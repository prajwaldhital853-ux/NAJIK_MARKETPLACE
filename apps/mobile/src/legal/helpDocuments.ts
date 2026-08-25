import type { LegalDocument, LegalRole } from "./types";

const SUPPORT_EMAIL = "support@najik.com";
const WEBSITE = "www.najik.com";
const SUPPORT_PHONE = "01-5970123";

function roleNote(role: LegalRole) {
  return role === "seller" ? "service providers (sellers)" : "buyers";
}

export function buildSafetyTips(role: LegalRole): LegalDocument {
  const who = roleNote(role);
  return {
    id: "safety-tips",
    title: "Safety Tips",
    lastUpdated: "25 August 2026",
    intro: `NAJIK helps ${who} discover listings and connect safely. Most deals go well when people stay alert. Use these tips whenever you browse, chat, or meet someone from the app.`,
    sections: [
      {
        title: "Before you contact a seller",
        paragraphs: ["Take a moment to review the listing and seller profile:"],
        bullets: [
          "Check photos, price, location, and how long the listing has been live",
          "Read reviews and ratings when available",
          "Prefer verified service providers for high-value or in-person services",
          "Be cautious of prices far below market value or urgent pressure to pay immediately",
        ],
      },
      {
        title: "Chat and phone safety",
        paragraphs: ["Keep early conversations inside NAJIK chat when possible so there is a record if something goes wrong."],
        bullets: [
          "Do not share OTP codes, passwords, or banking PINs with anyone",
          "Never send money outside the agreed method before you are satisfied with what you are buying",
          "Watch for requests to move the conversation to unknown apps and pay there",
          "Report suspicious messages using the in-app report option",
        ],
      },
      {
        title: "Meeting in person",
        paragraphs: ["For property visits, vehicle checks, or local pickups:"],
        bullets: [
          "Meet in a public, well-lit place when possible",
          "Bring a friend for high-value meetings when you can",
          "Inspect the item or property carefully before paying",
          "Tell someone you trust where you are going and when you expect to return",
        ],
      },
      {
        title: "Payments",
        paragraphs: [
          "NAJIK wallet and listing fees are platform features — payment for the actual product or service is usually arranged directly between buyer and seller unless stated otherwise.",
        ],
        bullets: [
          "Confirm the total price, delivery, and refund expectations before paying",
          "Keep receipts, transfer screenshots, or written confirmation in chat",
          "Avoid paying full amounts upfront for items you have not seen",
        ],
      },
      {
        title: "If something feels wrong",
        paragraphs: [
          "Stop the conversation, do not send more money, and report the listing or user from the app.",
          `For urgent safety concerns, contact local authorities first, then email ${SUPPORT_EMAIL} with screenshots and listing details.`,
        ],
      },
    ],
    footer: "Staying cautious protects you and keeps NAJIK trustworthy for everyone.",
  };
}

export function buildPostingRules(role: LegalRole): LegalDocument {
  const sellerFocus = role === "seller";
  return {
    id: "posting-rules",
    title: "Posting Rules",
    lastUpdated: "25 August 2026",
    intro: sellerFocus
      ? "These rules apply to every listing and profile on NAJIK. Following them helps your posts go live faster and stay visible to buyers."
      : "These rules explain what sellers may post on NAJIK. Report listings that break them.",
    sections: [
      {
        title: "Allowed listings",
        paragraphs: ["Posts should be genuine offers in the categories NAJIK supports (property, jobs, services, electronics, vehicles, used items, and related local listings)."],
        bullets: [
          "Use your own photos or photos you have permission to use",
          "Describe the item or service honestly — condition, price, location, and availability",
          "Use a contact phone number you control",
          "Keep one listing per distinct item or service unless the category allows variations",
        ],
      },
      {
        title: "Prohibited content",
        paragraphs: ["The following are not allowed and may be removed without warning:"],
        bullets: [
          "Illegal goods, weapons, drugs, counterfeit products, or stolen property",
          "Adult content, hate speech, harassment, or discriminatory listings",
          "Misleading prices, fake urgency, or bait-and-switch offers",
          "Duplicate spam listings or keyword stuffing",
          "Personal data of other people posted without consent",
          "Links or QR codes that phish, scam, or bypass NAJIK fees fraudulently",
        ],
      },
      {
        title: "Photos and media",
        paragraphs: ["Clear, accurate photos build trust."],
        bullets: [
          "No watermarks from other marketplaces unless you own the listing there too",
          "No excessively edited images that hide defects",
          "Live photos are required for certain seller verification steps",
        ],
      },
      {
        title: "Pricing and fees",
        paragraphs: [
          "Sellers may need wallet balance or listing fees to publish live, as shown in the app before posting.",
          "Promotions such as urgent sell or boost campaigns must follow the in-app pricing and duration rules.",
        ],
      },
      {
        title: "Moderation",
        paragraphs: [
          "NAJIK staff and automated checks may approve, reject, pause, or remove listings.",
          "Repeated violations can lead to account warnings, blocks, or permanent removal from the platform.",
        ],
      },
    ],
    footer: "Questions about a rejected listing? Contact support with your listing ID.",
  };
}

