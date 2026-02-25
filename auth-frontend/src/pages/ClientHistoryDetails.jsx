// src/pages/ClientHistoryDetail.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import API from "../hooks/useApi";

export default function ClientHistoryDetail() {
  const { id, index } = useParams(); // client ID and index from list
  const [historyItem, setHistoryItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    API.get(`/nutrition/clients/${id}/profile-history/`).then((res) => {
      if (res.data && res.data[index]) {
        setHistoryItem(res.data[index]);
      } else {
        toast.error("History item not found.");
        navigate(`/dashboard/clients/${id}/history`);
      }
    });
  }, [id, index]);

  if (!historyItem) return null;

  return (
    <div className="min-h-screen bg-[#f7f3ef] px-6 py-10">
  <div className="max-w-4xl mx-auto bg-white p-10 rounded-xl shadow-md">
    <h2 className="text-3xl font-bold text-[#7c5f4d] mb-8">
      Profile Details – {new Date(historyItem.created_at).toLocaleString()}
    </h2>

    {/* Two-column grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-800 mb-10">
      <div>
        <p><span className="font-semibold">Age:</span> {historyItem.age}</p>
        <p><span className="font-semibold">Weight:</span> {historyItem.weight} kg</p>
        <p><span className="font-semibold">Height:</span> {historyItem.height} cm</p>
        <p><span className="font-semibold">Gender:</span> {historyItem.gender}</p>
        <p><span className="font-semibold">Goal:</span> {historyItem.goal}</p>
        <p><span className="font-semibold">Work Style:</span> {historyItem.work_style}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#fdf8f6] border border-[#e0d4cd] rounded-md p-4 text-center shadow-sm">
          <div className="text-sm text-gray-500">BMR</div>
          <div className="text-xl font-bold text-[#7c5f4d]">{historyItem.bmr?.toFixed(2)}</div>
        </div>
        <div className="bg-[#fdf8f6] border border-[#e0d4cd] rounded-md p-4 text-center shadow-sm">
          <div className="text-sm text-gray-500">Calories</div>
          <div className="text-xl font-bold text-[#7c5f4d]">{historyItem.calorie_target?.toFixed(2)}</div>
        </div>
        <div className="bg-[#fdf8f6] border border-[#e0d4cd] rounded-md p-4 text-center shadow-sm">
          <div className="text-sm text-gray-500">Protein</div>
          <div className="text-xl font-bold text-[#7c5f4d]">{historyItem.target_protein?.toFixed(2)}</div>
        </div>
        <div className="bg-[#fdf8f6] border border-[#e0d4cd] rounded-md p-4 text-center shadow-sm">
          <div className="text-sm text-gray-500">Carbs</div>
          <div className="text-xl font-bold text-[#7c5f4d]">{historyItem.target_carb?.toFixed(2)}</div>
        </div>
        <div className="bg-[#fdf8f6] border border-[#e0d4cd] rounded-md p-4 text-center shadow-sm col-span-2">
          <div className="text-sm text-gray-500">Fats</div>
          <div className="text-xl font-bold text-[#7c5f4d]">{historyItem.target_fat?.toFixed(2)}</div>
        </div>
      </div>
    </div>

    <button
      onClick={() => navigate(-1)}
      className="mt-6 bg-[#7c5f4d] text-white px-6 py-3 rounded-full hover:bg-[#6a4d3d]"
    >
      ← Back to History
    </button>
  </div>
</div>

    // <div className="min-h-screen bg-[#f7f3ef] px-8 py-10">
    //   <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
    //     <h2 className="text-2xl font-bold text-[#7c5f4d] mb-6">
    //       Profile Detail – {new Date(historyItem.created_at).toLocaleString()}
    //     </h2>
    //     <ul className="space-y-3 text-gray-800">
    //       <li><strong>Age:</strong> {historyItem.age}</li>
    //       <li><strong>Weight:</strong> {historyItem.weight} kg</li>
    //       <li><strong>Height:</strong> {historyItem.height} cm</li>
    //       <li><strong>Gender:</strong> {historyItem.gender}</li>
    //       <li><strong>Goal:</strong> {historyItem.goal}</li>
    //       <li><strong>Work Style:</strong> {historyItem.work_style}</li>
    //       <li><strong>BMR:</strong> {historyItem.bmr?.toFixed(2)}</li>
    //       <li><strong>Calories:</strong> {historyItem.calorie_target?.toFixed(2)}</li>
    //       <li><strong>Protein:</strong> {historyItem.target_protein?.toFixed(2)}</li>
    //       <li><strong>Carbs:</strong> {historyItem.target_carb?.toFixed(2)}</li>
    //       <li><strong>Fats:</strong> {historyItem.target_fat?.toFixed(2)}</li>
    //     </ul>
    //     <button
    //       onClick={() => navigate(-1)}
    //       className="mt-6 bg-[#7c5f4d] text-white px-6 py-2 rounded-full hover:bg-[#6a4d3d]"
    //     >
    //       Back to History
    //     </button>
    //   </div>
    // </div>
  );
}
