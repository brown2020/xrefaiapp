"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show footer on chat pages to maximize vertical space
  if (pathname?.startsWith("/chat")) {
    return null;
  }

  const menuItemsRight = [{ label: "XREF.AI", link: "/" }];

  const menuItemsLeft = [
    { label: "About", link: "/about" },
    { label: "Terms", link: "/terms" },
    { label: "Privacy", link: "/privacy" },
    { label: "Support", link: "/support" },
  ];

  const handleNavigation = (link: string) => {
    router.push(link);
  };

  const menuDisplayRight = menuItemsRight.map((item, index) => (
    <div
      key={index}
      onClick={() => handleNavigation(item.link)}
      className="cursor-pointer text-[#041D34] hover:text-[#83A873] navbar-link"
    >
      {item.label}
    </div>
  ));

  const menuDisplayLeft = menuItemsLeft.map((item, index) => (
    <div
      key={index}
      onClick={() => handleNavigation(item.link)}
      className="cursor-pointer text-[#041D34] hover:text-[#83A873] navbar-link"
    >
      {item.label}
    </div>
  ));

  return (
    <div className="bg-[#F5F5F5]">
      <div className="container flex flex-col sm:flex-row items-center justify-between px-5 py-5 mx-auto z-10 text-gray-500 gap-4 sm:gap-0">
        {/* Left Menu */}
        <div className="flex gap-4 sm:gap-6 order-2 sm:order-1 lg:w-[33%]">
          {menuDisplayLeft}
        </div>

        {/* Social Media Icons */}
        <div className="flex lg:justify-center gap-3 order-1 lg:order-2 lg:w-[33%]">
          <Link
            href="https://x.com/xrefdotai"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-[#141D3D] text-white cursor-pointer hover:bg-[#83A873] hover:text-[#ffffff] rounded-full">
              <i className="fa-brands fa-x"></i>
            </div>
          </Link>
          <Link
            href="https://www.facebook.com/xrefdotai"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-[#141D3D] text-white cursor-pointer hover:bg-[#83A873] hover:text-[#ffffff] rounded-full">
              <i className="fa-brands fa-facebook-f"></i>
            </div>
          </Link>
          <Link
            href="https://www.instagram.com/xrefdotai"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-[#141D3D] text-white cursor-pointer hover:bg-[#83A873] hover:text-[#ffffff] rounded-full">
              <i className="fa-brands fa-instagram"></i>
            </div>
          </Link>
        </div>

        {/* Right Menu and Copyright */}
        <div className="flex lg:justify-end gap-2 order-3 lg:order-3 lg:w-[33%] text-[#041D34]">
          <div>&copy; {new Date().getFullYear()}</div>
          {menuDisplayRight}
        </div>
      </div>
    </div>
  );
}
