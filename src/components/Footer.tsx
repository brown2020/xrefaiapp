"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { FOOTER_MENU_ITEMS, FOOTER_HIDDEN_ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/zustand/useAuthStore";
import { useSignOut } from "@/hooks/useSignOut";

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
    </Link>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const uid = useAuthStore((s) => s.uid);
  const signOutAndLeave = useSignOut();

  if (FOOTER_HIDDEN_ROUTES.some((path) => pathname?.startsWith(path))) {
    return null;
  }

  return (
    <footer className="border-t border-border bg-card">
      <div className="container z-10 mx-auto flex flex-col items-center justify-between gap-4 px-5 py-5 text-muted-foreground sm:flex-row">
        <nav className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6">
          {FOOTER_MENU_ITEMS.map((item) => (
            <FooterLink key={item.href} label={item.label} href={item.href} />
          ))}
          {uid && (
            <button
              onClick={() => void signOutAndLeave()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          )}
        </nav>

        <div className="flex gap-2 text-sm font-semibold text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Ignite Channel Inc.</span>
        </div>
      </div>
    </footer>
  );
}
