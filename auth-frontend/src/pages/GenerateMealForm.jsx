import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from 'react-hot-toast';
import API from "../hooks/useApi";

export default function GenerateMealScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGenerateMeal = async () => {
    setLoading(true);
    try {
      await API.post("/nutrition/generate-plan/");
      setSuccess(true);
    } catch (err) {
      console.error("Meal generation failed", err);
      toast.error("Could not generate meal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ef] flex flex-col md:flex-row p-8 gap-8">
      {/* Profile Info */}
      <div className="w-full md:w-1/2 bg-white rounded-2xl shadow-md p-6 space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Profile</h2>
        <div className="space-y-2 text-gray-800">
          <p><strong>Weight:</strong> {profile?.weight} kg</p>
          <p><strong>Height:</strong> {profile?.height} cm</p>
          <p><strong>Age:</strong> {profile?.age}</p>
          <p><strong>Gender:</strong> {profile?.gender === "M" ? "Male" : "Female"}</p>
          <p><strong>Goal:</strong> {formatGoal(profile?.goal)}</p>
          <p><strong>Work Style:</strong> {formatWorkStyle(profile?.work_style)}</p>
          <p><strong>BMR:</strong> {profile?.bmr}</p>
          <p><strong>Calories:</strong> {profile?.target_calories}</p>
          <p><strong>Target Macros:</strong><br />
            {profile?.target_carb}g CARB,<br />
            {profile?.target_protein}g PROTEIN,<br />
            {profile?.target_fat}g FAT
          </p>
        </div>
      </div>

      {/* Generate Button */}
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div className="text-center space-y-4">
          <button
            onClick={handleGenerateMeal}
            disabled={loading}
            className="bg-[#7c5f4d] hover:bg-[#6a4d3d] text-white text-lg font-medium px-6 py-3 rounded-full shadow-md transition"
          >
            {loading ? "Generating..." : "Generate My Meal Plan"}
          </button>
          {success && (
            <p className="text-green-600 font-medium">Meal plan generated successfully!</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions to prettify enums
const formatGoal = (goal) => {
  switch (goal) {
    case "gain":
      return "Weight Gain";
    case "loss":
      return "Weight Loss";
    case "maintain":
      return "Maintain";
    default:
      return "-";
  }
};

const formatWorkStyle = (style) => {
  switch (style) {
    case "bed_bound":
      return "Chair bound / bed bound";
    case "seated_static":
      return "Seated, no movement";
    case "seated_moving":
      return "Seated, moving a little";
    case "standing":
      return "Standing work";
    case "sport":
      return "Significant sport activity";
    case "strenuous":
      return "Strenuous / highly active";
    default:
      return "-";
  }
};
