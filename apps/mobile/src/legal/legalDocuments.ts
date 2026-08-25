import { buildContact, buildFaq, buildPostingRules, buildReportBugs, buildSafetyTips } from "./helpDocuments";
import type { LegalDocId, LegalDocument, LegalRole } from "./types";

export type { LegalDocId, LegalDocument, LegalRole, LegalSection } from "./types";
export { INFO_LINK_DOCS, infoLinkDocId, legalDocTitle } from "./types";

const COMPANY = "NAJIK Marketplace";
const SUPPORT_EMAIL = "support@najik.com";
const WEBSITE = "www.najik.com";

function roleLabel(role: LegalRole) {
  return role === "seller" ? "Service Provider (Seller)" : "Buyer";
}

export function getLegalDocument(id: LegalDocId, role: LegalRole): LegalDocument {
  if (id === "terms") return buildTerms(role);
  if (id === "privacy") return buildPrivacy(role);
  if (id === "safety-tips") return buildSafetyTips(role);
  if (id === "posting-rules") return buildPostingRules(role);
  if (id === "faq") return buildFaq(role);
  if (id === "contact") return buildContact(role);
  return buildReportBugs(role);
}

function buildTerms(role: LegalRole): LegalDocument {
  const who = roleLabel(role);
  return {
    id: "terms",
    title: "Terms & Conditions",
    lastUpdated: "25 August 2026",
    intro: `These Terms & Conditions ("Terms") govern your use of the ${COMPANY} mobile application and related services. By creating an account or using NAJIK as a ${who}, you agree to these Terms. If you do not agree, do not use the app.`,
    sections: [
      {
        title: "1. About NAJIK",
        paragraphs: [
          `${COMPANY} operates a digital marketplace that connects buyers and service providers in Nepal. NAJIK provides listing, discovery, messaging, verification, and platform tools. NAJIK is not the seller of listed goods or services unless explicitly stated.`,
          "Transactions, pricing, delivery, quality, and payment arrangements between users are primarily between the buyer and the seller. NAJIK may offer wallet, referral, or promotion features subject to separate in-app rules.",
        ],
      },
      {
        title: "2. Eligibility",
        paragraphs: [
          "You must be at least 18 years old and legally able to enter a binding contract under the laws of Nepal.",
          "You must provide accurate registration information and keep it up to date. One person may maintain separate buyer and provider accounts only where permitted by NAJIK and subject to identity rules.",
        ],
      },
      {
        title: "3. Your account",
        paragraphs: [
          "You are responsible for activity on your account and for keeping your password and device secure.",
          "Do not share OTP codes, passwords, or government ID images with anyone claiming to represent NAJIK unless through official in-app channels.",
          "We may suspend or terminate accounts that violate these Terms, applicable law, or community safety rules.",
        ],
        bullets:
          role === "seller"
            ? [
                "Service provider accounts require phone verification and KYC review before certain features (such as ID card download) are enabled.",
                "Listing fees, wallet top-ups, and promotions may apply as shown in the app before you publish or purchase platform services.",
              ]
            : [
                "Buyer accounts may sign in with Google or phone-based registration where available.",
                "Phone verification is required before some features (such as referrals or certain messaging actions) are enabled.",
              ],
      },
      {
        title: "4. Acceptable use",
        paragraphs: ["You agree not to misuse the platform. Prohibited conduct includes, without limitation:"],
        bullets: [
          "Posting false, misleading, illegal, stolen, or dangerous listings",
          "Harassment, hate speech, fraud, impersonation, or spam",
          "Circumventing fees, verification, or account restrictions",
          "Scraping, reverse engineering, or interfering with app security",
          "Uploading malware or content that infringes intellectual property or privacy rights",
        ],
      },
      {
        title: "5. Listings, bookings, and communications",
        paragraphs: [
          "Sellers are responsible for the accuracy of listings, photos, prices, availability, and compliance with local laws (including property, employment, and consumer rules where applicable).",
          "Buyers should inspect listings, ask questions in chat, and exercise judgment before paying or meeting in person.",
          "In-app chat and reviews must be used lawfully. Reports and complaints may be reviewed by NAJIK staff.",
        ],
      },
      {
        title: "6. Payments and wallet",
        paragraphs: [
          "Some seller wallet top-ups are processed offline (e.g. bank transfer) and credited after staff approval. NAJIK records balances and deductions for platform services such as listing fees.",
          "Refer & Earn rewards, boosts, urgent sell placements, and promotions follow the rules displayed in the app at the time of use.",
          "Chargebacks, disputes, or off-platform payments are between the parties involved unless NAJIK explicitly mediates a specific case.",
        ],
      },
      {
        title: "7. Verification and ID cards",
        paragraphs: [
          "Providers may submit identity and business documents for verification. Approval is at NAJIK's discretion.",
          "Digital provider ID cards are for identification within the NAJIK ecosystem. Misuse, forgery, or unauthorized reproduction is prohibited.",
        ],
      },
      {
        title: "8. Content and intellectual property",
        paragraphs: [
          "You retain ownership of content you upload but grant NAJIK a non-exclusive licence to host, display, and promote it on the platform for marketplace operations.",
          "NAJIK names, logos, and app design are protected. Do not use them without written permission.",
        ],
      },
      {
        title: "9. Disclaimers and liability",
        paragraphs: [
          'The app is provided "as is" and "as available". We do not guarantee uninterrupted service, error-free listings, or the conduct of any user.',
          "To the maximum extent permitted by law, NAJIK is not liable for indirect, incidental, or consequential losses arising from user transactions or third-party actions.",
          "Nothing in these Terms limits rights that cannot be excluded under applicable consumer protection laws in Nepal.",
        ],
      },
      {
        title: "10. Changes and termination",
        paragraphs: [
          "We may update these Terms. Material changes will be reflected in the app with an updated date. Continued use after changes constitutes acceptance.",
          "You may stop using NAJIK at any time. We may suspend or close accounts for violations, legal requirements, or risk management.",
        ],
      },
      {
        title: "11. Governing law and contact",
        paragraphs: [
          "These Terms are governed by the laws of Nepal. Disputes should first be raised with NAJIK support.",
          `Questions: ${SUPPORT_EMAIL} · ${WEBSITE}`,
        ],
      },
    ],
    footer: `By checking "I agree" during registration, you confirm that you have read and accept these Terms as a ${who} on NAJIK.`,
  };
}

