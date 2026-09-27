import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessFinance, isHqRole } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";

// The ₦ glyph isn't in @react-pdf/renderer's built-in Helvetica font, so it
// renders as a missing-glyph box — use a plain "NGN" prefix in the PDF only.
function pdfCurrency(amount: number | string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return `NGN ${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)}`;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0f172a", paddingBottom: 4, marginBottom: 2 },
  cell: { flex: 1 },
  headerCell: { flex: 1, fontWeight: 700 },
  statRow: { flexDirection: "row", gap: 24, marginBottom: 8 },
  stat: { fontSize: 11 },
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branchId = req.nextUrl.searchParams.get("branchId") ?? undefined;
  if (branchId && !canAccessFinance(session, branchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const hq = isHqRole(session.role);
  const branchWhere = branchId ? { branchId } : hq ? {} : { branchId: session.branchId ?? "__none__" };

  const [branch, giving, expenses] = await Promise.all([
    branchId ? db.branch.findUnique({ where: { id: branchId }, select: { name: true } }) : null,
    db.givingRecord.findMany({
      where: branchWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { category: true, branch: { select: { name: true } } },
    }),
    db.expenseRecord.findMany({
      where: branchWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { branch: { select: { name: true } } },
    }),
  ]);

  const totalGiving = giving.reduce((sum, g) => sum + Number(g.amount), 0);
  const totalExpense = expenses.filter((e) => e.status === "APPROVED").reduce((sum, e) => sum + Number(e.amount), 0);

  const pdfDoc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CAMI OP — Finance Report</Text>
        <Text style={styles.subtitle}>
          {branch?.name ?? "All branches"} · Generated {formatDate(new Date())}
        </Text>

        <View style={styles.statRow}>
          <Text style={styles.stat}>Total Giving: {pdfCurrency(totalGiving)}</Text>
          <Text style={styles.stat}>Approved Expenses: {pdfCurrency(totalExpense)}</Text>
          <Text style={styles.stat}>Net: {pdfCurrency(totalGiving - totalExpense)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Giving records</Text>
        <View style={styles.headerRow}>
          {!branchId && <Text style={styles.headerCell}>Branch</Text>}
          <Text style={styles.headerCell}>Category</Text>
          <Text style={styles.headerCell}>Amount</Text>
          <Text style={styles.headerCell}>Date</Text>
        </View>
        {giving.map((g) => (
          <View key={g.id} style={styles.row}>
            {!branchId && <Text style={styles.cell}>{g.branch.name}</Text>}
            <Text style={styles.cell}>{g.category.name}</Text>
            <Text style={styles.cell}>{pdfCurrency(g.amount.toString())}</Text>
            <Text style={styles.cell}>{formatDate(g.createdAt)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Expense records</Text>
        <View style={styles.headerRow}>
          {!branchId && <Text style={styles.headerCell}>Branch</Text>}
          <Text style={styles.headerCell}>Category</Text>
          <Text style={styles.headerCell}>Amount</Text>
          <Text style={styles.headerCell}>Status</Text>
          <Text style={styles.headerCell}>Date</Text>
        </View>
        {expenses.map((e) => (
          <View key={e.id} style={styles.row}>
            {!branchId && <Text style={styles.cell}>{e.branch.name}</Text>}
            <Text style={styles.cell}>{e.category}</Text>
            <Text style={styles.cell}>{pdfCurrency(e.amount.toString())}</Text>
            <Text style={styles.cell}>{e.status}</Text>
            <Text style={styles.cell}>{formatDate(e.createdAt)}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(pdfDoc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cami-op-finance-report.pdf"`,
    },
  });
}
