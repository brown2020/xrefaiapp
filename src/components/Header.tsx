"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react"; // Import the Menu icon from lucide-react

export default function Header() {
  const [showMenu, setShowMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { label: "Chat", link: "/chat" },
    { label: "Tools", link: "/tools" },
    { label: "History", link: "/history" },
    { label: "Account", link: "/account" },
  ];

  const handleNavigation = (link: string) => {
    setShowMenu(false);
    router.push(link);
  };

  const menuDisplay = menuItems.map((item, index) => (
    <div
      key={index}
      onClick={() => handleNavigation(item.link)}
      className={`cursor-pointer px-3 py-2 rounded-md ${
        pathname === item.link
          ? "bg-orange-500 text-white"
          : "text-gray-700 hover:bg-gray-100 hover:text-black"
      }`}
    >
      {item.label}
    </div>
  ));

  // Sidebar for small screens - moved to the right
  const sideBar = (
    <div className="fixed top-0 right-0 z-40 mt-14 w-full h-screen max-w-[200px] bg-white shadow-inner">
      {menuItems.map((item, index) => (
        <div
          key={index}
          onClick={() => handleNavigation(item.link)}
          className={`whitespace-nowrap flex h-14 w-full items-center justify-start px-3 py-3 md:py-2 ${
            pathname === item.link
              ? "bg-orange-500 text-white" // Highlight the active item with bg-orange-500
              : "text-gray-700 hover:bg-gray-100 hover:text-black"
          }`}
        >
          {item.label}
        </div>
      ))}
    </div>
  );

  return (
    <div className="sticky top-0 z-30 h-14 bg-white text-gray-700 shadow-lg sm:px-5">
      <div className="flex items-center justify-between h-14 max-w-5xl mx-auto text-sm uppercase">
        {/* Logo */}
        <div
          onClick={() => handleNavigation("/")}
          className="flex items-center justify-center"
        >
          <span className="px-3 py-2 text-white bg-orange-500 rounded-md cursor-pointer">
            XREF.AI
          </span>
        </div>

        {/* Menu icon for small screens - moved to the right */}
        <div
          className="ml-auto flex items-center justify-center h-full p-2 w-14 sm:hidden"
          onClick={() => setShowMenu(!showMenu)}
        >
          {/* lucide-react Menu icon */}
          <Menu className="w-6 h-6 cursor-pointer hover:bg-gray-300 hover:text-white rounded-full" />
        </div>

        {/* Desktop Menu */}
        <div className="hidden sm:flex space-x-4">{menuDisplay}</div>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="relative flex w-full h-full sm:hidden">
          <div className="fixed top-0 right-0 z-40 w-full h-screen bg-black bg-opacity-50" />
          {sideBar}
        </div>
      )}
    </div>
  );
}
