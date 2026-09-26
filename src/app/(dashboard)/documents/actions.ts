"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { DocumentType, DocumentScope, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const docSchema = z.object({
  type: z.nativeEnum(DocumentType),
  title: z.string().min(2),
  fileUrl: z.string().url(),
  scope: z.nativeEnum(DocumentScope),
  targetBranchId: z.string().optional(),
  targetRole: z.nativeEnum(Role).optional(),
  requiresAck: z.string().optional(),
});

export async function createDocumentAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError("Only Headquarters administrators can publish documents.");

  const raw = Object.fromEntries(formData.entries());
  const parsed = docSchema.safeParse({ ...raw, targetBranchId: raw.targetBranchId || undefined, targetRole: raw.targetRole || undefined });
  if (!parsed.success) {
    redirect(`/documents?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }
  const data = parsed.data as z.infer<typeof docSchema>;

  const doc = await db.document.create({
    data: {
      type: data.type,
      title: data.title,
      fileUrl: data.fileUrl,
      scope: data.scope,
      targetBranchId: data.scope === "BRANCH" ? data.targetBranchId ?? null : null,
      targetRole: data.scope === "ROLE" ? data.targetRole ?? null : null,
      requiresAck: data.requiresAck === "on",
      uploadedById: session.userId,
    },
  });

  await writeAuditLog({ actor: session, action: "DOCUMENT_PUBLISHED", entityType: "Document", entityId: doc.id, after: doc });
  redirect("/documents");
}

export async function acknowledgeDocumentAction(formData: FormData) {
  const session = await requireSession();
  const documentId = String(formData.get("documentId"));

  await db.acknowledgement.upsert({
    where: { documentId_userId: { documentId, userId: session.userId } },
    update: {},
    create: { documentId, userId: session.userId },
  });

  await writeAuditLog({ actor: session, action: "DOCUMENT_ACKNOWLEDGED", entityType: "Document", entityId: documentId });
  redirect("/documents");
}
