export type PoTokenSegment={start?:number;duration?:number;text?:string};
export type PoTokenTranscript={videoId?:string;language?:string;kind?:string;segments?:PoTokenSegment[];text?:string};

export function normalizePoTokenTranscript(value:unknown){
  if(!value||typeof value!=='object')throw new Error('PoToken transcript helper returned an invalid response.');
  const data=value as PoTokenTranscript;
  const segments=Array.isArray(data.segments)?data.segments
    .map(segment=>({
      start:Number(segment?.start||0),
      duration:Number(segment?.duration||0),
      text:String(segment?.text||'').replace(/\s+/g,' ').trim(),
    }))
    .filter(segment=>segment.text):[];
  const text=String(data.text||segments.map(segment=>segment.text).join('\n')).trim();
  if(!text)throw new Error('PoToken transcript helper returned no usable caption text.');
  return {text,language:String(data.language||''),kind:String(data.kind||''),segments};
}

export async function fetchPoTokenTranscript(videoId:string,languages:string[]){
  const {getTranscript}=await import('get-youtube-transcript');
  const result=await getTranscript(videoId,{languages});
  return normalizePoTokenTranscript(result);
}
