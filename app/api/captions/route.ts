import {failure,sameOrigin} from '@/lib/database';
import {captionTextFromPayload,captionTrackNeedsPoToken,extractCaptionTracks,youtubeVideoId} from '@/lib/youtube';
import {fetchPoTokenTranscript} from '@/lib/youtube-pot';
export const runtime='nodejs';

const headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36','Accept-Language':'en-US,en;q=0.9'};

async function fetchCaptionText(baseUrl:string){
  const original=new URL(baseUrl);
  if(original.protocol!=='https:'||!['www.youtube.com','youtube.com'].includes(original.hostname))throw new Error('Unsupported caption source.');
  const candidates:URL[]=[];
  for(const fmt of ['json3','vtt','']){
    const u=new URL(original);
    if(fmt)u.searchParams.set('fmt',fmt);else u.searchParams.delete('fmt');
    candidates.push(u);
  }
  let lastStatus=0;
  for(const u of candidates){
    const res=await fetch(u,{signal:AbortSignal.timeout(15000),headers,redirect:'follow'});
    lastStatus=res.status;
    if(!res.ok)continue;
    const raw=await res.text();
    const text=captionTextFromPayload(raw);
    if(text)return text;
  }
  throw new Error(lastStatus?`YouTube timed-text returned no usable caption body (${lastStatus}).`:'YouTube timed-text returned no usable caption body.');
}

async function videoTitle(id:string){
  let title='YouTube article';
  try{
    const meta=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+id),{headers,signal:AbortSignal.timeout(8000)});
    if(meta.ok){const raw=await meta.text();if(raw.trim())title=JSON.parse(raw).title||title;}
  }catch{}
  return title;
}

function languagePreferences(requested:string,trackLanguage?:string){
  const values=[requested,requested.split('-')[0],trackLanguage||''].map(v=>String(v||'').trim()).filter(Boolean);
  return [...new Set(values)];
}

export async function POST(r:Request){try{
  sameOrigin(r);
  const{url,language='en'}=await r.json() as any;
  const id=youtubeVideoId(url);
  const page=await fetch('https://www.youtube.com/watch?v='+id,{signal:AbortSignal.timeout(15000),headers,redirect:'follow'});
  if(!page.ok)throw new Error(`YouTube returned ${page.status} while loading the video page.`);
  const html=await page.text();
  const tracks=extractCaptionTracks(html);
  if(!tracks.length)throw new Error('YouTube did not expose a caption track for this video request.');
  const wanted=String(language||'en').toLowerCase();
  const track=tracks.find(t=>String(t.languageCode||'').toLowerCase()===wanted)||tracks.find(t=>String(t.languageCode||'').toLowerCase().startsWith(wanted.split('-')[0]))||tracks[0];
  const title=await videoTitle(id);

  let directError:unknown;
  if(!captionTrackNeedsPoToken(track.baseUrl)){
    try{
      const text=await fetchCaptionText(track.baseUrl);
      return Response.json({text,title,language:track.languageCode||language,url:'https://www.youtube.com/watch?v='+id,source:'timedtext'});
    }catch(error){directError=error;}
  }

  try{
    const transcript=await fetchPoTokenTranscript(id,languagePreferences(wanted,track.languageCode));
    return Response.json({text:transcript.text,title,language:transcript.language||track.languageCode||language,url:'https://www.youtube.com/watch?v='+id,source:'potoken'});
  }catch(error){
    const details=error instanceof Error?error.message:String(error);
    const direct=directError instanceof Error?` Direct caption fetch also failed: ${directError.message}`:'';
    throw new Error(`YouTube protected this transcript with its browser proof token and the local PoToken fallback failed: ${details}.${direct}`);
  }
}catch(e){return failure(e);}}
