const ORIGIN='https://api.mangadex.org';
module.exports=async function(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Only GET is supported'});
  const id=String(req.query.id||'');
  if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({error:'Invalid chapter id'});
  try{const r=await fetch(ORIGIN+'/at-home/server/'+id,{headers:{Accept:'application/json','User-Agent':'RoHub-MangaDex-Proxy/1.0'}});
  const body=await r.text();res.setHeader('Content-Type',r.headers.get('content-type')||'application/json');res.setHeader('Cache-Control',r.ok?'public, s-maxage=30':'no-store');return res.status(r.status).send(body)}
  catch(e){return res.status(502).json({error:'Could not reach MangaDex API'})}
};