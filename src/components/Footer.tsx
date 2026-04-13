"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { X as Twitter, Share as Facebook, Camera as Instagram, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { deleteCookie } from "cookies-next";
import {
  FOOTER_MENU_ITEMS,
  FOOTER_HIDDEN_ROUTES,
  ROUTES,
} from "@/constants/routes";
import { useAuthStore } from "@/zustand/useAuthStore";
import { auth } from "@/firebase/firebaseClient";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import toast from "react-hot-toast";

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="text-foreground hover:text-accent navbar-link transition-colors"
    >
      {label}
    </Link>
  );
}

function SocialIcon({
  href,
  icon: Icon,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground rounded-full transition-colors"
    >
      <Icon size={14} />
    </Link>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const uid = useAuthStore((s) => s.uid);
  const clearAuthDetails = useAuthStore((s) => s.clearAuthDetails);

  if (FOOTER_HIDDEN_ROUTES.some((path) => pathname?.startsWith(path))) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      deleteCookie(getAuthCookieName());
      await signOut(auth);
      clearAuthDetails();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("An error occurred while signing out.");
    }
  };

  return (
    <footer className="bg-muted border-t border-border">
      <div className="container flex flex-col sm:flex-row items-center justify-between px-5 py-5 mx-auto z-10 text-muted-foreground gap-4 sm:gap-0">
        {/* Left Menu */}
        <nav className="flex flex-wrap gap-4 sm:gap-6 order-2 sm:order-1 lg:w-[33%]">
          {FOOTER_MENU_ITEMS.map((item) => (
            <FooterLink key={item.href} label={item.label} href={item.href} />
          ))}
          {uid && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-foreground hover:text-red-600 navbar-link transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          )}
        </nav>

        {/* Social Media Icons */}
        <div className="flex lg:justify-center gap-3 order-1 lg:order-2 lg:w-[33%]">
          <SocialIcon href="https://x.com/xrefdotai" icon={Twitter} />
          <SocialIcon
            href="https://www.facebook.com/xrefdotai"
            icon={Facebook}
          />
          <SocialIcon
            href="https://www.instagram.com/xrefdotai"
            icon={Instagram}
          />
        </div>

        {/* Right Menu and Copyright */}
        <div className="flex lg:justify-end gap-2 order-3 lg:order-3 lg:w-[33%] text-foreground">
          <span>&copy; {new Date().getFullYear()}</span>
          <FooterLink label="XREF.AI" href={ROUTES.home} />
        </div>
      </div>
    </footer>
  );
}
