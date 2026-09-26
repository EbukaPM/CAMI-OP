import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/rbac";
import { createDocumentAction, acknowledgeDocumentAction } from "./actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ErrorText, Field, Input, Select } from "@/components/ui/primitives";
import { formatDate, ROLE_LABELS } from "@/lib/utils";
import { DocumentType, DocumentScope, Role } from "@prisma/client";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  const { error } = await searchParams;
  const canPublish = canManageUsers(session);

  const [documents, branches] = await Promise.all([
    db.document.findMany({
      where: {
        OR: [
          { scope: "ALL" },
          { scope: "BRANCH", targetBranchId: session.branchId ?? "__none__" },
          { scope: "ROLE", targetRole: session.role },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { fullName: true } }, acknowledgements: { where: { userId: session.userId } } },
      take: 100,
    }),
    canPublish ? db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Documents &amp; Memos</h1>
        <p className="text-sm text-slate-500">Memos, policies, minutes, letters, and certificates.</p>
      </div>

      {canPublish && (
        <Card>
          <CardHeader>
            <CardTitle>Publish a document</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDocumentAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Type">
                <Select name="type" required defaultValue={DocumentType.MEMO}>
                  {Object.values(DocumentType).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Title">
                <Input name="title" required />
              </Field>
              <Field label="File URL">
                <Input name="fileUrl" type="url" required placeholder="https://..." />
              </Field>
              <Field label="Distribute to">
                <Select name="scope" required defaultValue={DocumentScope.ALL}>
                  <option value={DocumentScope.ALL}>Everyone</option>
                  <option value={DocumentScope.BRANCH}>A specific branch</option>
                  <option value={DocumentScope.ROLE}>A specific role</option>
                </Select>
              </Field>
              <Field label="Branch (if scope = branch)">
                <Select name="targetBranchId" defaultValue="">
                  <option value="">—</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Role (if scope = role)">
                <Select name="targetRole" defaultValue="">
                  <option value="">—</option>
                  {Object.values(Role).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input type="checkbox" name="requiresAck" /> Require read acknowledgement
              </label>
              <div className="sm:col-span-2">
                <ErrorText>{error}</ErrorText>
                <Button type="submit">Publish</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
              <div>
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-900 hover:underline dark:text-slate-100">
                  {d.title}
                </a>
                <p className="text-xs text-slate-500">
                  {d.type} · by {d.uploadedBy.fullName} · {formatDate(d.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color="blue">{d.scope}</Badge>
                {d.requiresAck &&
                  (d.acknowledgements.length > 0 ? (
                    <Badge color="green">Acknowledged</Badge>
                  ) : (
                    <form action={acknowledgeDocumentAction}>
                      <input type="hidden" name="documentId" value={d.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        Acknowledge
                      </Button>
                    </form>
                  ))}
              </div>
            </div>
          ))}
          {documents.length === 0 && <p className="text-sm text-slate-500">No documents published yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
