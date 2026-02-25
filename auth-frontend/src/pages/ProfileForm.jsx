import { useState } from "react";
import toast from 'react-hot-toast';
import API from "../hooks/useApi";

export default function ProfileForm({ onComplete }) {
  const [form, setForm] = useState({
    weight: "",
    height: "",
    age: "",
    gender: "M",
    goal: "maintain",
    work_style: "bed_bound",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/nutrition/profile/", form);
      onComplete();
    } catch (err) {
      console.error("Profile creation failed:", err);
      toast.error("Failed to create profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen w-full bg-[#f7f3ef] flex items-center justify-center px-4"
    >
      <div className="w-full max-w-3xl bg-white p-10 rounded-2xl shadow-xl space-y-8">
        <h2 className="text-3xl font-semibold text-center text-gray-700">
          Complete Your Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="number"
            name="weight"
            value={form.weight}
            onChange={handleChange}
            placeholder="Weight (kg)"
            className="h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c8b4a8]"
            required
          />
          <input
            type="number"
            name="height"
            value={form.height}
            onChange={handleChange}
            placeholder="Height (cm)"
            className="h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c8b4a8]"
            required
          />
          <input
            type="number"
            name="age"
            value={form.age}
            onChange={handleChange}
            placeholder="Age"
            className="h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c8b4a8]"
            required
          />
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c8b4a8]"
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
          <select
            name="goal"
            value={form.goal}
            onChange={handleChange}
            className="h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c8b4a8]"
          >
            <option value="gain">Weight Gain</option>
            <option value="loss">Weight Loss</option>
            <option value="maintain">Maintain</option>
          </select>
          <select
            name="work_style"
            value={form.work_style}
            onChange={handleChange}
            className="h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c8b4a8] col-span-1 md:col-span-2"
          >
            <option value="bed_bound">Chair bound/bed bound</option>
            <option value="seated_static">Seated work with no option of moving, no activity</option>
            <option value="seated_moving">Seated work with requirement to moving a little</option>
            <option value="standing">Standing work (e.g., housework, shop assistant)</option>
            <option value="sport">Significant amounts of sport</option>
            <option value="strenuous">Strenuous work or highly active</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full h-12 bg-[#7c5f4d] text-white rounded-full font-semibold text-lg hover:bg-[#6a4d3d] transition"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
