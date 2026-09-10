import crypto from 'node:crypto';

export const DEFAULT_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
export const DEFAULT_TEST_ENCRYPTION_KEY = DEFAULT_ENCRYPTION_KEY;

/**
 * Resolves a 32-byte encryption key buffer from hex/base64 string or environment.
 */
export function getEncryptionKey(keyHex?: string): Buffer {
  const rawKey =
    keyHex ||
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    DEFAULT_ENCRYPTION_KEY;

  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  if (rawKey.length === 44 && rawKey.endsWith('=')) {
    return Buffer.from(rawKey, 'base64');
  }
  const hexBuf = Buffer.from(rawKey, 'hex');
  if (hexBuf.length === 32) {
    return hexBuf;
  }
  const fallback = Buffer.alloc(32);
  Buffer.from(rawKey).copy(fallback);
  return fallback;
}

export interface EncryptedResult {
  serialized: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

/**
 * Encrypts a plain text PIN or secret string using AES-256-GCM.
 * Formats output as `iv:authTag:ciphertext` in hex.
 */
export function encryptPin(
  pin: string,
  keyHex?: string
): EncryptedResult {
  if (typeof pin !== 'string') {
    throw new Error('PIN must be a string');
  }

  const key = getEncryptionKey(keyHex);
  const iv = crypto.randomBytes(12); // Standard 96-bit (12-byte) IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(pin, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');
  const serialized = `${ivHex}:${authTag}:${ciphertext}`;

  return {
    serialized,
    iv: ivHex,
    authTag,
    ciphertext,
  };
}

/**
 * Decrypts an AES-256-GCM serialized ciphertext string formatted as `iv:authTag:ciphertext`.
 * Throws an error if the format is invalid or if authentication tag verification fails.
 */
export function decryptPin(
  serialized: string,
  keyHex?: string
): string {
  if (typeof serialized !== 'string') {
    throw new Error('Invalid encrypted PIN format. Expected iv:authTag:ciphertext');
  }

  const parts = serialized.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted PIN format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  if (
    !/^[0-9a-fA-F]{24}$/.test(ivHex) ||
    !/^[0-9a-fA-F]{32}$/.test(authTagHex) ||
    (ciphertextHex.length > 0 && !/^[0-9a-fA-F]+$/.test(ciphertextHex))
  ) {
    throw new Error('Invalid encrypted PIN format. Invalid hex characters or segment lengths');
  }

  const key = getEncryptionKey(keyHex);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Validates whether a value conforms to the AES-256-GCM serialized format `iv:authTag:ciphertext`.
 */
export function isEncryptedPin(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const parts = val.split(':');
  if (parts.length !== 3) return false;
  const [iv, tag, cipher] = parts;
  return (
    /^[0-9a-fA-F]{24}$/.test(iv) &&
    /^[0-9a-fA-F]{32}$/.test(tag) &&
    /^[0-9a-fA-F]+$/.test(cipher)
  );
}

// General purpose aliases
export const encrypt = encryptPin;
export const decrypt = decryptPin;
