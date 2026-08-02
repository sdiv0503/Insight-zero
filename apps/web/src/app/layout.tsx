import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Insight-Zero",
  description: "Autonomous Data Steward",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          
          <SignedIn>
            <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-50">
              <div className="flex items-center gap-8">
                <div className="text-xl font-bold tracking-wider text-blue-600">
                  INSIGHT-ZERO
                </div>
                
                {/* Navigation Links - Updated to Light Theme */}
                <div className="flex gap-6 font-medium text-sm text-gray-600">
                  <Link href="/" className="hover:text-blue-600 transition-colors cursor-pointer block">
                    Run Analysis
                  </Link>
                  <Link href="/dashboard" className="hover:text-blue-600 transition-colors cursor-pointer block">
                    History Dashboard
                  </Link>
                </div>
              </div>

              {/* Top Right Profile Button */}
              <div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </nav>
          </SignedIn>

          <main className="min-h-screen bg-slate-50">
            {children}
          </main>
          
        </body>
      </html>
    </ClerkProvider>
  );
}
