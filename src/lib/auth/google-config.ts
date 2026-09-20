// src/lib/auth/google-config.ts
export const DEFAULT_GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';

export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
] as const;

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: readonly string[];
  spreadsheetId?: string;
};

/**
 * Resolves the Google OAuth redirect URI in order of priority:
 * 1. Explicit custom redirect URI
 * 2. Explicit GOOGLE_REDIRECT_URI environment variable
 * 3. Incoming HTTP Request headers (x-forwarded-host / host, x-forwarded-proto)
 * 4. Vercel deployment URL (VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL)
 * 5. Default localhost callback URL
 */
export function resolveRedirectUri(request?: Request, customRedirectUri?: string): string {
  if (customRedirectUri?.trim()) {
    return customRedirectUri.trim();
  }

  if (process.env.GOOGLE_REDIRECT_URI?.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }

  if (request) {
    try {
      const url = new URL(request.url);
      const host =
        request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        url.host;
      const proto =
        request.headers.get('x-forwarded-proto') ||
        (url.protocol ? url.protocol.replace(':', '') : 'http');

      if (host) {
        return `${proto}://${host}/api/auth/callback/google`;
      }
    } catch {
      // Fall through on URL parsing error
    }
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const cleanUrl = vercelUrl.replace(/^https?:\/\//, '');
    return `https://${cleanUrl}/api/auth/callback/google`;
  }

  return DEFAULT_GOOGLE_REDIRECT_URI;
}

export function getGoogleOAuthConfig(customRedirectUri?: string): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  const redirectUri = resolveRedirectUri(undefined, customRedirectUri);

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: GOOGLE_OAUTH_SCOPES,
    spreadsheetId,
  };
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export const AUTHORITATIVE_SPREADSHEETS = {
  accounts: {
    key: 'accounts',
    name: 'List of Accounts and Google Group Management',
    domain: 'identity',
    envVar: 'GOOGLE_SHEETS_ACCOUNTS_ID',
    defaultId: '15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8',
    sheets: [
      { title: 'List of User Account', gid: '0', description: 'User accounts, roles, departments, domains' },
      { title: 'Google Group', gid: '347490362', description: 'Google Workspace groups and distribution lists' },
    ],
  },
  devices: {
    key: 'devices',
    name: 'List of Company Hardware Devices (Laptop)',
    domain: 'assets',
    envVar: 'GOOGLE_SHEETS_DEVICES_ID',
    defaultId: '1ELcKpCCEYXpI2wg3IIKJ0s3XpfdN92tyiyUOe40S_YQ',
    sheets: [
      { title: 'Laptop Information', gid: '0', description: 'Hardware assets, specifications, assignments' },
      { title: 'Access Login', gid: '', description: 'Device access credentials and PINs' },
    ],
  },
  software: {
    key: 'software',
    name: 'List of Softwares/Tools/Applications',
    domain: 'software',
    envVar: 'GOOGLE_SHEETS_SOFTWARE_ID',
    defaultId: '1q_pkNgrfDm7F_fQRF2beOxRvQf9XVE3e4MGPVxSmA5M',
    sheets: [
      { title: 'List of Applications', gid: '0', description: 'Company software catalog and subscription status' },
      { title: 'Drop Down', gid: '', description: 'Master reference codes and categories' },
    ],
  },
} as const;

export type SpreadsheetDomainKey = keyof typeof AUTHORITATIVE_SPREADSHEETS;

export interface LinkedSpreadsheetInfo {
  key: SpreadsheetDomainKey;
  name: string;
  domain: string;
  spreadsheetId: string;
  url: string;
  sheets: readonly { title: string; gid: string; description: string }[];
}

export function getSpreadsheetIdForDomain(domainKey?: SpreadsheetDomainKey | string): string {
  if (domainKey === 'devices') {
    return (
      process.env.GOOGLE_SHEETS_DEVICES_ID?.trim() ||
      AUTHORITATIVE_SPREADSHEETS.devices.defaultId
    );
  }
  if (domainKey === 'software') {
    return (
      process.env.GOOGLE_SHEETS_SOFTWARE_ID?.trim() ||
      AUTHORITATIVE_SPREADSHEETS.software.defaultId
    );
  }
  // Default to accounts
  return (
    process.env.GOOGLE_SHEETS_ACCOUNTS_ID?.trim() ||
    process.env.GOOGLE_SHEETS_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID?.trim() ||
    AUTHORITATIVE_SPREADSHEETS.accounts.defaultId
  );
}

export function getLinkedSpreadsheetId(domainKey?: SpreadsheetDomainKey | string): string {
  return getSpreadsheetIdForDomain(domainKey);
}

export function getLinkedSpreadsheetUrl(domainKey?: SpreadsheetDomainKey | string): string {
  const id = getLinkedSpreadsheetId(domainKey);
  return `https://docs.google.com/spreadsheets/d/${id}`;
}

export function getAllLinkedSpreadsheets(): LinkedSpreadsheetInfo[] {
  const keys: SpreadsheetDomainKey[] = ['accounts', 'devices', 'software'];
  return keys.map((key) => {
    const meta = AUTHORITATIVE_SPREADSHEETS[key];
    const id = getSpreadsheetIdForDomain(key);
    return {
      key,
      name: meta.name,
      domain: meta.domain,
      spreadsheetId: id,
      url: `https://docs.google.com/spreadsheets/d/${id}`,
      sheets: meta.sheets,
    };
  });
}
