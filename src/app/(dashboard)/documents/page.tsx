import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/rbac";
import { acknowledgeDocumentAction } from "./actions";
import { CreateDocumentModal } from "./create-document-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { pageSkipTake } from "@/lib/pagination";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { DocumentType } from "@prisma/client";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ type?: string; page?: string }> }) {
  const session = await requireSession();
  const canPublish = canManageUsers(session) && !session.isViewOnly;
  const sp = await searchParams;

  const typeFilter = sp.type && sp.type in DocumentType ? (sp.type as DocumentType) : undefined;
  const where = {
    OR: [{ scope: "ALL" as const }, { scope: "BRANCH" as const, targetBranchId: session.branchId ?? "__none__" }, { scope: "ROLE" as const, targetRole: session.role }],
    ...(typeFilter ? { type: typeFilter } : {}),
  };
  const { page, skip, take } = pageSkipTake(sp.page);

  const [documents, branches, totalCount] = await Promise.all([
    db.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { uploadedBy: { select: { fullName: true } }, acknowledgements: { where: { userId: session.userId } } },
    }),
    canPublish ? db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    db.document.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents & Memos"
        description="Memos, policies, minutes, letters, and certificates."
        actions={canPublish ? <CreateDocumentModal branches={branches} /> : undefined}
      />

      <div className="w-56">
        <Field label="Type">
          <AutoSubmitSelect paramName="type" defaultValue={sp.type ?? ""}>
            <option value="">All types</option>
            {Object.values(DocumentType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </AutoSubmitSelect>
        </Field>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents ({totalCount})</CardTitle>
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
                      !session.isViewOnly && (
                        <form action={acknowledgeDocumentAction}>
                          <input type="hidden" name="documentId" value={d.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            Acknowledge
                          </Button>
                        </form>
                      )
                    ))}
                </div>
              </div>
            );
          })}
          {documents.length === 0 && <p className="text-sm text-slate-500">No documents match this filter.</p>}
        </CardContent>
        <Pagination page={page} pageSize={take} totalCount={totalCount} basePath="/documents" searchParams={sp} />
      </Card>
    </div>
  );
}
