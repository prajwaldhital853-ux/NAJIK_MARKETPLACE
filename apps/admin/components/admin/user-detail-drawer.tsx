"use client";

import { useEffect, useState } from "react";
import { DetailOverlay } from "./detail-overlay";
import { UserListingsPanel } from "./user-listings-panel";
import { Avatar, Btn, Field, StatusBadge, inputClass } from "./ui";
import { Kv } from "./resource-page";
import { useAdmin } from "@/lib/store";
import { toastAdminError } from "@/lib/rbac";
import { usePageRbac } from "@/lib/use-page-rbac";
import type { User } from "@/lib/demo-data";

export function userDocuments(u: User) {
  return [
    { label: "Profile photo", src: u.photo_uri || u.avatar_uri },
    { label: "Citizenship front (Nagrita)", src: u.nagrita_uri },
    { label: "Citizenship back", src: u.nagrita_back_uri },
    { label: "Nation card", src: u.nation_card_uri },
    { label: "Other document", src: u.other_document_uri },
  ].filter((d) => d.src);
}

export function UserDetailDrawer({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const admin = useAdmin();
  const { canUpdate, canDelete, readOnly } = usePageRbac("user_management");
  const [note, setNote] = useState("");
  const [listingsOpen, setListingsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNote("");
      return;
    }
    setNote(user.staff_warning || "");
    admin.markInboxSeen(`user-${user.id}`);
  }, [user?.id]);

  const isProvider = user?.role === "provider";

  async function runAction(key: string, fn: () => Promise<void>) {
    setLoading(key);
    try {
      await fn();
    } catch (err) {
      toastAdminError(admin.toast, err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <DetailOverlay
        open={!!user}
        title={user?.name || "User"}
        onClose={onClose}
        details={
          user ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} id={user.id} size={48} />
                <div>
                  <p className="font-semibold text-ink">{user.name}</p>
                  <StatusBadge status={user.status} />
                </div>
              </div>
              <Kv label="Email" value={user.email} />
              <Kv label="Phone" value={user.phone} />
              <Kv label="City" value={user.city} />
              <Kv label="Role" value={user.role} />
              <Kv label="Joined" value={user.joined} />
              {isProvider ? <Kv label="Listings" value={user.listings} /> : null}
              {isProvider ? <Kv label="KYC" value={user.kyc} /> : null}
              {isProvider ? <Kv label="Segment" value={user.category} /> : null}
              <Kv label="Status" value={user.status} />
              {user.staff_warning ? <Kv label="Current note to user" value={user.staff_warning} /> : null}
            </div>
          ) : null
        }
        documents={user && isProvider ? userDocuments(user) : []}
        footer={
          user ? (
            <div className="space-y-3 text-sm">
              {readOnly ? (
                <p className="rounded-xl border border-line bg-elevated px-3 py-2 text-xs text-muted">
                  View-only access — you cannot edit, block, or deactivate users.
                </p>
              ) : null}
              {isProvider ? (
                <Btn kind="primary" onClick={() => setListingsOpen(true)}>
                  See all listings of this user
                </Btn>
              ) : null}
              {canUpdate ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Moderation</p>
                  <Field label="Note for user (shown in app)">
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Write a note the user will see on Home and Profile"
                    />
                  </Field>
                  <div className="flex flex-wrap items-center gap-2">
                    <Btn
                      kind="primary"
                      loading={loading === "note"}
                      loadingLabel="Sending…"
                      onClick={() =>
                        void runAction("note", async () => {
                          if (!note.trim()) {
                            admin.toast("Write a note before sending.");
                            return;
                          }
                          await admin.patch("users", user.id, { staff_warning: note.trim(), notes: note.trim() });
                          admin.toast("Note sent to user.");
                        })
                      }
                    >
                      Send note
                    </Btn>
                    <Btn
                      kind="ghost"
                      loading={loading === "clear"}
                      loadingLabel="Clearing…"
                      onClick={() =>
                        void runAction("clear", async () => {
                          await admin.patch("users", user.id, { staff_warning: "", notes: "" });
                          admin.toast("Note cleared.");
                          setNote("");
                        })
                      }
                    >
                      Clear note
                    </Btn>
                    {(["active", "deactivated", "blocked"] as const).map((s) => (
                      <Btn
                        key={s}
                        kind={s === "blocked" || s === "deactivated" ? "danger" : "ghost"}
                        loading={loading === s}
                        loadingLabel={`${s === "active" ? "Activating" : s === "blocked" ? "Blocking" : "Deactivating"}…`}
                        onClick={() =>
                          void runAction(s, async () => {
                            const patchData = note.trim()
                              ? { status: s, staff_warning: note.trim(), notes: note.trim() }
                              : { status: s };
                            await admin.patch("users", user.id, patchData);
                            admin.toast(
                              s === "active"
                                ? "Account is active."
                                : s === "blocked"
                                  ? "Account blocked."
                                  : "Account deactivated.",
                            );
                          })
                        }
                      >
                        {s}
                      </Btn>
                    ))}
                  </div>
                </div>
              ) : null}
              {canDelete ? (
                <Btn
                  kind="danger"
                  loading={loading === "delete"}
                  loadingLabel="Deleting…"
                  onClick={() => {
                    if (!window.confirm("Delete this account and all of their listings? This cannot be undone.")) return;
                    void runAction("delete", async () => {
                      await admin.remove("users", user.id);
                      admin.toast("Deleted.");
                      onClose();
                    });
                  }}
                >
                  Delete
                </Btn>
              ) : null}
            </div>
          ) : null
        }
      />
      {user && listingsOpen && isProvider ? (
        <UserListingsPanel userId={user.id} userName={user.name} onClose={() => setListingsOpen(false)} />
      ) : null}
    </>
  );
}
