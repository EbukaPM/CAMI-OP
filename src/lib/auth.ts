import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { getViewingBranchId } from "./branch-view";
import { isHqRole, ForbiddenError } from "./rbac";

const SESSION_COOKIE = "cami_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: Role;
  branchId: string | null;
  fullName: string;
  email: string;
  /** True when an HQ user is browsing a branch's portal in read-only mode
   * (see lib/branch-view.ts). `branchId` above is overridden to that branch
   * for the duration; `realRole`/`realBranchId` preserve the actual identity. */
  isViewOnly?: boolean;
  realRole?: Role;
  realBranchId?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/**
 * Use in server components/pages that require a logged-in user. If the
 * caller is HQ and currently browsing a branch's portal (see
 * lib/branch-view.ts), the returned session's `branchId`/`role`-scoping
 * fields reflect that branch in read-only mode — callers that compute
 * branch-scoping (e.g. `const hq = isHqRole(session.role)`) should also
 * check `!session.isViewOnly` so they scope to the single branch being
 * viewed rather than treating the caller as still seeing everything.
 *
 * This function itself never blocks a read — write-blocking during
 * view-only browsing is enforced by requireWriteSession, which every
 * mutating server action uses instead.
 */
export async function requireSession(): Promise<SessionPayload> {
  const { redirect } = await import("next/navigation");
  const session = await getSession();
  if (!session) {
    redirect("/login");
    throw new Error("unreachable");
  }

  const viewingBranchId = await getViewingBranchId();
  if (viewingBranchId && isHqRole(session.role)) {
    return {
      ...session,
      branchId: viewingBranchId,
      isViewOnly: true,
      realRole: session.role,
      realBranchId: session.branchId,
    };
  }
  return { ...session, isViewOnly: false, realRole: session.role, realBranchId: session.branchId };
}

/** Use at the top of every mutating server action instead of requireSession. */
export async function requireWriteSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.isViewOnly) {
    throw new ForbiddenError("You're viewing this branch in read-only mode — return to your own dashboard to make changes.");
  }
  return session;
}

