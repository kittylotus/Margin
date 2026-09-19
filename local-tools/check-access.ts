import assert from 'node:assert/strict';
import { ACCESS_COOKIE, accessRequired, sessionValueForCode, validAccessSession, verifyAccessCode } from '../lib/access.ts';

const previousRequired = process.env.MARGIN_REQUIRE_AUTH;
const previousCode = process.env.MARGIN_ACCESS_CODE;

try {
  process.env.MARGIN_REQUIRE_AUTH = '1';
  process.env.MARGIN_ACCESS_CODE = 'ABCD-EFGH-IJKL-MNOP';
  assert.equal(ACCESS_COOKIE, 'margin_access');
  assert.equal(accessRequired(), true);
  assert.equal(await verifyAccessCode('ABCD-EFGH-IJKL-MNOP'), true);
  assert.equal(await verifyAccessCode('WRONG-CODE'), false);
  const session = await sessionValueForCode('ABCD-EFGH-IJKL-MNOP');
  assert.equal(await validAccessSession(session), true);
  assert.equal(await validAccessSession('not-the-session'), false);
  process.env.MARGIN_REQUIRE_AUTH = '0';
  assert.equal(await validAccessSession(null), true);
  console.log('✓ remote access gate');
} finally {
  if (previousRequired === undefined) delete process.env.MARGIN_REQUIRE_AUTH; else process.env.MARGIN_REQUIRE_AUTH = previousRequired;
  if (previousCode === undefined) delete process.env.MARGIN_ACCESS_CODE; else process.env.MARGIN_ACCESS_CODE = previousCode;
}
