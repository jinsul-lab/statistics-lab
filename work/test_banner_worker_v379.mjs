import assert from 'node:assert/strict';import worker from '../workers/banner/worker.mjs';
const original=globalThis.fetch,env={BANNER_API_KEY:'synthetic-secret'},req=(path,origin='https://jinsul-lab.github.io',method='GET')=>new Request('https://test.local'+path,{method,headers:{Origin:origin}});
let checks=0;async function check(request,status){const r=await worker.fetch(request,env);assert.equal(r.status,status);checks++;return r;}
await check(req('/banner','https://invalid.example'),403);await check(req('/banner?page=0'),400);await check(req('/banner?page=101'),400);await check(req('/banner?url=http://example.com'),400);await check(req('/banner','https://jinsul-lab.github.io','POST'),405);await check(req('/banner','https://jinsul-lab.github.io','OPTIONS'),204);
globalThis.fetch=async u=>{assert.equal(u.hostname,'api.data.go.kr');assert.equal(u.searchParams.get('pageNo'),'2');assert.equal(u.searchParams.get('serviceKey'),'synthetic-secret');return Response.json({header:{resultCode:'00'},body:{totalCount:1,items:{item:[{bbsNm:'synthetic-secret'}]}}});};
const ok=await check(req('/banner?page=2'),200);assert.equal(ok.headers.get('Access-Control-Allow-Origin'),'https://jinsul-lab.github.io');assert(!(await ok.text()).includes('synthetic-secret'));checks+=2;
globalThis.fetch=async()=>Response.json({header:{resultCode:'30'}});await check(req('/banner'),502);
globalThis.fetch=async()=>{throw Error('timeout')};await check(req('/banner'),504);
const missing=await worker.fetch(req('/banner'),{});assert.equal(missing.status,503);checks++;
globalThis.fetch=original;console.log(JSON.stringify({ok:true,checks,liveApi:false}));
