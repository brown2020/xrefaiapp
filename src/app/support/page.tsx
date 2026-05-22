import Link from "next/link";
import {
  PublicContentSection,
  PublicPageLayout,
} from "@/components/PublicPageLayout";
import { ROUTES } from "@/constants/routes";

export default function Support() {
  return (
    <PublicPageLayout
      eyebrow="Support"
      title="Support for Xref.ai"
      description="Reach Ignite Channel Inc. for product support, billing questions, account requests, privacy inquiries, or feedback about the app."
      updatedAt="May 22, 2026"
    >
      <PublicContentSection title="Contact">
        <p>
          For support, privacy, billing, or product questions, email{" "}
          <a href="mailto:info@ignitechannel.com">info@ignitechannel.com</a>.
        </p>
        <div>
          <p>Ignite Channel Inc.</p>
          <p>190 W Amado Road</p>
          <p>Palm Springs, CA 92262</p>
        </div>
      </PublicContentSection>

      <PublicContentSection title="Common Requests">
        <ul className="list-disc pl-5">
          <li>Sign-in links, password resets, and account access.</li>
          <li>Credit balances, Stripe checkout, refunds, and payment records.</li>
          <li>Saved content, user-provided API keys, and deletion requests.</li>
          <li>Privacy, security, policy, or legal questions.</li>
        </ul>
      </PublicContentSection>

      <PublicContentSection title="Policies">
        <p>
          You can also review the{" "}
          <Link href={ROUTES.privacy}>Privacy Policy</Link> and{" "}
          <Link href={ROUTES.terms}>Terms of Service</Link>.
        </p>
      </PublicContentSection>
    </PublicPageLayout>
  );
}
