"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canAccessFinance, isHqRole, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const givingSchema = z.object({
  branchId: z.string().min(1),
  categoryId: z.string().min(1),
  amount: z.coerce.number().positive(),
  serviceDate: z.string().min(1),
  notes: z.string().optional(),
});

export async function recordGivingAction(formData: FormData) {
  const session = await requireSession();
  const parsed = givingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect(`/finance?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }
  const data = parsed.data as z.infer<typeof givingSchema>;

  if (!canAccessFinance(session, data.branchId)) {
    throw new ForbiddenError("You can only record giving for your own branch.");
  }

  const service = await db.service.create({
    data: { branchId: data.branchId, date: new Date(data.serviceDate), type: "Service" },
  });

  const record = await db.givingRecord.create({
    data: {
      branchId: data.branchId,
      serviceId: service.id,
      categoryId: data.categoryId,
      amount: data.amount,
      notes: data.notes || null,
      recordedById: session.userId,
    },
  });

  await writeAuditLog({
    actor: session,
    action: "GIVING_RECORDED",
    entityType: "GivingRecord",
    entityId: record.id,
    after: { branchId: data.branchId, categoryId: data.categoryId, amount: data.amount },
  });

  redirect(isHqRole(session.role) ? `/finance?branchId=${data.branchId}` : "/finance");
}

const expenseSchema = z.object({
  branchId: z.string().min(1),
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
});

export async function recordExpenseAction(formData: FormData) {
  const session = await requireSession();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect(`/finance?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }
  const data = parsed.data as z.infer<typeof expenseSchema>;

  if (!canAccessFinance(session, data.branchId)) {
    throw new ForbiddenError("You can only record expenses for your own branch.");
  }

  const expense = await db.expenseRecord.create({
    data: {
      branchId: data.branchId,
      category: data.category,
      amount: data.amount,
      description: data.description || null,
      recordedById: session.userId,
      status: "SUBMITTED",
    },
  });

  await writeAuditLog({
    actor: session,
    action: "EXPENSE_SUBMITTED",
    entityType: "ExpenseRecord",
    entityId: expense.id,
    after: { branchId: data.branchId, category: data.category, amount: data.amount },
  });

  redirect(isHqRole(session.role) ? `/finance?branchId=${data.branchId}` : "/finance");
}

export async function decideExpenseAction(formData: FormData) {
  const session = await requireSession();
  if (!isHqRole(session.role)) throw new ForbiddenError("Only Headquarters finance roles can approve expenses.");

  const expenseId = String(formData.get("expenseId"));
  const decision = String(formData.get("decision")) === "APPROVED" ? "APPROVED" : "REJECTED";

  const before = await db.expenseRecord.findUnique({ where: { id: expenseId } });
  await db.expenseRecord.update({
    where: { id: expenseId },
    data: { status: decision, approvedById: session.userId },
  });

  await writeAuditLog({
    actor: session,
    action: `EXPENSE_${decision}`,
    entityType: "ExpenseRecord",
    entityId: expenseId,
    before,
    after: { status: decision },
  });

  redirect("/finance");
}
