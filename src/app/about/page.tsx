export default function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-foreground">
          About Xref.AI
        </h1>

        <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
          <div className="prose max-w-none">
            <p className="text-lg leading-relaxed mb-4 text-muted-foreground">
              <span className="font-bold text-foreground">Xref.AI</span> is an
              advanced AI-powered platform designed to help you create
              high-quality content with ease. Whether you&apos;re a writer,
              marketer, student, or professional, our tools can help you generate
              ideas, summarize information, and create engaging content.
            </p>

            <p className="text-lg leading-relaxed mb-4 text-muted-foreground">
              <span className="font-bold text-foreground">Our Mission:</span> To
              make content creation accessible, efficient, and enjoyable for
              everyone. We believe that with the right tools, anyone can produce
              exceptional content that communicates their ideas effectively.
            </p>

            <p className="text-lg leading-relaxed mb-4 text-muted-foreground">
              <span className="font-bold text-foreground">
                Powerful AI Tools:
              </span>{" "}
              Our platform offers a variety of tools including{" "}
              <strong className="text-foreground">topic summarization</strong>,{" "}
              <strong className="text-foreground">freestyle writing</strong>,{" "}
              <strong className="text-foreground">text simplification</strong>,{" "}
              <strong className="text-foreground">image generation</strong>, and{" "}
              <strong className="text-foreground">design assistance</strong>.
              Each tool is powered by state-of-the-art AI models to deliver the
              best results.
            </p>

            <p className="text-lg leading-relaxed mb-4 text-muted-foreground">
              <span className="font-bold text-foreground">
                Customizable and Shareable:
              </span>{" "}
              Every image you generate is stored on your profile, where you can{" "}
              <strong className="text-foreground">add tags</strong>,{" "}
              <strong className="text-foreground">search and filter</strong>{" "}
              your images, and{" "}
              <strong className="text-foreground">regenerate</strong> them using
              the same or edited prompts. You can also make your images{" "}
              <strong className="text-foreground">sharable</strong> and easily{" "}
              <strong className="text-foreground">download</strong> or{" "}
              <strong className="text-foreground">share</strong> them with your
              friends, community, or social media followers.
            </p>

            <p className="text-lg leading-relaxed text-muted-foreground">
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
