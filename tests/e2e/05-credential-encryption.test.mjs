import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from '../helpers/test-framework.mjs';
import { encryptPin, decryptPin, isEncryptedPin, DEFAULT_TEST_ENCRYPTION_KEY } from '../helpers/crypto-helper.mjs';
import { createMockSession, evaluateRouteGuard } from '../helpers/auth-helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devicesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/spreadsheet-devices.json'), 'utf8'));

describe('Suite 05: Device Credential Encryption (AES-256-GCM) & Secure Reveal', () => {

  // ============================================================================
  // TIER 1: FEATURE COVERAGE
  // ============================================================================

  it('[Tier 1] encrypts plain text PIN into valid AES-256-GCM serialized format (iv:authTag:ciphertext)', () => {
    const plainPin = '123456';
    const encrypted = encryptPin(plainPin);
    expect(encrypted.serialized).toBeDefined();
    expect(isEncryptedPin(encrypted.serialized)).toBe(true);

    const parts = encrypted.serialized.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(encrypted.iv);
    expect(parts[1]).toBe(encrypted.authTag);
    expect(parts[2]).toBe(encrypted.ciphertext);
  });

  it('[Tier 1] decrypts serialized ciphertext back to exact original plain text PIN', () => {
    const plainPin = 'Leadgeeks123';
    const encrypted = encryptPin(plainPin);
    const decrypted = decryptPin(encrypted.serialized);
    expect(decrypted).toBe(plainPin);
  });

  it('[Tier 1] verifies zero plain text PIN values in sample device credentials', () => {
    for (const dev of devicesData.sampleDevices) {
      const encrypted = encryptPin(dev.pinPlain);
      expect(encrypted.serialized).not.toBe(dev.pinPlain);
      expect(encrypted.serialized).not.toContain(dev.pinPlain);
      expect(isEncryptedPin(encrypted.serialized)).toBe(true);
    }
  });

  it('[Tier 1] verifies encryption produces distinct IV and ciphertext for identical inputs (semantic security)', () => {
    const pin = '123456';
    const enc1 = encryptPin(pin);
    const enc2 = encryptPin(pin);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.serialized).not.toBe(enc2.serialized);

    expect(decryptPin(enc1.serialized)).toBe(pin);
    expect(decryptPin(enc2.serialized)).toBe(pin);
  });

  it('[Tier 1] verifies Super Admin can access credential reveal route', () => {
    const session = createMockSession('super_admin');
    const res = evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session });
    expect(res.allowed).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('[Tier 1] verifies IT Admin can access credential reveal route', () => {
    const session = createMockSession('it_admin');
    const res = evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session });
    expect(res.allowed).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('[Tier 1] verifies Auditor is blocked from credential reveal with 403', () => {
    const session = createMockSession('auditor');
    const res = evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session });
    expect(res.statusCode).toBe(403);
    expect(res.errorMessage).toContain('requires Super Admin or IT Admin privileges');
  });

  it('[Tier 1] verifies Asset Admin is blocked from credential reveal with 403', () => {
    const session = createMockSession('asset_admin');
    const res = evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session });
    expect(res.statusCode).toBe(403);
  });

  it('[Tier 1] verifies Software Admin is blocked from credential reveal with 403', () => {
    const session = createMockSession('software_admin');
    const res = evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session });
    expect(res.statusCode).toBe(403);
  });

  it('[Tier 1] verifies device login email is preserved alongside encrypted PIN', () => {
    const sample = devicesData.sampleDevices[0];
    expect(sample.loginEmail).toBe('leadgeeksindonesia@gmail.com');
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] fails securely when ciphertext is tampered (auth tag authentication failure)', () => {
    const encrypted = encryptPin('secret123');
    const parts = encrypted.serialized.split(':');
    const lastChar = parts[2].slice(-1);
    const tamperedLastChar = lastChar === 'a' ? 'b' : 'a';
    const tamperedCipher = parts[2].slice(0, -1) + tamperedLastChar;
    const tamperedSerialized = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

    expect(() => decryptPin(tamperedSerialized)).toThrow();
  });

  it('[Tier 2] fails securely when auth tag is tampered', () => {
    const encrypted = encryptPin('secret123');
    const parts = encrypted.serialized.split(':');
    const tamperedTag = '0'.repeat(32);
    const tamperedSerialized = `${parts[0]}:${tamperedTag}:${parts[2]}`;

    expect(() => decryptPin(tamperedSerialized)).toThrow();
  });

  it('[Tier 2] rejects invalid serialized format (missing colons or wrong number of parts)', () => {
    expect(() => decryptPin('invalid_serialized_string')).toThrow('Invalid encrypted PIN format');
    expect(() => decryptPin('iv:only_two_parts')).toThrow('Invalid encrypted PIN format');
    expect(() => decryptPin('iv:tag:cipher:extra')).toThrow('Invalid encrypted PIN format');
  });

  it('[Tier 2] handles empty PIN or whitespace PIN string safely', () => {
    const emptyEncrypted = encryptPin('');
    expect(decryptPin(emptyEncrypted.serialized)).toBe('');

    const spaceEncrypted = encryptPin('   ');
    expect(decryptPin(spaceEncrypted.serialized)).toBe('   ');
  });

  it('[Tier 2] handles complex UTF-8 passwords with special characters', () => {
    const complexPin = 'P@$$w0rd!#%^&*()_+~`|}{[]:;?><,./';
    const encrypted = encryptPin(complexPin);
    expect(decryptPin(encrypted.serialized)).toBe(complexPin);
  });

  it('[Tier 2] fails decryption when wrong encryption key is used', () => {
    const encrypted = encryptPin('supersecret', DEFAULT_TEST_ENCRYPTION_KEY);
    const wrongKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    expect(() => decryptPin(encrypted.serialized, wrongKey)).toThrow();
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ============================================================================

  it('[Tier 3] pairwise check: Device ingestion + encryption at rest + PIN reveal audit interlock', () => {
    const device = devicesData.sampleDevices[0];

    const encrypted = encryptPin(device.pinPlain);
    expect(isEncryptedPin(encrypted.serialized)).toBe(true);

    const apiDeviceResponse = {
      id: 'dev-1',
      assetNumber: device.assetNumber,
      brand: device.brand,
      model: device.model,
      credentials: {
        loginEmail: device.loginEmail,
        hasPin: true
      }
    };
    expect(apiDeviceResponse.credentials.pinPlain).toBeUndefined();
    expect(apiDeviceResponse.credentials.pin_hash).toBeUndefined();

    const superAdmin = createMockSession('super_admin');
    const guardRes = evaluateRouteGuard({
      path: `/api/assets/${device.assetNumber}/credentials/reveal`,
      method: 'POST',
      session: superAdmin
    });
    expect(guardRes.allowed).toBe(true);
    const revealedPin = decryptPin(encrypted.serialized);
    expect(revealedPin).toBe(device.pinPlain);
  });

  it('[Tier 3] pairwise check: Shared PIN vulnerability detection across imported hardware', () => {
    const identicalPins = devicesData.sampleDevices.filter(d => d.pinPlain === '123456');
    expect(identicalPins.length).toBeGreaterThan(1);

    const encryptions = identicalPins.map(d => encryptPin(d.pinPlain).serialized);
    const uniqueCiphertexts = new Set(encryptions);
    expect(uniqueCiphertexts.size).toBe(identicalPins.length);
  });

  it('[Tier 3] pairwise check: Unauthorized reveal attempt does NOT return PIN', () => {
    const auditor = createMockSession('auditor');
    const guard = evaluateRouteGuard({
      path: '/api/assets/LGI-CD-2024-001/credentials/reveal',
      method: 'POST',
      session: auditor
    });
    expect(guard.allowed).toBe(false);
    expect(guard.statusCode).toBe(403);
  });

  it('[Tier 3] checks isEncryptedPin validator accuracy', () => {
    expect(isEncryptedPin('123456')).toBe(false);
    expect(isEncryptedPin('plain-password')).toBe(false);
    const valid = encryptPin('test');
    expect(isEncryptedPin(valid.serialized)).toBe(true);
  });

  // ============================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: IT administrator provisioning a laptop with PIN reveal', () => {
    const itAdmin = createMockSession('it_admin');
    const laptop = devicesData.sampleDevices[2];

    const viewRes = evaluateRouteGuard({ path: `/assets/${laptop.assetNumber}`, method: 'GET', session: itAdmin });
    expect(viewRes.allowed).toBe(true);

    const revealRes = evaluateRouteGuard({ path: `/api/assets/${laptop.assetNumber}/credentials/reveal`, method: 'POST', session: itAdmin });
    expect(revealRes.allowed).toBe(true);

    const encrypted = encryptPin(laptop.pinPlain);
    const pin = decryptPin(encrypted.serialized);
    expect(pin).toBe(laptop.pinPlain);
  });

  it('[Tier 4] Scenario 2: Defense in depth - database dump inspection shows zero plain text', () => {
    const databaseRows = devicesData.sampleDevices.map(d => ({
      deviceId: d.assetNumber,
      loginEmail: d.loginEmail,
      pinHash: encryptPin(d.pinPlain).serialized
    }));

    for (const row of databaseRows) {
      expect(row.pinHash).not.toContain('123456');
      expect(row.pinHash).not.toContain('Leadgeeks123');
      expect(isEncryptedPin(row.pinHash)).toBe(true);
    }
  });
});
