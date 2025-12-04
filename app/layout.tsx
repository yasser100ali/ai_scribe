import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import { ProviderLayoutProvider } from "@/components/provider-layout";

export const metadata = {
  title: "AI Healthcare Assistant - Project by Yasser Ali",
  description:
    "An intelligent healthcare AI assistant for medical documentation and patient data insights. Built with FastAPI, Next.js, and OpenAI GPT-4.",
  openGraph: {
    images: [
      {
        url: "/og?title=AI Healthcare Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "/og?title=AI Healthcare Assistant",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head></head>
      <body className={cn(GeistSans.className, "antialiased dark")}>
        <ProviderLayoutProvider>
          <Toaster position="top-center" richColors />
          <Navbar />
          {children}
        </ProviderLayoutProvider>
      </body>
    </html>
  );
}
