import {chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {createCipheriv, createDecipheriv, randomBytes, randomUUID} from 'node:crypto';
import {database} from '@/lib/database';

export type ConnectionProfile = {
  id: string;
  name: string;
  endpoint: string;
  model: string;
  hasKey: boolean;
  created: string;
  updated: string;
};

type ConnectionRow = {
  id: string;
  name: string;
  endpoint: string;
  model: string;
  secret: string;
  created: string;
  updated: string;
};

function configDirectory(){
  const configured=process.env.MARGIN_CONFIG_DIR?.trim();
  if(configured)return path.resolve(configured);
  if(process.platform==='win32')return path.join(process.env.LOCALAPPDATA||process.env.APPDATA||homedir(),'Margin');
  if(process.platform==='darwin')return path.join(homedir(),'Library','Application Support','Margin');
  return path.join(process.env.XDG_CONFIG_HOME||path.join(homedir(),'.config'),'margin');
}

export function secretKeyPath(){
  const configured=process.env.MARGIN_SECRET_KEY_PATH?.trim();
  return configured?path.resolve(configured):path.join(configDirectory(),'secrets.key');
}

function masterKey(){
  const env=process.env.MARGIN_SECRET_KEY?.trim();
  if(env){
    const raw=/^[0-9a-f]{64}$/i.test(env)?Buffer.from(env,'hex'):Buffer.from(env,'base64');
    if(raw.length!==32)throw new Error('MARGIN_SECRET_KEY must decode to exactly 32 bytes.');
    return raw;
  }
  const file=secretKeyPath();
  mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  if(!existsSync(file)){
    const fresh=randomBytes(32);
    try{writeFileSync(file,fresh,{mode:0o600,flag:'wx'});}catch(error:any){if(error?.code!=='EEXIST')throw error;}
  }
  try{chmodSync(file,0o600);}catch{}
  const raw=readFileSync(file);
  if(raw.length!==32)throw new Error(`Margin secret key at ${file} is invalid.`);
  return raw;
}

export function encryptSecret(value:string){
  if(!value)return '';
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',masterKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return ['v1',iv.toString('base64url'),tag.toString('base64url'),ciphertext.toString('base64url')].join('.');
}

export function decryptSecret(value:string){
  if(!value)return '';
  const [version,ivRaw,tagRaw,cipherRaw]=value.split('.');
  if(version!=='v1'||!ivRaw||!tagRaw||!cipherRaw)throw new Error('Stored connection secret has an unsupported format.');
  try{
    const decipher=createDecipheriv('aes-256-gcm',masterKey(),Buffer.from(ivRaw,'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw,'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(cipherRaw,'base64url')),decipher.final()]).toString('utf8');
  }catch{throw new Error('This saved API key cannot be decrypted on this machine. Re-enter the key and save the connection again.');}
}

function rowToProfile(row:ConnectionRow):ConnectionProfile{
  return {id:row.id,name:row.name,endpoint:row.endpoint,model:row.model,hasKey:!!row.secret,created:row.created,updated:row.updated};
}

export function listConnections():ConnectionProfile[]{
  const rows=database().prepare('SELECT id,name,endpoint,model,secret,created,updated FROM connection_profiles ORDER BY updated DESC').all().results as unknown as ConnectionRow[];
  return rows.map(rowToProfile);
}

export function getConnection(id:string){
  const rows=database().prepare('SELECT id,name,endpoint,model,secret,created,updated FROM connection_profiles WHERE id=?').bind(id).all().results as unknown as ConnectionRow[];
  return rows[0]||null;
}

function cleanName(name:unknown,endpoint:string,model:string){
  if(typeof name==='string'&&name.trim())return name.trim().slice(0,80);
  try{return new URL(endpoint).host+(model?` · ${model}`:'');}catch{return model||'AI connection';}
}

export function saveConnection(input:{id?:unknown;name?:unknown;endpoint?:unknown;model?:unknown;key?:unknown}){
  const endpoint=typeof input.endpoint==='string'?input.endpoint.trim():'';
  const model=typeof input.model==='string'?input.model.trim():'';
  if(!/^https?:\/\//i.test(endpoint))throw new Error('Use an http:// or https:// provider URL.');
  const requestedId=typeof input.id==='string'&&input.id.trim()?input.id.trim():'';
  const existing=requestedId?getConnection(requestedId):null;
  const id=existing?.id||randomUUID();
  const now=new Date().toISOString();
  const name=cleanName(input.name,endpoint,model);
  const normalized=(value:string)=>value.trim().replace(/\/+$/,'');
  const endpointChanged=!!existing&&normalized(existing.endpoint)!==normalized(endpoint);
  let secret=endpointChanged?'':existing?.secret||'';
  if(typeof input.key==='string'&&input.key.length)secret=encryptSecret(input.key);
  database().prepare(`INSERT INTO connection_profiles (id,name,endpoint,model,secret,created,updated)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,endpoint=excluded.endpoint,model=excluded.model,secret=excluded.secret,updated=excluded.updated`)
    .bind(id,name,endpoint,model,secret,existing?.created||now,now).run();
  const saved=getConnection(id);
  if(!saved)throw new Error('Connection profile could not be saved.');
  return rowToProfile(saved);
}

export function deleteConnection(id:string){
  database().prepare('DELETE FROM connection_profiles WHERE id=?').bind(id).run();
}

export function resolveProviderConnection(input:{connectionId?:unknown;endpoint?:unknown;model?:unknown;key?:unknown}){
  const connectionId=typeof input.connectionId==='string'?input.connectionId.trim():'';
  const saved=connectionId?getConnection(connectionId):null;
  const endpoint=typeof input.endpoint==='string'&&input.endpoint.trim()?input.endpoint.trim():saved?.endpoint||'';
  const model=typeof input.model==='string'&&input.model.trim()?input.model.trim():saved?.model||'';
  const transientKey=typeof input.key==='string'&&input.key.length?input.key:'';
  const sameSavedEndpoint=!!saved&&saved.endpoint.trim().replace(/\/+$/,'')===endpoint.trim().replace(/\/+$/,'');
  const key=transientKey||(sameSavedEndpoint&&saved?.secret?decryptSecret(saved.secret):'');
  return {endpoint,model,key,connectionId:saved?.id||''};
}