export function buildFaq(role: LegalRole): LegalDocument {
  const sections =
    role === "seller"
      ? [
          {
            title: "Getting started as a service provider",
            paragraphs: [],
            bullets: [
              "Register with phone OTP, complete KYC documents, and create a password",
              "After admin verification, you can post listings and access seller tools",
              "Your NAJIK provider ID card becomes available after approval",
            ],
          },
          {
            title: "Listing fees and wallet",
            paragraphs: [],
            bullets: [
              "Listing fees are deducted from your seller wallet when a listing goes live",
              "Top up offline via bank transfer, then submit proof in Payments for staff approval",
              "Wallet history shows credits, deductions, and adjustments",
            ],
          },
          {
            title: "Verification and ID card",
            paragraphs: [],
            bullets: [
              "KYC review usually completes after staff checks your documents",
              "If rejected, you will see a note explaining what to fix",
              "ID card download/print requires a separate access approval in the app",
            ],
          },
          {
            title: "Promotions",
            paragraphs: [],
            bullets: [
              "Urgent Sell highlights your listing on buyer home for a limited time",
              "Boost campaigns rotate your listing in category feeds based on wallet payment",
              "Featured post requests may require admin approval",
            ],
          },
        ]
      : [
          {
            title: "Creating a buyer account",
            paragraphs: [],
            bullets: [
              "Sign in with Google or register with phone and password where available",
              "Complete your profile and verify your phone with OTP",
              "Save listings, chat with sellers, leave reviews, and report problems",
            ],
          },
          {
            title: "Finding listings",
            paragraphs: [],
            bullets: [
              "Browse categories, search by keyword, or use the map view",
              "Check seller ratings, listing details, and location before contacting",
              "Use Save to revisit listings later",
            ],
          },
          {
            title: "Chat and inquiries",
            paragraphs: [],
            bullets: [
              "Tap Contact or Message on a listing to start a conversation",
              "Do not share OTPs or passwords in chat",
              "Report abusive chat from the listing or thread screen",
            ],
          },
          {
            title: "Refer & Earn",
            paragraphs: [],
            bullets: [
              "Enter a friend's invite code once when you register or complete profile",
              "Rewards are credited according to the program rules shown in Payments",
              "Each code works for one new user only",
            ],
          },
        ];

  return {
    id: "faq",
    title: "Frequently Asked Questions",
    lastUpdated: "25 August 2026",
    intro: `Quick answers for ${roleNote(role)} using NAJIK. For account-specific help, contact ${SUPPORT_EMAIL}.`,
    sections: [
      ...sections,
      {
        title: "Account and security",
        paragraphs: [],
        bullets: [
          "Use a strong password and do not share it",
          "Buyers and sellers use separate account types — the same phone cannot be both",
          "If your account is blocked, contact support — only admins can reactivate",
        ],
      },
    ],
    footer: `Still need help? See Contact Us or email ${SUPPORT_EMAIL}.`,
  };
}

export function buildContact(role: LegalRole): LegalDocument {
  return {
    id: "contact",
    title: "Contact Us",
    lastUpdated: "25 August 2026",
    intro: "We're here to help with account access, listings, payments, verification, and safety reports.",
    sections: [
      {
        title: "Support channels",
        paragraphs: ["Reach NAJIK support through the channels below. Include your registered phone or email and a short description of the issue."],
        bullets: [
          `Email: ${SUPPORT_EMAIL}`,
          `Website: ${WEBSITE}`,
          `Phone (business hours NPT): ${SUPPORT_PHONE}`,
        ],
      },
      {
        title: "What to include in your message",
        paragraphs: [],
        bullets: [
          "Your account phone number or email (never send passwords or OTP codes)",
          "Listing ID or screenshot if the issue is about a specific post",
          "Steps to reproduce app bugs, device model, and app version if reporting a technical problem",
          "Dates and amounts for wallet or payment questions",
        ],
      },
      {
        title: "Response times",
        paragraphs: [
          "We aim to respond to most support emails within 1–2 business days.",
          "Urgent safety issues involving fraud or threats should also be reported to local authorities immediately.",
        ],
      },
      {
        title: role === "seller" ? "Seller verification enquiries" : "Buyer account enquiries",
        paragraphs:
          role === "seller"
            ? [
                "For KYC status, ID card access, or listing moderation, mention your provider name and the date you submitted documents.",
              ]
            : [
                "For OTP, Google sign-in, or profile issues, mention whether you are signing in as a buyer and the phone number on your account.",
              ],
      },
    ],
    footer: "Thank you for using NAJIK — Everything Near You, One App.",
  };
}

export function buildReportBugs(role: LegalRole): LegalDocument {
  return {
    id: "report-bugs",
    title: "Report a Bug",
    lastUpdated: "25 August 2026",
    intro: "Found something broken? Tell us so we can fix it. Separate from listing reports or user complaints — use in-app Report for those.",
    sections: [
      {
        title: "Before you report",
        paragraphs: ["Try these quick steps first:"],
        bullets: [
          "Force-close and reopen the NAJIK app",
          "Check your internet connection",
          "Update to the latest app version from your app store or install link",
          "Sign out and sign in again if sync looks stuck",
        ],
      },
      {
        title: "What to send us",
        paragraphs: [`Email ${SUPPORT_EMAIL} with the subject line "Bug report" and include:`],
        bullets: [
          "What you were trying to do",
          "What you expected to happen",
          "What actually happened (error message, blank screen, crash, etc.)",
          "Phone model and Android/iOS version",
          "Screenshots or screen recording if possible",
          "Approximate date and time (NPT) when it occurred",
        ],
      },
      {
        title: "Not a bug report?",
        paragraphs: ["Use the correct channel so we can help faster:"],
        bullets: [
          "Scam listing or abusive user → Report from the listing or chat screen",
          "Wallet not credited → Payments support with transfer proof",
          "KYC rejection → reply with corrected documents via seller verification flow",
        ],
      },
    ],
    footer: "We read every bug report. Thank you for helping improve NAJIK.",
  };
}
