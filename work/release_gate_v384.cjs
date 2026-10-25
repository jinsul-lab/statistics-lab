const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const phase=process.argv[2];if(!['debug','functional'].includes(phase))throw Error('debug or functional required');
const specs=phase==='debug'?[
 ['work/test_patient_upgrade_v384.cjs'],['work/test_site_upgrade_v384.cjs'],['work/test_map_upgrade_v384.cjs'],
 ['work/test_address_recovery_v383.cjs'],['work/test_emr_geo_v382.cjs'],['work/test_emr_address_import_v382.cjs'],
 ['work/test_clinic_integration_v378.cjs'],['work/test_senior_current.cjs'],['work/test_banner_layout_v380.cjs']
]:[['work/test_interaction_v384.cjs'],['work/test_patient_upgrade_ui_v384.cjs'],['work/test_patient_current.cjs'],['work/test_analysis_v371.cjs'],['work/test_emr_address_ui_v382.cjs'],['work/test_site_upgrade_v384.cjs','--render']];
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync('jinsulmap/jinsulmap.html')).digest('hex'),sha=hash();
const record={version:'3.8.4',phase,sha256:sha,environment:'Local synthetic/offline browser fixtures; no real patient data; live API checked separately',runs:[]};
const file='work/release-v384-'+phase+'.json';
for(let round=1;round<=3;round++){
 const run={round,startedAt:new Date().toISOString(),checks:[]};record.runs.push(run);
 for(const args of specs){
  if(hash()!==sha)throw Error('HTML changed; restart checks');
  const result=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:3e6,timeout:120000});
  run.checks.push({script:args.join(' '),passed:result.status===0,output:result.stdout?.trim(),error:result.status===0?undefined:result.stderr?.trim()});
  fs.writeFileSync(file,JSON.stringify(record,null,2));
  if(result.status!==0)throw Error('Failed: '+args.join(' ')+' '+result.stderr);
 }
 if(hash()!==sha)throw Error('HTML changed; restart checks');
 run.finishedAt=new Date().toISOString();run.passed=true;fs.writeFileSync(file,JSON.stringify(record,null,2));console.log(phase+' '+round+'/3 PASS');
}
