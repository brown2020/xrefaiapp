"use client";

import { Typewriter } from "react-simple-typewriter";
import AuthComponent from "@/components/AuthComponent";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  const handleNavigation = (link: string) => {
    router.push(link);
  };
  return (
    <div className="flex flex-col items-center justify-center mx-auto">
      <div className="flex flex-col text-center my-6">
        <h3 className="mb-4 text-2xl sm:text-3xl md:text-3xl lg:text-2xl text-[#041D34] font-normal px-4">
          What would you like to create today?
        </h3>
        <div className="container wrapper relative px-4">
          <div className="overlayer-bgi absolute h-min sm:block hidden">
            <Image
              height={300}
              width={300}
              className="w-full h-full object-cover"
              src="/bg_img_1.png"
              alt=""
            />
          </div>
          <div className="z-10 relative Typewriter_Section w-full">
            <h3 className="h-16 text-4xl sm:text-5xl md:text-5xl chnage_title font-extrabold my-5">
              <Typewriter
                loop={false}
                words={[
                  "Topic Summaries",
                  "Blog Posts",
                  "Newsletters",
                  "Travel Logs",
                  "Website Content",
                  "Essay Paragraphs",
                  "Homework Help",
                  "Descriptions",
                  "Product Info",
                  "Social Media Posts",
                  "Useful Tweets",
                  "Instagram Captions",
                  "Marketing Content",
                ]}
              />
            </h3>
          </div>
          <div className="z-10 relative Hero_Image flex flex-col md:flex-row md:gap-8">
            <div className="hero-img sd:w-4/6 md:w-3/5 lg:w-3/5">
              <Image
                className="rounded-3xl w-full h-auto object-cover"
                src="/hero.png"
                alt="Hero Image"
                height={1000}
                width={1000}
              />
            </div>
            <div className="flex flex-col justify-between gap-4 img-section py-4 sm:w-2/6 md:w-2/5">
              <div className="">
                <Image
                  src="/hero_2.png"
                  className="w-full h-auto object-cover"
                  alt=""
                  height={1000}
                  width={1000}
                />
              </div>

              <div className="text-start">
                <AuthComponent />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="premium w-full">
        <div className="container mx-auto p-6 text-center gap">
          <div className="flex flex-col justify-center gap-3">
            <div className="credits_icon flex justify-center ">
              {/* <Image src="credits_1.svg" alt="" className="max-w-16	" height={100} width={100}/> */}
              <Image src="credits_1.svg" alt="" height={60} width={60} />
            </div>
            <div className="premium_title flex justify-center">
              <div
                className="bg-white max-w-max p-1 px-2 font-semibold cursor-pointer"
                onClick={() => handleNavigation("/account")}
              >
                BUY CREDITS
              </div>
            </div>
            <div className="paraghragh">
              <p className="text-2xl sm:text-2xl font-bold text-white">
                Pay only for what you use
              </p>
            </div>
            <div className="paraghragh">
              <p className="text-xl sm:text-1xl font-normal text-white max-w-xl mx-auto">
                Purchase credits as needed for your content creation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* End of premium section */}
    </div>
  );
}
