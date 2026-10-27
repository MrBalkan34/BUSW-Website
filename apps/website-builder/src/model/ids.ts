let counter = 0;

/** A full-length unique id for a project. It is sent with a submission. */
export function newProjectId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${newId("proj")}-${Date.now().toString(36)}`;
}

/** Short unique id. Uses crypto.randomUUID when available, with a safe fallback. */
export function newId(prefix = "id"): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid.slice(0, 8)}`;
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}
