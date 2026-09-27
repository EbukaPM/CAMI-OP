"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AssetCondition } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWriteSession as requireSession } from "@/lib/auth";
import { canManageBranch, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { storeUploadedFile, getOptionalFile, UploadError } from "@/lib/uploads";
import type { ActionState } from "@/lib/action-state";

const assetSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  purchaseValue: z.coerce.number().nonnegative(),
  purchaseDate: z.string().optional(),
  condition: z.nativeEnum(AssetCondition),
});

export async function createAssetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = assetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  if (!canManageBranch(session, data.branchId)) {
    throw new ForbiddenError("You can only register equipment for your own branch.");
  }

  const asset = await db.asset.create({
    data: {
      branchId: data.branchId,
      name: data.name,
      category: data.category,
      serialNumber: data.serialNumber || null,
      location: data.location || null,
      purchaseValue: data.purchaseValue,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      condition: data.condition,
    },
  });

  const photo = getOptionalFile(formData, "photo");
  if (photo) {
    try {
      const fileAsset = await storeUploadedFile(photo, session.userId);
      if (fileAsset) {
        await db.attachment.create({
          data: { assetId: asset.id, fileAssetId: fileAsset.id, fileName: photo.name },
        });
      }
    } catch (err) {
      if (err instanceof UploadError) return { error: err.message };
      throw err;
    }
  }

  // Adding an asset changes the restricted valuation total, so it's logged
  // like every other valuation-affecting action (PRD Section 3.3 / 7).
  await writeAuditLog({
    actor: session,
    action: "ASSET_CREATED",
    entityType: "Asset",
    entityId: asset.id,
    after: { branchId: data.branchId, name: data.name, purchaseValue: data.purchaseValue },
  });

  revalidatePath("/equipment");
  return { success: true };
}

export async function disposeAssetAction(formData: FormData) {
  const session = await requireSession();
  const assetId = String(formData.get("assetId"));
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) redirect("/equipment");
  if (!canManageBranch(session, asset!.branchId)) {
    throw new ForbiddenError("You can only dispose of equipment belonging to your own branch.");
  }

  await db.asset.update({ where: { id: assetId }, data: { isDisposed: true, condition: "DISPOSED" } });

  await writeAuditLog({
    actor: session,
    action: "ASSET_DISPOSED",
    entityType: "Asset",
    entityId: assetId,
    before: { purchaseValue: asset!.purchaseValue.toString(), branchId: asset!.branchId },
  });

  redirect("/equipment");
}
