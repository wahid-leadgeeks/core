import crypto from 'node:crypto';

export const DEFAULT_TEST_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export function getEncryptionKey(keyHex = DEFAULT_TEST_ENCRYPTION_KEY) {
  return Buffer.from(keyHex, 'hex');
}

export function encryptPin(pin, keyHex = DEFAULT_TEST_ENCRYPTION_KEY) {
  if (typeof pin !== 'string') {
    throw new Error('PIN must be a string');
  }
  const key = getEncryptionKey(keyHex);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(pin, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');
  const serialized = `${ivHex}:${authTag}:${ciphertext}`;

  return { serialized, iv: ivHex, authTag, ciphertext };
}

export function decryptPin(serialized, keyHex = DEFAULT_TEST_ENCRYPTION_KEY) {
  const parts = serialized.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted PIN format. Expected iv:authTag:ciphertext');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey(keyHex);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function isEncryptedPin(val) {
  if (typeof val !== 'string') return false;
  const parts = val.split(':');
  if (parts.length !== 3) return false;
  const [iv, tag, cipher] = parts;
  return /^[0-9a-fA-F]{24}$/.test(iv) && /^[0-9a-fA-F]{32}$/.test(tag) && /^[0-9a-fA-F]+$/.test(cipher);
}
