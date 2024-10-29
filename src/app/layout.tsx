
// import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ClientProvider } from "@/components/ClientProvider";

// const metadata: Metadata = {
//   title: "Xref.ai",
//   description:
//     "What do you want to write about? Based on your prompts and references, Xref.ai writes original content that you can use freely in blog posts, websites, essays, product descriptions, creative writing, marketing copy or just to get unblocked with some creative inspiration.",
// };

export default function RootLayout({
  children,
  showFooter = true, // Default value for showFooter
}: {
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        {/* <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap" rel="stylesheet" /> */}

      </head>
      <body className="h-full bg-[#ffffff]">
        <ClientProvider>
          <div className="flex flex-col h-full">
            <Header />
            <main className="flex-1">{children}</main>
            {showFooter && <Footer />}
          </div>
        </ClientProvider>
      </body>
    </html>
  );
}
