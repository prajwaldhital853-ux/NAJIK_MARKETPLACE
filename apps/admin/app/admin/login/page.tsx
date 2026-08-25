"use client";

import { isProductionApiUrl } from "@/lib/api-config";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, LogIn, Mail, User } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

const HERO =
  "https://res.cloudinary.com/fqbdfsxg/image/upload/f_auto,q_auto/najik/admin/login-hero.png";
const CORNER =
  "https://res.cloudinary.com/fqbdfsxg/image/upload/f_auto,q_auto/najik/admin/login-corner.png";

export default function StaffLoginPage() {
  const router = useRouter();
  const { login, verifyLogin } = useSession();
  const [email, setEmail] = useState("owner@najik.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verifyStep, setVerifyStep] = useState<{
    staffId: string;
    email: string;
    message: string;
    debugCode?: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("1234");

  function formatLoginError(err: unknown) {
    if (err instanceof ApiError) {
      const msg = err.message.toLowerCase();
      if (msg.includes("invalid credentials") || err.status === 400) {
        return "Invalid email or password. Use matching pair: owner@najik.local + ChangeMeNow!23  or  admin@najik.com + NajikAdmin@2026";
      }
      if (err.status === 429) {
        return "Too many login attempts. Wait a minute and try again.";
      }
      return err.message || "Login failed.";
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return "Login failed. Check the backend terminal for details.";
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (verifyStep) {
        const live = await verifyLogin(verifyStep.staffId, verificationCode.trim());
        router.replace(live.mustChangePassword ? "/admin/change-password" : "/admin");
        return;
      }

      const fd = new FormData(event.currentTarget);
      const nextEmail = String(fd.get("email") || email).trim();
      const nextPassword = String(fd.get("password") || password);
      setEmail(nextEmail);
      setPassword(nextPassword);

      const result = await login(nextEmail, nextPassword);
      if (result.verify) {
        setVerifyStep(result.verify);
        setVerificationCode(result.verify.debugCode || "1234");
        return;
      }
      router.replace(result.staff?.mustChangePassword ? "/admin/change-password" : "/admin");
    } catch (err) {
      setError(formatLoginError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f4f7f5]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative grid w-full overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(27,125,44,0.12)] lg:grid-cols-2">
          {/* Top-right corner accent (Cloudinary) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CORNER}
            alt=""
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 z-20 h-16 w-16 object-contain sm:h-20 sm:w-20 lg:h-24 lg:w-24"
          />

          {/* Left hero */}
          <div className="relative hidden min-h-[560px] bg-[#eef5f0] lg:block">
            <div className="absolute left-0 top-0 h-full w-3 bg-[#1B7D2C]" />
            <div className="absolute bottom-0 left-0 h-16 w-40 rounded-tr-[80px] bg-[#1B7D2C]/90" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO}
              alt="NAJIK admin"
              className="absolute inset-0 h-full w-full object-contain object-center p-8"
            />
          </div>

          {/* Right form — matches SS4 */}
          <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
            <div className="mb-6 overflow-hidden rounded-2xl bg-[#eef5f0] lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO} alt="" className="mx-auto h-44 w-full object-contain object-center p-3" />
            </div>

            <div className="mx-auto w-full max-w-[400px]">
              <div className="mb-7 flex flex-col items-center text-center">
                <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-[#1B7D2C] shadow-[0_10px_24px_rgba(27,125,44,0.28)]">
                  <svg viewBox="0 0 24 24" className="h-9 w-9 text-white" fill="none" aria-hidden>
                    <path
                      d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z"
                      fill="currentColor"
                      opacity="0.95"
                    />
                    <circle cx="12" cy="10" r="2.2" fill="#1B7D2C" />
                    <path d="M8.8 16.2c1.1-1.4 2.1-2 3.2-2s2.1.6 3.2 2" stroke="#1B7D2C" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#111827]">Admin Panel Login</h1>
                <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-[#6b7280]">
                  Welcome back! Please login to your Admin Panel account.
                </p>
                <p className="mt-2 text-[11px] text-[#9aa19c]">
                  {isProductionApiUrl()
                    ? "Connected to live API"
                    : "Connected to local API"}
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-3.5">
                {verifyStep ? (
                  <>
                    <div className="rounded-2xl border border-[#d7ddd9] bg-[#f8fbf9] px-4 py-3 text-left">
                      <p className="text-[13px] font-semibold text-[#111827]">Verify this device</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#6b7280]">
                        {verifyStep.message || `Enter the verification code sent to ${verifyStep.email}.`}
                      </p>
                      <p className="mt-2 text-[11px] font-medium text-[#1B7D2C]">
                        For now, use code <span className="font-bold">1234</span>.
                      </p>
                    </div>

                    <label className="block">
                      <span className="sr-only">Verification code</span>
                      <div className="flex items-center gap-2.5 rounded-full border border-[#d7ddd9] bg-white px-4 py-[13px] transition focus-within:border-[#1B7D2C] focus-within:ring-4 focus-within:ring-[#1B7D2C]/12">
                        <Lock className="h-[18px] w-[18px] shrink-0 text-[#9aa19c]" />
                        <input
                          className="w-full bg-transparent text-[14px] text-[#111827] outline-none placeholder:text-[#9aa19c]"
                          type="text"
                          name="verification_code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="Verification code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          required
                        />
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setVerifyStep(null);
                        setVerificationCode("1234");
                        setError("");
                      }}
                      className="w-full text-[13px] font-semibold text-[#6b7280] hover:text-[#111827]"
                    >
                      Back to login
                    </button>
                  </>
                ) : (
                  <>
                <label className="block">
                  <span className="sr-only">Email</span>
                  <div className="flex items-center gap-2.5 rounded-full border border-[#d7ddd9] bg-white px-4 py-[13px] transition focus-within:border-[#1B7D2C] focus-within:ring-4 focus-within:ring-[#1B7D2C]/12">
                    <User className="h-[18px] w-[18px] shrink-0 text-[#9aa19c]" />
                    <input
                      className="w-full bg-transparent text-[14px] text-[#111827] outline-none placeholder:text-[#9aa19c]"
                      type="text"
                      name="email"
                      autoComplete="username"
                      inputMode="email"
                      placeholder="Username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Mail className="h-[18px] w-[18px] shrink-0 text-[#9aa19c]" />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Password</span>
                  <div className="flex items-center gap-2.5 rounded-full border border-[#d7ddd9] bg-white px-4 py-[13px] transition focus-within:border-[#1B7D2C] focus-within:ring-4 focus-within:ring-[#1B7D2C]/12">
                    <Lock className="h-[18px] w-[18px] shrink-0 text-[#9aa19c]" />
                    <input
                      className="w-full bg-transparent text-[14px] text-[#111827] outline-none placeholder:text-[#9aa19c]"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="shrink-0 text-[#9aa19c] hover:text-[#1B7D2C]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </label>

                <div className="flex justify-end pt-0.5">
                  <span className="cursor-default text-[13px] font-semibold text-[#1B7D2C]/70">Forgot Password?</span>
                </div>
                  </>
                )}

                {error ? <p className="text-center text-[12px] font-medium text-[#c62828]">{error}</p> : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#1B7D2C] py-[14px] text-[15px] font-semibold text-white transition hover:bg-[#166826] disabled:opacity-70"
                >
                  {busy ? (verifyStep ? "Verifying…" : "Signing in…") : verifyStep ? "Verify & Login" : "Login"}
                  {!busy ? <LogIn className="h-4 w-4" /> : null}
                </button>
              </form>

              {!verifyStep ? (
              <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#e5e7eb]" />
                <span className="text-[12px] font-semibold tracking-wide text-[#9ca3af]">OR</span>
                <div className="h-px flex-1 bg-[#e5e7eb]" />
              </div>

              <button
                type="button"
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>('input[type="email"]');
                  el?.focus();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#1B7D2C] bg-white py-[13px] text-[14px] font-semibold text-[#1B7D2C] transition hover:bg-[#eef8f0]"
              >
                <Mail className="h-4 w-4" />
                Login with Email
              </button>
              </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
