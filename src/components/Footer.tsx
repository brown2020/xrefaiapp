"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const menuItemsLeft = [
  { label: "About", href: "/about" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
];

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="text-[#041D34] hover:text-[#83A873] navbar-link transition-colors"
    >
      {label}
    </Link>
  );
}

function SocialIcon({ href, icon }: { href: string; icon: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center w-8 h-8 bg-[#141D3D] text-white hover:bg-[#83A873] hover:text-[#ffffff] rounded-full transition-colors"
    >
      <i className={icon}></i>
    </Link>
  );
}

export default function Footer() {
  const pathname = usePathname();

  // Don't show footer on functional pages to maximize vertical space
  const hiddenPaths = ["/chat", "/history", "/tools", "/account"];
  if (hiddenPaths.some((path) => pathname?.startsWith(path))) {
    return null;
  }

  return (
    <footer className="bg-[#F5F5F5]">
      <div className="container flex flex-col sm:flex-row items-center justify-between px-5 py-5 mx-auto z-10 text-gray-500 gap-4 sm:gap-0">
        {/* Left Menu */}
        <nav className="flex gap-4 sm:gap-6 order-2 sm:order-1 lg:w-[33%]">
          {menuItemsLeft.map((item) => (
            <FooterLink key={item.href} label={item.label} href={item.href} />
          ))}
        </nav>

        {/* Social Media Icons */}
        <div className="flex lg:justify-center gap-3 order-1 lg:order-2 lg:w-[33%]">
          <SocialIcon href="https://x.com/xrefdotai" icon="fa-brands fa-x" />
          <SocialIcon
            href="https://www.facebook.com/xrefdotai"
            icon="fa-brands fa-facebook-f"
          />
          <SocialIcon
            href="https://www.instagram.com/xrefdotai"
            icon="fa-brands fa-instagram"
          />
        </div>

        {/* Right Menu and Copyright */}
        <div className="flex lg:justify-end gap-2 order-3 lg:order-3 lg:w-[33%] text-[#041D34]">
          <span>&copy; {new Date().getFullYear()}</span>
          <FooterLink label="XREF.AI" href="/" />
        </div>
      </div>
    </footer>
  );
}
