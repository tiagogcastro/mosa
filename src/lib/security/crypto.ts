import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function key() {
  if (process.env.APP_ENCRYPTION_KEY) {
    if (!/^[a-f\d]{64}$/i.test(process.env.APP_ENCRYPTION_KEY)) {
      throw new Error('APP_ENCRYPTION_KEY must be 64 hexadecimal characters');
    }
    return Buffer.from(process.env.APP_ENCRYPTION_KEY, 'hex');
  }
  mkdirSync('data', { recursive: true });
  const file = 'data/.encryption-key';
  if (!existsSync(file)) {
    writeFileSync(file, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
  }
  return Buffer.from(readFileSync(file, 'utf8').trim(), 'hex');
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}
export function decrypt<T>(value: string): T {
  const [iv, tag, ciphertext] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString()) as T;
}
