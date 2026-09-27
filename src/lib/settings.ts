import "server-only";
import { db } from "./db";

export async function getChurchSettings() {
  const settings = await db.churchSettings.findUnique({ where: { id: "default" } });
  if (settings) return settings;
  return db.churchSettings.create({ data: { id: "default" } });
}
