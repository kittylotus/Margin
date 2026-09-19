export const ANNOTATION_COLORS=['sage','lavender','amber','rose','blue'] as const;
export type AnnotationColor=(typeof ANNOTATION_COLORS)[number];
export type AnnotationKind='highlight'|'note';
export type Annotation={
  id:string;
  articleId:string;
  kind:AnnotationKind;
  exactText:string;
  prefixText:string;
  suffixText:string;
  startOffset:number;
  endOffset:number;
  note:string;
  color:AnnotationColor;
  created:string;
  updated:string;
};

function commonPrefix(a:string,b:string){let i=0;const max=Math.min(a.length,b.length);while(i<max&&a[i]===b[i])i++;return i;}
function commonSuffix(a:string,b:string){let i=0;const max=Math.min(a.length,b.length);while(i<max&&a[a.length-1-i]===b[b.length-1-i])i++;return i;}

export function selectionContext(text:string,start:number,end:number,context=72){
  const safeStart=Math.max(0,Math.min(text.length,start));
  const safeEnd=Math.max(safeStart,Math.min(text.length,end));
  const selected=text.slice(safeStart,safeEnd);
  const leftTrim=selected.length-selected.trimStart().length;
  const rightTrim=selected.length-selected.trimEnd().length;
  const normalizedStart=Math.min(safeEnd,safeStart+leftTrim);
  const normalizedEnd=Math.max(normalizedStart,safeEnd-rightTrim);
  return{
    exactText:text.slice(normalizedStart,normalizedEnd),
    prefixText:text.slice(Math.max(0,normalizedStart-context),normalizedStart),
    suffixText:text.slice(normalizedEnd,Math.min(text.length,normalizedEnd+context)),
    startOffset:normalizedStart,
    endOffset:normalizedEnd,
  };
}

export function resolveAnnotationRange(text:string,annotation:Pick<Annotation,'exactText'|'prefixText'|'suffixText'|'startOffset'|'endOffset'>){
  const exact=annotation.exactText||'';
  if(!exact)return null;
  const start=Number(annotation.startOffset),end=Number(annotation.endOffset);
  const matches:number[]=[];let from=0;
  while(from<=text.length-exact.length){const index=text.indexOf(exact,from);if(index<0)break;matches.push(index);from=index+Math.max(1,exact.length);if(matches.length>100)break;}
  if(!matches.length)return null;
  if(matches.length===1)return{start:matches[0],end:matches[0]+exact.length};
  let best=matches[0],bestScore=-Infinity;
  for(const index of matches){
    const before=text.slice(Math.max(0,index-annotation.prefixText.length),index);
    const after=text.slice(index+exact.length,index+exact.length+annotation.suffixText.length);
    const score=commonSuffix(annotation.prefixText,before)*2+commonPrefix(annotation.suffixText,after)*2-Math.min(500,Math.abs(index-(Number.isFinite(start)?start:index)))/500;
    if(score>bestScore){best=index;bestScore=score;}
  }
  return{start:best,end:best+exact.length};
}

export function annotationColor(value:unknown):AnnotationColor{
  return typeof value==='string'&&(ANNOTATION_COLORS as readonly string[]).includes(value)?value as AnnotationColor:'sage';
}
