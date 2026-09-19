import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {database,sameOrigin} from '../lib/database.ts';
import {providerUrl} from '../lib/provider.ts';
import {captionTextFromPayload,captionTrackNeedsPoToken,extractCaptionTracks,youtubeVideoId} from '../lib/youtube.ts';
import {normalizePoTokenTranscript} from '../lib/youtube-pot.ts';
import {buildCompletionBody,extractProviderChunk,parseExtraParams,providerPayloadFromStreamLine,takeCompleteLines} from '../lib/generation.ts';
import {annotationColor,resolveAnnotationRange,selectionContext} from '../lib/annotations.ts';

assert.equal(youtubeVideoId('https://youtu.be/abcdefghijk?t=42'),'abcdefghijk');
assert.equal(youtubeVideoId('https://www.youtube.com/watch?v=abcdefghijk'),'abcdefghijk');
assert.equal(youtubeVideoId('https://www.youtube.com/shorts/abcdefghijk'),'abcdefghijk');
assert.throws(()=>youtubeVideoId('https://example.com/watch?v=abcdefghijk'),/YouTube/);

const mockHtml='prefix "captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc\\u0026x=%5Bok%5D","languageCode":"en"},{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc2","languageCode":"es"}] suffix';
const tracks=extractCaptionTracks(mockHtml);
assert.equal(tracks.length,2);
assert.equal(tracks[0]?.languageCode,'en');
assert.match(tracks[0]?.baseUrl||'',/timedtext/);

assert.equal(captionTrackNeedsPoToken('https://www.youtube.com/api/timedtext?v=abc&exp=xpe'),true);
assert.equal(captionTrackNeedsPoToken('https://www.youtube.com/api/timedtext?v=abc&exp=foo,xpe'),true);
assert.equal(captionTrackNeedsPoToken('https://www.youtube.com/api/timedtext?v=abc&expire=123'),false);

const potMock=normalizePoTokenTranscript({language:'en',kind:'auto-generated',segments:[{start:0,duration:1.5,text:'Hello   world'},{start:1.5,duration:2,text:'Second line'}]});
assert.equal(potMock.text,'Hello world\nSecond line');
assert.equal(potMock.language,'en');
assert.equal(potMock.segments.length,2);
assert.throws(()=>normalizePoTokenTranscript({segments:[]}),/no usable caption text/);

assert.equal(captionTextFromPayload(JSON.stringify({events:[{segs:[{utf8:'Hello '},{utf8:'world'}]},{segs:[{utf8:'Next line'}]}]})),'Hello world\nNext line');
assert.equal(captionTextFromPayload('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello world\n\n00:00:01.000 --> 00:00:02.000\nNext line'),'Hello world\nNext line');
assert.equal(captionTextFromPayload('<?xml version="1.0"?><transcript><text start="0">Hello &amp; hi</text><text start="1">Next &lt;line&gt;</text></transcript>'),'Hello & hi\nNext <line>');
assert.equal(captionTextFromPayload(''),'');


const completion=buildCompletionBody({model:'local-model',transcript:'hello',style:'Readable article',profile:{temperature:'0.7',topP:'0.9',maxTokens:'2048',topK:'40',minP:'0.05',reasoningEffort:'high',extras:'{"custom_sampler":true}'}});
assert.equal(completion.model,'local-model');
assert.equal(completion.stream,true);
assert.equal(completion.temperature,0.7);
assert.equal(completion.top_p,0.9);
assert.equal(completion.max_tokens,2048);
assert.equal(completion.top_k,40);
assert.equal(completion.min_p,0.05);
assert.equal(completion.reasoning_effort,'high');
assert.equal(completion.custom_sampler,true);
assert.throws(()=>parseExtraParams('{"model":"nope"}'),/cannot override/);
assert.throws(()=>parseExtraParams('{wat'),/valid JSON/);
const delta=extractProviderChunk({choices:[{delta:{reasoning_content:'thinking ',content:'draft '}}],usage:{completion_tokens:2}});
assert.equal(delta.reasoning,'thinking ');
assert.equal(delta.content,'draft ');
assert.equal((delta.usage as any).completion_tokens,2);
const finalChunk=extractProviderChunk({choices:[{message:{analysis:'hidden-ish',content:[{type:'text',text:'final text'}]},finish_reason:'stop'}]});
assert.equal(finalChunk.reasoning,'hidden-ish');
assert.equal(finalChunk.content,'final text');
assert.equal(finalChunk.finishReason,'stop');
const firstFrame=takeCompleteLines('{"type":"content","text":"hel');
assert.deepEqual(firstFrame.lines,[]);
const secondFrame=takeCompleteLines(firstFrame.rest+'lo"}\n{"type":"done"}\npar');
assert.deepEqual(secondFrame.lines,['{"type":"content","text":"hello"}','{"type":"done"}']);
assert.equal(secondFrame.rest,'par');
assert.equal(providerPayloadFromStreamLine('data: [DONE]')?.done,true);
assert.equal(providerPayloadFromStreamLine('data: {"choices":[]}')?.payload?.choices?.length,0);
assert.equal(providerPayloadFromStreamLine('{"choices":[]}')?.payload?.choices?.length,0);

