import type { ReactNode } from "react";

type PublicPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt?: string;
  children: ReactNode;
};

export function PublicPageLayout({
  eyebrow,
  title,
  description,
  updatedAt,
  children,
}: PublicPageLayoutProps) {
  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
        <header className="mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-normal text-foreground md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {description}
          </p>
          {updatedAt && (
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Last updated: {updatedAt}
            </p>
          )}
        </header>

        <div>{children}</div>
      </div>
    </main>
  );
}

export function PublicContentSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-t border-border py-8 first:border-t-0 first:pt-0 ${className}`}
    >
      <h2 className="mb-4 text-xl font-bold leading-tight tracking-normal text-foreground">
        {title}
      </h2>
      <div className="space-y-4 text-base leading-7 text-muted-foreground [&_a]:font-semibold [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:underline [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}

export function PublicCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}
