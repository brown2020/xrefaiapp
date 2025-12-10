"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  ChatIcon,
  ToolsIcon,
  HistoryIcon,
  AccountIcon,
} from "@/components/icons/NavIcons";

type MenuItem = {
  label: string;
  link: string;
  icon: React.ComponentType<{ className?: string }>;
};

const menuItems: MenuItem[] = [
  { label: "Chat", link: "/chat", icon: ChatIcon },
  { label: "Tools", link: "/tools", icon: ToolsIcon },
  { label: "History", link: "/history", icon: HistoryIcon },
  { label: "Account", link: "/account", icon: AccountIcon },
];

export default function Header() {
  const [showMenu, setShowMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (link: string) => {
    setShowMenu(false);
    router.push(link);
  };

  const toggleMenu = () => setShowMenu((prev) => !prev);

  return (
    <div className="container mx-auto bg-[#ffffff] sticky top-0 z-[20] text-gray-700 px-4 py-4">
      <div className="flex items-center justify-between text-sm">
        {/* Logo */}
        <div
          onClick={() => handleNavigation("/")}
          className="flex items-center justify-center"
        >
          <span className="px-3 py-2 text-white bg-orange-500 rounded-md cursor-pointer text-lg font-bold">
            XREF.AI
          </span>
        </div>

        {/* Menu icon for small screens */}
        <div
          className="ml-auto flex items-center justify-center h-full sm:hidden transition ease-in-out"
          onClick={toggleMenu}
        >
          <Menu className="w-6 h-6 cursor-pointer text-[#041D34] rounded-full" />
        </div>

        {/* Desktop Menu */}
        <div className="hidden sm:flex space-x-4">
          {menuItems.map((item) => (
            <div
              key={item.link}
              onClick={() => handleNavigation(item.link)}
              className={`cursor-pointer px-3 py-2 navbar-link font-semibold flex items-center gap-2 text-base ${
                pathname === item.link ? "active" : "text-[#041D34]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="relative flex w-full h-full sm:hidden">
          <div
            className="fixed top-0 right-0 z-40 w-full h-screen bg-black/50"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed top-0 right-0 z-40 w-full h-screen max-w-[250px] bg-[#ffffff] transition ease-in-out">
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4">
              <span
                onClick={() => handleNavigation("/")}
                className="px-3 py-2 text-white bg-orange-500 rounded-md cursor-pointer text-lg font-bold"
              >
                XREF.AI
              </span>
              <button onClick={toggleMenu} className="p-2">
                <X className="w-5 h-5 text-[#041D34] cursor-pointer" />
              </button>
            </div>

            {/* Mobile Menu Items */}
            <div className="flex flex-col">
              {menuItems.map((item) => (
                <div
                  key={item.link}
                  onClick={() => handleNavigation(item.link)}
                  className={`transition-all whitespace-nowrap flex h-14 gap-2 w-full items-center justify-start p-4 navbar-link font-semibold cursor-pointer md:py-2 ${
                    pathname === item.link ? "active" : ""
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
