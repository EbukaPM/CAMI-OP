import { PrismaClient, Role, AssetCondition } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "CamiOp#2026";

async function main() {
  console.log("Seeding CAMI OP demo data...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const categories = await Promise.all(
    [
      ["Offering per Service", "OFFERING"],
      ["Tithe", "TITHE"],
      ["Pastors' Seed", "PASTORS_SEED"],
      ["Suya Seed", "SUYA_SEED"],
      ["Pastors' Birthday Giving", "PASTORS_BIRTHDAY"],
      ["Father's Day Giving", "FATHERS_DAY"],
    ].map(([name, code]) => db.givingCategory.upsert({ where: { code }, update: {}, create: { name, code } }))
  );

  const branchDefs = [
    { name: "CAMI Church — Headquarters Campus", code: "HQ-01", city: "Lagos", state: "Lagos" },
    { name: "CAMI Church — Lekki", code: "LEKKI-01", city: "Lagos", state: "Lagos" },
    { name: "CAMI Church — Abuja", code: "ABJ-01", city: "Abuja", state: "FCT" },
  ];

  const branches = [];
  for (const b of branchDefs) {
    const branch = await db.branch.upsert({
      where: { code: b.code },
      update: {},
      create: { ...b, country: "Nigeria", serviceSchedule: "Sundays 8am & 10am", status: "ACTIVE" },
    });
    branches.push(branch);
  }
  const [hq, lekki, abuja] = branches;

  const overseer = await db.user.upsert({
    where: { email: "overseer@camichurch.org" },
    update: {},
    create: { email: "overseer@camichurch.org", fullName: "Apostle Samuel Adeyemi", role: Role.GENERAL_OVERSEER, passwordHash },
  });
  await db.user.upsert({
    where: { email: "hqadmin@camichurch.org" },
    update: {},
    create: { email: "hqadmin@camichurch.org", fullName: "Grace Okonkwo", role: Role.HQ_ADMIN, passwordHash },
  });
  await db.user.upsert({
    where: { email: "hqfinance@camichurch.org" },
    update: {},
    create: { email: "hqfinance@camichurch.org", fullName: "David Umeh", role: Role.HQ_FINANCE, passwordHash },
  });

  async function seedBranchStaff(branchId: string, slug: string, branchLabel: string) {
    const pastor = await db.user.upsert({
      where: { email: `${slug}.pastor@camichurch.org` },
      update: {},
      create: {
        email: `${slug}.pastor@camichurch.org`,
        fullName: `Pastor ${branchLabel} Lead`,
        role: Role.BRANCH_PASTOR,
        branchId,
        passwordHash,
      },
    });
    await db.pastorProfile.upsert({ where: { userId: pastor.id }, update: {}, create: { userId: pastor.id, bio: `Resident pastor at ${branchLabel}.` } });

    await db.user.upsert({
      where: { email: `${slug}.admin@camichurch.org` },
      update: {},
      create: { email: `${slug}.admin@camichurch.org`, fullName: `${branchLabel} Branch Admin`, role: Role.BRANCH_ADMIN, branchId, passwordHash },
    });
    const finance = await db.user.upsert({
      where: { email: `${slug}.finance@camichurch.org` },
      update: {},
      create: { email: `${slug}.finance@camichurch.org`, fullName: `${branchLabel} Finance Officer`, role: Role.FINANCE_OFFICER, branchId, passwordHash },
    });
    await db.user.upsert({
      where: { email: `${slug}.leader@camichurch.org` },
      update: {},
      create: { email: `${slug}.leader@camichurch.org`, fullName: `${branchLabel} Ministry Leader`, role: Role.MINISTRY_LEADER, branchId, passwordHash },
    });
    await db.user.upsert({
      where: { email: `${slug}.worker@camichurch.org` },
      update: {},
      create: { email: `${slug}.worker@camichurch.org`, fullName: `${branchLabel} Usher`, role: Role.WORKER, branchId, passwordHash },
    });

    return { pastor, finance };
  }

  await seedBranchStaff(hq.id, "hq", "HQ");
  const lekkiStaff = await seedBranchStaff(lekki.id, "lekki", "Lekki");
  const abujaStaff = await seedBranchStaff(abuja.id, "abuja", "Abuja");

  // Members with a mix of birthdays (some within the next 7 days for the SMS demo)
  const today = new Date();
  function inDays(n: number) {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    d.setFullYear(1990);
    return d;
  }

  const memberSeeds = [
    { branch: hq, first: "Chidinma", last: "Eze", dob: inDays(2), phone: "+2348010000001" },
    { branch: hq, first: "Tunde", last: "Bakare", dob: inDays(40), phone: "+2348010000002" },
    { branch: lekki, first: "Ifeoma", last: "Nwosu", dob: inDays(5), phone: "+2348010000003" },
    { branch: lekki, first: "Emeka", last: "Obi", dob: inDays(120), phone: "+2348010000004" },
    { branch: abuja, first: "Bilkisu", last: "Musa", dob: inDays(1), phone: "+2348010000005" },
    { branch: abuja, first: "John", last: "Adamu", dob: inDays(200), phone: "+2348010000006" },
  ];

  for (const m of memberSeeds) {
    const existing = await db.member.findFirst({ where: { firstName: m.first, lastName: m.last, branchId: m.branch.id } });
    if (!existing) {
      await db.member.create({
        data: { branchId: m.branch.id, firstName: m.first, lastName: m.last, dateOfBirth: m.dob, phone: m.phone, membershipStatus: "ACTIVE" },
      });
    }
  }

  // Equipment for the restricted valuation demo
  const assetSeeds = [
    { branch: hq, name: "Main Auditorium PA System", category: "Sound", value: 8_500_000 },
    { branch: hq, name: "Livestream Camera Rig", category: "Media", value: 4_200_000 },
    { branch: lekki, name: "Backup Generator", category: "Facilities", value: 3_000_000 },
    { branch: lekki, name: "Projector Set", category: "Media", value: 900_000 },
    { branch: abuja, name: "Keyboard & Drum Kit", category: "Instruments", value: 2_100_000 },
  ];
  for (const a of assetSeeds) {
    const existing = await db.asset.findFirst({ where: { name: a.name, branchId: a.branch.id } });
    if (!existing) {
      await db.asset.create({
        data: { branchId: a.branch.id, name: a.name, category: a.category, purchaseValue: a.value, condition: AssetCondition.GOOD },
      });
    }
  }

  // Giving + expenses
  const offeringCat = categories.find((c) => c.code === "OFFERING")!;
  const titheCat = categories.find((c) => c.code === "TITHE")!;
  for (const branch of [hq, lekki, abuja]) {
    const svc = await db.service.create({ data: { branchId: branch.id, date: new Date(), type: "Sunday Service", totalAttendance: 180 } });
    await db.givingRecord.create({
      data: { branchId: branch.id, serviceId: svc.id, categoryId: offeringCat.id, amount: 450_000, recordedById: overseer.id },
    });
    await db.givingRecord.create({
      data: { branchId: branch.id, serviceId: svc.id, categoryId: titheCat.id, amount: 620_000, recordedById: overseer.id },
    });
    await db.expenseRecord.create({
      data: { branchId: branch.id, category: "Utilities", amount: 85_000, status: "APPROVED", recordedById: overseer.id, approvedById: overseer.id },
    });
  }

  // Requests demonstrating the approval flow, including one above the escalation threshold
  await db.request.create({
    data: {
      branchId: lekki.id,
      createdById: lekkiStaff.pastor.id,
      type: "REPAIR",
      title: "Roof leak repair — main hall",
      description: "Roof has been leaking during rain, needs urgent repair before the rainy season.",
      amount: 750_000,
      priority: "HIGH",
      status: "HQ_REVIEW",
      approvalActions: { create: [{ actorId: lekkiStaff.pastor.id, action: "COMMENT", comment: "Request submitted." }, { actorId: lekkiStaff.finance.id, action: "VERIFY", comment: "Quotation attached, verified." }] },
    },
  });
  await db.request.create({
    data: {
      branchId: abuja.id,
      createdById: abujaStaff.pastor.id,
      type: "SUPPLIES",
      title: "Children's church learning materials",
      description: "Restocking books and craft supplies for the children's ministry.",
      amount: 120_000,
      priority: "NORMAL",
      status: "SUBMITTED",
      approvalActions: { create: [{ actorId: abujaStaff.pastor.id, action: "COMMENT", comment: "Request submitted." }] },
    },
  });

  await db.churchTheme.upsert({
    where: { month_year: { month: today.getMonth() + 1, year: today.getFullYear() } },
    update: {},
    create: {
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      title: "Year of Overflowing Grace",
      description: "A season of divine multiplication in every area of church life.",
    },
  });

  await db.announcement.create({
    data: { title: "Welcome to CAMI OP", body: "This is the new Operations Portal for Headquarters and all branches.", scope: "ALL", createdById: overseer.id },
  });

  await db.document.create({
    data: {
      type: "MEMO",
      title: "Q1 Reporting Guidelines",
      fileUrl: "https://example.com/q1-reporting-guidelines.pdf",
      scope: "ALL",
      requiresAck: true,
      uploadedById: overseer.id,
    },
  });

  console.log("Seed complete.");
  console.log(`Demo password for all seeded accounts: ${DEMO_PASSWORD}`);
  console.log("Try: overseer@camichurch.org, hqadmin@camichurch.org, lekki.pastor@camichurch.org");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
