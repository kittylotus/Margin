export type CaptionTrack={baseUrl:string;languageCode?:string;name?:{simpleText?:string};kind?:string};

export function youtubeVideoId(input:string){
  const u=new URL(input);
  const host=u.hostname.toLowerCase();
  if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host))throw new Error('Enter a YouTube video URL.');
  let id='';
  if(host==='youtu.be')id=u.pathname.split('/').filter(Boolean)[0]||'';
  else if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
  else{
    const parts=u.pathname.split('/').filter(Boolean);
    if(['shorts','embed','live'].includes(parts[0]||''))id=parts[1]||'';
    else id=u.searchParams.get('v')||parts[1]||'';
  }
  if(!/^[-\w]{11}$/.test(id))throw new Error('That YouTube link does not contain a valid video ID.');
  return id;
}

export function extractCaptionTracks(html:string):CaptionTrack[]{
  const marker='"captionTracks":';
  const markerAt=html.indexOf(marker);
  if(markerAt<0)return [];
  const start=html.indexOf('[',markerAt+marker.length);
  if(start<0)return [];
  let depth=0,inString=false,escaped=false;
  for(let i=start;i<html.length;i++){
    const ch=html[i];
    if(inString){
      if(escaped)escaped=false;
      else if(ch==='\\')escaped=true;
      else if(ch==='"')inString=false;
      continue;
    }
    if(ch==='"'){inString=true;continue;}
    if(ch==='[')depth++;
    else if(ch===']'){
      depth--;
      if(depth===0){
        try{
          const value=JSON.parse(html.slice(start,i+1));
          return Array.isArray(value)?value:[];
        }catch{return [];}
      }
    }
  }
  return [];
}

function decodeEntities(value:string){
  return value
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(parseInt(n,10)))
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}

function cleanLine(value:string){return decodeEntities(value.replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();}

function collapse(lines:string[]){
  const out:string[]=[];
  for(const line of lines.map(cleanLine).filter(Boolean))if(out[out.length-1]!==line)out.push(line);
  return out.join('\n').trim();
}

function fromJson(raw:string){
  const data=JSON.parse(raw) as any;
  return collapse((data.events||[]).map((e:any)=>(e.segs||[]).map((s:any)=>s.utf8||'').join('')));
}

function fromVtt(raw:string){
  const lines=raw.replace(/^\uFEFF/,'').split(/\r?\n/);
  return collapse(lines.filter(line=>{
    const t=line.trim();
    return t&&t!=='WEBVTT'&&!/^\d+$/.test(t)&&!/^NOTE\b/.test(t)&&!/^STYLE\b/.test(t)&&!/^REGION\b/.test(t)&&!/^\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}\s+-->/.test(t);
  }));
}

function fromXml(raw:string){
  const matches=[...raw.matchAll(/<(?:text|p)\b[^>]*>([\s\S]*?)<\/(?:text|p)>/gi)];
  return collapse(matches.map(m=>m[1]||''));
}


export function captionTrackNeedsPoToken(baseUrl:string){
  try{
    const u=new URL(baseUrl);
    const exp=(u.searchParams.get('exp')||'').split(',').map(v=>v.trim().toLowerCase());
    return exp.includes('xpe');
  }catch{return false;}
}

export function captionTextFromPayload(raw:string){
  const text=raw.trim();
  if(!text)return '';
  if(text.startsWith('{')){try{return fromJson(text);}catch{}}
  if(/^WEBVTT\b/.test(text)||text.includes('-->'))return fromVtt(text);
  if(/<(?:text|p)\b/i.test(text))return fromXml(text);
  return '';
}
