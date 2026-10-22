"use client";

import AuthDataDisplay from "./AuthDataDisplay";
import PaymentsPage from "./PaymentsPage";
import ProfileComponent from "./ProfileComponent";
import DeleteAccount from "./DeleteAccount";
import CreditsLedger from "./CreditsLedger";

export default function Profile() {
  return (
    <div className="bg-muted/30">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile, credits, API keys, and billing history
          </p>
        </div>
        <AuthDataDisplay />
        <ProfileComponent />
        <PaymentsPage />
        <CreditsLedger />
        <DeleteAccount />
      </div>
    </div>
  );
}
