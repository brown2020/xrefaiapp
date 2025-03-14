// pages/about.tsx
import React from "react";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">About Xref.AI</h1>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="prose max-w-none">
            <p className="text-lg leading-relaxed mb-4">
              <span className="font-bold">Xref.AI</span> is an advanced
              AI-powered platform designed to help you create high-quality
              content with ease. Whether you&apos;re a writer, marketer,
              student, or professional, our tools can help you generate ideas,
              summarize information, and create engaging content.
            </p>

            <p className="text-lg leading-relaxed mb-4">
              <span className="font-bold">Our Mission:</span> To make content
              creation accessible, efficient, and enjoyable for everyone. We
              believe that with the right tools, anyone can produce exceptional
              content that communicates their ideas effectively.
            </p>

            <p className="text-lg leading-relaxed mb-4">
              <span className="font-bold">Powerful AI Tools:</span> Our platform
              offers a variety of tools including{" "}
              <strong>topic summarization</strong>,{" "}
              <strong>freestyle writing</strong>,{" "}
              <strong>text simplification</strong>,{" "}
              <strong>image generation</strong>, and{" "}
              <strong>design assistance</strong>. Each tool is powered by
              state-of-the-art AI models to deliver the best results.
            </p>

            <p className="text-lg leading-relaxed mb-4">
              <span className="font-bold">Customizable and Shareable:</span>{" "}
              Every image you generate is stored on your profile, where you can{" "}
              <strong>add tags</strong>, <strong>search and filter</strong> your
              images, and <strong>regenerate</strong> them using the same or
              edited prompts. You can also make your images{" "}
              <strong>sharable</strong> and easily <strong>download</strong> or{" "}
              <strong>share</strong> them with your friends, community, or
              social media followers.
            </p>

            <p className="text-lg leading-relaxed">
              Whether you&apos;re experimenting with different styles, refining
              your ideas, or simply enjoying the process of creation, Xref.AI is
              here to help you unleash your creative potential. Join the growing
              community of creators and start generating today!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
