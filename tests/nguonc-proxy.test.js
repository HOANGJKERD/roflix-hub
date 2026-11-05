const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/nguonc.js');

function makeRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},
    status(code){this.statusCode=code;return this;},
    json(value){this.body=value;return this;},
    send(value){this.body=value;return this;},
    end(){return this;}
  };
}
function response(status, body, headers={}) {
  const h=Object.assign({'content-type':'application/json; charset=utf-8'},headers);
  return {status,ok:status>=200&&status<300,headers:{get:n=>h[String(n).toLowerCase()]||null},text:async()=>body};
}
async function invoke(path, query={}) {
  const req={method:'GET',query:Object.assign({path},query)};
  const res=makeRes(); await handler(req,res); return res;
}
const originalFetch=global.fetch;
test.afterEach(()=>{global.fetch=originalFetch;});

test('NguonC list requests use the dedicated upstream, preserving page',async()=>{
  let target='';
  global.fetch=async url=>{target=String(url);return response(200,JSON.stringify({status:'success',items:[]}));};
  const res=await invoke('films/phim-moi-cap-nhat',{page:'2'});
  assert.equal(res.statusCode,200);
  assert.equal(target,'https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=2');
  assert.match(res.headers['cache-control'],/s-maxage=60/);
});

test('NguonC search forwards keyword safely',async()=>{
  let target='';
  global.fetch=async url=>{target=String(url);return response(200,JSON.stringify({status:'success',items:[]}));};
  await invoke('films/search',{keyword:'naruto'});
  assert.equal(target,'https://phim.nguonc.com/api/films/search?keyword=naruto');
});

test('invalid routes are rejected without calling upstream',async()=>{
  let calls=0;
  global.fetch=async()=>{calls++;throw new Error('must not call');};
  const res=await invoke('https://example.com/private');
  assert.equal(res.statusCode,400);
  assert.equal(calls,0);
  assert.equal(res.headers['cache-control'],'no-store');
});

test('upstream errors are not cached',async()=>{
  global.fetch=async()=>response(503,'unavailable',{'content-type':'text/plain'});
  const res=await invoke('film/example');
  assert.equal(res.statusCode,503);
  assert.equal(res.headers['cache-control'],'no-store');
});

test('upstream timeout is classified as 504',async()=>{
  global.fetch=async()=>{const error=new Error('aborted');error.name='AbortError';throw error;};
  const res=await invoke('film/example');
  assert.equal(res.statusCode,504);
  assert.equal(res.headers['cache-control'],'no-store');
});
