import {deleteConnection,listConnections,saveConnection} from '@/lib/connections';
import {failure,sameOrigin} from '@/lib/database';
export const runtime='nodejs';

export async function GET(){
  try{return Response.json({connections:listConnections()});}
  catch(error){return failure(error);}
}

export async function POST(r:Request){
  try{sameOrigin(r);const body=await r.json();return Response.json({connection:saveConnection(body as any)});}
  catch(error){return failure(error);}
}

export async function DELETE(r:Request){
  try{sameOrigin(r);const{id}=await r.json() as any;if(typeof id!=='string'||!id.trim())throw new Error('Choose a connection profile to delete.');deleteConnection(id.trim());return Response.json({ok:true});}
  catch(error){return failure(error);}
}
