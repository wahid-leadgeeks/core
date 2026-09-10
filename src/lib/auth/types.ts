export type SystemRole =
  | 'super_admin'
  | 'it_admin'
  | 'asset_admin'
  | 'software_admin'
  | 'auditor';

export type SystemRoleDisplayName =
  | 'Super Admin'
  | 'IT Admin'
  | 'Asset Admin'
  | 'Software Admin'
  | 'Auditor';

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
  role: SystemRole;
  departmentId?: string;
  departmentCode?: string;
}

export type DomainResource =
  | 'identity'
  | 'groups'
  | 'assets'
  | 'credentials'
  | 'software'
  | 'audit';

export type DomainAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'sync'
  | 'assign'
  | 'reveal'
  | 'rotate';

export type SensitiveOperation =
  | 'credential.reveal'
  | 'account.export'
  | 'permission.change'
  | 'device.delete'
  | 'google_workspace.sync';

export interface RouteGuardResult {
  allowed: boolean;
  statusCode: 200 | 302 | 401 | 403;
  redirectUrl?: string;
  errorMessage?: string;
}
