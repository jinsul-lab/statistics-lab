const ORIGINS=new Set(['https://jinsul-lab.github.io','http://127.0.0.1:5500','http://localhost:5500']);
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  const headers={'Content-Type':'application/json; charset=utf-8','Vary':'Origin','Cache-Control':'no-store'};
  if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Max-Age':'86400'});
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(url.pathname==='/health')return reply({ok:true,service:'jinsul-banner-proxy',version:'1.0.0',configured:!!env.BANNER_API_KEY});
  if(origin&&!ORIGINS.has(origin))return reply({error:'허용되지 않은 접속 주소'},403);
  if(url.pathname!=='/banner')return reply({error:'경로 없음'},404);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='GET')return reply({error:'GET 요청 필요'},405);
  const raw=url.searchParams.get('page')||'1',page=Number(raw);
  if(!/^\d+$/.test(raw)||!Number.isInteger(page)||page<1||page>100||[...url.searchParams.keys()].some(k=>k!=='page'))return reply({error:'조회 조건 오류'},400);
  if(!env.BANNER_API_KEY)return reply({error:'게시대 API 인증정보 미설정'},503);
  const cacheKey=new Request(url.origin+'/banner?page='+page);
  const cache=typeof caches!=='undefined'?caches.default:null;
  const cached=cache?await cache.match(cacheKey):null;
  if(cached)return new Response(cached.body,{status:200,headers:{...headers,'X-Banner-Cache':'HIT'}});
  const upstream=new URL('https://api.data.go.kr/openapi/tn_pubr_public_banner_api');
  upstream.search=new URLSearchParams({serviceKey:env.BANNER_API_KEY,pageNo:String(page),numOfRows:'1000',type:'json'});
  try{
   const res=await fetch(upstream,{signal:AbortSignal.timeout(18000),redirect:'manual'});
   if(!res.ok)return reply({error:'공공 API HTTP 오류',upstreamStatus:res.status},502);
   const payload=await res.json(),root=payload.response||payload,code=String(root.header?.resultCode??'');
   if(!['00','0'].includes(code))return reply({error:'공공 API 조회 실패',code},502);
   const body=root.body,total=Number(body?.totalCount),rawItems=body?.items?.item;
   const items=Array.isArray(rawItems)?rawItems:rawItems&&typeof rawItems==='object'?[rawItems]:[];
   if(!Number.isInteger(total)||total<0||!body)return reply({error:'공공 API 응답 형식 오류'},502);
   const safe={ok:true,page,numOfRows:1000,totalCount:total,items,source:'공공데이터포털 전국현수막게시대시설표준데이터',fetchedAt:new Date().toISOString()};
   const text=JSON.stringify(safe).split(env.BANNER_API_KEY).join('[redacted]');
   if(cache&&ctx)ctx.waitUntil(cache.put(cacheKey,new Response(text,{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=3600'}})));
   return new Response(text,{headers});
  }catch(e){return reply({error:'공공 API 연결 실패 또는 대기시간 초과',kind:e.name},504);}
 }
};
