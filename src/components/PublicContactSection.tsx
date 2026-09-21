import { PublicContentSection } from "@/components/PublicPageLayout";

type PublicContactSectionProps = {
  companyName: string;
  companyAddress: string;
  companyLocation: string;
  companyEmail: string;
};

export function PublicContactSection({
  companyName,
  companyAddress,
  companyLocation,
  companyEmail,
}: PublicContactSectionProps) {
  return (
    <PublicContentSection title="Contact">
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
    </PublicContentSection>
  );
}
