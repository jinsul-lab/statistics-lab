const fs=require('fs'),vm=require('vm'),a=require('assert/strict');const source=fs.readFileSync('work/ux_v364.js','utf8');let timer,requests=0;
const elements={btnRunAI:{after:x=>{elements[x.id]=x}}};
const c=vm.createContext({AbortController,TypeError,Error,setTimeout:f=>{timer=f;return 1},clearTimeout:()=>{},$:id=>elements[id],document:{createElement:()=>({})},runAI:async()=>{requests++;await new Promise(r=>{c.release=r})}});
vm.runInContext(source.slice(0,source.indexOf('function mapUXInstall')),c);
(async()=>{
 a.match(c.aiFriendlyError(429,'You have no credits remaining'),/잔액/);a.match(c.aiFriendlyError(401,''),/인증/);a.match(c.aiFriendlyError(403,''),/접근/);a.match(c.aiFriendlyError(500,''),/일시/);
 c.fetch=async()=>({ok:true,text:async()=>'{"ok":true}'});a.equal((await c.proxyCallJSON('https://example.test',{})).ok,true);
 c.fetch=async()=>({ok:false,status:429,text:async()=>'{"error":{"message":"prepayment credits depleted"}}'});await a.rejects(c.proxyCallJSON('https://example.test',{}),/잔액/);
 c.fetch=(_,o)=>new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Error('abort'))));const pending=c.proxyCallJSON('https://example.test',{});timer();await a.rejects(pending,/45초/);
 const run=c.runAI();await c.runAI();a.equal(requests,1);a.equal(elements.btnRunAI.disabled,true);elements.btnCancelAI.onclick();c.release();await run;a.equal(elements.btnRunAI.disabled,false);a.equal(elements.btnCancelAI.hidden,true);
 const clear=source.slice(source.indexOf("$('btnClearTools').onclick="),source.indexOf("$('mapShapeDelete').onclick="));a.ok(!/scanClear|routeLines|targetMarkers/.test(clear));a.ok(source.includes("on&&['btnRadius'"));a.ok(source.includes("e.key==='Escape'"));a.ok(source.includes("shapes()[Number(value)]?.remove()"));
 console.log('PASS 15 AI/toolbar checks: errors, success, timeout, duplicate prevention, cancellation controls, deletion scope, toggle, Esc, individual deletion');
})();
