export function providerUrl(base:string,path:string){
  const raw=String(base||'').trim();
  if(!raw)throw new Error('Set your provider base URL first.');
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('Use a valid HTTP or HTTPS provider URL without embedded credentials.');
  u.hash='';
  u.search='';
  const clean=u.href.replace(/\/+$/,'');
  return clean+'/'+path.replace(/^\/+/, '');
}

export async function readJsonResponse(res:Response,label:string){
  const raw=await res.text();
  if(!raw.trim())throw new Error(`${label} returned an empty response.`);
  try{return JSON.parse(raw) as any;}catch{
    throw new Error(`${label} returned non-JSON data (${res.status}).`);
  }
}

export function providerError(status:number,data:any,fallback='Check the API key, model, and base URL.'){
  const detail=data?.error?.message||data?.message||data?.error;
  return `Provider returned ${status}${typeof detail==='string'&&detail.trim()?`: ${detail.trim()}`:`. ${fallback}`}`;
}
