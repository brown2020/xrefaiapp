"use client";

import { useRouter } from "next/navigation";

export default function Footer() {
  const router = useRouter();
  const menuItems = [
    { label: "XREF.AI", link: "/" },
    { label: "Tools", link: "/tools" },
    { label: "History", link: "/history" },
    { label: "Account", link: "/account" },
    { label: "Privacy", link: "/privacy" },
    { label: "Terms", link: "/terms" },
  ];

  const handleNavigation = (link: string) => {
    router.push(link);
  };

  const menuDisplay = menuItems.map((item, index) => (
    <div
      key={index}
      onClick={() => handleNavigation(item.link)}
      className="cursor-pointer text-gray-500 hover:text-black"
    >
      {item.label}
    </div>
  ));

  return (
    <div className="h-14 mt-5 flex flex-wrap items-center justify-center max-w-5xl px-5 pb-5 mx-auto space-x-2 z-10 text-gray-500">
      <div>&copy; {new Date().getFullYear()}</div>
      {menuDisplay}
    </div>
  );
}
