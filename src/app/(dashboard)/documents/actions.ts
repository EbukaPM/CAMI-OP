"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { DocumentType, DocumentScope, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { storeUploadedFile, getOptionalFile, UploadError } from "@/lib/uploads";
import type { ActionState } from "@/lib/action-state";

const docSchema = z.object({
  type: z.nativeEnum(DocumentType),
  title: z.string().min(2),
  fileUrl: z.string().url().optional().or(z.literal("")),
  scope: z.nativeEnum(DocumentScope),
  targetBranchId: z.string().optional(),
  targetRole: z.nativeEnum(Role).optional(),
  requiresAck: z.string().optional(),
});

export async function createDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError("Only Headquarters administrators can publish documents.");

  const raw = Object.fromEntries(formData.entries());
  const parsed = docSchema.safeParse({ ...raw, targetBranchId: raw.targetBranchId || undefined, targetRole: raw.targetRole || undefined });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const file = getOptionalFile(formData, "file");
  if (!file && !data.fileUrl) {
    return { error: "Upload a file or paste a link." };
  }

  let fileAssetId: string | null = null;
  if (file) {
    try {
      const stored = await storeUploadedFile(file, session.userId);
      fileAssetId = stored?.id ?? null;
    } catch (err) {
      if (err instanceof UploadError) return { error: err.message };
      throw err;
    }
  }

  const doc = await db.document.create({
    data: {
      type: data.type,
      title: data.title,
      fileUrl: fileAssetId ? null : data.fileUrl || null,
      fileAssetId,
      scope: data.scope,
      targetBranchId: data.scope === "BRANCH" ? data.targetBranchId ?? null : null,
      targetRole: data.scope === "ROLE" ? data.targetRole ?? null : null,
      requiresAck: data.requiresAck === "on",
      uploadedById: session.userId,
    },
  });

  await writeAuditLog({ actor: session, action: "DOCUMENT_PUBLISHED", entityType: "Document", entityId: doc.id, after: doc });
  revalidatePath("/documents");
  return { success: true };
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
  revalidatePath("/documents");
}
