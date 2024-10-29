import PrivacyPage from "@/components/PrivacyPage";
import RootLayout from "../layout";

export default function page() {
  return (
    <RootLayout showFooter={true}>
    <PrivacyPage
      companyName="Xref.ai"
      companyEmail="info@ignitechannel.com"
      companyAddress={"30765 Pacific Coast Hwy #354"}
      companyLocation={"Malibu, CA"}
      updatedAt={"September 1, 2024"}
    />
    </RootLayout>
  );
}
