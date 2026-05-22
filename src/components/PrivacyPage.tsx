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

export default function Privacy({
  appName,
  companyName,
  companyEmail,
  companyAddress,
  companyLocation,
  updatedAt,
}: Props) {
  return (
    <PublicPageLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      description={`${companyName} keeps this policy specific to ${appName}: account data, prompts, generated content, credits, payments, provider keys, and the AI services that power the app.`}
      updatedAt={updatedAt}
    >
        <Section title="Overview">
          <p>
            This Privacy Policy explains how {companyName} collects, uses, and
            shares information when you use {appName}, including our website,
            chat, writing, summarization, image-generation, account, credit, and
            payment features.
          </p>
          <p>
            We built this policy to describe the data practices that matter for
            an AI productivity app. If you do not agree with this policy, please
            do not use {appName}.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account information:</strong> email address, display name,
              authentication identifiers, profile settings, selected AI model,
              and account preferences.
            </li>
            <li>
              <strong>User content:</strong> prompts, chat messages, writing
              requests, URLs you ask us to summarize, uploaded or resized images,
              generated images, generated text, and saved history items.
            </li>
            <li>
              <strong>Credits and payment records:</strong> credit balances,
              credit ledger entries, purchase history, Stripe Checkout session
              identifiers, pack selections, payment status, and related metadata.
              We do not receive or store full payment card numbers.
            </li>
            <li>
              <strong>User-provided API keys:</strong> if you choose to use your
              own provider keys instead of credits, we store the keys you save in
              your profile so we can route your requests to the provider you
              select.
            </li>
            <li>
              <strong>Device, cookie, and usage information:</strong> cookies,
              local storage values, browser or WebView details, logs, error
              information, rate-limit records, idempotency records, and security
              signals used to operate and protect the service.
            </li>
          </ul>
        </Section>

        <Section title="How We Use Information">
          <p>We use information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>provide, personalize, secure, and improve {appName};</li>
            <li>authenticate users and keep accounts signed in;</li>
            <li>generate, stream, save, and display AI responses and images;</li>
            <li>process credit debits, refunds, purchases, and payment records;</li>
            <li>send sign-in links, password reset emails, receipts, and support messages;</li>
            <li>detect abuse, enforce rate limits, prevent duplicate charges, and debug errors;</li>
            <li>comply with law, enforce our terms, and protect rights and safety.</li>
          </ul>
        </Section>

        <Section title="AI Providers and Service Providers">
          <p>
            To provide AI features, we may send your prompts, conversation
            context, tool inputs, requested URLs, image prompts, generated
            content, model selections, and related metadata to AI providers such
            as OpenAI, Anthropic, xAI, Google, and Fireworks AI, depending on the
            feature and model you choose.
          </p>
          <p>
            We use Firebase and Google Cloud services for authentication,
            database, storage, and server infrastructure. We use Stripe for
            checkout and payment processing. These providers process information
            on our behalf or as independent service providers under their own
            terms and privacy notices.
          </p>
          <p>
            We do not intentionally send full payment card numbers to AI
            providers. We do not sell your prompts, saved history, generated
            outputs, or account information.
          </p>
        </Section>

        <Section title="Cookies and Local Storage">
          <p>
            We use cookies and local storage to keep you signed in, remember
            account and email-link state, support security, and improve the user
            experience. You can control cookies through your browser settings,
            but disabling cookies may prevent sign-in or protected routes from
            working correctly.
          </p>
        </Section>

        <Section title="How We Share Information">
          <p>We may share information:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>with service providers who help us operate {appName};</li>
            <li>with AI providers when needed to fulfill your request;</li>
            <li>with payment processors when you buy credits;</li>
            <li>when you direct us to share or transmit information;</li>
            <li>to comply with law, legal process, or enforceable government requests;</li>
            <li>to protect users, the public, {companyName}, or our service;</li>
            <li>as part of a merger, acquisition, financing, or sale of assets.</li>
          </ul>
        </Section>

        <Section title="Retention">
          <p>
            We keep account records, saved chats, summaries, generated image
            metadata, credit records, payment records, idempotency records, and
            rate-limit records for as long as needed to provide the service,
            maintain accurate financial and security records, resolve disputes,
            comply with law, and enforce our terms.
          </p>
          <p>
            You may delete certain content in the product where that option is
            available or contact us to request deletion. Some records, such as
            payment, fraud-prevention, ledger, backup, or legal compliance
            records, may be retained when required or reasonably necessary.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use administrative, technical, and organizational measures designed
            to protect information, including authenticated access, server-side
            token verification, transaction-based credit updates, rate limits,
            idempotency protections, and hardened URL proxy controls. No online
            service can guarantee absolute security.
          </p>
        </Section>

        <Section title="Your Choices and Rights">
          <p>
            You can update certain profile settings in your account, remove
            user-provided API keys, sign out, and contact us about access,
            correction, deletion, or portability requests.
          </p>
          <p>
            California residents may have rights to know, access, correct,
            delete, and obtain a copy of personal information, and to opt out of
            certain sale or sharing of personal information. We do not sell
            personal information or share it for cross-context behavioral
            advertising as those terms are commonly used in California privacy
            law. We will not discriminate against you for exercising privacy
            rights.
          </p>
          <p>
            To make a request, email {companyEmail}. We may need to verify your
            identity before fulfilling a request.
          </p>
        </Section>

        <Section title="Children">
          <p>
            {appName} is not intended for children under 13. We do not knowingly
            collect personal information from children under 13. If you believe a
            child has provided personal information to us, contact us and we will
            take appropriate steps.
          </p>
        </Section>

        <Section title="International Users">
          <p>
            {companyName} is based in the United States. If you use {appName}
            from outside the United States, your information may be processed and
            stored in the United States and other locations where we or our
            service providers operate.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. The updated
            version will be posted on this page with a new last-updated date.
            Your continued use of {appName} after an update means you accept the
            updated policy.
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
