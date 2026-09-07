const scanRegistryCache=new Map();
function scanRegistryPublicReference(candidate){
  const p=scanParcelParams(candidate);if(!p||p.sigunguCd!=='41192'||p.bjdongCd!=='10800'||p.bun!=='1140'||p.ji!=='0005'||p.platGbCd!=='0')return null;
  return {url:'https://officefind.co.kr/중동1140-5삼성화재부천사옥',title:'오피스파인드 · 삼성화재부천사옥',checked:'2026-09-07',text:'중개법인 공개 자료에 2026년 기준층 임대시세가 있습니다. 기준 전용면적 528.43㎡이며 제공 샘플의 1층 일부 100.49평과 다릅니다. 해당 시세를 이 호실의 보증금·월세로 자동 입력하지 않습니다. 중앙 냉난방은 중개자료 표기이며 현장 미확인. 문의: 오피스파인드부동산중개법인 02-517-2277. 현재 1층 공실·입주일·임대조건은 미확인.'};
}
function scanRegistrySameParcel(row,parcel){return ['sigunguCd','bjdongCd','platGbCd','bun','ji'].every(k=>String(row[k]??'').padStart(k==='bun'||k==='ji'?4:1,'0')===String(parcel[k]));}
async function scanRegistryFetch(path,parcel){
  const rows=[];let total=null;
  for(let page=1;page<=10;page++){
    const params=new URLSearchParams({serviceKey:PUBLIC_DATA_API_KEY,...parcel,_type:'json',numOfRows:'100',pageNo:String(page)});
    const data=scanApiEnvelope(await scanFetchApiDocument('https://apis.data.go.kr/1613000/BldRgstHubService/'+path+'?'+params,30000));
    if(total!==null&&total!==data.total)throw Error('조회 도중 대장 건수가 변경되어 재조회 필요');total=data.total;
    if(data.rows.some(r=>!scanRegistrySameParcel(r,parcel)))throw Error('후보 필지와 다른 대장 응답');
    rows.push(...data.rows);if(rows.length>=total)return {rows,total,complete:true};
    if(data.rows.length<100)throw Error('대장 응답 일부 누락');
  }
  return {rows,total,complete:false};
}
function scanRegistryUnits(rows,complete){
  if(!complete)return [];const map=new Map();
  for(const r of rows){if(String(r.exposPubuseGbCdNm||'').trim()!=='전유'||!String(r.hoNm||'').trim())continue;
    const key=[r.mgmBldrgstPk,r.dongNm,r.hoNm].join('|');let u=map.get(key);if(!u){u={key,dong:String(r.dongNm||'').trim(),unit:String(r.hoNm).trim(),floors:[],uses:[],area:0,valid:true,when:String(r.crtnDay||'')};map.set(key,u);}
    const n=scanSiteNum(r.area);if(n===null||n<=0)u.valid=false;else u.area+=n;
    u.floors.push(String(r.flrNoNm||r.flrNo||''));u.uses.push(String(r.etcPurps||r.mainPurpsCdNm||''));
  }
  return [...map.values()].filter(u=>u.valid).map(u=>({...u,floors:[...new Set(u.floors)],uses:[...new Set(u.uses)]}));
}
async function scanRegistryLoad(result){
  const parcel=scanParcelParams(result.candidate);if(!parcel||result.candidate.searchScope)throw Error('구체적인 도로명주소·지번이 필요합니다.');
  const key=Object.values(parcel).join('|');if(scanRegistryCache.has(key))return scanRegistryCache.get(key);
  const promise=Promise.allSettled(['getBrFlrOulnInfo','getBrExposPubuseAreaInfo'].map(p=>scanRegistryFetch(p,parcel))).then(([f,u])=>({floors:f.status==='fulfilled'?f.value:{rows:[],complete:false},units:u.status==='fulfilled'?u.value:{rows:[],complete:false},errors:[f.status==='rejected'?'층별개요: '+scanApiErrorMessage(f.reason):'',u.status==='rejected'?'전유면적: '+scanApiErrorMessage(u.reason):''].filter(Boolean),checkedAt:new Date().toISOString()}));
  scanRegistryCache.set(key,promise);promise.then(d=>{if(d.errors.length||!d.floors.complete||!d.units.complete)scanRegistryCache.delete(key);},()=>scanRegistryCache.delete(key));return promise;
}
function scanRegistryFacts(data){
  const facts=data.floors.rows.slice(0,40).map(r=>({name:'대장 층별 · '+[r.bldNm,r.dongNm,r.flrNoNm||r.flrNo].filter(Boolean).join(' '),value:(r.etcPurps||r.mainPurpsCdNm||'용도 미제공')+' · '+(scanSiteNum(r.area)===null?'면적 미제공':Number(r.area).toLocaleString()+'㎡')+' · '+(r.strctCdNm||'구조 미제공'),scope:'해당 층·용도 구획 · 임대 호실 전용면적 아님',when:'원본 생성 '+(r.crtnDay||'미표시')+' / 조회 '+data.checkedAt.slice(0,10),source:'국토교통부 건축물대장 층별개요'}));
  facts.push({name:'대장 조회 상태',value:'층별 '+data.floors.rows.length+'/'+(data.floors.total??'?')+'건 · 전유/공용 '+data.units.rows.length+'/'+(data.units.total??'?')+'건'+(data.errors.length?' · '+data.errors.join(' / '):'')+(!data.units.rows.length&&data.units.complete?' · 등록 전유면적 없음(일반건축물 등)':'')+(data.floors.rows.length>40?' · 자료표는 앞40건 표시':'')+(!data.floors.complete||!data.units.complete?' · 일부 조회/미완료':''),scope:'후보 필지 · 공실/임대 매물 목록 아님',when:'조회 '+data.checkedAt,source:'국토교통부 건축물대장'});return facts;
}
function scanRegistryApply(draft,unit,checkedAt){
  if(!unit||!Number.isFinite(unit.area)||unit.area<=0)throw Error('검증된 전유면적 없음');
  if(String(draft.fields.unit||'').trim()||String(draft.fields.area||'').trim())throw Error('기존 층·호실 또는 면적 입력값이 있어 자동으로 덮어쓰지 않았습니다.');
  const label=[unit.dong,unit.unit+'호',unit.floors.join('/')].filter(Boolean).join(' '),area=(unit.area/3.305785).toFixed(2);
  draft.fields.unit=label;draft.fields.area=area;draft.autoFields=draft.autoFields||{};
  for(const [k,value] of [['unit',label],['area',area]])draft.autoFields[k]={value,source:'국토교통부 전유공용면적 · 선택 호실의 전유 구획 합계',checkedAt};
  const fact={name:'대장 선택 호실',value:label+' · 전유 '+unit.area.toFixed(2)+'㎡ · '+unit.uses.join(', '),scope:'선택한 등재 호실 전체 · 일부 임대시 별도 면적 필요',when:'원본 생성 '+unit.when+' / 조회 '+checkedAt,source:'국토교통부 건축물대장'};
  draft.registryFacts=(draft.registryFacts||[]).filter(r=>r.name!==fact.name);draft.registryFacts.push(fact);draft.snapshot.facts=draft.snapshot.facts.filter(r=>r.name!==fact.name);draft.snapshot.facts.push(fact);
}
async function scanRegistryOpen(draft,result){
  const node=$('siteRegistry');if(!node||!result)return;node.textContent='건축물대장 층·호실 자료 자동 조회 중…';
  try{const data=await scanRegistryLoad(result);if(draft!==scanSite.active||result!==scanSite.result)return;
    const saved=(draft.registryFacts||[]).filter(r=>r.name==='대장 선택 호실');draft.registryFacts=[...scanRegistryFacts(data),...saved];const ref=scanRegistryPublicReference(result.candidate);if(ref)draft.registryFacts.push({name:'대장 대조 · 공개 중개자료',value:ref.text,scope:'동일 건물 기준층 참고 · 선택 임대호실 조건 아님',when:'자료 확인 '+ref.checked+' · 실시간 갱신 아님',source:ref.title+' '+ref.url});draft.snapshot.facts=draft.snapshot.facts.filter(r=>!r.name.startsWith('대장 ')).concat(draft.registryFacts);scanSitePreview();
    const units=scanRegistryUnits(data.units.rows,data.units.complete),e=scanSiteEscape;
    node.innerHTML='<h4>공식 대장 · 층과 호실</h4><p>층별 용도·면적은 아래 자료표에 자동 반영했습니다. 대장 등재가 현재 공실·임대 가능 또는 의원 개설 가능을 뜻하지는 않습니다.</p>'+data.errors.map(x=>'<p>'+e(x)+'</p>').join('')+(units.length?'<label>실제 검토할 등재 호실<select id="siteRegistryUnit"><option value="">호실을 선택하세요</option>'+units.map((u,i)=>'<option value="'+i+'">'+e([u.dong,u.unit+'호',u.floors.join('/'),u.area.toFixed(2)+'㎡',u.uses.join(', ')].join(' · '))+'</option>').join('')+'</select></label><button class="btn outline" id="siteRegistryApply">선택 호실·전유면적 반영</button>':'<p>자동 반영할 전유 호실 자료가 없습니다. 일반건축물의 일부 임대 면적은 매물 원문·임대 도면과 대조해야 합니다.</p>')+'<p class="scanCaption">원본 생성일과 오늘 조회일을 구분해 표시합니다. 임대조건은 매물 등록자와 확인한 날짜가 필요합니다.</p>';
    if(ref)node.innerHTML+='<h4>동일 건물 공개 중개자료</h4><p>'+e(ref.text)+'</p><a target="_blank" rel="noopener" href="'+e(ref.url)+'">'+e(ref.title)+' 원문 ↗</a><p class="scanCaption">확인 '+ref.checked+' · 매물 광고/시세 정보이며 현장 확인 또는 현재 공실 확인을 대신하지 않습니다.</p>';
    if($('siteRegistryApply'))$('siteRegistryApply').onclick=()=>{try{const selected=$('siteRegistryUnit').value;if(selected==='')throw Error('실제 검토할 호실을 먼저 선택하세요.');scanRegistryApply(draft,units[Number(selected)],data.checkedAt);scanSiteRender();scanSiteStatus('선택 호실의 전유면적을 반영했습니다. 공용면적·층 전체 면적은 포함하지 않았습니다.');}catch(e){scanSiteStatus(e.message);}};
  }catch(error){if(draft===scanSite.active&&result===scanSite.result)node.textContent='대장 상세 조회: '+scanApiErrorMessage(error);}
}
const scanRegistryRenderBase=scanSiteRender;
scanSiteRender=function(){scanRegistryRenderBase();const d=scanSite.active;if(!d||!scanSite.result)return;const node=document.createElement('section');node.id='siteRegistry';node.className='siteClinicBox';$('siteStatus').after(node);scanRegistryOpen(d,scanSite.result);};
const scanRegistryValidBase=scanSiteValidDraft;
scanSiteValidDraft=function(raw){const d=scanRegistryValidBase(raw);d.registryFacts=d.snapshot.facts.filter(r=>r.name.startsWith('대장 '));return d;};
