// Seoul-only relay. No credentials are stored in source or client request URLs.
const ORIGINS=new Set(['https://jinsul-lab.github.io','http://localhost:5500','http://127.0.0.1:5500']);
const SERVICES=new Set(['citydata_ppltn','VwsmTrdarFlpopQq','VwsmTrdarStorQq']);
export default {
  async fetch(request){
    const origin=request.headers.get('Origin')||'';
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
    if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'});
    const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(new URL(request.url).pathname==='/health')return reply({ok:true,service:'jinsul-seoul-proxy',version:'1.0.2'});
    if(!ORIGINS.has(origin))return reply({error:'허용되지 않은 접속 주소입니다.'},403);
    if(new URL(request.url).pathname!=='/seoul')return reply({error:'존재하지 않는 경로입니다.'},404);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply({error:'POST 요청만 허용합니다.'},405);
    let data;
    try{const text=await request.text();if(text.length>2048)return reply({error:'요청이 너무 큽니다.'},413);data=JSON.parse(text);}catch{return reply({error:'올바른 JSON 요청이 필요합니다.'},400);}
    const {service,key,start,end,tail=''}=data||{};
    if(!SERVICES.has(service)||typeof key!=='string'||!/^[A-Za-z0-9]{10,80}$/.test(key)||!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end-start>=1000||end>100000)return reply({error:'조회 조건이 올바르지 않습니다.'},400);
    if(typeof tail!=='string'||tail.length>100)return reply({error:'조회 대상이 올바르지 않습니다.'},400);
    if(service==='citydata_ppltn'?(!/^[가-힣A-Za-z0-9 ·ㆍ()&–·-]+$/.test(tail)||start!==1||end>5):!new RegExp('^[0-9]{4}[1-4](/[0-9]{6,10})?$').test(tail))return reply({error:'조회 대상 또는 분기가 올바르지 않습니다.'},400);
    const url='http://openapi.seoul.go.kr:8088/'+encodeURIComponent(key)+'/json/'+service+'/'+start+'/'+end+'/'+tail.split('/').map(encodeURIComponent).join('/');
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(18000),redirect:'manual'});
      if(!response.ok)return reply({error:'서울시 원본 API HTTP 오류',upstreamStatus:response.status},502);
      let payload;try{payload=await response.json();}catch{return reply({error:'서울시 원본 API 응답이 JSON이 아닙니다.'},502);}
      // Redact any upstream echo of the supplied credential.
      const safe=JSON.stringify(payload).split(key).join('[redacted]');
      return new Response(safe,{status:200,headers});
    }catch(error){return reply({error:error.name==='TimeoutError'||error.name==='AbortError'?'서울시 원본 API 응답 대기시간 초과':'서울시 원본 API 연결 실패'},504);}
  }
};

