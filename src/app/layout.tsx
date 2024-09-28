import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ClientProvider } from "@/components/ClientProvider";

export const metadata: Metadata = {
  title: "Xref.ai",
  description:
    "What do you want to write about? Based on your prompts and references, Xref.ai writes original content that you can use freely in blog posts, websites, essays, product descriptions, creative writing, marketing copy or just to get unblocked with some creative inspiration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <ClientProvider>
          <div className="flex flex-col h-full">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ClientProvider>
      </body>
    </html>
  );
}
