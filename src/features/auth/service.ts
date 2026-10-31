import 'server-only';

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import type { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { authAttempts, authSessions, pairInvites } from '@/db/schema';
import { installationSecret } from '@/lib/security/crypto';

export type Role = 'owner' | 'viewer';
export const cookieName = 'mosa_session';
const sessionSeconds = 14 * 24 * 60 * 60;
const inviteSeconds = 2 * 60;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
function sessionVersion() {
  return createHmac('sha256', installationSecret())
    .update(process.env.MOSA_ADMIN_PASSWORD || '')
    .digest('hex')
    .slice(0, 24);
}

export function authEnabled() {
  return !!process.env.MOSA_ADMIN_PASSWORD;
}
export function authConfigured() {
  return !authEnabled() || (process.env.MOSA_ADMIN_PASSWORD?.length ?? 0) >= 16;
}
export function publicOrigin() {
  const value = process.env.MOSA_PUBLIC_ORIGIN;
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
export function roleFor(tokenValue?: string): Role | null {
  if (!tokenValue || !/^[A-Za-z0-9_-]{43}$/.test(tokenValue)) {
    return null;
  }
  const session = db
    .select()
    .from(authSessions)
    .where(
      and(eq(authSessions.tokenHash, hash(tokenValue)), gt(authSessions.expiresAt, new Date())),
    )
    .get();
  return session?.role === `owner:${sessionVersion()}`
    ? 'owner'
    : session?.role === `viewer:${sessionVersion()}`
      ? 'viewer'
      : null;
}
export function roleForRequest(request: NextRequest) {
  return roleFor(request.cookies.get(cookieName)?.value);
}
export function issueSession(response: NextResponse, request: NextRequest, role: Role) {
  const value = token();
  const now = new Date();
  db.delete(authSessions).where(lt(authSessions.expiresAt, now)).run();
  db.insert(authSessions)
    .values({
      tokenHash: hash(value),
      role: `${role}:${sessionVersion()}`,
      createdAt: now,
      expiresAt: new Date(now.getTime() + sessionSeconds * 1000),
    })
    .run();
  response.cookies.set(cookieName, value, {
    httpOnly: true,
    secure:
      role === 'viewer' ||
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https',
    sameSite: 'strict',
    path: '/',
    maxAge: sessionSeconds,
  });
  return response;
}
export function revokeSession(request: NextRequest) {
  const value = request.cookies.get(cookieName)?.value;
  if (value) {
    db.delete(authSessions)
      .where(eq(authSessions.tokenHash, hash(value)))
      .run();
  }
}
export function verifyOwnerPassword(password: string) {
  if (!authConfigured() || !authEnabled() || password.length > 512) {
    return false;
  }
  const now = new Date();
  const attempt = db.select().from(authAttempts).where(eq(authAttempts.key, 'owner-login')).get();
  if (attempt && attempt.resetAt > now && attempt.failures >= 10) {
    return false;
  }
  const expected = createHash('sha256').update(process.env.MOSA_ADMIN_PASSWORD!).digest();
  const actual = createHash('sha256').update(password).digest();
  const valid = timingSafeEqual(expected, actual);
  if (valid) {
    db.delete(authAttempts).where(eq(authAttempts.key, 'owner-login')).run();
    return true;
  }
  const windowActive = attempt && attempt.resetAt > now;
  db.insert(authAttempts)
    .values({
      key: 'owner-login',
      failures: windowActive ? attempt.failures + 1 : 1,
      resetAt: windowActive ? attempt.resetAt : new Date(now.getTime() + 15 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: authAttempts.key,
      set: {
        failures: windowActive ? attempt.failures + 1 : 1,
        resetAt: windowActive ? attempt.resetAt : new Date(now.getTime() + 15 * 60 * 1000),
      },
    })
    .run();
  return false;
}
export function createInvite(locale: string) {
  const origin = publicOrigin();
  if (!authEnabled() || !origin) {
    return null;
  }
  const value = token();
  const now = new Date();
  db.delete(pairInvites).where(lt(pairInvites.expiresAt, now)).run();
  db.insert(pairInvites)
    .values({ tokenHash: hash(value), expiresAt: new Date(now.getTime() + inviteSeconds * 1000) })
    .run();
  return {
    url: `${origin}/${['en', 'es', 'pt-BR'].includes(locale) ? locale : 'pt-BR'}/pair#${value}`,
    expiresAt: new Date(now.getTime() + inviteSeconds * 1000).toISOString(),
  };
}
export function redeemInvite(value: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) {
    return false;
  }
  const usedAt = new Date();
  const updated = db
    .update(pairInvites)
    .set({ usedAt })
    .where(
      and(
        eq(pairInvites.tokenHash, hash(value)),
        isNull(pairInvites.usedAt),
        gt(pairInvites.expiresAt, usedAt),
      ),
    )
    .returning({ tokenHash: pairInvites.tokenHash })
    .get();
  return !!updated;
}
export function viewerSessions() {
  return db
    .select({
      id: authSessions.tokenHash,
      createdAt: authSessions.createdAt,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.role, `viewer:${sessionVersion()}`),
        gt(authSessions.expiresAt, new Date()),
      ),
    )
    .all();
}
export function revokeViewer(id: string) {
  return !!db
    .delete(authSessions)
    .where(and(eq(authSessions.tokenHash, id), eq(authSessions.role, `viewer:${sessionVersion()}`)))
    .returning({ id: authSessions.tokenHash })
    .get();
}
