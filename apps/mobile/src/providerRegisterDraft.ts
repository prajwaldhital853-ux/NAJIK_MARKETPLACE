import type { ProviderServiceType } from "./types";

export type ProviderRegisterDraft = {
  full_name: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  password: string;
  service_type: ProviderServiceType;
  nagrita_uri: string;
  nagrita_back_uri: string;
  photo_uri: string;
  nation_card_uri: string;
  other_document_uri?: string;
  profile_data?: Record<string, string>;
  referral_code?: string;
};

let draft: ProviderRegisterDraft | null = null;

export function setProviderRegisterDraft(value: ProviderRegisterDraft) {
  draft = value;
}

export function takeProviderRegisterDraft() {
  const value = draft;
  draft = null;
  return value;
}

export function peekProviderRegisterDraft() {
  return draft;
}

export function clearProviderRegisterDraft() {
  draft = null;
}
