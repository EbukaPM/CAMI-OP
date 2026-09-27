import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/rbac";
import { acknowledgeDocumentAction } from "./actions";
import { CreateDocumentModal } from "./create-document-modal";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function DocumentsPage() {
  const session = await requireSession();
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Documents &amp; Memos</h1>
          <p className="text-sm text-slate-500">Memos, policies, minutes, letters, and certificates.</p>
        </div>
        {canPublish && <CreateDocumentModal branches={branches} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((d) => {
            const href = d.fileAssetId ? `/api/files/${d.fileAssetId}` : d.fileUrl ?? "#";
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
                <div>
                  <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-900 hover:underline dark:text-slate-100">
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
            );
          })}
          {documents.length === 0 && <p className="text-sm text-slate-500">No documents published yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
