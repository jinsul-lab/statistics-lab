const fs=require('fs');let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.10.html','utf8').replaceAll('3.5.10','3.5.11');
if(!s.includes('function scanReportScores(result){'))throw Error('Missing anchor');
s=s.replace('function scanReportScores(result){',fs.readFileSync('work/registry_v3511.js','utf8')+'\nfunction scanReportScores(result){');
s=s.replace('(snap.facts||[]).slice(0,80)','(snap.facts||[]).slice(0,160)');
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.5.11.html',s);console.log('Generated v3.5.11');
