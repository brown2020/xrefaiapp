"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, MessageSquare, Grid2X2, History, User } from "lucide-react";
import { NAV_MENU_ITEMS, ROUTES } from "@/constants/routes";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui";

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

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4 text-sm">
        <div className="flex items-center justify-between text-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center">
            <span className="px-3 py-2 text-white bg-orange-500 rounded-md cursor-pointer text-lg font-bold">
              XREF.AI
            </span>
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden sm:flex space-x-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`px-3 py-2 navbar-link font-semibold flex items-center gap-2 text-base ${
                  pathname === item.href ? "active" : "text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu (accessible sheet) */}
          <div className="sm:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger>
                <button
                  type="button"
                  className="ml-auto flex items-center justify-center"
                  aria-label="Open menu"
                >
                  <Menu className="w-6 h-6 text-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent title="Menu">
                <nav className="flex flex-col">
                  {menuItems.map((item) => (
                    <SheetClose key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={pathname === item.href ? "page" : undefined}
                        className={`transition-all whitespace-nowrap flex h-12 gap-2 w-full items-center justify-start px-3 rounded-lg navbar-link font-semibold ${
                          pathname === item.href ? "active" : ""
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
