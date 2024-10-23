"use client";

import { useRouter } from "next/navigation";

export default function Footer() {
  const router = useRouter();

  const menuItemsRight = [
    { label: "XREF.AI", link: "/" },
  ];

  const menuItemsLeft = [
    { label: "Privacy Policy", link: "/privacy" },
    { label: "Terms And Condition", link: "/terms" },
  ];

  const handleNavigation = (link: string) => {
    router.push(link);
  };

  const menuDisplayRight = menuItemsRight.map((item, index) => (
    <div
      key={index}
      onClick={() => handleNavigation(item.link)}
      className="cursor-pointer text-[#A1ADF4] hover:text-[#B6F09C] navbar-link"
    >
      {item.label}
    </div>
  ));

  const menuDisplayLeft = menuItemsLeft.map((item, index) => (
    <div
      key={index}
      onClick={() => handleNavigation(item.link)}
      className="cursor-pointer text-[#A1ADF4] hover:text-[#B6F09C] navbar-link"
    >
      {item.label}
    </div>
  ));

  return (
    <div className="container flex flex-col sm:flex-row items-center justify-between px-5 py-5 mx-auto z-10 text-gray-500 gap-4 sm:gap-0">
      {/* Left Menu */}
      <div className="flex gap-4 sm:gap-6 order-2 sm:order-1">
        {menuDisplayLeft}
      </div>

      {/* Social Media Icons */}
      <div className="flex gap-3 order-1 sm:order-2">
        <div className="flex items-center justify-center w-8 h-8 bg-[#141D3D] text-white cursor-pointer hover:bg-[#B6F09C] hover:text-[#060912] rounded-full">
          <i className="fa-brands fa-facebook-f"></i>
        </div>
        <div className="flex items-center justify-center w-8 h-8 bg-[#141D3D] text-white cursor-pointer hover:bg-[#B6F09C] hover:text-[#060912] rounded-full">
          <i className="fa-brands fa-twitter"></i>
        </div>
        <div className="flex items-center justify-center w-8 h-8 bg-[#141D3D] text-white cursor-pointer hover:bg-[#B6F09C] hover:text-[#060912] rounded-full">
          <i className="fa-brands fa-pinterest-p"></i>
        </div>
        <div className="flex items-center justify-center w-8 h-8 bg-[#141D3D] text-white cursor-pointer hover:bg-[#B6F09C] hover:text-[#060912] rounded-full">
          <i className="fa-brands fa-youtube"></i>
        </div>
      </div>

      {/* Right Menu and Copyright */}
      <div className="flex  gap-2 order-3 sm:order-3 text-[#A1ADF4]">
        <div>&copy; {new Date().getFullYear()}</div>
        {menuDisplayRight}
      </div>
    </div>
  );
}
