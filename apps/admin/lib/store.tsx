"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ADS,
  CATEGORY_SHARE,
  GADGETS,
  GROWTH,
  JOBS,
  KYC,
  NOTICES,
  ORDERS,
  OTHERS,
  PAYMENTS,
  PLATFORM_KPIS,
  PROPERTIES,
  REPORTS,
  REVIEWS,
  SERVICES,
  USERS,
  type Activity,
  type Ad,
  type Gadget,
  type Job,
  type KycRow,
  type Notice,
  type Order,
  type OtherListing,
  type Payment,
  type Property,
  type Report,
  type Review,
  type Service,
  type Staff,
  type User,
} from "./demo-data";
import { mapDirectoryActivity, mapDirectoryUser } from "./live-users";
import { mapStaffListingActivity, mapStaffListingToProperty } from "./live-listings";
import { getStaffRefreshToken } from "./auth";
import {
  deleteAppUser,
  deleteStaffListing,
  listAppUsersPage,
  listProviderApplications,
  listStaffListingsPage,
  listStaffLoadRequests,
  listComplaints,
  patchAppUser,
  getStaffPaymentsSummary,
  type ProviderApplication,
  type StaffListing,
  type ComplaintTicket,
  type SellerLoadRequestRow,
  type StaffPaymentsSummary,
} from "./staff-api";
import { buildInbox, navBadges, readSeenInbox, writeSeenInbox, type InboxItem } from "./live-inbox";
import { ADMIN_POLL_FALLBACK_MS, connectAdminEventStream } from "./event-stream";
import { useSession } from "./session";

const LIVE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Toast = { id: string; text: string };

const EXTRA_KEY = "najik_admin_extra_users";
const SEED_IDS = new Set(USERS.map((u) => u.id));