function buildPrivacy(role: LegalRole): LegalDocument {
  const who = roleLabel(role);
  const commonCollect = [
    "Account identifiers: name, phone number, email address, account type (buyer or provider), and authentication data (including Google sign-in identifiers where used)",
    "Profile and usage data: city/address, app activity, saved listings, searches, reviews, reports, and device/app logs needed for security",
    "Communications: in-app chat messages and support enquiries",
  ];
  const buyerCollect = [
    ...commonCollect,
    "Location data when you choose \"Use my current location\" or similar features (approximate or precise depending on permission)",
    "Referral/invite codes and reward status",
  ];
  const sellerCollect = [
    ...commonCollect,
    "KYC and business information: date of birth, parent names, citizenship details, business name, category, service area, and registration documents (photos of citizenship, live photo, nation card, optional documents)",
    "Seller wallet history, load requests, listing fees, and promotion usage",
    "Provider ID card data and verification status",
    "Phone visibility preferences (e.g. hide phone on ads, allow buyer calls)",
  ];

  return {
    id: "privacy",
    title: "Privacy Policy",
    lastUpdated: "25 August 2026",
    intro: `This Privacy Policy explains how ${COMPANY} ("NAJIK", "we", "us") collects, uses, shares, and protects personal information when you use our app as a ${who}. It should be read together with our Terms & Conditions.`,
    sections: [
      {
        title: "1. Who is responsible for your data",
        paragraphs: [
          `${COMPANY} is the data controller for personal information processed through the NAJIK mobile application and related admin operations.`,
          `Data protection contact: ${SUPPORT_EMAIL}`,
        ],
      },
      {
        title: "2. Information we collect",
        paragraphs: [`Depending on how you use NAJIK, we may collect the following categories of information from ${who}s:`],
        bullets: role === "seller" ? sellerCollect : buyerCollect,
      },
      {
        title: "3. How we use your information",
        paragraphs: ["We use personal data to:"],
        bullets: [
          "Create and secure your account, verify contact details, and prevent fraud or duplicate identities",
          "Operate marketplace features: listings, search, chat, bookings, reviews, notifications, and referrals",
          "Verify service providers, process KYC, issue ID cards, and enforce platform rules",
          "Process wallet balances, listing fees, promotions, and support requests",
          "Improve performance, troubleshoot errors, and analyse aggregated usage trends",
          "Comply with legal obligations and respond to valid law-enforcement requests",
        ],
      },
      {
        title: "4. Legal bases and consent",
        paragraphs: [
          "We process data where necessary to perform our contract with you (providing the app), where required by law, where we have legitimate interests (security, fraud prevention, service improvement), and where you give consent (for example optional marketing notices or location when permission is granted).",
          "You must accept this Privacy Policy and our Terms before creating an account.",
        ],
      },
      {
        title: "5. How we share information",
        paragraphs: ["We do not sell your personal information. We may share data with:"],
        bullets: [
          "Other users as part of normal marketplace activity (e.g. seller name, listing details, chat messages, public reviews)",
          "Verification and operations staff under strict access controls",
          "Infrastructure providers (hosting, email/SMS/OTP delivery, analytics) bound by confidentiality obligations",
          "Regulators or law enforcement when required by applicable law or to protect users and the platform",
        ],
      },
      {
        title: "6. International transfers",
        paragraphs: [
          "Our primary operations are oriented to users in Nepal. Some service providers (such as Google sign-in or cloud hosting) may process data in other countries with appropriate safeguards.",
        ],
      },
      {
        title: "7. Retention",
        paragraphs: [
          "We keep account and transaction records while your account is active and for a reasonable period afterward for legal, tax, fraud-prevention, and dispute-resolution purposes.",
          "KYC documents may be retained as required for verification audits and regulatory compliance. You may request deletion subject to limits described below.",
        ],
      },
      {
        title: "8. Security",
        paragraphs: [
          "We use administrative, technical, and organisational measures such as access controls, encrypted transport (HTTPS), and staff permission policies.",
          "No system is completely secure. Protect your password and report suspicious activity to support immediately.",
        ],
      },
      {
        title: "9. Your choices and rights",
        paragraphs: ["Subject to applicable law, you may:"],
        bullets: [
          "Access or update profile information in the app",
          "Control seller phone visibility settings where available",
          "Withdraw marketing consent where applicable",
          "Request correction or deletion by contacting support (some data must be kept for legal or security reasons)",
          "Lodge a complaint with a relevant data protection authority in Nepal if you believe your rights have been violated",
        ],
      },
      {
        title: "10. Children",
        paragraphs: [
          "NAJIK is not intended for users under 18. We do not knowingly collect data from children. Contact us if you believe a minor has registered.",
        ],
      },
      {
        title: "11. Changes to this policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time. The \"Last updated\" date at the top will change when we do. Significant changes may be highlighted in the app.",
        ],
      },
      {
        title: "12. Contact us",
        paragraphs: [
          `Email: ${SUPPORT_EMAIL}`,
          `Website: ${WEBSITE}`,
          "Postal enquiries: contact support for current registered office details in Nepal.",
        ],
      },
    ],
    footer: `By agreeing during registration, you acknowledge that you have read this Privacy Policy and understand how NAJIK processes your data as a ${who}.`,
  };
}