assert.equal(providerUrl('http://127.0.0.1:1234/v1/','models'),'http://127.0.0.1:1234/v1/models');
assert.equal(providerUrl('https://api.openai.com/v1','chat/completions'),'https://api.openai.com/v1/chat/completions');
assert.throws(()=>providerUrl('ftp://example.com/v1','models'),/HTTP or HTTPS/);

const loopbackRequest=new Request('http://127.0.0.1:3000/api/captions',{headers:{origin:'http://localhost:3000',host:'localhost:3000'}});
assert.doesNotThrow(()=>sameOrigin(loopbackRequest));
const forwardedRequest=new Request('http://127.0.0.1:3000/api/models',{headers:{origin:'http://mica:3000','x-forwarded-host':'mica:3000'}});
assert.doesNotThrow(()=>sameOrigin(forwardedRequest));
const hostileRequest=new Request('http://127.0.0.1:3000/api/models',{headers:{origin:'https://evil.example',host:'localhost:3000'}});
assert.throws(()=>sameOrigin(hostileRequest),/origin is not allowed/);

const articleColors=['#6674FF','#9B88C5','#B58A46','#4D91B5','#5AA889','#C66B7A','#8396A5','#D17854'];
assert.equal(articleColors.every(value=>/^#[0-9A-F]{6}$/.test(value)),true);
const selectedArticles=new Set(['a','b','c']);
selectedArticles.delete('b');
assert.deepEqual([...selectedArticles],['a','c']);

const sourceText='The first thought lives here. The repeated idea matters. Later, the repeated idea matters again.';
const selectedStart=sourceText.indexOf('The repeated idea matters.');
const selected=selectionContext(sourceText,selectedStart,selectedStart+'The repeated idea matters.'.length,18);
assert.equal(selected.exactText,'The repeated idea matters.');
const shifted='Intro added. '+sourceText;
const shiftedRange=resolveAnnotationRange(shifted,{...selected,startOffset:selected.startOffset,endOffset:selected.endOffset});
assert.equal(shiftedRange?.start,selected.startOffset+13);
const duplicateSource='Alpha repeated idea. Middle. Alpha repeated idea. Tail.';
const secondStart=duplicateSource.lastIndexOf('Alpha repeated idea.');
const duplicateContext=selectionContext(duplicateSource,secondStart,secondStart+'Alpha repeated idea.'.length,12);
assert.equal(resolveAnnotationRange(duplicateSource,{...duplicateContext,startOffset:0,endOffset:20})?.start,secondStart);
assert.equal(annotationColor('rose'),'rose');
assert.equal(annotationColor('radioactive'),'sage');

const libraryDir=mkdtempSync(path.join(tmpdir(),'margin-library-contract-'));
const libraryPath=path.join(libraryDir,'legacy.sqlite');
const legacyDb=new DatabaseSync(libraryPath);
legacyDb.exec(`CREATE TABLE articles (id TEXT PRIMARY KEY,title TEXT NOT NULL,content TEXT NOT NULL,transcript TEXT NOT NULL DEFAULT '',url TEXT NOT NULL DEFAULT '',collection TEXT NOT NULL DEFAULT 'Inbox',tags TEXT NOT NULL DEFAULT '',favorite INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL); CREATE TABLE collections (name TEXT PRIMARY KEY);`);
legacyDb.close();
process.env.MARGIN_DB_PATH=libraryPath;
const migratedDb=database();
const columns=migratedDb.prepare('PRAGMA table_info(articles)').all().results.map(row=>String(row.name));
assert.equal(columns.includes('headerColor'),true);
const annotationTables=migratedDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='annotations'").all().results;
assert.equal(annotationTables.length,1);
migratedDb.prepare('INSERT INTO articles (id,title,content,created,headerColor) VALUES (?,?,?,?,?)').bind('one','One','Body',new Date(0).toISOString(),'#6674FF').run();
migratedDb.prepare('UPDATE articles SET collection=? WHERE id=?').bind('Psychology','one').run();
const moved=migratedDb.prepare('SELECT collection,headerColor FROM articles WHERE id=?').bind('one').all().results[0];
assert.equal(moved?.collection,'Psychology');
assert.equal(moved?.headerColor,'#6674FF');
migratedDb.prepare('INSERT INTO annotations (id,articleId,kind,exactText,prefixText,suffixText,startOffset,endOffset,note,color,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind('ann-one','one','highlight','Body','','',0,4,'remember this','amber',new Date(0).toISOString(),new Date(0).toISOString()).run();
assert.equal(migratedDb.prepare('SELECT note FROM annotations WHERE articleId=?').bind('one').all().results[0]?.note,'remember this');
migratedDb.prepare('DELETE FROM articles WHERE id=?').bind('one').run();
assert.equal(migratedDb.prepare('SELECT id FROM annotations WHERE articleId=?').bind('one').all().results.length,0);

console.log('Margin API contracts OK: origin checks, provider URLs, streaming generation payloads/deltas, YouTube captions, annotation anchoring, SQLite annotation migration/cascade, and library metadata.');
