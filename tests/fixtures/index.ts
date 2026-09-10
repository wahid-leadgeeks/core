import referenceData from './reference-data.json' with { type: 'json' };
import accountsData from './spreadsheet-accounts.json' with { type: 'json' };
import groupsData from './spreadsheet-groups.json' with { type: 'json' };
import devicesData from './spreadsheet-devices.json' with { type: 'json' };
import softwareData from './spreadsheet-software.json' with { type: 'json' };
import rbacData from './rbac-matrix.json' with { type: 'json' };
import schemaData from './schema-definitions.json' with { type: 'json' };

export {
  referenceData,
  accountsData,
  groupsData,
  devicesData,
  softwareData,
  rbacData,
  schemaData
};

export type SystemRole = 'super_admin' | 'it_admin' | 'asset_admin' | 'software_admin' | 'auditor';

export const VALID_ROLES: SystemRole[] = [
  'super_admin',
  'it_admin',
  'asset_admin',
  'software_admin',
  'auditor',
];

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
  role: SystemRole;
  departmentId?: string;
  departmentCode?: string;
}

export const MOCK_USERS: Record<SystemRole, UserSession> = {
  super_admin: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'amanda@leadgeeksinc.com',
    displayName: 'Amanda (Super Admin)',
    role: 'super_admin',
    departmentCode: 'MNG'
  },
  it_admin: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'adit@leadgeeksinc.com',
    displayName: 'Aditya (IT Admin)',
    role: 'it_admin',
    departmentCode: 'ITE'
  },
  asset_admin: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'devi@leadgeeksinc.com',
    displayName: 'Devi (Asset Admin)',
    role: 'asset_admin',
    departmentCode: 'OPS'
  },
  software_admin: {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'rian@leadgeeksinc.com',
    displayName: 'Rian (Software Admin)',
    role: 'software_admin',
    departmentCode: 'GRW'
  },
  auditor: {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'auditor@leadgeeksinc.com',
    displayName: 'Auditor (Read-Only)',
    role: 'auditor',
    departmentCode: 'GNR'
  }
};
