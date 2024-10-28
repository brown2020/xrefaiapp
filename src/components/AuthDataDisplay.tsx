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
        <div className="flex flex-col space-y-1">
          <div className="text-base text-[#A1ADF4] mb-1">Profile</div>
          <div className="border border-gray-300 p-4 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-start md:space-x-4">
              {/* <!-- Profile Image --> */}
              <div className="flex-shrink-0 mb-4 md:mb-0">
                <div className="profile_img w-[17rem] h-[17rem]">
                  <img
                    src="A.png"
                    alt="Profile"
                    className="w-full h-full object-cover rounded-md cursor-pointer"
                  />
                </div>
              </div>
              {/* <!-- Form Inputs --> */}
              <div className="flex-grow space-y-3">
                <div>
                  <label className="text-base text-[#A1ADF4] mb-1">First Name</label>
                  <input
                    type="text"
                    id="first-name"
                    className="mt-2 w-full border border-[#263566] bg-[#131C3C] text-white rounded-md px-3 py-3 placeholder:text-[#585E70]"
                    placeholder="Enter your First Name"
                  />
                </div>
                <div>
                  <label className="text-base text-[#A1ADF4] mb-1">Last Name</label>
                  <input
                    type="text"
                    id="last-name"
                    className="mt-2 w-full border border-[#263566] bg-[#131C3C] text-white rounded-md px-3 py-3 placeholder:text-[#585E70]"
                    placeholder="Enter your Last Name"
                  />
                </div>
                <div>
                  <label className="text-base text-[#A1ADF4] mb-1">Contact Email</label>
                  <input
                    type="email"
                    id="contact-email"
                    className="mt-2 w-full border border-[#263566] bg-[#131C3C] text-white rounded-md px-3 py-3 placeholder:text-[#585E70]"
                    placeholder="Enter your Email"
                  />
                </div>
              </div>
            </div>
            {/* <!-- Save Button --> */}
            <div className="w-full text-end mt-4">
              <button className="font-bold bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white rounded-3xl py-2 px-3 hover:opacity-50 focus:outline-none">
                Save Profile Changes
              </button>
            </div>
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
