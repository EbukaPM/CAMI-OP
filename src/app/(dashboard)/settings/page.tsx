import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSettings, ForbiddenError } from "@/lib/rbac";
import { getChurchSettings } from "@/lib/settings";
import { ALL_MODULES } from "@/lib/permissions";
import { BrandingForm } from "./branding-form";
import { GrantAccessModal } from "./grant-access-modal";
import { updateModulePermissionsAction, revokeUserModuleGrantAction } from "./actions";
import { PageHeader } from "@/components/ui/page-header";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { ROLE_LABELS } from "@/lib/utils";
import { Role } from "@prisma/client";
import { NAV_ITEMS } from "@/lib/nav";

export default async function SettingsPage() {
  const session = await requireSession();
  if (session.isViewOnly) throw new ForbiddenError("Not available while viewing a branch's portal.");
  if (!canManageSettings(session)) throw new ForbiddenError("Settings are restricted to Headquarters administrators.");

  const [settings, modulePermissions, grants, users] = await Promise.all([
    getChurchSettings(),
    db.modulePermission.findMany(),
    db.userModuleGrant.findMany({ include: { user: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } }),
    db.user.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
  ]);

  const roles = Object.values(Role);
  const defaultAllowed = (role: Role, moduleKey: string) => {
    const item = NAV_ITEMS.find((i) => (i.href.slice(1) || "dashboard") === moduleKey);
    return !item?.roles || item.roles.includes(role);
  };
  const isChecked = (role: Role, moduleKey: string) => {
    const override = modulePermissions.find((p) => p.role === role && p.module === moduleKey);
    return override ? override.allowed : defaultAllowed(role, moduleKey);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Branding and role-based module access — Headquarters administrators only." />

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandingForm churchName={settings.churchName} primaryColor={settings.primaryColor} logoFileAssetId={settings.logoFileAssetId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Which roles can see which modules</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-slate-500">
            This controls sidebar visibility only. Hard security rules — branch scoping, the restricted equipment
            valuation — aren&apos;t affected by these toggles.
          </p>
          <form action={updateModulePermissionsAction} className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3">Role</th>
                  {ALL_MODULES.map((m) => (
                    <th key={m.key} className="px-1.5 py-2 text-center font-normal">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-100">{ROLE_LABELS[role]}</td>
                    {ALL_MODULES.map((m) => (
                      <td key={m.key} className="px-1.5 py-2 text-center">
                        <input type="checkbox" name={`perm__${role}__${m.key}`} defaultChecked={isChecked(role, m.key)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="submit" className="mt-4">
              Save role access
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extra access for individual users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <GrantAccessModal users={users} modules={ALL_MODULES} />
          <div className="space-y-2">
            {grants.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{g.user.fullName}</span>{" "}
                  <span className="text-slate-500">— {ALL_MODULES.find((m) => m.key === g.module)?.label ?? g.module}</span>
                </span>
                <form action={revokeUserModuleGrantAction}>
                  <input type="hidden" name="grantId" value={g.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Revoke
                  </Button>
                </form>
              </div>
            ))}
            {grants.length === 0 && <p className="text-sm text-slate-500">No individual grants yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
