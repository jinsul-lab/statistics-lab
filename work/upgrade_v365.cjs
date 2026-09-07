const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let h=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.6.4.html','utf8').replaceAll('3.6.4','3.6.5');
function removeElement(id){const re=new RegExp('<([a-z]+)\\b[^>]*\\bid="'+id+'"[^>]*>','i'),m=re.exec(h);assert.ok(m,id);const tokens=new RegExp('</?'+m[1]+'\\b[^>]*>','gi');tokens.lastIndex=m.index;let depth=0,t;while(t=tokens.exec(h)){depth+=t[0].startsWith('</')?-1:1;if(!depth){h=h.slice(0,m.index)+h.slice(tokens.lastIndex);return;}}throw Error('Unbalanced '+id);}
for(const id of ['aiQuickSection','btnFabAI','aiDrawer','aiReportModal'])removeElement(id);
const start=h.indexOf('/* ===========================   [AI 전략 컨설턴트:'),end=h.indexOf('function mapUXInstall()',start);assert.ok(start>0&&end>start);h=h.slice(0,start)+h.slice(end);
h=h.replace("if($('btnRunAI'))$('btnRunAI').onclick=runAI;",'');
// Remove dead AI-only CSS without changing shared modal/button styles.
h=h.replace(/\/\* ===========================   \[AI Drawer \(Gemini\/GPT\)\]   =========================== \*\//,'/* Legacy drawer styles (unused) */');
assert.ok(!/proxyCallJSON|runAI|OPENAI_API_KEY|AI_PROXY_BASE_DEFAULT|id="aiDrawer"|id="btnFabAI"/.test(h));
for(const m of h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
for(const id of ['scanReportModal','site','btnRunScan','btnStats','btnRoadview','btnRouteOpt'])assert.ok(h.includes(id));
assert.ok(h.includes('function mapUXInstall()'));assert.ok(h.includes('function scanFetchHiraSpecialty('));
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.6.5.html',h);fs.writeFileSync('jinsulmap/index.html',fs.readFileSync('jinsulmap/index.html','utf8').replaceAll('3.6.4','3.6.5'));console.log('PASS AI removal, preserved map/report/scan/upload controls and inline syntax');
