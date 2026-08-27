"""Default Terms & Privacy content seeded into LegalDocumentConfig (matches mobile app baseline)."""
from django.utils import timezone

from apps.core.models.privacy_compliance import LegalDocumentConfig

COMPANY = "NAJIK Marketplace"
SUPPORT_EMAIL = "support@najik.com"
WEBSITE = "www.najik.com"
LAST_UPDATED = "25 August 2026"


def _role_label(role: str) -> str:
    return "Service Provider (Seller)" if role == LegalDocumentConfig.ROLE_SELLER else "Buyer"


def _terms_sections(role: str) -> list:
    account_bullets = (
        [
            "Service provider accounts require phone verification and KYC review before certain features (such as ID card download) are enabled.",
            "Listing fees, wallet top-ups, and promotions may apply as shown in the app before you publish or purchase platform services.",
        ]
        if role == LegalDocumentConfig.ROLE_SELLER
        else [
            "Buyer accounts may sign in with Google or phone-based registration where available.",
            "Phone verification is required before some features (such as referrals or certain messaging actions) are enabled.",
        ]
    )
    return [
        {
            "title": "1. About NAJIK",
            "paragraphs": [
                f"{COMPANY} operates a digital marketplace that connects buyers and service providers in Nepal. NAJIK provides listing, discovery, messaging, verification, and platform tools. NAJIK is not the seller of listed goods or services unless explicitly stated.",
                "Transactions, pricing, delivery, quality, and payment arrangements between users are primarily between the buyer and the seller. NAJIK may offer wallet, referral, or promotion features subject to separate in-app rules.",
            ],
        },
        {
            "title": "2. Eligibility",
            "paragraphs": [
                "You must be at least 18 years old and legally able to enter a binding contract under the laws of Nepal.",
                "You must provide accurate registration information and keep it up to date.",
            ],
        },
        {
            "title": "3. Your account",
            "paragraphs": [
                "You are responsible for activity on your account and for keeping your password and device secure.",
                "Do not share OTP codes, passwords, or government ID images with anyone claiming to represent NAJIK unless through official in-app channels.",
                "We may suspend or terminate accounts that violate these Terms, applicable law, or community safety rules.",
            ],
            "bullets": account_bullets,
        },
        {
            "title": "4. Acceptable use",
            "paragraphs": ["You agree not to misuse the platform. Prohibited conduct includes, without limitation:"],
            "bullets": [
                "Posting false, misleading, illegal, stolen, or dangerous listings",
                "Harassment, hate speech, fraud, impersonation, or spam",
                "Circumventing fees, verification, or account restrictions",
                "Scraping, reverse engineering, or interfering with app security",
                "Uploading malware or content that infringes intellectual property or privacy rights",
            ],
        },
        {
            "title": "5. Listings, bookings, and communications",
            "paragraphs": [
                "Sellers are responsible for the accuracy of listings, photos, prices, availability, and compliance with local laws.",
                "Buyers should inspect listings, ask questions in chat, and exercise judgment before paying or meeting in person.",
                "In-app chat and reviews must be used lawfully. Reports and complaints may be reviewed by NAJIK staff.",
            ],
        },
        {
            "title": "6. Payments and wallet",
            "paragraphs": [
                "Some seller wallet top-ups are processed offline and credited after staff approval.",
                "Refer & Earn rewards, boosts, urgent sell placements, and promotions follow the rules displayed in the app at the time of use.",
            ],
        },
        {
            "title": "7. Verification and ID cards",
            "paragraphs": [
                "Providers may submit identity and business documents for verification. Approval is at NAJIK's discretion.",
                "Digital provider ID cards are for identification within the NAJIK ecosystem. Misuse, forgery, or unauthorized reproduction is prohibited.",
            ],
        },
        {
            "title": "8. Content and intellectual property",
            "paragraphs": [
                "You retain ownership of content you upload but grant NAJIK a non-exclusive licence to host, display, and promote it on the platform for marketplace operations.",
                "NAJIK names, logos, and app design are protected. Do not use them without written permission.",
            ],
        },
        {
            "title": "9. Disclaimers and liability",
            "paragraphs": [
                'The app is provided "as is" and "as available". We do not guarantee uninterrupted service, error-free listings, or the conduct of any user.',
                "To the maximum extent permitted by law, NAJIK is not liable for indirect, incidental, or consequential losses arising from user transactions or third-party actions.",
            ],
        },
        {
            "title": "10. Changes and termination",
            "paragraphs": [
                "We may update these Terms. Material changes will be reflected in the app with an updated date. Continued use after changes constitutes acceptance.",
                "You may stop using NAJIK at any time. You may also export or delete your account where enabled in the app settings.",
            ],
        },
        {
            "title": "11. Governing law and contact",
            "paragraphs": [
                "These Terms are governed by the laws of Nepal. Disputes should first be raised with NAJIK support.",
                f"Questions: {SUPPORT_EMAIL} · {WEBSITE}",
            ],
        },
    ]


