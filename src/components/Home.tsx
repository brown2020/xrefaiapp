"use client";

import { Typewriter } from "react-simple-typewriter";
import AuthComponent from "@/components/AuthComponent";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  PenTool, 
  Image as ImageIcon, 
  FileText, 
  Share2, 
  Sparkles, 
  Zap, 
  CheckCircle2
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  const handleNavigation = (link: string) => {
    router.push(link);
  };

  const typewriterWords = [
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
    "Instagram Captions",
    "Marketing Content",
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="container px-4 mx-auto relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            
            <div className="inline-flex items-center px-3 py-1 mb-8 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-4 h-4 mr-2" />
              <span>Unlock your creative potential with AI</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white">
              Create amazing <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
                <Typewriter
                  words={typewriterWords}
                  loop={0}
                  cursor
                  cursorStyle="_"
                  typeSpeed={70}
                  deleteSpeed={50}
                  delaySpeed={1500}
                />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl leading-relaxed">
              Generate high-quality content in seconds. From engaging blog posts to stunning visuals, 
              let our AI tools handle the heavy lifting so you can focus on big ideas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <AuthComponent />
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Explore Features
              </button>
            </div>
          </div>

          {/* Hero Images Composition */}
          <div className="mt-16 relative max-w-5xl mx-auto hidden md:block">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 dark:opacity-30 animate-pulse"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-3 gap-4 p-4">
                 <div className="col-span-2 aspect-video relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <Image
                      src="/hero.png"
                      alt="AI Dashboard Interface"
                      fill
                      className="object-cover"
                    />
                 </div>
                 <div className="col-span-1 flex flex-col gap-4">
                    <div className="grow relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <Image
                        src="/hero_2.png"
                        alt="AI Generated Content"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="h-1/3 relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white p-4">
                       <div className="text-center">
                          <div className="text-3xl font-bold">100+</div>
                          <div className="text-xs opacity-80">Content Types</div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[10%] left-[-5%] w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white dark:bg-slate-950">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Everything you need to create</h2>
            <p className="text-slate-600 dark:text-slate-400">
              A comprehensive suite of AI-powered tools designed to streamline your creative workflow and boost productivity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard 
              icon={<FileText className="w-6 h-6 text-blue-500" />}
              title="Smart Writing Assistant"
              description="Generate articles, essays, and stories with context-aware AI that captures your unique voice."
            />
            <FeatureCard 
              icon={<ImageIcon className="w-6 h-6 text-purple-500" />}
              title="Image Generation"
              description="Turn text descriptions into vivid, high-quality images for your projects and marketing."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-500" />}
              title="Instant Summaries"
              description="Condense long documents, articles, or transcripts into concise summaries in seconds."
            />
            <FeatureCard 
              icon={<Share2 className="w-6 h-6 text-pink-500" />}
              title="Social Media Magic"
              description="Create engaging posts, captions, and hashtags optimized for different platforms."
            />
             <FeatureCard 
              icon={<PenTool className="w-6 h-6 text-green-500" />}
              title="Content Improvement"
              description="Rewrite and polish existing content to improve clarity, tone, and engagement."
            />
            <FeatureCard 
              icon={<Sparkles className="w-6 h-6 text-cyan-500" />}
              title="Creative Brainstorming"
              description="Generate ideas for blog topics, product names, and marketing campaigns instantly."
            />
          </div>
        </div>
      </section>

      {/* Premium/Credits Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container px-4 mx-auto">
          <div className="max-w-5xl mx-auto bg-[#041D34] rounded-3xl overflow-hidden shadow-2xl relative">
             {/* Abstract Background Elements */}
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
             <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-500 rounded-full opacity-20 blur-3xl"></div>
             
             <div className="grid md:grid-cols-2 gap-8 items-center p-8 md:p-12 relative z-10">
                <div className="text-white space-y-6">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                        <Image src="/credits_1.svg" alt="Credits" height={32} width={32} className="w-8 h-8" />
                      </div>
                      <span className="text-blue-300 font-semibold tracking-wider text-sm uppercase">Flexible Pricing</span>
                   </div>
                   
                   <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                      Pay only for what you use. No monthly subscriptions.
                   </h2>
                   
                   <p className="text-blue-100 text-lg opacity-90">
                      Purchase credits as needed. Your credits never expire, giving you complete control over your spending.
                   </p>
                   
                   <ul className="space-y-3 pt-2">
                      <li className="flex items-center gap-2 text-blue-50">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span>Transparent pricing per generation</span>
                      </li>
                      <li className="flex items-center gap-2 text-blue-50">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span>Secure payments via Stripe</span>
                      </li>
                      <li className="flex items-center gap-2 text-blue-50">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span>Top up anytime instantly</span>
                      </li>
                   </ul>

                   <button 
                      onClick={() => handleNavigation("/account")}
                      className="mt-4 inline-flex items-center justify-center px-8 py-3 bg-white text-[#041D34] font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                   >
                      Buy Credits
                   </button>
                </div>
                
                <div className="hidden md:flex justify-center items-center">
                   <div className="relative w-full aspect-square max-w-xs">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
                      <Image 
                        src="/credits_1.svg" 
                        alt="Credits Coin" 
                        fill 
                        className="object-contain drop-shadow-2xl p-8"
                      />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