function readExtras(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(EXTRA_KEY) || "[]") as User[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeExtras(list: User[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXTRA_KEY, JSON.stringify(list.filter((u) => !SEED_IDS.has(u.id))));
}

type Store = {
  users: User[];
  liveCount: number;
  activity: Activity[];
  kpis: typeof PLATFORM_KPIS;
  growth: typeof GROWTH;
  categories: typeof CATEGORY_SHARE;
  properties: Property[];
  jobs: Job[];
  services: Service[];
  gadgets: Gadget[];
  others: OtherListing[];
  orders: Order[];
  payments: Payment[];
  kyc: KycRow[];
  reports: Report[];
  reviews: Review[];
  notices: Notice[];
  ads: Ad[];
  staff: Staff[];
  toasts: Toast[];
  applications: ProviderApplication[];
  inbox: InboxItem[];
  inboxCount: number;
  inboxReady: boolean;
  badges: Record<string, number>;
  liveListings: StaffListing[];
  paymentsSummary: StaffPaymentsSummary | null;
  patch: (key: StoreKey, id: string, data: Record<string, unknown>) => Promise<void>;
  add: (key: StoreKey, row: unknown) => void;
  remove: (key: StoreKey, id: string) => Promise<void>;
  markInboxSeen: (ids: string | string[]) => void;
  toast: (text: string) => void;
};

type StoreKey =
  | "users"
  | "properties"
  | "jobs"
  | "services"
  | "gadgets"
  | "others"
  | "orders"
  | "payments"
  | "kyc"
  | "reports"
  | "reviews"
  | "notices"
  | "ads"
  | "staff";

const StoreCtx = createContext<Store | null>(null);

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const { apiSession, staff: sessionStaff } = useSession();
  const [users, setUsers] = useState(USERS);
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [liveActivity, setLiveActivity] = useState<Activity[]>([]);
  const [liveListings, setLiveListings] = useState<StaffListing[]>([]);
  const [listingTotals, setListingTotals] = useState<{
    total: number;
    pending: number;
    by_category?: Record<string, number>;
  } | null>(null);
  const [liveApplications, setLiveApplications] = useState<ProviderApplication[]>([]);
  const [liveReports, setLiveReports] = useState<ComplaintTicket[]>([]);
  const [liveLoadRequests, setLiveLoadRequests] = useState<SellerLoadRequestRow[]>([]);
  const [paymentsSummary, setPaymentsSummary] = useState<StaffPaymentsSummary | null>(null);
  const [inboxReady, setInboxReady] = useState(false);
  const [properties, setProperties] = useState(PROPERTIES);
  const [jobs, setJobs] = useState(JOBS);
  const [services, setServices] = useState(SERVICES);
  const [gadgets, setGadgets] = useState(GADGETS);
  const [others, setOthers] = useState(OTHERS);
  const [orders, setOrders] = useState(ORDERS);
  const [payments, setPayments] = useState(PAYMENTS);
  const [kyc, setKyc] = useState(KYC);
  const [reports, setReports] = useState(REPORTS);
  const [reviews, setReviews] = useState(REVIEWS);
  const [notices, setNotices] = useState(NOTICES);
  const [ads, setAds] = useState(ADS);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [seenInbox, setSeenInbox] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setSeenInbox(readSeenInbox());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.removeItem(EXTRA_KEY);
    setStaff(sessionStaff ? [sessionStaff] : []);
  }, [sessionStaff]);

  useEffect(() => {
    let alive = true;

    async function refreshListings() {
      const [pendingPage, recentPage] = await Promise.all([
        listStaffListingsPage({ status: "pending", page_size: 50 }),
        listStaffListingsPage({ page_size: 25 }),
      ]);
      if (!alive) return;
      const merged = [...pendingPage.results];
      const seen = new Set(merged.map((row) => row.id));
      for (const row of recentPage.results) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        merged.push(row);
      }
      setLiveListings(
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      );
      setListingTotals(recentPage.counts || pendingPage.counts || null);
    }

    async function refreshUsers() {
      const usersPage = await listAppUsersPage({ page_size: 100 });
      if (!alive) return;
      const sortedUsers = [...usersPage.results].sort(
        (a, b) => new Date(b.date_joined).getTime() - new Date(a.date_joined).getTime(),
      );
      setLiveUsers(sortedUsers.map(mapDirectoryUser));
      setLiveActivity(sortedUsers.map(mapDirectoryActivity));
    }

    async function refreshApplications() {
      const page = await listProviderApplications({ pending: true, page_size: 50 });
      if (!alive) return;
      setLiveApplications(page);
    }

    async function refreshReports() {
      const [openPage, reviewPage] = await Promise.all([
        listComplaints({ status: "open", page_size: 50 }).catch(() => ({ results: [] as ComplaintTicket[] })),
        listComplaints({ status: "under_review", page_size: 25 }).catch(() => ({ results: [] as ComplaintTicket[] })),
      ]);
      if (!alive) return;
      const merged = [...openPage.results];
      const seen = new Set(merged.map((row) => row.id));
      for (const row of reviewPage.results) {
        if (seen.has(row.id)) continue;
        merged.push(row);
      }
      setLiveReports(merged);
    }

    async function refreshLoadRequests() {
      const pending = await listStaffLoadRequests("pending").catch(() => [] as SellerLoadRequestRow[]);
      if (!alive) return;
      setLiveLoadRequests(pending);
    }

    async function refreshPayments() {
      const payments = await getStaffPaymentsSummary("month").catch(() => null);
      if (!alive) return;
      setPaymentsSummary(payments);
    }

    async function loadAll() {
      if (!apiSession || !getStaffRefreshToken()) {
        setLiveUsers([]);
        setLiveActivity([]);
        setLiveListings([]);
        setListingTotals(null);
        setLiveApplications([]);
        setLiveReports([]);
        setLiveLoadRequests([]);
        setPaymentsSummary(null);
        setInboxReady(false);
        return;
      }
      try {
        await Promise.all([
          refreshUsers(),
          refreshListings(),
          refreshApplications(),
          refreshReports(),
          refreshLoadRequests(),
          refreshPayments(),
        ]);
      } catch {
        // Keep the last successful snapshot so a blip does not empty the inbox.
      } finally {
        if (alive) setInboxReady(true);
      }
    }

    void loadAll();
    const fallbackId = window.setInterval(() => void loadAll(), ADMIN_POLL_FALLBACK_MS);
    const disconnect = connectAdminEventStream((event) => {
      if (event.type === "listings_changed") void refreshListings();
      else if (event.type === "applications_changed") void refreshApplications();
      else if (event.type === "complaints_changed") void refreshReports();
      else if (event.type === "load_requests_changed") void refreshLoadRequests();
      else if (event.type === "payments_changed") void refreshPayments();
    });

    return () => {
      alive = false;
      window.clearInterval(fallbackId);
      disconnect();
    };
  }, [apiSession]);

  const toast = useCallback((text: string) => {
    const id = `t${Date.now()}`;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const markInboxSeen = useCallback((ids: string | string[]) => {
    const extra = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (!extra.length) return;
    setSeenInbox((prev) => {
      const next = [...new Set([...prev, ...extra])];
      if (next.length === prev.length && extra.every((id) => prev.includes(id))) return prev;
      writeSeenInbox(next);
      return next;
    });
  }, []);

  const patch = useCallback(async (key: StoreKey, id: string, data: Record<string, unknown>) => {
    const apply = <T extends { id: string }>(set: Dispatch<SetStateAction<T[]>>) => {
      set((prev) => prev.map((row) => (row.id === id ? { ...row, ...data } : row)));
    };
    if (key === "users" && LIVE_ID.test(id)) {
      if (!getStaffRefreshToken()) throw new Error("Sign in with a staff account to update this user.");
      const status = String(data.status || "");
      const row = await patchAppUser(id, {
        ...(status ? { status } : {}),
        is_active:
          status === "active"
            ? true
            : status === "blocked" || status === "deactivated"
              ? false
              : undefined,
        ...(typeof data.staff_warning === "string"
          ? { staff_warning: String(data.staff_warning) }
          : typeof data.notes === "string"
            ? { staff_warning: String(data.notes) }
            : {}),
      });
      const mapped = mapDirectoryUser(row);
      setLiveUsers((prev) => prev.map((user) => (user.id === id ? mapped : user)));
      setLiveActivity((prev) => prev.map((item) => (item.id === `live-${id}` ? mapDirectoryActivity(row) : item)));
      markInboxSeen(`user-${id}`);
      return;
    }
    const map: Record<StoreKey, () => void> = {
      users: () => {
        setUsers((prev) => {
          const next = prev.map((row) => (row.id === id ? { ...row, ...data } : row));
          writeExtras(next);
          return next;
        });
        setLiveUsers((prev) => prev.map((row) => (row.id === id ? { ...row, ...data } : row)));
      },
      properties: () => apply(setProperties),
      jobs: () => apply(setJobs),
      services: () => apply(setServices),
      gadgets: () => apply(setGadgets),
      others: () => apply(setOthers),
      orders: () => apply(setOrders),
      payments: () => apply(setPayments),
      kyc: () => apply(setKyc),
      reports: () => apply(setReports),
      reviews: () => apply(setReviews),
      notices: () => apply(setNotices),
      ads: () => apply(setAds),
      staff: () => apply(setStaff),
    };
    map[key]();
  }, [markInboxSeen]);

  const add = useCallback((key: StoreKey, row: unknown) => {
    const apply = <T,>(set: Dispatch<SetStateAction<T[]>>) => {
      set((prev) => [row as T, ...prev]);
    };
    const map: Record<StoreKey, () => void> = {
      users: () => {
        setUsers((prev) => {
          const next = [row as User, ...prev];
          writeExtras(next);
          return next;
        });
      },
      properties: () => apply(setProperties),
      jobs: () => apply(setJobs),
      services: () => apply(setServices),
      gadgets: () => apply(setGadgets),
      others: () => apply(setOthers),
      orders: () => apply(setOrders),
      payments: () => apply(setPayments),
      kyc: () => apply(setKyc),
      reports: () => apply(setReports),
      reviews: () => apply(setReviews),
      notices: () => apply(setNotices),
      ads: () => apply(setAds),
      staff: () => apply(setStaff),
    };
    map[key]();
  }, []);

  const remove = useCallback(async (key: StoreKey, id: string) => {
    const drop = <T extends { id: string }>(set: Dispatch<SetStateAction<T[]>>) => {
      set((prev) => prev.filter((row) => row.id !== id));
    };
    if (key === "users") {
      if (LIVE_ID.test(id)) {
        if (!getStaffRefreshToken()) throw new Error("Sign in with a staff API account to delete this account.");
        await deleteAppUser(id);
        setLiveUsers((prev) => prev.filter((row) => row.id !== id));
        setLiveActivity((prev) => prev.filter((row) => row.id !== `live-${id}`));
        setLiveListings((prev) => prev.filter((row) => row.owner_id !== id));
        markInboxSeen(`user-${id}`);
      }
      setUsers((prev) => {
        const next = prev.filter((row) => row.id !== id);
        writeExtras(next);
        return next;
      });
      return;
    }
    if (key === "properties") {
      if (LIVE_ID.test(id)) {
        if (!getStaffRefreshToken()) throw new Error("Sign in with a staff API account to delete this listing.");
        await deleteStaffListing(id);
        setLiveListings((prev) => prev.filter((row) => row.id !== id));
      }
      drop(setProperties);
      return;
    }
    const map: Record<Exclude<StoreKey, "users" | "properties">, () => void> = {
      jobs: () => drop(setJobs),
      services: () => drop(setServices),
      gadgets: () => drop(setGadgets),
      others: () => drop(setOthers),
      orders: () => drop(setOrders),
      payments: () => drop(setPayments),
      kyc: () => drop(setKyc),
      reports: () => drop(setReports),
      reviews: () => drop(setReviews),
      notices: () => drop(setNotices),
      ads: () => drop(setAds),
      staff: () => drop(setStaff),
    };
    map[key]();
  }, [markInboxSeen]);

  const mergedUsers = useMemo(() => {
    const counts = new Map<string, number>();
    liveListings.forEach((row) => counts.set(row.owner_id, (counts.get(row.owner_id) || 0) + 1));
    const ids = new Set(liveUsers.map((u) => u.id));
    const withCounts = liveUsers.map((u) => ({ ...u, listings: counts.get(u.id) || 0 }));
    const merged = [...withCounts, ...users.filter((u) => !ids.has(u.id))];
    return merged.sort((a, b) => {
      const at = Date.parse(a.joinedAt || "") || 0;
      const bt = Date.parse(b.joinedAt || "") || 0;
      return bt - at;
    });
  }, [liveUsers, users, liveListings]);

  const listingCount = (category: string) =>
    listingTotals?.by_category?.[category] ?? liveListings.filter((row) => row.category === category).length;

  const kpis = useMemo(
    () => ({
      ...PLATFORM_KPIS,
      totalUsers: mergedUsers.length,
      activeUsers: mergedUsers.filter((u) => u.status === "active" || u.status === "verified").length,
      pendingUsers: mergedUsers.filter((u) => u.status === "pending").length,
      verifiedUsers: mergedUsers.filter((u) => u.status === "verified").length,
      blockedUsers: mergedUsers.filter((u) => u.status === "blocked").length,
      propertyUsers: mergedUsers.filter((u) => /property|real estate/i.test(u.category)).length,
      jobUsers: mergedUsers.filter((u) => /job/i.test(u.category)).length,
      serviceUsers: mergedUsers.filter((u) => /service/i.test(u.category)).length,
      providers: mergedUsers.filter((u) => u.role === "provider").length,
      electronicUsers: mergedUsers.filter((u) => /electronic/i.test(u.category)).length,
      usedItemUsers: mergedUsers.filter((u) => /used|marketplace/i.test(u.category)).length,
      shopUsers: mergedUsers.filter((u) => /shop|business/i.test(u.category)).length,
      properties: listingCount("property"),
      listings: listingTotals?.total ?? liveListings.length,
      jobs: listingCount("jobs"),
      vehicles: listingCount("vehicles"),
      usedItems: listingCount("marketplace"),
      electronics: listingCount("marketplace"),
      shops: listingCount("business"),
      revenue: paymentsSummary?.total_revenue_rupees ?? paymentsSummary?.admin_credit_total_rupees ?? 0,
      revenueDelta: 0,
    }),
    [mergedUsers, liveListings, listingTotals, paymentsSummary],
  );

  const growth = useMemo(() => {
    const usersSeries = GROWTH.Users.map((point, index) =>
      index === GROWTH.Users.length - 1 ? { ...point, v: mergedUsers.length } : point,
    );
    const propertiesSeries = GROWTH.Properties.map((point, index) =>
      index === GROWTH.Properties.length - 1 ? { ...point, v: listingCount("property") } : point,
    );
    const jobsSeries = GROWTH.Jobs.map((point, index) =>
      index === GROWTH.Jobs.length - 1 ? { ...point, v: listingCount("jobs") } : point,
    );
    const servicesSeries = GROWTH.Services.map((point, index) =>
      index === GROWTH.Services.length - 1 ? { ...point, v: listingCount("services") } : point,
    );
    return { ...GROWTH, Users: usersSeries, Properties: propertiesSeries, Jobs: jobsSeries, Services: servicesSeries };
  }, [mergedUsers.length, liveListings, listingTotals]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {
      Property: listingCount("property"),
      Jobs: listingCount("jobs"),
      Services: listingCount("services"),
      Electronics: listingCount("nearby"),
      "Used Items": listingCount("marketplace"),
      Shops: listingCount("business"),
    };
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return CATEGORY_SHARE.map((row) => {
      const count = counts[row.name] ?? 0;
      return { ...row, count, value: total ? Math.round((count / total) * 100) : 0 };
    });
  }, [liveListings]);

  const listingActivity = useMemo(() => liveListings.map(mapStaffListingActivity), [liveListings]);
  const activity = useMemo(() => {
    const merged = [...listingActivity, ...liveActivity];
    return merged.sort((a, b) => (b.at || 0) - (a.at || 0));
  }, [listingActivity, liveActivity]);

  const displayProperties = useMemo(
    () => liveListings.filter((row) => row.category === "property").map(mapStaffListingToProperty),
    [liveListings],
  );

  const inbox = useMemo(
    () => buildInbox(mergedUsers, liveListings, liveApplications, seenInbox, liveReports, liveLoadRequests),
    [mergedUsers, liveListings, liveApplications, seenInbox, liveReports, liveLoadRequests],
  );
  const badges = useMemo(
    () => navBadges(mergedUsers, liveListings, liveApplications, seenInbox, liveReports, liveLoadRequests),
    [mergedUsers, liveListings, liveApplications, seenInbox, liveReports, liveLoadRequests],
  );

  const value = useMemo(
    () => ({
      users: mergedUsers,
      liveCount: liveUsers.length,
      activity,
      kpis,
      growth,
      categories,
      properties: displayProperties,
      jobs,
      services,
      gadgets,
      others,
      orders,
      payments,
      kyc,
      reports,
      reviews,
      notices,
      ads,
      staff,
      toasts,
      applications: liveApplications,
      inbox,
      inboxCount: inbox.length,
      inboxReady,
      badges,
      liveListings,
      paymentsSummary,
      patch,
      add,
      remove,
      markInboxSeen,
      toast,
    }),
    [
      mergedUsers,
      liveUsers.length,
      activity,
      kpis,
      growth,
      categories,
      displayProperties,
      jobs,
      services,
      gadgets,
      others,
      orders,
      payments,
      kyc,
      reports,
      reviews,
      notices,
      ads,
      staff,
      toasts,
      liveApplications,
      inbox,
      inboxReady,
      badges,
      liveListings,
      paymentsSummary,
      patch,
      add,
      remove,
      markInboxSeen,
      toast,
    ],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useAdmin() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useAdmin must be used inside AdminStoreProvider");
  return ctx;
}
