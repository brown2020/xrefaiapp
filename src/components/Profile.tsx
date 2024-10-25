"use client";

import RootLayout from "@/app/layout";
import AuthDataDisplay from "./AuthDataDisplay";
import PaymentsPage from "./PaymentsPage";
import ProfileComponent from "./ProfileComponent";

export default function Profile() {
  return (
    <RootLayout showFooter={true}>
      <div className="flex flex-col gap-4">
        <div className="container mx-auto px-4 py-4">
          <div className="text-4xl font-bold mt-3 text-center mb-3"><span className="bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] bg-clip-text text-transparent">User Profile</span></div>
          <AuthDataDisplay />
          <ProfileComponent />
          <PaymentsPage />
        </div>
      </div>
    </RootLayout>
  );
}
