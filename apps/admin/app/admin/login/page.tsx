"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Shield, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/session";

export default function StaffLoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState("admin@najik.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const staff = await login(email, password);
      if (!staff) {
        setError("Invalid email or password.");
        return;
      }
      router.replace("/admin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#eef3ef]">
      {/* Decorative corners */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-br-[120px] bg-[#1B7D2C]/30 md:h-64 md:w-64" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-56 rounded-tr-[100px] bg-[#1B7D2C]/25 md:h-52 md:w-72" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(27,125,44,0.12)] lg:grid-cols-2">
          {/* Left illustration — desktop/tablet */}
          <div className="relative hidden min-h-[520px] bg-[#f3f6f4] lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(27,125,44,0.08),transparent_55%)]" />
            <Image
              src="/admin-login-hero.png"
              alt="NAJIK admin"
              fill
              priority
              className="object-contain object-center p-6"
              sizes="(min-width: 1024px) 50vw, 0px"
            />
          </div>

          {/* Right form */}
          <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:px-12">
            {/* Mobile hero strip */}
            <div className="relative mb-6 h-40 overflow-hidden rounded-2xl bg-[#f3f6f4] lg:hidden">
              <Image
                src="/admin-login-hero.png"
                alt=""
                fill
                priority
                className="object-contain object-center p-3"
                sizes="100vw"
              />
            </div>

            <div className="mx-auto w-full max-w-[380px]">
              <div className="mb-5 flex flex-col items-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B7D2C] shadow-sm">
                  <Shield className="h-7 w-7 text-white" strokeWidth={2.2} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#151515] sm:text-[28px]">
                  Admin Panel Login
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
                  Welcome back! Please login to your Admin Panel account.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-3.5">
                <label className="block">
                  <span className="sr-only">Email</span>
                  <div className="flex items-center gap-2 rounded-xl border border-[#d7ddd8] bg-white px-3.5 py-3 transition focus-within:border-[#1B7D2C] focus-within:ring-2 focus-within:ring-[#1B7D2C]/15">
                    <Mail className="h-4 w-4 shrink-0 text-[#8a918c]" />
                    <input
                      className="w-full bg-transparent text-sm text-[#151515] outline-none placeholder:text-[#9ca3af]"
                      type="email"
                      autoComplete="username"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Password</span>
                  <div className="flex items-center gap-2 rounded-xl border border-[#d7ddd8] bg-white px-3.5 py-3 transition focus-within:border-[#1B7D2C] focus-within:ring-2 focus-within:ring-[#1B7D2C]/15">
                    <Lock className="h-4 w-4 shrink-0 text-[#8a918c]" />
                    <input
                      className="w-full bg-transparent text-sm text-[#151515] outline-none placeholder:text-[#9ca3af]"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="shrink-0 text-[#8a918c] hover:text-[#1B7D2C]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {error ? <p className="text-center text-[12px] font-medium text-[#c62828]">{error}</p> : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B7D2C] py-3 text-sm font-semibold text-white transition hover:bg-[#166826] disabled:opacity-70"
                >
                  {busy ? "Signing in…" : "Login"}
                  {!busy ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] text-[#8a918c]">
                NAJIK staff access · Live marketplace admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
