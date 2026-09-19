declare module 'get-youtube-transcript' {
  export type TranscriptSegment={start:number;duration:number;text:string};
  export type TranscriptResult={
    videoId:string;
    language:string;
    kind:string;
    segments:TranscriptSegment[];
    text:string;
  };
  export function getTranscript(videoIdOrUrl:string,opts?:{languages?:string[]}):Promise<TranscriptResult>;
}
