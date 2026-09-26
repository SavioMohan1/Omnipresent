import 'server-only';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/config/env';
import { AuthSession, SessionUser } from '@/lib/auth/types';

export const SESSION_COOKIE_NAME = 'onboardflow_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signSession(user: SessionUser): Promise<string> {
  const secret = process.env.AUTH_SECRET || 'onboardflow-default-demo-secret-key-32b';
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const session: AuthSession = { user, expiresAt };

  const enc = new TextEncoder();
  const payloadStr = JSON.stringify(session);
  const payloadB64 = base64UrlEncode(enc.encode(payloadStr));

  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64 = base64UrlEncode(signatureBuffer);

  return `${payloadB64}.${sigB64}`;
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;

    const secret = process.env.AUTH_SECRET || 'onboardflow-default-demo-secret-key-32b';
    const key = await getCryptoKey(secret);
    const enc = new TextEncoder();
    const signatureBytes = base64UrlDecode(sigB64);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(payloadB64) as unknown as BufferSource
    );
    if (!valid) return null;

    const decodedStr = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const session: AuthSession = JSON.parse(decodedStr);

    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt < now) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifySession(cookie.value);
}

export async function setSessionCookie(user: SessionUser): Promise<string> {
  const token = await signSession(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
