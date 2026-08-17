"use client";

import { createContext, useCallback, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ADS,
  GADGETS,
  JOBS,
  KYC,
  NOTICES,
  ORDERS,
  OTHERS,
  PAYMENTS,
  PROPERTIES,
  REPORTS,
  REVIEWS,
  SERVICES,
  STAFF,
  USERS,
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

type Toast = { id: string; text: string };

type Store = {
  users: User[];
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
  patch: (key: StoreKey, id: string, data: Record<string, unknown>) => void;
  add: (key: StoreKey, row: unknown) => void;
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
  const [users, setUsers] = useState(USERS);
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
  const [staff, setStaff] = useState(STAFF);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string) => {
    const id = `t${Date.now()}`;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const patch = useCallback((key: StoreKey, id: string, data: Record<string, unknown>) => {
    const apply = <T extends { id: string }>(set: Dispatch<SetStateAction<T[]>>) => {
      set((prev) => prev.map((row) => (row.id === id ? { ...row, ...data } : row)));
    };
    const map: Record<StoreKey, () => void> = {
      users: () => apply(setUsers),
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

  const add = useCallback((key: StoreKey, row: unknown) => {
    const apply = <T,>(set: Dispatch<SetStateAction<T[]>>) => {
      set((prev) => [row as T, ...prev]);
    };
    const map: Record<StoreKey, () => void> = {
      users: () => apply(setUsers),
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

  const value = useMemo(
    () => ({
      users,
      properties,
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
      patch,
      add,
      toast,
    }),
    [
      users,
      properties,
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
      patch,
      add,
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
