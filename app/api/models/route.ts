import {resolveProviderConnection} from '@/lib/connections';
import {failure,sameOrigin} from '@/lib/database';
import {providerError,providerUrl,readJsonResponse} from '@/lib/provider';
export const runtime='nodejs';
export async function POST(r:Request){try{
  sameOrigin(r);
  const body=await r.json() as any;
  const{endpoint,key}=resolveProviderConnection(body);
  const res=await fetch(providerUrl(endpoint,'models'),{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json',...(key?{Authorization:'Bearer '+key}:{})}});
  const data=await readJsonResponse(res,'The model endpoint');
  if(!res.ok)throw new Error(providerError(res.status,data));
  const rows=Array.isArray(data?.data)?data.data:Array.isArray(data?.models)?data.models:Array.isArray(data)?data:[];
  const ids:string[]=rows.map((x:any)=>typeof x==='string'?x:x?.id||x?.name||x?.model).filter((x:any):x is string=>typeof x==='string'&&!!x.trim()).map((x:string)=>x.trim());
  const models=Array.from(new Set<string>(ids)).sort((a,b)=>a.localeCompare(b));
  if(!models.length)throw new Error('The provider returned no model IDs from /models. You can still type a model ID manually.');
  return Response.json({models});
}catch(e){return failure(e);}}
