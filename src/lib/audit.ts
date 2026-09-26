import "server-only";
import { db } from "./db";
import type { SessionPayload } from "./auth";

// Dates/Decimals aren't valid Prisma Json input as-is; round-trip through
// JSON.stringify (which already knows how to stringify both) to normalize.
function toJsonSafe(value: unknown): object {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Every sensitive action (finance edits, role changes, approvals, equipment
 * valuation views, document actions) must produce an audit entry — PRD
 * Section 7. Call this from the same server action/route that performs the
 * mutation so the log and the change land together.
 */
export async function writeAuditLog(params: {
  actor: SessionPayload | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}) {
  await db.auditLog.create({
    data: {
      actorId: params.actor?.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      before: params.before === undefined ? undefined : toJsonSafe(params.before),
      after: params.after === undefined ? undefined : toJsonSafe(params.after),
      ipAddress: params.ipAddress ?? null,
    },
  });
}
