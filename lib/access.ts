export const ACCESS_COOKIE = 'margin_access';
export const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function accessRequired() {
  return process.env.MARGIN_REQUIRE_AUTH === '1';
}

export function configuredAccessCode() {
  return process.env.MARGIN_ACCESS_CODE?.trim() || '';
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sessionValueForCode(code: string) {
  return sha256(`margin-access-session-v1:${code.trim()}`);
}

export async function verifyAccessCode(candidate: string) {
  const expected = configuredAccessCode();
  if (!expected || !candidate.trim()) return false;
  const [candidateHash, expectedHash] = await Promise.all([
    sha256(`margin-access-code-v1:${candidate.trim()}`),
    sha256(`margin-access-code-v1:${expected}`),
  ]);
  return candidateHash === expectedHash;
}

export async function validAccessSession(cookieValue?: string | null) {
  if (!accessRequired()) return true;
  const code = configuredAccessCode();
  if (!code || !cookieValue) return false;
  return cookieValue === await sessionValueForCode(code);
}
