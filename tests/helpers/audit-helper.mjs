// tests/helpers/audit-helper.mjs

export class InMemoryAuditLogger {
  constructor() {
    this.events = [];
  }

  log(event) {
    const record = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...event,
    };
    this.events.push(record);
    return record;
  }

  getAll(filters) {
    let result = [...this.events].reverse();
    if (filters?.entityType) {
      result = result.filter((e) => e.entityType === filters.entityType);
    }
    if (filters?.action) {
      result = result.filter((e) => e.action === filters.action);
    }
    if (filters?.actorId) {
      result = result.filter((e) => e.actorId === filters.actorId);
    }
    return result;
  }

  attemptDelete() {
    throw new Error('FORBIDDEN: Deleting audit events is strictly prohibited');
  }

  attemptUpdate() {
    throw new Error('FORBIDDEN: Updating audit events is strictly prohibited');
  }

  count() {
    return this.events.length;
  }
}
