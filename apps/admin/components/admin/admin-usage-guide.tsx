"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Modal } from "@/components/admin/ui";
import { DEFAULT_STAFF_LOGINS } from "@/lib/default-staff-accounts";
import { hasPermission, type StaffAccess } from "@/lib/rbac";

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line pb-4 last:border-0 last:pb-0">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function canSeeAdminUsageGuide(staff: StaffAccess | null | undefined) {
  if (!staff) return false;
  if (staff.isSuperAdmin) return true;
  return hasPermission(staff, "staff_management.view");
}

export function AdminUsageGuideButton({ staff }: { staff: StaffAccess | null | undefined }) {
  const [open, setOpen] = useState(false);

  if (!canSeeAdminUsageGuide(staff)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-ink hover:bg-elevated"
      >
        <BookOpen size={15} className="text-brand" />
        Usage guide
      </button>

      <Modal open={open} title="Admin panel usage guide" onClose={() => setOpen(false)} xl>
        <div className="space-y-5">
          <p className="text-sm text-muted">
            How to set up staff accounts, roles, and page permissions in Najik admin. Super Admin manages this from{" "}
            <Link href="/admin/staff" className="font-semibold text-brand hover:underline" onClick={() => setOpen(false)}>
              Admin &amp; Staff
            </Link>
            .
          </p>

          <GuideSection title="1. How permissions work">
            <p>
              Each admin page has four actions: <strong className="text-ink">View</strong> (read only),{" "}
              <strong className="text-ink">Create</strong>, <strong className="text-ink">Update</strong> (approve, block,
              edit, pause), and <strong className="text-ink">Delete</strong>.
            </p>
            <p>
              Staff with <strong className="text-ink">View only</strong> can open the page and see data, but cannot edit,
              delete, or change status. The API also blocks unauthorized actions.
            </p>
            <p>
              Notifications and sidebar badges only show items for pages the staff member can access.
            </p>
          </GuideSection>

          <GuideSection title="2. Create a custom role">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Open <Link href="/admin/staff" className="text-brand hover:underline" onClick={() => setOpen(false)}>Admin &amp; Staff</Link>.
              </li>
              <li>Go to the <strong className="text-ink">Roles</strong> tab.</li>
              <li>Click <strong className="text-ink">Custom role</strong>, enter a name and description.</li>
              <li>
                Use the permission matrix — expand each page (User Management, KYC, Properties, etc.) and tick the actions
                this role needs.
              </li>
              <li>Save the role. You can edit permissions later; changes apply on the staff member&apos;s next login or refresh.</li>
            </ol>
          </GuideSection>

          <GuideSection title="3. Edit an existing role">
            <p>
              System roles (Admin, Moderator, Verification Officer, Support Agent, Business Manager) can be edited by Super
              Admin. Click a role card → adjust the matrix → save.
            </p>
            <p>
              Tip: For a <strong className="text-ink">Reports manager</strong>, grant{" "}
              <code className="rounded bg-elevated px-1 text-ink">reports_complaints.view</code> and{" "}
              <code className="rounded bg-elevated px-1 text-ink">reports_complaints.update</code> only — do not grant KYC or
              seller activation permissions unless they need them.
            </p>
          </GuideSection>

          <GuideSection title="4. Create a staff account">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                On <Link href="/admin/staff" className="text-brand hover:underline" onClick={() => setOpen(false)}>Admin &amp; Staff</Link>, stay on the{" "}
                <strong className="text-ink">Staff</strong> tab.
              </li>
              <li>Click <strong className="text-ink">Add staff</strong>.</li>
              <li>Enter name, email, temporary password (must meet strength rules), and assign a role.</li>
              <li>
                On first login, staff must verify with OTP <strong className="text-ink">1234</strong> (dev/demo) and change
                their password before using the panel.
              </li>
              <li>Super Admin can change a staff email from the edit drawer.</li>
            </ol>
          </GuideSection>

          <GuideSection title="5. Default demo staff logins">
            <p>These are created automatically on deploy (change passwords after first login):</p>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[420px] text-left text-[12px]">
                <thead className="bg-elevated/60 text-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Role</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Temp password</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_STAFF_LOGINS.map((row) => (
                    <tr key={row.email} className="border-t border-line">
                      <td className="px-3 py-2 text-ink">{row.role}</td>
                      <td className="px-3 py-2 font-mono text-ink">{row.email}</td>
                      <td className="px-3 py-2 font-mono text-ink">{row.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GuideSection>

          <GuideSection title="6. Manage app users (buyers & sellers)">
            <p>
              On <Link href="/admin/users" className="text-brand hover:underline" onClick={() => setOpen(false)}>User Management</Link>, staff
              with <code className="rounded bg-elevated px-1 text-ink">user_management.view</code> can browse accounts.
            </p>
            <p>
              To let someone block, activate, or send notes to users, also grant{" "}
              <code className="rounded bg-elevated px-1 text-ink">user_management.update</code>. Delete requires{" "}
              <code className="rounded bg-elevated px-1 text-ink">user_management.delete</code>.
            </p>
          </GuideSection>

          <GuideSection title="7. Login & landing pages">
            <p>
              Staff are not sent to the full dashboard unless they have <code className="rounded bg-elevated px-1 text-ink">dashboard.view</code>.
              After login they land on their first allowed page (e.g. Reports, KYC, Users).
            </p>
            <p>Only Super Admin sees every page and all notifications.</p>
          </GuideSection>

          <GuideSection title="8. Reset staff password">
            <p>
              Super Admin can reset a staff password from the staff edit drawer. The staff member will be forced to set a new
              password on next login.
            </p>
          </GuideSection>
        </div>
      </Modal>
    </>
  );
}
