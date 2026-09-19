import {resolveProviderConnection} from '@/lib/connections';
import {failure,sameOrigin} from '@/lib/database';
import {buildCompletionBody,extractProviderChunk,providerPayloadFromStreamLine,takeCompleteLines} from '@/lib/generation';
import {providerError,providerUrl} from '@/lib/provider';
export const runtime='nodejs';

function jsonLine(value:unknown){return new TextEncoder().encode(JSON.stringify(value)+'\n');}

async function providerFailure(res:Response){
  const raw=await res.text();
  let data:any={};
  if(raw.trim())try{data=JSON.parse(raw);}catch{data={message:raw.slice(0,500)};}
  throw new Error(providerError(res.status,data));
}

export async function POST(r:Request){try{
  sameOrigin(r);
  const body=await r.json() as any;
  const{transcript,style,profile}=body;
  const{endpoint,key,model}=resolveProviderConnection(body);
  if(typeof transcript!=='string'||!transcript.trim()||transcript.length>120000)throw new Error('Use a transcript between 1 and 120,000 characters.');
  if(!model.trim()||!endpoint.trim())throw new Error('Set your provider URL and model in AI connection.');
  const requestBody=buildCompletionBody({model:model.trim(),transcript,style:typeof style==='string'&&style.trim()?style.trim():'Readable article',profile});
  const signal=AbortSignal.any([r.signal,AbortSignal.timeout(10*60*1000)]);
  const res=await fetch(providerUrl(endpoint,'chat/completions'),{method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json',Accept:'text/event-stream, application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(requestBody)});
  if(!res.ok)await providerFailure(res);
  if(!res.body)throw new Error('The provider returned no response body.');

  const contentType=res.headers.get('content-type')||'';
  if(!contentType.includes('text/event-stream')){
    const raw=await res.text();
    if(!raw.trim())throw new Error('The provider returned an empty response.');
    let data:any;
    try{data=JSON.parse(raw);}catch{throw new Error(`The provider returned non-JSON data (${res.status}).`);}
    const chunk=extractProviderChunk(data);
    if(!chunk.content.trim())throw new Error('The provider returned no article text.');
    const events=[...(chunk.reasoning?[{type:'reasoning',text:chunk.reasoning}]:[]),{type:'content',text:chunk.content},...(chunk.usage?[{type:'usage',data:chunk.usage}]:[]),{type:'done'}];
    return new Response(events.map(e=>JSON.stringify(e)).join('\n')+'\n',{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store'}});
  }

  let upstreamReader:ReadableStreamDefaultReader<Uint8Array>|null=null;
  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      upstreamReader=res.body!.getReader();
      const decoder=new TextDecoder();
      let buffer='';
      let sentDone=false;
      const emit=(value:unknown)=>controller.enqueue(jsonLine(value));
      const finish=()=>{if(!sentDone){sentDone=true;emit({type:'done'});}controller.close();};
      const handleLine=(line:string)=>{
        const event=providerPayloadFromStreamLine(line);
        if(!event)return;
        if(event.done){sentDone=true;emit({type:'done'});return;}
        const chunk=extractProviderChunk(event.payload);
        if(chunk.reasoning)emit({type:'reasoning',text:chunk.reasoning});
        if(chunk.content)emit({type:'content',text:chunk.content});
        if(chunk.usage)emit({type:'usage',data:chunk.usage});
      };
      try{
        while(true){
          const{done,value}=await upstreamReader.read();
          if(done)break;
          buffer+=decoder.decode(value,{stream:true});
          const framed=takeCompleteLines(buffer);buffer=framed.rest;for(const line of framed.lines)handleLine(line);
        }
        buffer+=decoder.decode();
        if(buffer.trim())handleLine(buffer);
        finish();
      }catch(error:any){
        if(r.signal.aborted){try{controller.close();}catch{}return;}
        try{emit({type:'error',message:error?.message||'The provider stream stopped unexpectedly.'});controller.close();}catch{}
      }
    },
    async cancel(){try{await upstreamReader?.cancel();}catch{}},
  });
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
}catch(e){return failure(e);}}
