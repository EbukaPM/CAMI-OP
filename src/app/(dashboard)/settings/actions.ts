"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWriteSession as requireSession } from "@/lib/auth";
import { canManageSettings, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { storeUploadedFile, getOptionalFile, UploadError } from "@/lib/uploads";
import { ALL_MODULES } from "@/lib/permissions";
import type { ActionState } from "@/lib/action-state";

const brandingSchema = z.object({
  churchName: z.string().min(1),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Enter a hex color like #0f172a"),
});

export async function updateBrandingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageSettings(session)) throw new ForbiddenError("Only Headquarters administrators can change branding.");

  const parsed = brandingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let logoFileAssetId: string | undefined;
  const logo = getOptionalFile(formData, "logo");
  if (logo) {
    try {
      const stored = await storeUploadedFile(logo, session.userId);
      logoFileAssetId = stored?.id;
    } catch (err) {
      if (err instanceof UploadError) return { error: err.message };
      throw err;
    }
  }

  await db.churchSettings.upsert({
    where: { id: "default" },
    update: { ...parsed.data, ...(logoFileAssetId ? { logoFileAssetId } : {}) },
    create: { id: "default", ...parsed.data, logoFileAssetId },
  });

  await writeAuditLog({ actor: session, action: "SETTINGS_BRANDING_UPDATED", entityType: "ChurchSettings", entityId: "default" });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateModulePermissionsAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageSettings(session)) throw new ForbiddenError("Only Headquarters administrators can change role access.");

  const writes = [];
  for (const role of Object.values(Role)) {
    for (const mod of ALL_MODULES) {
      const key = `perm__${role}__${mod.key}`;
      const allowed = formData.get(key) === "on";
      writes.push(
        db.modulePermission.upsert({
          where: { role_module: { role, module: mod.key } },
          update: { allowed },
          create: { role, module: mod.key, allowed },
        })
      );
    }
  }
  await Promise.all(writes);

  await writeAuditLog({ actor: session, action: "SETTINGS_ROLE_PERMISSIONS_UPDATED", entityType: "ModulePermission" });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

const grantSchema = z.object({
  userId: z.string().min(1),
  module: z.string().min(1),
});

export async function grantUserModuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageSettings(session)) throw new ForbiddenError("Only Headquarters administrators can grant extra access.");

  const parsed = grantSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Select a user and a module." };

  await db.userModuleGrant.upsert({
    where: { userId_module: { userId: parsed.data.userId, module: parsed.data.module } },
    update: { allowed: true, grantedById: session.userId },
    create: { userId: parsed.data.userId, module: parsed.data.module, allowed: true, grantedById: session.userId },
  });

  await writeAuditLog({
    actor: session,
    action: "USER_MODULE_GRANTED",
    entityType: "UserModuleGrant",
    entityId: parsed.data.userId,
    after: { module: parsed.data.module },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function revokeUserModuleGrantAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageSettings(session)) throw new ForbiddenError("Only Headquarters administrators can revoke access.");

  const id = String(formData.get("grantId"));
  await db.userModuleGrant.delete({ where: { id } });
  await writeAuditLog({ actor: session, action: "USER_MODULE_GRANT_REVOKED", entityType: "UserModuleGrant", entityId: id });
  revalidatePath("/settings");
}
