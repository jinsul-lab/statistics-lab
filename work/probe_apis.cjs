// Run from the repository root: node work/probe_apis.cjs
// Read existing app settings locally; never print credentials, request URLs or bodies.
const fs=require('fs');
const html=fs.readFileSync('JINSUL_MAP_v3.5.2.html','utf8');
const cfg={};for(const m of html.matchAll(/const\s+([A-Z_]+)\s*=\s*(['"])([^'"\r\n]*)\2/g))cfg[m[1]]=m[3];
const origin='https://jinsul-lab.github.io';
const query=(base,params)=>base+'?'+new URLSearchParams(params);
const monthDate=new Date();monthDate.setDate(1);monthDate.setMonth(monthDate.getMonth()-1);
const month=''+monthDate.getFullYear()+String(monthDate.getMonth()+1).padStart(2,'0');
const checks=[
  ['R-ONE',query(cfg.RONE_PROXY_API,{STATBL_ID:'T248223134698125',DTACYCLE_CD:'QY',START_WRTTIME:'2024',pIndex:1,pSize:1})],
  ['HIRA hospital',query(cfg.HIRA_HOSPITAL_API_BASE,{serviceKey:cfg.HIRA_API_KEY,pageNo:1,numOfRows:1,_type:'xml',clCd:'31'})],
  ['HIRA detail route',query(cfg.HIRA_DETAIL_API_BASE+'/getDtlInfo2.8',{serviceKey:cfg.HIRA_API_KEY,pageNo:1,numOfRows:1,_type:'xml'})],
  ['Building (sample parcel)',query(cfg.BUILDING_HUB_API,{serviceKey:cfg.PUBLIC_DATA_API_KEY,sigunguCd:'11680',bjdongCd:'10300',platGbCd:'0',bun:'0316',ji:'0000',pageNo:1,numOfRows:1,_type:'json'})],
  ['Commercial trade',query(cfg.COMMERCIAL_TRADE_API,{serviceKey:cfg.PUBLIC_DATA_API_KEY,LAWD_CD:'28245',DEAL_YMD:month,pageNo:1,numOfRows:1})],
  ['Radius stores',query(cfg.SDSC_RADIUS_API,{serviceKey:cfg.PUBLIC_DATA_API_KEY,cx:126.977,cy:37.566,radius:100,pageNo:1,numOfRows:1,type:'json'})],
  ['SGIS authentication',query(cfg.SGIS_API_BASE+'/auth/authentication.json',{consumer_key:cfg.SGIS_CONSUMER_KEY,consumer_secret:cfg.SGIS_CONSUMER_SECRET})],
  ['Seoul population HTTPS','https://openapi.seoul.go.kr/'+encodeURIComponent(cfg.SEOUL_REALTIME_API_KEY)+'/json/citydata_ppltn/1/5/'+encodeURIComponent('강남역')],
  ['Seoul commerce HTTPS','https://openapi.seoul.go.kr/'+encodeURIComponent(cfg.SEOUL_COMMERCE_API_KEY)+'/json/VwsmTrdarFlpopQq/1/1']
];
(async()=>{
const results=[];
for(const [service,url] of checks){
  const start=Date.now();
  try{
    const r=await fetch(url,{headers:{Origin:origin},signal:AbortSignal.timeout(20000)});
    const body=await r.text();let payload;try{payload=JSON.parse(body)}catch{}
    const code=payload?.errCd??payload?.response?.header?.resultCode??payload?.header?.code??payload?.RESULT?.CODE??payload?.RESULT?.['RESULT.CODE']??body.match(/<(?:resultCode|returnReasonCode)>\s*([^<]+)</)?.[1];
    results.push({service,http:r.status,cors:r.headers.get('access-control-allow-origin'),format:payload?'JSON':body.trim().startsWith('<')?'XML/HTML':'other',apiCode:code===undefined?null:String(code).replace(/[^A-Za-z0-9_-]/g,'').slice(0,24),bytes:Buffer.byteLength(body),elapsedMs:Date.now()-start});
  }catch(e){results.push({service,error:e.name,networkCode:e.cause?.code||null,elapsedMs:Date.now()-start});}
}
const result={testedAt:new Date().toISOString(),note:'Node transport probes, not browser execution. HTTP 200 alone does not establish successful data retrieval. HIRA detail requires a valid ykiho for end-to-end validation.',origin,results};
fs.writeFileSync('work/api-live-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})();
