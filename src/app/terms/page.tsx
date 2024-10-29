import TermsPage from "@/components/TermsPage";
import RootLayout from "../layout";

export default function Terms() {
  return (
    <RootLayout showFooter={true}>
      <TermsPage
        companyName="Xref.ai"
        companyEmail="info@ignitechannel.com"
        updatedAt={"September 1, 2024"}
        privacyLink={"/privacy"}
      />
    </RootLayout>
  );
}
