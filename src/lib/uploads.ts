import "server-only";
import { db } from "@/lib/db";

// Files are stored as bytes in Postgres (see prisma/schema.prisma FileAsset)
// rather than a separate object-storage service, so uploads work with zero
// extra accounts/credentials. Capped well under Netlify's ~6MB serverless
// request-body limit, leaving room for the rest of the form payload.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB

export class UploadError extends Error {}

export async function storeUploadedFile(file: File, uploadedById?: string) {
  if (file.size === 0) return null;
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`"${file.name}" is too large — the limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return db.fileAsset.create({
    data: {
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: buffer,
      uploadedById: uploadedById ?? null,
    },
    select: { id: true },
  });
}

/** Pulls an optional upload out of form data, ignoring empty file inputs. */
export function getOptionalFile(formData: FormData, field: string): File | null {
  const value = formData.get(field);
  if (!(value instanceof File) || value.size === 0 || !value.name) return null;
  return value;
}
