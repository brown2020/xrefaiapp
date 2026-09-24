"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  MessageSquare,
  Grid2X2,
  History,
  User,
  LogOut,
} from "lucide-react";
import { NAV_MENU_ITEMS, ROUTES } from "@/constants/routes";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui";
import { CreditsBadge } from "@/components/ui/CreditsBadge";
import { ProtectedLink } from "@/components/ui/ProtectedLink";
import { useAuthStore } from "@/zustand/useAuthStore";
import { useSignOut } from "@/hooks/useSignOut";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const MENU_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  [ROUTES.chat]: MessageSquare,
  [ROUTES.tools]: Grid2X2,
  [ROUTES.history]: History,
  [ROUTES.account]: User,
};

const menuItems: MenuItem[] = NAV_MENU_ITEMS.map((item) => ({
  ...item,
  icon: MENU_ICONS[item.href] || MessageSquare,
}));

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const uid = useAuthStore((s) => s.uid);
  const authReady = useAuthStore((s) => s.authReady);
  const signOutAndLeave = useSignOut();
  const showAuthLinks = authReady && !uid;
  const handleSignOut = () => void signOutAndLeave();

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 text-sm">
        <div className="flex items-center justify-between text-sm">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label="Xref.ai home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f97316] text-lg font-extrabold text-white">
              X
            </span>
            <span className="text-lg font-extrabold tracking-normal text-foreground">
              Xref.ai
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-3">
            {/* Desktop Menu */}
            <nav className="flex gap-1">
              {menuItems.map((item) => (
                <ProtectedLink
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    pathname === item.href
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </ProtectedLink>
              ))}
            </nav>
            <CreditsBadge />
            {showAuthLinks && (
              <>
                <Link
                  href={ROUTES.login}
                  className="rounded-lg px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  Sign in
                </Link>
                <Link
                  href={ROUTES.signup}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  Create account
                </Link>
              </>
            )}
            {uid && (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Sign Out</span>
              </button>
            )}
          </div>

          {/* Mobile Menu (accessible sheet) */}
          <div className="sm:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger>
                <button
                  type="button"
                  className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
                  aria-label="Open menu"
                >
                  <Menu className="w-6 h-6 text-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent title="Menu">
                <nav className="flex flex-col">
                  <div className="px-3 pb-3">
                    <CreditsBadge />
                  </div>
                  {menuItems.map((item) => (
                    <SheetClose key={item.href}>
                      <ProtectedLink
                        href={item.href}
                        aria-current={pathname === item.href ? "page" : undefined}
                        className={`flex h-12 w-full items-center justify-start gap-2 whitespace-nowrap rounded-lg px-3 font-bold transition-colors ${
                          pathname === item.href
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </ProtectedLink>
                    </SheetClose>
                  ))}
                  {showAuthLinks && (
                    <>
                      <SheetClose>
                        <Link
                          href={ROUTES.login}
                          className="flex h-12 w-full items-center justify-start rounded-lg px-3 font-bold text-foreground transition-colors hover:bg-muted"
                        >
                          Sign in
                        </Link>
                      </SheetClose>
                      <SheetClose>
                        <Link
                          href={ROUTES.signup}
                          className="flex h-12 w-full items-center justify-start rounded-lg px-3 font-bold text-foreground transition-colors hover:bg-muted"
                        >
                          Create account
                        </Link>
                      </SheetClose>
                    </>
                  )}
                  {uid && (
                    <SheetClose>
                      <button
                        onClick={handleSignOut}
                        className="flex h-12 w-full items-center justify-start gap-2 whitespace-nowrap rounded-lg px-3 font-bold text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </SheetClose>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
