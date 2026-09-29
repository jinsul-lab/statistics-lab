/* Synthetic integration checks of current release functions; no API/browser calls or HTML edits. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../jinsulmap/jinsulmap.html'),'utf8');
function fn(name){
  const start=html.indexOf('function '+name+'(');assert(start>=0,'Missing release function '+name);
  const lineEnd=html.indexOf('\n',start),line=html.slice(start,lineEnd).trimEnd();
  if(line.endsWith('}'))return line;
  const end=html.indexOf('\n}',lineEnd);assert(end>=0,'Missing release function terminator '+name);
  return html.slice(start,end+2);
}
function line(prefix){const row=html.split(/\r?\n/).find(s=>s.startsWith(prefix));assert(row,'Missing release declaration '+prefix);return row;}
const nodes=new Map(),charts=new Map(),markers=[];
function $(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,style:{},querySelectorAll:()=>[]});return nodes.get(id);}
const e=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const c=vm.createContext({console,URL,Date,Map,Set,Number,Math,
  $,scanEscapeHTML:e,scanState:{mode:'scan',comparisons:[]},scanSite:{active:null,result:null},
  map:{},document:{querySelectorAll:()=>[]},SCAN_FACILITY_CONFIG:{},
  scanClearMapArtifacts:()=>{markers.length=0;},scanDrawCandidate:()=>{},scanAddMarker:(place,type)=>markers.push({place,type}),scanApplyLayerVisibility:()=>{},
  scanReportChart:(key,id,config)=>charts.set(key,config),scanRenderRoneChart:()=>{},scanRenderPopulationDetailCharts:()=>{},
  scanSiteFacts:()=>[{name:'existing fact',value:'kept',scope:'test',when:'test',source:'test'}],scanSiteClinicFact:()=>null,scanSiteClinicHTML:()=>'',
  scanFormatHiraDate:value=>value||'개설일 미상',scanFormatDistance:value=>String(value)+'m',
  scanReportScores:()=>({total:null,scores:[]}),scanRenderVisitors:()=>'',scanRenderNetwork:()=>{},scanCandidateRegion:()=>({name:'시험 지역'}),scanRegionalCoverage:()=>({}),
  scanRenderRoneReport:()=>{},scanRenderPopulationDetails:()=>{},scanSwitchReportTab:()=>{},scanDestroyReportCharts:()=>{},setTimeout:()=>{},toast:()=>{},
});
const names=['scanClinicCount','scanClinicCohort','scanCompetitionStatus','scanClinicCriteriaNote','scanSiteNum','scanSiteText','scanSiteEscape','scanSiteSameClinic','scanSiteCompetition','scanSiteCompetitionTitle','scanSiteAssessment','scanSiteSnapshot','scanSiteValidDraft','scanSiteMergeEvidence','scanSiteCompetitionHTML','scanSiteRenderCompetition','scanDrawResult','scanRenderReportCharts','scanReportTable','scanReportInsights','scanRenderComparisons','scanOpenReport'];
vm.runInContext([line('const SCAN_CLINIC_CRITERIA_VERSION='),line('const HIRA_SPECIALTY_CODES ='),line('const scanSiteFields='),line('const scanSiteChecks='),...names.map(fn),
  line('const scanSiteValidBeforeEnrich='),line('scanSiteValidDraft=function(raw){const d=scanSiteValidBeforeEnrich'),
  line('const scanRegistryValidBase='),line('scanSiteValidDraft=function(raw){const d=scanRegistryValidBase'),
  line('const scanSiteSnapshotBeforeAudit='),line('scanSiteSnapshot=function(result,draft){const snapshot=scanSiteSnapshotBeforeAudit')
].join('\n'),c);
const version='specialist-no-inpatient-v1';
const assessment=(status='competitor',matched=['정형외과'])=>({status,criteriaVersion:version,reason:'synthetic verified source',specialistCount:status==='competitor'?2:status==='declared'?0:null,specialistCounts:{'정형외과':status==='competitor'?2:status==='declared'?0:null,'재활의학과':matched.includes('재활의학과')?1:0},matchedSpecialties:matched,bedCount:status==='excluded'?5:status==='unverified'?null:0,checkedAt:'2026-09-30T00:00:00Z'});
const clinic=(id,distance,status='competitor',specialties=['정형외과'],matched=specialties)=>({ykiho:id,name:'의원 '+id,address:'시험시 확인로 1',phone:'',lat:37.5,lng:127,distance,doctorCount:3,establishedDate:'20200101',specialties,competitionAssessment:assessment(status,matched)});
const v1=clinic('self',30),v2=clinic('verified',500,'competitor',['정형외과','내과'],['정형외과','재활의학과']);
const d1=clinic('declared',70,'declared'),d2=clinic('declared-rehab',200,'declared',['재활의학과']);
const unknown=clinic('unknown',80,'unverified'),inpatient=clinic('inpatient',90,'excluded');
const hira={places:[v1,d1,unknown,inpatient,d2,v2],competitors:[v1,v2],declared:[d1,d2],unverified:[unknown],excluded:[inpatient],unavailable:false,errorLabels:[],specialties:[{name:'정형외과',count:97,error:false},{name:'재활의학과',count:88,error:false}]};
const result={candidate:{name:v1.name,address:'후보 주소',lat:37.5,lng:127},radiusMeters:1000,createdAt:'2026-09-30T01:00:00Z',criteriaVersion:version,competitors:[v1,v2],density:2/Math.PI,nearestCompetitor:v1,hira,
  specialties:[{name:'정형외과',count:2,error:false},{name:'재활의학과',count:1,error:false}],kakaoSpecialties:[{name:'정형외과',count:999}],kakaoCandidates:[clinic('kakao-only',10)],facilities:{},population:{},truncatedLabels:[],errorLabels:[]};
const draft={schema:'jinsul-site-1',key:'test',competitionMode:'pain',exclude:true,fields:{title:'시험 저장본'},photos:{},checks:[],registryFacts:[{name:'대장 테스트',value:'보존',scope:'test',when:'test',source:'test'}]};
let checks=0;const failures=[];
function check(actual,expected,label){checks++;try{assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected,label);}catch(error){failures.push({label,actual,expected});}}
function truth(value,label){check(!!value,true,label);}
function test(label,run){try{run();}catch(error){failures.push({label,error:error.message});}}
test('site competition cohort and self exclusion',()=>{
  const comp=c.scanSiteCompetition(result,true,draft);
  check(comp.rows.map(p=>p.ykiho),['verified'],'site excludes self and ignores declarations/unknown/beds/Kakao rows');
  check(comp.rows[0].specialties,['정형외과','재활의학과'],'site shows verified specialty matches, not raw declarations');
  check([comp.mode,comp.excluded,comp.unverifiedCount,comp.excludedClinicalCount,comp.partial],['competition',1,1,1,true],'site stores eligibility exclusions separately from self exclusion');
  check(c.scanSiteCompetition(result,false,draft).rows.map(p=>p.ykiho),['self','verified'],'self toggle affects only candidate matching');
  check(comp.bins.map(b=>b.count),[0,1,0,0],'distance bins use same verified cohort');
  truth(c.scanSiteCompetitionTitle(comp).includes('전문의'),'current competition title identifies source criterion');
});
test('all-clinic reference is a separate view',()=>{
  const all=[...hira.places,clinic('other-specialty',100,'unverified',['내과'])];
  const comp=c.scanSiteCompetition({...result,siteAllHira:{places:all,unavailable:false}},false,{competitionMode:'all'});
  check(comp.mode,'reference','all mode is reference');
  check(comp.rows.length,7,'all reference preserves declared and other-specialty records');
  check(c.scanSiteCompetitionTitle(comp),'타과 포함 신고기관 참고','reference view title cannot imply verified competitors');
  truth(c.scanSiteCompetitionHTML({snapshot:{radius:1000,competition:comp}}).includes('경쟁병원 수에 포함하지 않습니다'),'reference table discloses exclusion from competition count');
  check(result.hira.competitors.length,2,'reference viewing does not mutate canonical cohort');
  check(c.scanSiteCompetition(result,false,{competitionMode:'all'}).unavailable,true,'unloaded all mode is unavailable, not zero confirmed');
});
let snapshot,valid;
test('snapshot and real validator wrappers preserve evidence',()=>{
  snapshot=c.scanSiteSnapshot(result,draft);
  check(snapshot.competition.criteriaVersion,version,'snapshot criterion saved');
  check(snapshot.competition.selectedSpecialties,['정형외과','재활의학과'],'snapshot selected scope saved');
  check(snapshot.competition.rows.map(p=>p.name),[v2.name],'snapshot uses verified site cohort');
  truth(snapshot.competition.rows.every(p=>!Object.hasOwn(p,'ykiho')),'snapshot removes provider identifiers');
  check(snapshot.competition.rows[0].competitionAssessment.bedCount,0,'explicit zero inpatient evidence survives snapshot');
  truth(snapshot.facts.some(p=>p.name==='대장 테스트'),'latest snapshot wrapper preserves registry evidence');
  valid=c.scanSiteValidDraft({...draft,snapshot});
  const comp=valid.snapshot.competition,a=comp.rows[0].competitionAssessment;
  check([comp.criteriaVersion,comp.mode,a.status,a.bedCount,a.specialistCount,a.checkedAt],[version,'competition','competitor',0,2,'2026-09-30T00:00:00Z'],'save/import/print validator keeps criterion and assessment');
  check(comp.selectedSpecialties,['정형외과','재활의학과'],'validator keeps selected specialties');
  check(a.matchedSpecialties,['정형외과','재활의학과'],'validator keeps confirmed specialty matches');
  check(a.specialistCounts['신경외과'],null,'absent specialty evidence remains null');
  truth(!Object.hasOwn(comp.rows[0],'ykiho'),'validator excludes provider identifiers');
  truth(valid.registryFacts.some(p=>p.name==='대장 테스트'),'latest validation wrapper still runs');
  const again=c.scanSiteValidDraft(JSON.parse(JSON.stringify(valid)));
  check(again.snapshot.competition,JSON.parse(JSON.stringify(comp)),'save/import round trip stable');
});
test('legacy snapshots remain reference rather than becoming zero or verified',()=>{
  const legacyRow={name:'이전 신고의원',address:'옛 주소',phone:'',lat:37.5,lng:127,distance:100,doctorCount:null,establishedDate:'',specialties:['정형외과']};
  const old=c.scanSiteValidDraft({...draft,snapshot:{candidate:result.candidate,radius:1000,createdAt:'2020-01-01',facts:[],competition:{rows:[legacyRow],excluded:0},facilities:[]}});
  check(old.snapshot.competition.rows.length,1,'legacy rows retained');
  check(old.snapshot.competition.rows[0].competitionAssessment,null,'legacy evidence stays unknown');
  check(c.scanSiteCompetitionTitle(old.snapshot.competition),'과거 신고기관 참고 · 재조회 필요','legacy title explicitly marks old reference');
  const text=c.scanSiteCompetitionHTML(old);
  truth(text.includes('이전 신고의원')&&text.includes('전문의·병상 조건을 검증한 경쟁병원 목록이 아니며'),'legacy table keeps original records and discloses missing validation');
  truth(text.includes('미확인')&&!text.includes('0개 확인'),'legacy beds do not become zero');
  c.scanSite.active=old;c.scanSiteRenderCompetition();
  truth(charts.get('siteDistance').data.datasets[0].label.includes('과거 신고기관 참고'),'legacy chart carries same reference title');
});
test('map canonical cohorts do not overlap',()=>{
  const cohort=c.scanClinicCohort(hira);
  check(Object.fromEntries(['competitors','declared','unverified','excluded'].map(key=>[key,cohort[key].map(p=>p.ykiho)])),{competitors:['self','verified'],declared:['declared','declared-rehab'],unverified:['unknown'],excluded:['inpatient']},'one assessment maps to one cohort');
  c.scanDrawResult(result);
  check(markers.map(m=>[m.place.ykiho,m.type]),[['self','competitor'],['verified','competitor'],['declared','hira'],['declared-rehab','hira']],'map uses verified and declaration-only lists');
  check(new Set(markers.map(m=>m.place.ykiho)).size,markers.length,'same HIRA source is not drawn twice');
  truth(!markers.some(m=>['unknown','inpatient','kakao-only'].includes(m.place.ykiho)),'unverified, excluded, Kakao candidates omitted from competitor map');
});
test('report chart datasets share verified and declaration cohorts',()=>{
  c.scanRenderReportCharts(result,{scores:[]});
  const chart=charts.get('competition');
  check(chart.data.labels,['정형외과','재활의학과'],'report chart scope matches selected specialties');
  check(chart.data.datasets.map(d=>d.data),[[2,1],[1,1]],'report uses verified specialty counts and declaration-only counts, not raw HIRA/Kakao totals');
  check(chart.data.datasets.map(d=>d.label),['경쟁병원 · 전문의 신고','심평원 신고의원'],'datasets distinguish eligibility and declarations');
  const failed={...result,specialties:result.specialties.map(s=>({...s,error:true,count:0})),hira:{...hira,unavailable:true,places:[],competitors:[],declared:[],unverified:[],excluded:[],specialties:hira.specialties.map(s=>({...s,error:true}))},competitors:[],density:0,nearestCompetitor:null,population:null};
  c.scanRenderReportCharts(failed,{scores:[]});
  check(charts.get('competition').data.datasets.map(d=>d.data),[[null,null],[null,null]],'failed specialty requests chart as missing values rather than zero');
  check(c.scanCompetitionStatus(failed),'조회 불가','failed source count is unavailable');
  check(c.scanCompetitionStatus({...result,hira:null,competitors:[]}),'조회 불가','missing source count is unavailable');
  truth(c.scanCompetitionStatus(result).includes('일부 미확인'),'partial evidence count is qualified');
  const noRows={...result,competitors:[],hira:{...hira,places:[],competitors:[],declared:[],unverified:[],excluded:[],errorLabels:[]}};
  check(c.scanCompetitionStatus(noRows),'0곳','confirmed complete zero remains a true zero');
  c.scanSite.active={...draft,snapshot:c.scanSiteSnapshot(failed,draft)};c.scanSiteRenderCompetition();
  check(charts.get('siteDistance').data.datasets[0].data,[null,null,null,null],'unavailable site histogram is missing, not zero');
  truth(c.scanSiteCompetitionHTML(c.scanSite.active).includes('조회 불가'),'unavailable site table discloses failure');
  c.scanOpenReport(failed);
  const kpi=$('scanReportKpis').innerHTML;
  truth(kpi.includes('조회 불가')&&kpi.includes('밀도 확인 불가')&&!kpi.includes('0.00곳/㎢'),'report KPI does not imply zero competition during outage');
  const insight=c.scanReportInsights(failed,{scores:[]});
  truth(!/정형외과 0곳|재활의학과 0곳/.test(insight),'failed specialty narrative does not state zero');
  const missingNote=c.scanClinicCriteriaNote({...result,hira:null});
  truth(/조회.*불가|미확인|확인 불가/.test(missingNote)&&!missingNote.includes('경쟁 0곳'),'criteria note for missing HIRA source does not state zero');
  c.scanState.comparisons=[{id:1,name:'실패 저장',address:'시험 주소',radiusMeters:1000,competitionStatus:'조회 불가',density:0,uniqueCount:0,hira:{unavailable:true},facilities:Object.fromEntries(['subway','parking','pharmacy'].map(key=>[key,{label:key,count:0,nearestDistance:null}]))}];
  c.scanRenderComparisons();
  truth(!$('scanCompareList').innerHTML.includes('0.00곳/km²'),'comparison outage does not display zero density');
});
console.log(JSON.stringify({ok:failures.length===0,checks,failures,source:'current release HTML with synthetic source and DOM fixtures',liveApi:false,htmlEdited:false},null,2));
if(failures.length)process.exitCode=1;
