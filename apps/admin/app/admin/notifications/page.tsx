"use client";

import { useState } from "react";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, Field, StatusBadge, inputClass } from "@/components/admin/ui";
import { useAdmin } from "@/lib/store";

export default function NotificationsPage() {
  const { notices, add, patch, toast } = useAdmin();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("All users");
  const [channel, setChannel] = useState<"push" | "email" | "in-app">("push");

  function compose(status: "draft" | "scheduled" | "sent") {
    if (!title.trim()) return;
    add("notices", {
      id: `n${Date.now()}`,
      title,
      body,
      audience,
      channel,
      status,
      time: status === "sent" ? "Just now" : "Queued",
      reads: status === "sent" ? 1 : 0,
    });
    toast(status === "sent" ? "Notification sent to demo audience." : "Saved.");
    setTitle("");
    setBody("");
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        summary="12 staff and user notices — KYC backlog, Dashain promo, payout window, safety tips. Compose a push, email or in-app message on the right. Sent counts are demo reads; scheduled items fire in this session when you mark them sent from the list."
      />
      <SummaryStrip
        items={[
          { label: "Notices", value: notices.length, tone: "brand" },
          { label: "Sent", value: notices.filter((n) => n.status === "sent").length, tone: "green" },
          { label: "Scheduled", value: notices.filter((n) => n.status === "scheduled").length, tone: "amber" },
          { label: "Drafts", value: notices.filter((n) => n.status === "draft").length, tone: "brand" },
          { label: "Reads (sum)", value: notices.reduce((s, n) => s + n.reads, 0), tone: "green" },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {notices.map((n) => (
            <article key={n.id} className="card-glow rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{n.title}</p>
                  <p className="mt-1 text-sm text-muted">{n.body}</p>
                </div>
                <StatusBadge status={n.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span>{n.audience}</span>
                <span className="capitalize">{n.channel}</span>
                <span>{n.time}</span>
                <span>{n.reads.toLocaleString()} reads</span>
                {n.status !== "sent" ? (
                  <Btn
                    onClick={() => {
                      patch("notices", n.id, { status: "sent", time: "Just now", reads: Math.max(n.reads, 1) });
                      toast(`Sent “${n.title}”.`);
                    }}
                  >
                    Send now
                  </Btn>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        <aside className="card-glow h-fit rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-ink">Compose</h2>
          <div className="mt-3 space-y-3">
            <Field label="Title">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Body">
              <textarea className={inputClass} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Field label="Audience">
              <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value)}>
                {["All users", "All sellers", "Pending providers", "Staff · KYC", "Staff · Super"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Channel">
              <select className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
                <option value="push">Push</option>
                <option value="email">Email</option>
                <option value="in-app">In-app</option>
              </select>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => compose("sent")}>Send</Btn>
              <Btn kind="ghost" onClick={() => compose("scheduled")}>
                Schedule
              </Btn>
              <Btn kind="ghost" onClick={() => compose("draft")}>
                Draft
              </Btn>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
