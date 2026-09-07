const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let h=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.6.1.html','utf8').replaceAll('3.6.1','3.6.2');
const fn=`function scanRegistryUnitCompare(a,b){
  const cmp=(x,y)=>String(x||'').localeCompare(String(y||''),'ko',{numeric:true,sensitivity:'base'});
  const room=x=>String(x||'').trim().replace(/^제(?=\\d)/,'').replace(/호$/,'').trim();
  return cmp(a.dong,b.dong)||cmp(room(a.unit),room(b.unit))||cmp(a.key,b.key);
}
`;
h=h.replace('function scanRegistryUnits(rows,complete){',fn+'function scanRegistryUnits(rows,complete){');
const old='return [...map.values()].filter(u=>u.valid).map(u=>({...u,floors:[...new Set(u.floors)],uses:[...new Set(u.uses)]}));';
assert.ok(h.includes(old));h=h.replace(old,old.replace('));',')).sort(scanRegistryUnitCompare);'));
const c=vm.createContext({scanSiteNum:v=>Number(v)});vm.runInContext(fn+h.slice(h.indexOf('function scanRegistryUnits('),h.indexOf('async function scanRegistryLoad(')),c);
const rooms=['106호','303호','109호','403호','107호','102호','202호','104-2호','504호','405호','103호','205호','401-2호','404호','402호','302호','301호','203호','112호','104-10호','104호'];
const rows=rooms.map((hoNm,i)=>({hoNm,dongNm:'A동',mgmBldrgstPk:String(i),area:40+i,exposPubuseGbCdNm:'전유'}));
const sorted=c.scanRegistryUnits(rows,true);
assert.deepEqual(Array.from(sorted,x=>x.unit),['102호','103호','104호','104-2호','104-10호','106호','107호','109호','112호','202호','203호','205호','301호','302호','303호','401-2호','402호','403호','404호','405호','504호']);
assert.equal(sorted.find(x=>x.unit==='303호').area,41);
assert.deepEqual(Array.from([{dong:'10동',unit:'101'},{dong:'2동',unit:'1001'},{dong:'2동',unit:'201'}].sort(c.scanRegistryUnitCompare),x=>x.dong+'/'+x.unit),['2동/201','2동/1001','10동/101']);
assert.equal(rows[0].hoNm,'106호');assert.equal(c.scanRegistryUnits(rows,false).length,0);
for(const m of h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.6.2.html',h);
fs.writeFileSync('jinsulmap/index.html',fs.readFileSync('jinsulmap/index.html','utf8').replaceAll('3.6.1','3.6.2'));
console.log('PASS screenshot room order, numeric building order, area association, original row preservation, incomplete data, inline syntax');
