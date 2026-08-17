"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, StatusBadge } from "@/components/admin/ui";

type Application = {
  id: string;
  full_name: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  service_type: string;
  nagrita_uri?: string;
  photo_uri?: string;
  status: string;
  created_at: string;
};

export default function ProviderVerificationPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/provider-applications");
      if (!response.ok) throw new Error("Could not load applications.");
      setItems(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load applications.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: "verified" | "rejected" | "pending") {
    await fetch(`/api/provider-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Provider queue"
        crumb="Dashboard / KYC / Provider applications"
        summary="Live submissions from the NAJIK mobile apply form: name, address, contact, phone, email, nagrita, photo and service type. Status stays pending until staff verify. They cannot post until verified. Demo KYC rows live on the User KYC page."
        extra={
          <Link href="/admin/kyc" className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink">
            User KYC
          </Link>
        }
      />
      <SummaryStrip
        items={[
          { label: "Applications", value: items.length, tone: "brand" },
          { label: "Pending", value: pending, tone: "amber" },
          { label: "Verified", value: items.filter((i) => i.status === "verified").length, tone: "green" },
          { label: "Rejected", value: items.filter((i) => i.status === "rejected").length, tone: "red" },
        ]}
      />
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      {items.length === 0 ? (
        <section className="card-glow rounded-2xl border border-line bg-card p-6 text-sm text-muted">
          No mobile applications yet. Service providers submit from Continue as Service Provider → apply form.
        </section>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <section key={item.id} className="card-glow rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium text-ink">{item.full_name}</p>
                  <p className="text-sm text-muted">{item.service_type}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Address</dt>
                  <dd>{item.address}</dd>
                </div>
                <div>
                  <dt className="text-muted">Contact</dt>
                  <dd>{item.contact}</dd>
                </div>
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd>{item.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd>{item.email}</dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DocPreview label="Photo" src={item.photo_uri} />
                <DocPreview label="Nagrita / Citizenship" src={item.nagrita_uri} />
              </div>
              {item.status === "pending" ? (
                <div className="mt-5 flex gap-2">
                  <Btn onClick={() => void setStatus(item.id, "verified")}>Verify</Btn>
                  <Btn kind="danger" onClick={() => void setStatus(item.id, "rejected")}>
                    Reject
                  </Btn>
                </div>
              ) : (
                <div className="mt-5">
                  <Btn kind="ghost" onClick={() => void setStatus(item.id, "pending")}>
                    Reopen
                  </Btn>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DocPreview({ label, src }: { label: string; src?: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-elevated">
      <figcaption className="px-3 py-2 text-xs font-semibold tracking-wide text-muted uppercase">{label}</figcaption>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-48 w-full object-cover" />
      ) : (
        <p className="px-3 pb-3 text-sm text-muted">Not uploaded</p>
      )}
    </figure>
  );
}
