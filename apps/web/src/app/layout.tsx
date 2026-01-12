import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

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
          <header className="p-4 border-b flex justify-between items-center">
            <h1 className="font-bold text-xl">Insight-Zero</h1>
            <div>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-black text-white px-4 py-2 rounded">Sign In</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </header>
          <main className="min-h-screen p-8">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}