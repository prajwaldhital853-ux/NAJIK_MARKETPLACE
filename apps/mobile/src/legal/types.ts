export type LegalDocId =
  | "terms"
  | "privacy"
  | "safety-tips"
  | "posting-rules"
  | "faq"
  | "contact"
  | "report-bugs";

export type LegalRole = "buyer" | "seller";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  id: LegalDocId;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  footer: string;
};

export const INFO_LINK_DOCS: Record<string, LegalDocId> = {
  "Safety Tips": "safety-tips",
  "Posting Rules": "posting-rules",
  FAQ: "faq",
  "Terms of Use": "terms",
  "Privacy Policy": "privacy",
  "Contact Us": "contact",
  "Report bugs": "report-bugs",
};

export function infoLinkDocId(label: string): LegalDocId | null {
  return INFO_LINK_DOCS[label] || null;
}

export function legalDocTitle(id: LegalDocId): string {
  const titles: Record<LegalDocId, string> = {
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    "safety-tips": "Safety Tips",
    "posting-rules": "Posting Rules",
    faq: "FAQ",
    contact: "Contact Us",
    "report-bugs": "Report a Bug",
  };
  return titles[id];
}
