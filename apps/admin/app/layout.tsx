import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AdminProviders } from "@/components/admin/shell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NAJIK Admin",
  description: "Staff panel for NAJIK marketplace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('najik-theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}`,
          }}
        />
      </head>
      <body className="h-full overflow-hidden bg-surface font-sans text-ink">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
