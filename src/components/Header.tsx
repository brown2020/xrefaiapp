"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, MessageSquare, Grid2X2, History, User } from "lucide-react";
import { NAV_MENU_ITEMS, ROUTES } from "@/constants/routes";

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
  const [showMenu, setShowMenu] = useState(false);
  const pathname = usePathname();

  const closeMenu = () => setShowMenu(false);
  const toggleMenu = () => setShowMenu((prev) => !prev);

  return (
    <div className="container mx-auto bg-[#ffffff] sticky top-0 z-[20] text-gray-700 px-4 py-4">
      <div className="flex items-center justify-between text-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center">
          <span className="px-3 py-2 text-white bg-orange-500 rounded-md cursor-pointer text-lg font-bold">
            XREF.AI
          </span>
        </Link>

        {/* Menu icon for small screens */}
        <button
          className="ml-auto flex items-center justify-center h-full sm:hidden transition ease-in-out"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6 cursor-pointer text-[#041D34] rounded-full" />
        </button>

        {/* Desktop Menu */}
        <nav className="hidden sm:flex space-x-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 navbar-link font-semibold flex items-center gap-2 text-base ${
                pathname === item.href ? "active" : "text-[#041D34]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="relative flex w-full h-full sm:hidden">
          <div
            className="fixed top-0 right-0 z-40 w-full h-screen bg-black/50"
            onClick={closeMenu}
          />
          <div className="fixed top-0 right-0 z-40 w-full h-screen max-w-[250px] bg-[#ffffff] transition ease-in-out">
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4">
              <Link href="/" onClick={closeMenu}>
                <span className="px-3 py-2 text-white bg-orange-500 rounded-md cursor-pointer text-lg font-bold">
                  XREF.AI
                </span>
              </Link>
              <button
                onClick={toggleMenu}
                className="p-2"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-[#041D34] cursor-pointer" />
              </button>
            </div>

            {/* Mobile Menu Items */}
            <nav className="flex flex-col">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={`transition-all whitespace-nowrap flex h-14 gap-2 w-full items-center justify-start p-4 navbar-link font-semibold md:py-2 ${
                    pathname === item.href ? "active" : ""
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
