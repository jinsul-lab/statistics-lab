const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../jinsulmap/jinsulmap.html'),'utf8');
const start=html.indexOf('const SEOUL_SHELTER_SOURCE_URL=');
const end=html.indexOf('\nfunction facilityWithinBounds',start);
assert.ok(start>=0&&end>start,'official client must exist in release HTML');
const source=html.slice(start,end);
let passed=0;
const bounds=(south=37.4,west=126.7,north=37.75,east=127.3)=>({getSouthWest:()=>({getLat:()=>south,getLng:()=>west}),getNorthEast:()=>({getLat:()=>north,getLng:()=>east})});
const row=(n=1)=>({YEAR:'2026',AREA_CD:'1120059000',R_AREA_NM:'검증 경로당 '+n,R_DETL_ADD:'서울특별시 성동구 검증로 '+n,LOTNO_ADDR:'서울특별시 성동구 검증동 '+n,LON:'127.03',LAT:'37.56',FACILITY_TYPE1:'특정계층이용시설',FACILITY_TYPE2:'회원이용시설',OPR_DAYS:'월,화,수,목,금',OPR_START_TIME:'09:00',OPR_END_TIME:'18:00',EXT_OPR_YN:'N',ADD_OPR_YN:'Y',ADD_OPR_DAYS:'토',ADD_OPR_START_TIME:'10:00',ADD_OPR_END_TIME:'14:00'});
const payload=(start,end,total,make=row)=>({TbGtnHwcwP:{RESULT:{CODE:'INFO-000'},list_total_count:total,row:Array.from({length:Math.max(0,Math.min(end,total)-start+1)},(_,i)=>make(start+i))}});
const plain=value=>JSON.parse(JSON.stringify(value));
function setup(fetcher){
  const clock={now:Date.UTC(2026,8,29)};
  class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock.now]));}static now(){return clock.now;}}
  const context=vm.createContext({scanSeoulRequest:fetcher,SEOUL_COMMERCE_API_KEY:'fixturekey123456',Date:ClockDate,Promise,setTimeout});
  vm.runInContext(source,context);
  return {context,clock,fetch:box=>context.fetchSeoulOfficialShelters(box),state:()=>vm.runInContext('seoulShelterMemory',context)};
}
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
  await test('outside Seoul has explicit scope and no network',async()=>{
    const h=setup(()=>{throw Error('must not fetch');});
    const result=await h.fetch(bounds(35,129,36,130));
    assert.equal(result.status,'out-of-coverage');assert.equal(result.total,null);assert.equal(result.places.length,0);assert.match(result.note,/전부|전체/);
  });
  await test('invalid bounds never load an unbounded source',async()=>{
    const h=setup(()=>{throw Error('must not fetch');});
    await assert.rejects(()=>h.fetch({}),/조회 범위/);
    await assert.rejects(()=>h.fetch(bounds(38,128,37,127)),/조회 범위/);
  });
  await test('pagination maximum two requests, shared inflight, and one-hour complete cache',async()=>{
    let calls=0,active=0,maxActive=0;
    const requests=[];
    const h=setup(async(service,key,start,end,...tail)=>{
      assert.equal(service,'TbGtnHwcwP');assert.equal(key,'fixturekey123456');assert.equal(tail.length,0);
      calls++;active++;maxActive=Math.max(maxActive,active);requests.push([start,end]);
      await new Promise(resolve=>setTimeout(resolve,2));active--;
      return payload(start,end,2501);
    });
    const [a,b]=await Promise.all([h.fetch(bounds()),h.fetch(bounds())]);
    assert.equal(calls,3);assert.equal(maxActive,2);assert.equal(a.total,2501);assert.equal(b.matched,2501);
    assert.deepEqual(requests,[[1,1000],[1001,2000],[2001,2501]]);
    a.places[0].place_name='consumer mutation';a.recordYears.push('bad');
    const cached=await h.fetch(bounds());assert.equal(calls,3);assert.equal(cached.places[0].place_name,'검증 경로당 1');assert.deepEqual(plain(cached.recordYears),['2026']);
    h.clock.now+=3599999;await h.fetch(bounds());assert.equal(calls,3);
    h.clock.now+=1;await h.fetch(bounds());assert.equal(calls,6);
  });
  await test('exact inclusive viewport filtering after Seoul snapshot',async()=>{
    const coordinates=[[127.03,37.56],[127.04,37.57],[127.02,37.55],[127.10,37.61]];
    const h=setup(async(_,__,start,end)=>payload(start,end,4,n=>({...row(n),LON:String(coordinates[n-1][0]),LAT:String(coordinates[n-1][1])})));
    const result=await h.fetch(bounds(37.55,127.02,37.57,127.04));
    assert.equal(result.total,4);assert.equal(result.matched,3);assert.equal(result.scope,'서울특별시');assert.match(result.note,/전국 전체 자료/);
  });
  await test('official fields, limited users, dates, and stable compound IDs',async()=>{
    const h=setup(async(_,__,start,end)=>payload(start,end,2));
    const result=await h.fetch(bounds()),first=result.places[0],second=result.places[1];
    assert.equal(first.officialShelter,true);assert.equal(first.sourceProvider,'official');assert.equal(first.recordDate,'2026');assert.equal(first.recordDateLabel,'기준연도');
    assert.equal(first.facilityType,'특정계층이용시설');assert.equal(first.facilitySubtype,'회원이용시설');assert.equal(first.openingStatus,'현재 개방 여부 미확인');
    assert.match(first.operatingHours,/기본 월,화,수,목,금 09:00–18:00/);assert.match(first.operatingHours,/추가 토 10:00–14:00/);
    assert.equal(first.areaCode,second.areaCode);assert.notEqual(first.id,second.id);
    assert.equal(h.context.seoulShelterOfficialPlace({...row(),LON:'127.03000',LAT:'37.56000'}).id,first.id);
    assert.equal(first.sourceURL,'https://data.seoul.go.kr/dataList/OA-21065/S/1/datasetView.do?tab=A');
  });
  await test('missing coordinates and duplicate rows have explicit quality counts',async()=>{
    const rows=[row(1),row(1),{...row(3),LAT:''},{...row(4),LON:'not-a-number'}];
    const h=setup(async()=>({TbGtnHwcwP:{RESULT:{CODE:'INFO-000'},list_total_count:4,row:rows}}));
    const result=await h.fetch(bounds());
    assert.equal(result.total,4);assert.equal(result.matched,1);assert.equal(result.invalidCoordinateCount,2);assert.equal(result.duplicateCount,1);assert.match(result.note,/2건/);
  });
  await test('explicit source no-data is distinct from a failure',async()=>{
    const h=setup(async()=>({RESULT:{CODE:'INFO-200'}}));
    const result=await h.fetch(bounds());assert.equal(result.status,'complete');assert.equal(result.total,0);assert.equal(result.matched,0);assert.ok(h.state().snapshot);
  });
  await test('authentication, malformed code and malformed counts throw without caching',async()=>{
    const badCounts=['',-1,1.5,100001,'not-a-count'].map(total=>{const response=payload(1,1000,1);response.TbGtnHwcwP.list_total_count=total;return response;});
    for(const response of [{RESULT:{CODE:'INFO-100'}},{TbGtnHwcwP:{list_total_count:0,row:[]}},...badCounts]){
      const h=setup(async()=>response);
      await assert.rejects(()=>h.fetch(bounds()));assert.equal(h.state().snapshot,null);assert.equal(h.state().pending,null);
    }
  });
  await test('missing page and changed total do not return partial places',async()=>{
    for(const mode of ['missing','countChanged','emptyCode']){
      const h=setup(async(_,__,start,end)=>{
        if(start===1)return payload(start,end,1500);
        if(mode==='emptyCode')return {RESULT:{CODE:'INFO-200'}};
        const response=payload(start,end,mode==='countChanged'?1501:1500);
        if(mode==='missing')response.TbGtnHwcwP.row.pop();
        return response;
      });
      await assert.rejects(()=>h.fetch(bounds()));assert.equal(h.state().snapshot,null);
    }
  });
  await test('failure waits for sibling request and retries complete snapshot',async()=>{
    let fail=true,active=0,requests=0;
    const h=setup(async(_,__,start,end)=>{
      requests++;active++;
      try{
        if(start===1001&&fail)throw Error('simulated upstream timeout');
        if(start===2001)await new Promise(resolve=>setTimeout(resolve,5));
        return payload(start,end,2100);
      }finally{active--;}
    });
    await assert.rejects(()=>h.fetch(bounds()),/timeout/);assert.equal(active,0);assert.equal(h.state().snapshot,null);
    fail=false;const result=await h.fetch(bounds());assert.equal(result.matched,2100);assert.equal(requests,6);
  });
  await test('expired cache is not silently returned when refresh fails',async()=>{
    let fail=false;
    const h=setup(async(_,__,start,end)=>{if(fail)throw Error('refresh failed');return payload(start,end,1);});
    await h.fetch(bounds());h.clock.now+=3600000;fail=true;
    await assert.rejects(()=>h.fetch(bounds()),/refresh failed/);
    assert.equal(h.state().expiresAt,h.clock.now);assert.equal(h.state().pending,null);
  });
  await test('invalid individual record and inconsistent INFO-200 fail loudly',async()=>{
    for(const response of [payload(1,1000,1,()=>({...row(),R_AREA_NM:''})),{TbGtnHwcwP:{RESULT:{CODE:'INFO-200'},row:[row()]}},{TbGtnHwcwP:{RESULT:{CODE:'INFO-200'},list_total_count:4,row:[]}}]){
      const h=setup(async()=>response);await assert.rejects(()=>h.fetch(bounds()));assert.equal(h.state().snapshot,null);
    }
  });
  console.log(passed+' Seoul shelter client tests passed; synthetic data only, no live API requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
