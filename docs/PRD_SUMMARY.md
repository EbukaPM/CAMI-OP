# PRD → Build status

Reference: `CAMI_OP_PRD_Merged.docx` (Consolidated Edition). Status as of the first scaffold pass.

| PRD Module | Status | Notes |
|---|---|---|
| 1. Organization & Branch Setup | **Working** | Branch CRUD, service schedule, status. Ministries modeled in schema; no dedicated UI yet. |
| 2. Identity, Users & Roles | **Working** | Login (JWT session), user creation, role+branch assignment, activate/deactivate. No password-reset flow yet. |
| 3. People & Membership | **Working (core)** | Member profiles, branch scoping, DOB/occupation/status. Household linking and pastoral follow-up records are modeled in schema but have no UI yet. |
| 4. Pastoral & Leadership Management | **Partial** | Preaching assignment scheduling + notification works. Appointment/posting/promotion history is modeled in schema but has no UI yet. |
| 5. Finance & Giving | **Working (core)** | Giving entry by category, expense submission + HQ approve/reject, running totals. Budgets modeled in schema, no UI yet. No PDF/Excel export wired up yet. |
| 6. Requests & Approval Workflow | **Working** | Full Branch → Verify → HQ Review → Approve/Reject → Disburse flow, with the PRD's example escalation rule (>₦500,000 requires the General Overseer) and a full action history per request. |
| 7. Documents, Memos & Records | **Working (core)** | Publish by scope (all/branch/role), optional read-acknowledgement. Uses an external file URL — no file upload/storage is wired up yet. |
| 8. Equipment & Asset Register | **Working, restriction enforced** | Asset CRUD by branch. The restricted total-count/total-worth view is enforced at the data layer (not just hidden in the UI) — only `BRANCH_PASTOR` (own branch) and `GENERAL_OVERSEER` (church-wide) can compute it, and every view is audit-logged. Maintenance records modeled in schema, no UI yet. |
| 9–10. Department Ops / Tasks | **Working (core)** | Task creation, assignment to a user or whole branch, Pending → In Progress → Submitted → Reviewed → Completed. |
| 11. Communication & Engagement | **Partial** | Announcements work. Birthday SMS auto-drafts a campaign from real member data and requires an explicit "review & send" click before anything goes out — sends are simulated/logged until Twilio credentials are configured. Absentee-based SMS targeting and in-app chat are not built yet. |
| 12. Dashboards, Analytics & Audit | **Partial** | Role-scoped overview dashboard with key stats; audit log viewer (HQ admin only). Branch drill-down and richer analytics/exports are not built yet. |

## Known gaps / next priorities

- File uploads (documents, request attachments, asset photos) currently take a URL rather than an actual upload — needs object storage (Netlify Blobs or S3, matching the pattern used in other projects).
- No PDF/Excel export yet (`@react-pdf/renderer` and `exceljs` are installed but unused).
- No automated tests yet.
- Household/family linking, pastoral follow-up workflow, appointment/promotion history, and budgets have data models but no screens.
- Absentee-based SMS targeting (vs. birthday-based, which is built) needs per-service attendance capture to be used in anger first.
