import { api } from "./api";
import { withAppAuth } from "./authApi";

export type ComplaintSeverity = "normal" | "high";
export type ComplaintKind = "user" | "listing" | "chat";

export type CreateComplaintPayload = {
  kind: ComplaintKind;
  severity: ComplaintSeverity;
  reason: string;
  accused_id?: string;
  listing_id?: string;
  thread_id?: string;
};

export async function createComplaint(payload: CreateComplaintPayload) {
  return withAppAuth((token) =>
    api<{ id: string; status: string }>("/api/reports/", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  );
}
