"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/store";
import { Btn, Field, Modal, inputClass } from "./ui";

const TYPES = ["User", "Property", "Job", "Service", "Electronics", "Listing", "Ad", "Staff"] as const;

export function AddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const admin = useAdmin();
  const [kind, setKind] = useState<(typeof TYPES)[number]>("User");
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [city, setCity] = useState("Kathmandu");

  function submit() {
    const id = `new_${Date.now()}`;
    if (kind === "User") {
      admin.add("users", {
        id,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@mail.com`,
        phone: "9800-000000",
        city,
        role: "buyer",
        status: "pending",
        joined: "Today",
        listings: 0,
        lastActive: "Just now",
        kyc: "none",
        category: "User",
      });
    } else if (kind === "Property") {
      admin.add("properties", {
        id,
        title: name,
        owner: extra || "NAJIK Admin",
        ownerId: "st1",
        type: "House",
        price: 1000000,
        location: city,
        status: "pending",
        featured: false,
        beds: 3,
        baths: 2,
        area: "1,200 sqft",
        posted: "Just now",
        views: 0,
      });
    } else if (kind === "Job") {
      admin.add("jobs", {
        id,
        title: name,
        company: extra || "NAJIK",
        owner: extra || "NAJIK",
        type: "Full Time",
        salary: "NPR 30,000 /mo",
        location: city,
        status: "pending",
        applicants: 0,
        posted: "Just now",
      });
    } else if (kind === "Service") {
      admin.add("services", {
        id,
        title: name,
        provider: extra || "New provider",
        providerId: id,
        category: "Home",
        rate: "NPR 1,000 /visit",
        location: city,
        status: "pending",
        rating: 0,
        jobs: 0,
        verified: false,
      });
    } else if (kind === "Electronics") {
      admin.add("gadgets", {
        id,
        title: name,
        seller: extra || "Seller",
        brand: extra || "Generic",
        price: 10000,
        condition: "Used — Good",
        location: city,
        status: "pending",
        posted: "Just now",
      });
    } else if (kind === "Listing") {
      admin.add("others", {
        id,
        title: name,
        kind: "used",
        seller: extra || "Seller",
        price: "NPR 5,000",
        location: city,
        status: "pending",
        posted: "Just now",
      });
    } else if (kind === "Ad") {
      admin.add("ads", {
        id,
        name,
        advertiser: extra || "NAJIK Ads",
        placement: "Home · Featured",
        budget: 10000,
        spent: 0,
        status: "pending",
        ctr: "—",
        dates: "Starts today",
      });
    } else {
      admin.add("staff", {
        id,
        name,
        email: extra || `${name.toLowerCase().replace(/\s+/g, ".")}@najik.com`,
        role: "Support Agent",
        roleKey: "support",
        city,
        status: "invited",
        lastLogin: "Never",
        password: "najiktemp",
      });
    }
    admin.toast(`${kind} “${name}” added to the demo queue.`);
    setName("");
    setExtra("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add new">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setKind(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${kind === t ? "bg-brand text-white" : "bg-elevated text-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <Field label={kind === "User" || kind === "Staff" ? "Full name" : "Title"}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field
          label={
            kind === "User"
              ? "Notes"
              : kind === "Staff"
                ? "Email"
                : kind === "Property" || kind === "Job" || kind === "Ad"
                  ? "Owner / company"
                  : "Seller / provider"
          }
        >
          <input className={inputClass} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </Field>
        <Field label="City">
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn onClick={submit} disabled={!name.trim()}>
            Create
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
