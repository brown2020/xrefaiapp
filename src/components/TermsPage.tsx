import {
  PublicContentSection,
  PublicPageLayout,
} from "@/components/PublicPageLayout";

type Props = {
  appName: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  companyLocation: string;
  privacyLink: string;
  updatedAt: string;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <PublicContentSection title={title}>{children}</PublicContentSection>;
}

export default function Terms({
  appName,
  companyName,
  companyEmail,
  companyAddress,
  companyLocation,
  privacyLink,
  updatedAt,
}: Props) {
  return (
    <PublicPageLayout
      eyebrow="Terms"
      title="Terms of Service"
      description={`These terms explain how ${appName} works, including accounts, AI inputs and outputs, credits, payments, user-provided API keys, acceptable use, and support.`}
      updatedAt={updatedAt}
    >
        <Section title="Agreement">
          <p>
            These Terms of Service are a legal agreement between you and
            {` ${companyName}`} governing your access to and use of {appName},
            including our website, chat, writing, summarization,
            image-generation, account, credit, and payment features.
          </p>
          <p>
            By accessing or using {appName}, signing in, creating an account, or
            purchasing credits, you agree to these Terms and our{" "}
            <a href={privacyLink} className="underline">
              Privacy Policy
            </a>
            . If you do not agree, do not use {appName}.
          </p>
        </Section>

        <Section title="Who May Use the Service">
          <p>
            You must be at least 13 years old to use {appName}. If you are under
            the age of majority where you live, you may use {appName} only with
            permission from a parent or legal guardian. You are responsible for
            your account, credentials, and activity under your account.
          </p>
          <p>
            You agree to provide accurate account information and to keep your
            sign-in methods, passwords, and user-provided API keys secure.
          </p>
        </Section>

        <Section title="The Service">
          <p>
            {appName} provides AI-assisted writing, chat, summarization, image
            generation, saved history, credit purchases, and related tools. We may
            add, remove, suspend, or change features, models, providers, credit
            costs, rate limits, or availability at any time.
          </p>
          <p>
            Some features depend on third-party AI providers, Firebase, Google
            Cloud, Stripe, Fireworks AI, and other service providers. Their
            systems and policies may affect availability, performance, and
            handling of your content.
          </p>
        </Section>

        <Section title="AI Inputs and Outputs">
          <p>
            You are responsible for the prompts, files, images, URLs, API keys,
            and other content you submit to {appName} ("Inputs"). AI-generated
            text, images, summaries, suggestions, and other responses are
            "Outputs."
          </p>
          <p>
            Subject to these Terms and applicable law, you own your Inputs. To
            the extent we have rights in Outputs generated for you, we assign
            those rights to you. We may use Inputs and Outputs as needed to
            provide, secure, debug, and improve {appName}, enforce these Terms,
            and comply with law.
          </p>
          <p>
            AI Outputs can be inaccurate, incomplete, offensive, unsafe, or not
            unique. Similar or identical Outputs may be generated for other users.
            You are responsible for reviewing Outputs before relying on,
            publishing, or using them. Outputs are not legal, financial, medical,
            tax, professional, or other expert advice.
          </p>
          <p>
            Do not submit content unless you have the rights and permissions
            needed to do so, and do not use Outputs in a way that violates law,
            third-party rights, or these Terms.
          </p>
        </Section>

        <Section title="Credits, Billing, and Payments">
          <p>
            {appName} uses credits for certain paid features, including chat,
            writing, and image generation. Credit costs may vary by feature,
            model, word count, or other usage factors and may change over time.
          </p>
          <p>
            Credit purchases are processed through Stripe Checkout or, where
            available, an approved in-app purchase flow. Credits are not cash,
            have no cash value, are not transferable, and may not be resold.
            Purchased credits do not expire while your account remains active,
            unless we clearly state otherwise or applicable law requires a
            different rule.
          </p>
          <p>
            Except where required by law, purchases are final and non-refundable.
            We may issue refunds, credits, or adjustments at our sole discretion.
            If a charge is reversed, disputed, refunded, or appears fraudulent, we
            may reverse the associated credits or suspend account access.
          </p>
        </Section>

        <Section title="User-Provided API Keys">
          <p>
            If you choose to use your own AI provider API keys, you authorize us
            to store those keys in your profile and use them to send your
            requests to the provider you select. You are responsible for your
            provider account, provider fees, usage limits, and compliance with
            the provider terms. You can remove saved keys from your account
            settings.
          </p>
        </Section>

        <Section title="Acceptable Use">
          <p>You agree not to use {appName} to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>violate any law, regulation, contract, or third-party right;</li>
            <li>generate, request, upload, or distribute unlawful, abusive, or harmful content;</li>
            <li>harass, exploit, impersonate, defame, or threaten anyone;</li>
            <li>create malware, facilitate cyber abuse, or bypass security controls;</li>
            <li>scrape, crawl, or proxy websites in a way that violates law or site rules;</li>
            <li>attempt to access another user account or data;</li>
            <li>abuse credits, payments, refunds, promotions, rate limits, or idempotency systems;</li>
            <li>reverse engineer, overload, disrupt, or interfere with {appName};</li>
            <li>misrepresent AI Outputs as human-created where disclosure is legally required.</li>
          </ul>
          <p>
            We may block requests, remove content, suspend access, or terminate
            accounts that violate these Terms or create risk for users, providers,
            {companyName}, or the public.
          </p>
        </Section>

        <Section title="Intellectual Property">
          <p>
            {appName}, including its software, design, branding, logos,
            interfaces, and technology, is owned by {companyName} or its
            licensors and is protected by intellectual property laws. These Terms
            do not give you ownership of {appName} or our trademarks.
          </p>
          <p>
            You may use {appName} only as permitted by these Terms. You may not
            copy, modify, sell, lease, sublicense, or distribute our software or
            service except as expressly allowed by us.
          </p>
        </Section>

        <Section title="Copyright Complaints">
          <p>
            If you believe content on {appName} infringes your copyright, contact
            us at {companyEmail} with enough information for us to identify the
            work, the allegedly infringing material, your contact information, a
            good-faith statement, and a statement that the information is
            accurate and that you are authorized to act.
          </p>
        </Section>

        <Section title="Privacy">
          <p>
            Our{" "}
            <a href={privacyLink} className="underline">
              Privacy Policy
            </a>{" "}
            explains how we collect, use, and share information. By using
            {appName}, you consent to our privacy practices as described there.
          </p>
        </Section>

        <Section title="Beta Features and Availability">
          <p>
            Some features may be experimental, unavailable, rate limited, or
            changed without notice. We do not guarantee that {appName}, any AI
            model, any generated Output, or any saved content will always be
            available, accurate, secure, or uninterrupted.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            {appName} is provided "as is" and "as available." To the maximum
            extent allowed by law, {companyName} disclaims all warranties,
            including implied warranties of merchantability, fitness for a
            particular purpose, title, non-infringement, accuracy, availability,
            and security.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the maximum extent allowed by law, {companyName} and its
            affiliates, officers, directors, employees, agents, licensors, and
            service providers will not be liable for indirect, incidental,
            special, consequential, exemplary, or punitive damages, or for lost
            profits, lost revenue, lost data, business interruption, or loss of
            goodwill.
          </p>
          <p>
            To the maximum extent allowed by law, our total liability for any
            claim related to {appName} or these Terms will not exceed the greater
            of $100 or the amount you paid to {companyName} for {appName} in the
            three months before the event giving rise to the claim.
          </p>
        </Section>

        <Section title="Indemnity">
          <p>
            You agree to defend, indemnify, and hold harmless {companyName} and
            its affiliates, officers, directors, employees, agents, licensors, and
            service providers from claims, damages, liabilities, losses, and
            expenses arising from your Inputs, your use of Outputs, your use of
            {appName}, your violation of these Terms, or your violation of law or
            third-party rights.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using {appName} at any time. We may suspend or terminate
            your access if we believe you violated these Terms, created risk, used
            the service abusively, or if we discontinue the service. Sections that
            by their nature should survive termination will survive, including
            payment obligations, intellectual property, disclaimers, limitation of
            liability, indemnity, dispute resolution, and governing law.
          </p>
        </Section>

        <Section title="Governing Law and Disputes">
          <p>
            These Terms are governed by the laws of the State of California,
            without regard to conflict-of-law rules. Before filing a claim, you
            agree to email us at {companyEmail} and try to resolve the dispute
            informally.
          </p>
          <p>
            If a dispute cannot be resolved informally, the state and federal
            courts located in California will have jurisdiction, except where
            applicable law requires another forum.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. The updated Terms will
            be posted on this page with a new last-updated date. Your continued
            use of {appName} after changes become effective means you accept the
            updated Terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            {companyName}
            <br />
            {companyAddress}
            <br />
            {companyLocation}
          </p>
          <p>
            Email:{" "}
            <a className="underline" href={`mailto:${companyEmail}`}>
              {companyEmail}
            </a>
          </p>
        </Section>
    </PublicPageLayout>
  );
}
