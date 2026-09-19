import {database,failure,sameOrigin} from '@/lib/database';
export const runtime='nodejs';
export async function GET(){try{return Response.json((await database().prepare('SELECT name FROM collections ORDER BY name').all()).results);}catch(e){return failure(e);}}
export async function POST(r:Request){try{sameOrigin(r);const{name}=await r.json() as any;if(typeof name!=='string'||!name.trim()||name.length>100)throw new Error('Use a collection name of 1–100 characters.');await database().prepare('INSERT OR IGNORE INTO collections (name) VALUES (?)').bind(name.trim()).run();return Response.json({name:name.trim()});}catch(e){return failure(e);}}
