// Re-export all domain schemas
export * from '../../domains/identity/schema';
export * from '../../domains/groups/schema';
export * from '../../domains/assets/schema';
export * from '../../domains/access/schema';
export * from '../../domains/software/schema';
export * from '../../domains/audit/schema';

// Convenient naming aliases
import {
  accountRoles,
  accountDomains,
} from '../../domains/identity/schema';
import {
  googleGroups,
  groupMemberships,
} from '../../domains/groups/schema';
import {
  deviceSpecifications,
  deviceAssignments,
} from '../../domains/assets/schema';
import {
  deviceCredentials,
} from '../../domains/access/schema';
import {
  applicationCategoryEnum,
  applicationStatusEnum,
} from '../../domains/software/schema';
import {
  auditEvents,
} from '../../domains/audit/schema';

export {
  accountRoles as account_roles,
  accountDomains as account_domains,
  googleGroups as google_groups,
  groupMemberships as group_memberships,
  deviceSpecifications as device_specifications,
  deviceAssignments as device_assignments,
  deviceCredentials as device_credentials,
  auditEvents as audit_events,
  applicationCategoryEnum as appCategoryEnum,
  applicationStatusEnum as appStatusEnum,
};
