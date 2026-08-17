"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  async function setStatus(id: string, status: "verified" | "rejected") {
    await fetch(`/api/provider-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-widest text-green">NAJIK</p>
          <h1 className="text-2xl font-semibold">Provider verification</h1>
          <p className="mt-1 text-sm text-muted">Review nagrita, photo and service type. Verify before they can post.</p>
        </div>
        <Link href="/admin" className="rounded-xl border border-border px-4 py-2 text-sm hover:border-green">
          Dashboard
        </Link>
      </header>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <div className="mt-8 space-y-4">
        {items.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card p-6 text-muted">
            No applications yet. Service providers submit from the mobile app.
          </section>
        ) : (
          items.map((item) => (
            <section key={item.id} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium">{item.full_name}</p>
                  <p className="text-sm text-muted">{item.service_type}</p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide">
                  {item.status}
                </span>
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
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => void setStatus(item.id, "verified")}
                    className="rounded-xl bg-green px-4 py-2 text-sm font-semibold text-black"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => void setStatus(item.id, "rejected")}
                    className="rounded-xl border border-border px-4 py-2 text-sm hover:border-red-400"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </section>
          ))
        )}
      </div>
    </main>
  );
}

function DocPreview({ label, src }: { label: string; src?: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-background">
      <figcaption className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</figcaption>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-48 w-full object-cover" />
      ) : (
        <p className="px-3 pb-3 text-sm text-muted">Not uploaded</p>
      )}
    </figure>
  );
}
