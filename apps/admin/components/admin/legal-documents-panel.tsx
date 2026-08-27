"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn, Field, inputClass } from "@/components/admin/ui";
import { toastAdminError } from "@/lib/rbac";
import { useRbacGuard } from "@/lib/use-page-rbac";
import {
  listLegalDocuments,
  patchLegalDocument,
  type LegalDocumentAdmin,
  type LegalSection,
} from "@/lib/staff-api";

const DOC_OPTIONS = [
  { value: "terms", label: "Terms & Conditions" },
  { value: "privacy", label: "Privacy Policy" },
] as const;

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller (provider)" },
] as const;

function linesToList(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(items?: string[]) {
  return (items || []).join("\n");
}

export function LegalDocumentsPanel() {
  const { readOnly, canUpdate, guardUpdate } = useRbacGuard("app_control");
  const [docs, setDocs] = useState<LegalDocumentAdmin[]>([]);
  const [docType, setDocType] = useState<"terms" | "privacy">("terms");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [draft, setDraft] = useState<LegalDocumentAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listLegalDocuments();
      setDocs(rows);
      setError("");
    } catch (err) {
      setDocs([]);
      setError(err instanceof Error ? err.message : "Could not load legal documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = useMemo(
    () => docs.find((d) => d.doc_type === docType && d.role === role) || null,
    [docs, docType, role],
  );

  useEffect(() => {
    setDraft(current ? { ...current, sections: current.sections.map((s) => ({ ...s })) } : null);
  }, [current]);

  function updateSection(index: number, patch: Partial<LegalSection>) {
    if (!draft) return;
    const sections = draft.sections.map((section, i) => (i === index ? { ...section, ...patch } : section));
    setDraft({ ...draft, sections });
  }

  async function save(publish: boolean) {
    if (!draft || !guardUpdate()) return;
    setSaving(true);
    try {
      const saved = await patchLegalDocument(docType, role, {
        title: draft.title,
        last_updated_label: draft.lastUpdated,
        intro: draft.intro,
        footer: draft.footer,
        sections: draft.sections,
        is_published: draft.is_published,
        publish,
      });
      setDocs((prev) => prev.map((row) => (row.doc_type === saved.doc_type && row.role === saved.role ? saved : row)));
      setDraft(saved);
    } catch (err) {
      toastAdminError(() => undefined, err, "Could not save legal document.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-6 rounded border border-line bg-card p-4">
        <p className="text-sm text-muted">Loading legal documents…</p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded border border-line bg-card p-4">
      <h2 className="text-[13px] font-semibold text-ink">Terms & Privacy documents</h2>
      <p className="mt-1 text-[12px] text-muted">
        Edit Terms & Conditions and Privacy Policy for buyers and sellers. Published content is served to the mobile app.
      </p>
      {error ? <p className="mt-2 text-sm text-red">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Document">
          <select className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value as "terms" | "privacy")}>
            {DOC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Audience">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as "buyer" | "seller")}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {!draft ? (
        <p className="mt-4 text-sm text-muted">No document found for this selection.</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3">
            <Field label="Title">
              <input className={inputClass} value={draft.title} disabled={readOnly} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="Last updated label">
              <input className={inputClass} value={draft.lastUpdated} disabled={readOnly} onChange={(e) => setDraft({ ...draft, lastUpdated: e.target.value })} />
            </Field>
            <Field label="Introduction">
              <textarea className={`${inputClass} min-h-[80px]`} value={draft.intro} disabled={readOnly} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} />
            </Field>
          </div>

          <div className="mt-4 space-y-4">
            {draft.sections.map((section, index) => (
              <div key={`${section.title}-${index}`} className="rounded border border-line bg-elevated p-3">
                <Field label={`Section ${index + 1} title`}>
                  <input className={inputClass} value={section.title} disabled={readOnly} onChange={(e) => updateSection(index, { title: e.target.value })} />
                </Field>
                <Field label="Paragraphs (one per line)">
                  <textarea
                    className={`${inputClass} min-h-[72px]`}
                    value={listToLines(section.paragraphs)}
                    disabled={readOnly}
                    onChange={(e) => updateSection(index, { paragraphs: linesToList(e.target.value) })}
                  />
                </Field>
                <div className="mt-2">
                <Field label="Bullets (optional, one per line)">
                  <textarea
                    className={`${inputClass} min-h-[56px]`}
                    value={listToLines(section.bullets)}
                    disabled={readOnly}
                    onChange={(e) => {
                      const bullets = linesToList(e.target.value);
                      updateSection(index, { bullets: bullets.length ? bullets : undefined });
                    }}
                  />
                </Field>
                </div>
              </div>
            ))}
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted">Footer</span>
            <textarea className={`${inputClass} min-h-[64px]`} value={draft.footer} disabled={readOnly} onChange={(e) => setDraft({ ...draft, footer: e.target.value })} />
          </label>

          <p className="mt-2 text-[11px] text-muted">
            Version {draft.version} · {draft.is_published ? "Published" : "Draft"}
            {draft.published_at ? ` · Last publish ${new Date(draft.published_at).toLocaleString()}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {canUpdate ? (
              <>
                <Btn kind="primary" loading={saving} loadingLabel="Saving…" onClick={() => void save(false)}>
                  Save draft
                </Btn>
                <Btn kind="ghost" loading={saving} onClick={() => void save(true)}>
                  Save & publish (bump version)
                </Btn>
              </>
            ) : null}
            <Btn kind="ghost" onClick={() => void load()}>
              Refresh
            </Btn>
          </div>
        </>
      )}
    </section>
  );
}
