"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminStoreProvider } from "@/lib/store";
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeProvider } from "@/lib/theme";
import { canAccessPath, firstAllowedPath } from "@/lib/rbac";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ToastHost } from "./ui";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <AdminStoreProvider>{children}</AdminStoreProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/change-password")) {
    return <>{children}</>;
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, staff } = useSession();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!ready || !staff) return;
    if (staff.mustChangePassword && pathname !== "/admin/change-password") {
      router.replace("/admin/change-password");
      return;
    }
    if (canAccessPath(staff, pathname)) return;
    const target = firstAllowedPath(staff);
    if (target === pathname) return;
    router.replace(target);
  }, [ready, staff?.id, staff?.isSuperAdmin, staff?.mustChangePassword, staff?.permissions?.join("|"), pathname, router]);

  if (!ready || !staff) {
    return <div className="flex min-h-screen items-center justify-center bg-surface text-muted">Loading panel…</div>;
  }
  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <Sidebar />
      {mobile ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} />
          <Sidebar className="relative z-10 flex h-dvh" onNavigate={() => setMobile(false)} />
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setMobile(true)} />
        <main className="admin-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 lg:p-4">{children}</main>
      </div>
      <ToastHost />
    </div>
  );
}
