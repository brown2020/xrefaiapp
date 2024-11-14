"use client";

import { Typewriter } from "react-simple-typewriter";
import AuthComponent from "@/components/AuthComponent";
import { useRouter } from "next/navigation";
import Image from "next/image";
import RootLayout from "@/app/layout";

export default function Home() {
  const router = useRouter();

  const handleNavigation = (link: string) => {
    router.push(link);
  };
  return (
    <RootLayout showFooter={true}>
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
                  We are moving from a subscription model to a pay-as-you-go
                  model.
                </p>
              </div>
              <div className="paraghragh">
                <p className="text-xl sm:text-1xl font-normal text-white max-w-xl mx-auto">
                  If you are a previous paying subscriber, we have stopped your
                  billing and added{" "}
                  <span className="font-bold text-2xl">$99.99</span> of credits
                  to your account.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dismissible Notice */}
        {/* {showNotice && (
        <div className="relative p-4 text-center mt-80 text-white bg-blue-500 rounded-md w-full">
          <p className="text-lg font-semibold">
            We are moving from a subscription model to a pay-as-you-go model.
          </p>
          <p className="text-sm mt-2">
            If you are a previous paying subscriber, we have stopped your
            billing and added <strong>$99.99</strong> of credits to your
            account.
          </p>
          <button
            onClick={() => setShowNotice(false)}
            className="absolute top-1 right-3 text-white font-bold"
          >
            &times;
          </button>
        </div>
      )} */}
      </div>
    </RootLayout>
  );
}
