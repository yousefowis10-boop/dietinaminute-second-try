import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import API, {baseURL} from "../hooks/useApi";

export default function Settings() {
  const [logo, setLogo] = useState(null); // Will hold image URL or null
  const [logoFile, setLogoFile] = useState(null); // For upload
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Fetch user profile logo on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await API.get("/nutrition/profile/"); // Adjust endpoint accordingly
        debugger;
        if (res.data.logo) setLogo(baseURL + '' + res.data.logo);
      } catch (error) {
        toast.error("Failed to load profile.");
      }
    }
    fetchProfile();
  }, []);

  // Handle logo file select
  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  // Upload or update logo
  const handleLogoSubmit = async () => {
    if (!logoFile) {
      toast.error("Please select an image to upload.");
      return;
    }

    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      // Assume PATCH for update, POST if no logo yet - adapt if needed
      const res = logo
        ? await API.patch("/nutrition/profile/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : await API.put("/nutrition/profile/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

      setLogo(res.data.logo);
      setLogoFile(null);
      toast.success("Logo updated successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handle password form input change
  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  // Submit password change
  const handlePasswordSubmit = async () => {
    const { current_password, new_password, confirm_password } = passwordForm;

    if (!current_password || !new_password || !confirm_password) {
      toast.error("All password fields are required.");
      return;
    }

    if (new_password !== confirm_password) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setUpdatingPassword(true);

    try {
      await API.post("/auth/change-password/", {
        current_password,
        new_password,
      });
      toast.success("Password updated successfully.");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      if (error.response?.data?.current_password) {
        toast.error(error.response.data.current_password[0]);
      } else {
        toast.error("Failed to update password.");
      }
      console.error(error);
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ef] flex items-center justify-center px-6 py-10">
      <div className="bg-white w-full max-w-3xl p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-[#7c5f4d] mb-8">Settings</h2>

        <div className="grid grid-cols-12 gap-4 items-center border-b border-gray-200 py-4">
          {/* Label */}
          <div className="col-span-3 font-semibold text-gray-700">Logo</div>

          {/* Fields */}
          <div className="col-span-6 flex items-center space-x-4">
            {logo ? (
              <img
                src={logo}
                alt="User Logo"
                className="h-16 w-16 rounded-md object-cover border"
              />
            ) : (
              <div className="h-16 w-16 rounded-md border flex items-center justify-center text-gray-400 italic">
                No logo
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="block cursor-pointer"
            />
          </div>

          {/* Submit button */}
          <div className="col-span-3">
            <button
              onClick={handleLogoSubmit}
              disabled={uploadingLogo || !logoFile}
              className={`px-4 py-2 rounded-md font-semibold text-white ${
                uploadingLogo || !logoFile
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#7c5f4d] hover:bg-[#6a4d3d]"
              }`}
            >
              {logo ? "Update" : "Upload"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 items-center border-b border-gray-200 py-6">
          {/* Label */}
          <div className="col-span-3 font-semibold text-gray-700">Change Password</div>

          {/* Fields */}
          <div className="col-span-6 grid grid-cols-1 gap-4">
            <input
              type="password"
              name="current_password"
              placeholder="Current Password"
              value={passwordForm.current_password}
              onChange={handlePasswordChange}
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
            <input
              type="password"
              name="new_password"
              placeholder="New Password"
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
            <input
              type="password"
              name="confirm_password"
              placeholder="Confirm Password"
              value={passwordForm.confirm_password}
              onChange={handlePasswordChange}
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
          </div>

          {/* Submit button */}
          <div className="col-span-3">
            <button
              onClick={handlePasswordSubmit}
              disabled={updatingPassword}
              className={`px-4 py-2 rounded-md font-semibold text-white ${
                updatingPassword
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#7c5f4d] hover:bg-[#6a4d3d]"
              }`}
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
