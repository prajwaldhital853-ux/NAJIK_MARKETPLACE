"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, SummaryStrip, AdminLoadingState } from "@/components/admin/page-frame";
import { Btn, Field, StatusBadge, inputClass } from "@/components/admin/ui";
import { InboxList, InboxMarkAllButton } from "@/components/admin/inbox-list";
import { formatNptDateTime } from "@/lib/format";
import { ADMIN_POLL_FALLBACK_MS } from "@/lib/event-stream";
import { useSession } from "@/lib/session";
import { useAdmin } from "@/lib/store";
import { toastAdminError } from "@/lib/rbac";
import { ReadOnlyBanner, useRbacGuard } from "@/lib/use-page-rbac";
import {
  createAppNotice,
  deleteAppNotice,
  fetchStaffImage,
  listAppNotices,
  setAppNoticeActive,
  type AppNotice,
} from "@/lib/staff-api";

const AUDIENCES = [
  { value: "all", label: "All users (buyers + sellers)" },
  { value: "buyer", label: "Buyers only" },
  { value: "provider", label: "Sellers only" },
] as const;

async function fileToDataUri(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const type = file.type || "image/jpeg";
  return `data:${type};base64,${base64}`;
}

export default function NotificationsPage() {
  const { apiSession } = useSession();
  const { toast, inbox, inboxCount, markInboxSeen } = useAdmin();
  const { readOnly, canCreate, canUpdate, canDelete, guardCreate, guardUpdate, guardDelete } = useRbacGuard("notifications");
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["value"]>("all");
  const [imageUri, setImageUri] = useState("");
  const [imageName, setImageName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    if (!apiSession) return;
    if (opts?.refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setNotices(await listAppNotices());
      setError("");
    } catch (err) {
      setNotices([]);
      setError(err instanceof Error ? err.message : "Could not load notices.");
    } finally {
      if (opts?.refresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [apiSession]);

  useEffect(() => {
    if (!apiSession) {
      setNotices([]);
      setError("Sign in with a staff account to send in-app notices.");
      return;
    }
    void load();
    const id = window.setInterval(() => void load({ refresh: true }), ADMIN_POLL_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [apiSession, load]);

  async function send() {
    if (!guardCreate()) return;
    if (!title.trim()) {
      toast("Add a title.");
      return;
    }
    setBusy(true);
    try {
      await createAppNotice({
        title: title.trim(),
        body: body.trim(),
        audience,
        ...(imageUri ? { image_uri: imageUri } : {}),
      });
      toast("In-app notice sent. It shows when matching users open the app.");
      setTitle("");
      setBody("");
      setImageUri("");
      setImageName("");
      await load();
    } catch (err) {
      toastAdminError(toast, err, "Could not send notice.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Image must be 2 MB or smaller.");
      return;
    }
    try {
      setImageUri(await fileToDataUri(file));
      setImageName(file.name);
    } catch {
      toast("Could not read that image.");
    }
  }

  const active = notices.filter((n) => n.is_active);

  function markAllInboxRead() {
    if (!inbox.length) {
      toast("No unread notifications.");
      return;
    }
    markInboxSeen(inbox.map((item) => item.id));
    toast(`${inbox.length} notification${inbox.length === 1 ? "" : "s"} marked as read.`);
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        summary="Send in-app notices to all users, buyers only, or sellers only. Notices appear when the app opens until you remove them here."
      />
      <SummaryStrip
        items={[
          { label: "Waiting inbox", value: inboxCount, tone: "amber" },
          { label: "Active notices", value: active.length, tone: "green" },
          { label: "Total notices", value: notices.length, tone: "brand" },
          { label: "Buyers targeted", value: notices.filter((n) => n.audience === "buyer" && n.is_active).length, tone: "brand" },
          { label: "Sellers targeted", value: notices.filter((n) => n.audience === "provider" && n.is_active).length, tone: "amber" },
        ]}
      />

      <section className="mb-4 overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="text-sm font-semibold text-ink">
            Live queue {inboxCount ? `(${inboxCount} unread)` : ""}
          </div>
          <InboxMarkAllButton count={inboxCount} onMarkAll={markAllInboxRead} />
        </div>
        <InboxList
          items={inbox}
          showMarkActions
          onMarked={() => toast("Marked as read.")}
        />
      </section>

      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      {readOnly ? <div className="mb-4"><ReadOnlyBanner label="Notifications" /></div> : null}

      {loading ? <AdminLoadingState label="Loading notifications…" /> : null}

      {!loading ? (
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {notices.length === 0 && !error ? (
            <section className="card-glow rounded-2xl border border-line bg-card p-6 text-sm text-muted">
              No in-app notices yet. Compose one on the right — it will appear in the mobile app for the chosen audience.
            </section>
          ) : null}
          {notices.map((n) => (
            <NoticeCard
              key={n.id}
              notice={n}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onRemove={async () => {
                if (!guardDelete()) return;
                try {
                  await deleteAppNotice(n.id);
                  toast("Notice removed. It will no longer show in the app.");
                  await load();
                } catch (err) {
                  toastAdminError(toast, err, "Could not remove.");
                }
              }}
              onToggle={async () => {
                if (!guardUpdate()) return;
                try {
                  await setAppNoticeActive(n.id, !n.is_active);
                  toast(n.is_active ? "Notice paused." : "Notice active again.");
                  await load();
                } catch (err) {
                  toastAdminError(toast, err, "Could not update.");
                }
              }}
            />
          ))}
        </div>

        <aside className="card-glow h-fit rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-ink">Send in-app notice</h2>
          <p className="mt-1 text-xs text-muted">
            Text only, or add an image. Shows centered when matching users open the app.
          </p>
          {!canCreate ? (
            <p className="mt-3 text-xs text-muted">View-only — you cannot send new notices.</p>
          ) : (
          <div className="mt-3 space-y-3">
            <Field label="Title">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
            </Field>
            <Field label="Message (optional)">
              <textarea
                className={inputClass}
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Details for the user…"
              />
            </Field>
            <Field label="Audience">
              <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Image (optional)">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand"
                onChange={(e) => void onPickImage(e.target.files?.[0] || null)}
              />
              {imageUri ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-line bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUri} alt="Preview" className="max-h-40 w-full object-contain" />
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] text-muted">
                    <span className="truncate">{imageName || "Image attached"}</span>
                    <button type="button" className="font-semibold text-red" onClick={() => { setImageUri(""); setImageName(""); }}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}
            </Field>
            <Btn onClick={() => void send()} loading={busy} loadingLabel="Sending…" disabled={busy}>
              Send to app
            </Btn>
          </div>
          )}
        </aside>
      </div>
      ) : null}
    </div>
  );
}

function NoticeCard({
  notice,
  onRemove,
  onToggle,
  canUpdate,
  canDelete,
}: {
  notice: AppNotice;
  onRemove: () => Promise<void>;
  onToggle: () => Promise<void>;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [preview, setPreview] = useState("");
  const [busyAction, setBusyAction] = useState<"pause" | "remove" | null>(null);

  useEffect(() => {
    if (!notice.image_uri) {
      setPreview("");
      return;
    }
    let alive = true;
    let objectUrl = "";
    void fetchStaffImage(notice.image_uri).then((url) => {
      objectUrl = url;
      if (alive) setPreview(url);
      else if (url) URL.revokeObjectURL(url);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [notice.image_uri]);

  return (
    <article className="card-glow rounded-2xl border border-line bg-card p-4 text-ink">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{notice.title}</p>
          {notice.body ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{notice.body}</p> : null}
        </div>
        <StatusBadge status={notice.is_active ? "live" : "paused"} />
      </div>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="mt-3 max-h-48 w-full rounded-xl border border-line object-cover" />
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>{notice.audience_label}</span>
        <span>In-app</span>
        <span>{formatNptDateTime(notice.created_at)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {canUpdate ? (
        <Btn
          kind="ghost"
          loading={busyAction === "pause"}
          loadingLabel={notice.is_active ? "Pausing…" : "Activating…"}
          disabled={!!busyAction}
          onClick={() => {
            setBusyAction("pause");
            void onToggle().finally(() => setBusyAction(null));
          }}
        >
          {notice.is_active ? "Pause" : "Activate"}
        </Btn>
        ) : null}
        {canDelete ? (
        <Btn
          kind="danger"
          loading={busyAction === "remove"}
          loadingLabel="Removing…"
          disabled={!!busyAction}
          onClick={() => {
            setBusyAction("remove");
            void onRemove().finally(() => setBusyAction(null));
          }}
        >
          Remove from app
        </Btn>
        ) : null}
        {!canUpdate && !canDelete ? (
          <p className="text-xs text-muted">View-only — notice controls are disabled.</p>
        ) : null}
      </div>
    </article>
  );
}
