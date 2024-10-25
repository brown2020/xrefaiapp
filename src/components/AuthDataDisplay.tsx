import { useAuthStore } from "@/zustand/useAuthStore";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";


export default function AuthDataDisplay() {
  const uid = useAuthStore((s) => s.uid);
  const authEmail = useAuthStore((s) => s.authEmail);
  const clearAuthDetails = useAuthStore((s) => s.clearAuthDetails);
  
  const logoutUser = async () => {
    try {
      await signOut(auth);
      clearAuthDetails();
    } catch (error) {
      console.error("Error signing out:", error);
      alert("An error occurred while signing out.");
    } finally {
      
    }
  };

  return (
    <>
      <div className="flex flex-col p-5 space-y-3 mb-4  bg-[#192449] rounded-2xl">
        <div className="flex flex-col space-y-1">
          <div className="text-base text-[#A1ADF4] mb-1">Login email</div>
          <div className="px-3 py-3 text-white border border-[#263566] bg-[#131C3C] text-word rounded-md ">
            {authEmail}
          </div>
        </div>
        <div className="flex flex-col space-y-1">
          <div className="text-base text-[#A1ADF4] mb-1">User ID</div>
          <div className="px-3 py-3 text-white border border-[#263566] bg-[#131C3C] text-word rounded-md ">
            {uid}
          </div>
        </div>
        <div className="!mt-5 w-[100%] credits-block">
          <button
          onClick={logoutUser}
            className="font-bold bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] rounded-3xl text-white w-[12rem] block mx-auto px-3 py-2 hover:opacity-50 flex-1 text-center"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
