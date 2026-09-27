"use client";

import { Pencil } from "lucide-react";
import { MembershipStatus } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { updateMemberAction } from "../actions";

type MemberData = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  occupation: string | null;
  address: string | null;
  household: { name: string } | null;
  membershipStatus: MembershipStatus;
  baptismDate: Date | null;
  foundationClassDone: boolean;
  attendanceNotes: string | null;
  notes: string | null;
};

function toDateInput(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function EditMemberModal({ member }: { member: MemberData }) {
  return (
    <ModalForm
      trigger={
        <Button variant="secondary">
          <Pencil size={14} /> Edit member
        </Button>
      }
      title="Edit member"
      action={updateMemberAction}
      submitLabel="Save changes"
      size="lg"
    >
      <input type="hidden" name="memberId" value={member.id} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="firstName" required defaultValue={member.firstName} />
        </Field>
        <Field label="Last name">
          <Input name="lastName" required defaultValue={member.lastName} />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={member.phone ?? ""} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={member.email ?? ""} />
        </Field>
        <Field label="Date of birth">
          <Input name="dateOfBirth" type="date" defaultValue={toDateInput(member.dateOfBirth)} />
        </Field>
        <Field label="Gender">
          <Select name="gender" defaultValue={member.gender ?? ""}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
        </Field>
        <Field label="Occupation">
          <Input name="occupation" defaultValue={member.occupation ?? ""} />
        </Field>
        <Field label="Household / family name">
          <Input name="householdName" defaultValue={member.household?.name ?? ""} placeholder="e.g. The Adeyemi Family" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <Input name="address" defaultValue={member.address ?? ""} />
          </Field>
        </div>
        <Field label="Membership status">
          <Select name="membershipStatus" required defaultValue={member.membershipStatus}>
            {Object.values(MembershipStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Baptism date">
          <Input name="baptismDate" type="date" defaultValue={toDateInput(member.baptismDate)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 sm:col-span-2">
          <input type="checkbox" name="foundationClassDone" defaultChecked={member.foundationClassDone} /> Completed foundation class
        </label>
        <div className="sm:col-span-2">
          <Field label="Photo (optional, max 4MB)">
            <Input name="photo" type="file" accept="image/*" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Attendance notes">
            <Textarea name="attendanceNotes" rows={2} defaultValue={member.attendanceNotes ?? ""} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="General notes">
            <Textarea name="notes" rows={2} defaultValue={member.notes ?? ""} />
          </Field>
        </div>
      </div>
    </ModalForm>
  );
}