def _privacy_sections(role: str) -> list:
    common_collect = [
        "Account identifiers: name, phone number, email address, account type, and authentication data",
        "Profile and usage data: city/address, app activity, saved listings, searches, reviews, reports, and security logs",
        "Communications: in-app chat messages and support enquiries",
    ]
    buyer_collect = [
        *common_collect,
        "Location data when you choose to use location features (depending on permission)",
        "Referral/invite codes and reward status",
    ]
    seller_collect = [
        *common_collect,
        "KYC and business information: identity documents, business name, category, service area, and registration documents",
        "Seller wallet history, load requests, listing fees, and promotion usage",
        "Provider ID card data and verification status",
        "Phone visibility preferences",
    ]
    who = _role_label(role)
    return [
        {
            "title": "1. Who is responsible for your data",
            "paragraphs": [
                f"{COMPANY} is the data controller for personal information processed through the NAJIK mobile application and related admin operations.",
                f"Data protection contact: {SUPPORT_EMAIL}",
            ],
        },
        {
            "title": "2. Information we collect",
            "paragraphs": [f"Depending on how you use NAJIK, we may collect the following categories of information from {who}s:"],
            "bullets": seller_collect if role == LegalDocumentConfig.ROLE_SELLER else buyer_collect,
        },
        {
            "title": "3. How we use your information",
            "paragraphs": ["We use personal data to:"],
            "bullets": [
                "Create and secure your account, verify contact details, and prevent fraud or duplicate identities",
                "Operate marketplace features: listings, search, chat, bookings, reviews, notifications, and referrals",
                "Verify service providers, process KYC, issue ID cards, and enforce platform rules",
                "Process wallet balances, listing fees, promotions, and support requests",
                "Improve performance, troubleshoot errors, and analyse aggregated usage trends",
                "Comply with legal obligations and respond to valid law-enforcement requests",
            ],
        },
        {
            "title": "4. Legal bases and consent",
            "paragraphs": [
                "We process data where necessary to perform our contract with you, where required by law, where we have legitimate interests (security, fraud prevention, service improvement), and where you give consent.",
                "You must accept this Privacy Policy and our Terms before creating an account.",
            ],
        },
        {
            "title": "5. How we share information",
            "paragraphs": ["We do not sell your personal information. We may share data with:"],
            "bullets": [
                "Other users as part of normal marketplace activity",
                "Verification and operations staff under strict access controls",
                "Infrastructure providers bound by confidentiality obligations",
                "Regulators or law enforcement when required by applicable law",
            ],
        },
        {
            "title": "6. International transfers",
            "paragraphs": [
                "Our primary operations are oriented to users in Nepal. Some service providers may process data in other countries with appropriate safeguards.",
            ],
        },
        {
            "title": "7. Retention",
            "paragraphs": [
                "We keep account and transaction records while your account is active and for a reasonable period afterward for legal, tax, fraud-prevention, and dispute-resolution purposes.",
                "KYC documents may be retained as required for verification audits and regulatory compliance. Retention periods are configured by NAJIK and shown in the app where available.",
                "You may export your data or request account deletion in the app where self-service options are enabled.",
            ],
        },
        {
            "title": "8. Security",
            "paragraphs": [
                "We use administrative, technical, and organisational measures such as access controls, encrypted transport (HTTPS), and staff permission policies.",
                "No system is completely secure. Protect your password and report suspicious activity to support immediately.",
            ],
        },
        {
            "title": "9. Your choices and rights",
            "paragraphs": ["Subject to applicable law, you may:"],
            "bullets": [
                "Access or update profile information in the app",
                "Export a copy of your personal data (where enabled)",
                "Request account deletion (where enabled)",
                "Control seller phone visibility settings where available",
                "Lodge a complaint with a relevant data protection authority in Nepal if you believe your rights have been violated",
            ],
        },
        {
            "title": "10. Children",
            "paragraphs": [
                "NAJIK is not intended for users under 18. We do not knowingly collect data from children.",
            ],
        },
        {
            "title": "11. Changes to this policy",
            "paragraphs": [
                'We may update this Privacy Policy from time to time. The "Last updated" date at the top will change when we do.',
            ],
        },
        {
            "title": "12. Contact us",
            "paragraphs": [
                f"Email: {SUPPORT_EMAIL}",
                f"Website: {WEBSITE}",
            ],
        },
    ]


def default_legal_payload(doc_type: str, role: str) -> dict:
    who = _role_label(role)
    if doc_type == LegalDocumentConfig.DOC_TERMS:
        return {
            "title": "Terms & Conditions",
            "last_updated_label": LAST_UPDATED,
            "intro": (
                f'These Terms & Conditions ("Terms") govern your use of the {COMPANY} mobile application and related services. '
                f"By creating an account or using NAJIK as a {who}, you agree to these Terms."
            ),
            "sections": _terms_sections(role),
            "footer": f'By checking "I agree" during registration, you confirm that you have read and accept these Terms as a {who} on NAJIK.',
        }
    return {
        "title": "Privacy Policy",
        "last_updated_label": LAST_UPDATED,
        "intro": (
            f'This Privacy Policy explains how {COMPANY} ("NAJIK", "we", "us") collects, uses, shares, and protects personal '
            f"information when you use our app as a {who}."
        ),
        "sections": _privacy_sections(role),
        "footer": f"By agreeing during registration, you acknowledge that you have read this Privacy Policy as a {who}.",
    }


def ensure_legal_documents() -> list[LegalDocumentConfig]:
    now = timezone.now()
    rows: list[LegalDocumentConfig] = []
    for doc_type in (LegalDocumentConfig.DOC_TERMS, LegalDocumentConfig.DOC_PRIVACY):
        for role in (LegalDocumentConfig.ROLE_BUYER, LegalDocumentConfig.ROLE_SELLER):
            defaults = default_legal_payload(doc_type, role)
            row, created = LegalDocumentConfig.objects.get_or_create(
                doc_type=doc_type,
                role=role,
                defaults={
                    **defaults,
                    "is_published": True,
                    "published_at": now,
                },
            )
            if created:
                rows.append(row)
    return rows
