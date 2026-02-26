export default function Support() {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="text-foreground space-y-6">
        <div className="max-w-2xl mx-auto p-8 border border-border rounded-xl bg-card">
          <h2 className="text-3xl font-bold mb-4 text-center text-foreground">
            Xref.AI
          </h2>

          <h4 className="text-xl font-semibold mb-4 text-foreground">
            Contact Information
          </h4>

          <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
            Xref.AI welcomes your questions or comments regarding this
            application. If you have any inquiries or feedback, please reach out
            to us at:
          </p>

          <div className="text-lg text-muted-foreground mb-4">
            <p>Xref.AI</p>
            <p>30765 Pacific Coast Hwy #354</p>
            <p>Malibu, CA</p>
          </div>

          <div className="text-lg text-muted-foreground mb-6">
            <p>Email Address:</p>
            <a
              href="mailto:info@xref.ai"
              className="text-primary hover:opacity-80 transition-opacity"
            >
              info@xref.ai
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            Last updated: September 1, 2024
          </p>
        </div>
      </div>
    </div>
  );
}
