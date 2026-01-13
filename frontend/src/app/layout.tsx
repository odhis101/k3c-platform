import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "K3C Smart Giving | Kilaleshwa Covenant Community Church",
  description: "Experience a gamified, QR-based giving platform for Kilaleshwa Covenant Community Church. Give easily via MPESA or Card and watch the impact in real-time. Loving God, Connecting People, Transforming Communities.",
  keywords: ["K3C", "Kilaleshwa Church", "Giving", "Donation", "MPESA", "Smart Giving", "Church Donations", "Covenant Community"],
  authors: [{ name: "K3C Church" }],
  creator: "K3C Church",
  publisher: "K3C Church",
  icons: {
    icon: "/k3c-logo.png",
    apple: "/k3c-logo.png",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SocketProvider>
            <Header />
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              theme="light"
            />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
