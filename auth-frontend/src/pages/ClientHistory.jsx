// src/pages/ClientHistory.jsx

// import { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import toast from 'react-hot-toast';
// import API from "../hooks/useApi";

// export default function ClientHistory() {
//   const { id } = useParams(); // client ID
//   const [history, setHistory] = useState([]);

//   useEffect(() => {
//     API.get(`/nutrition/clients/${id}/profile-history/`)
//       .then((res) => setHistory(res.data))
//       .catch(() => toast.error("Failed to load history."));
//   }, [id]);

//   return (
//     <div className="min-h-screen bg-[#f7f3ef] px-8 py-10">
//       <h2 className="text-3xl font-bold text-[#7c5f4d] mb-6">
//         Profile History
//       </h2>

//       <div className="overflow-x-auto bg-white shadow-md rounded-lg">
//         <table className="min-w-full text-sm text-gray-700">
//           <thead className="bg-[#e8ded6] text-[#7c5f4d] text-left">
//             <tr>
//               <th className="px-6 py-3">Date</th>
//               <th className="px-6 py-3">Weight</th>
//               <th className="px-6 py-3">Height</th>
//               <th className="px-6 py-3">PBF</th>
//               <th className="px-6 py-3">SMM</th>
//               <th className="px-6 py-3">BMR</th>
//               <th className="px-6 py-3">Calories</th>
//               <th className="px-6 py-3">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {history.map((item, idx) => (
//               <tr key={idx} className="border-t hover:bg-gray-100">
//                 <td className="px-6 py-3">{new Date(item.created_at).toLocaleString()}</td>
//                 <td className="px-6 py-3">{item.weight} kg</td>
//                 <td className="px-6 py-3">{item.height} cm</td>
//                 <td className="px-6 py-3">{item.pbf} %</td>
//                 <td className="px-6 py-3">{item.smm} kg</td>
//                 <td className="px-6 py-3">{item.bmr?.toFixed(2)}</td>
//                 <td className="px-6 py-3">{item.calorie_target?.toFixed(2)}</td>
//                 <td className="px-6 py-3">
//                   <Link
//                     to={`/dashboard/clients/${id}/history/${idx}`}
//                     className="text-gray-600 hover:text-[#7c5f4d] underline"
//                   >
//                     View
//                   </Link>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { Line } from "react-chartjs-2"; // Import Line chart component from react-chartjs-2
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

// Register the necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ClientHistory() {
  const { id } = useParams(); // client ID
  const [history, setHistory] = useState([]);
  const [selectedData, setSelectedData] = useState("weight"); // Default to "weight" data

  useEffect(() => {
    API.get(`/nutrition/clients/${id}/profile-history/`)
      .then((res) => setHistory(res.data))
      .catch(() => toast.error("Failed to load history."));
  }, [id]);

  const getDataForSelectedMetric = (history, metric) => {
  return history
    .slice() // create a shallow copy so original isn't mutated
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // oldest first
    .map(item => ({
      date: new Date(item.created_at).toLocaleDateString(),
      value: item[metric],
    }));
};


  const data = getDataForSelectedMetric(history, selectedData);

  // Chart.js data configuration
  const chartData = {
    labels: data.map(point => point.date), // X-axis labels (dates)
    datasets: [
      {
        label: selectedData.charAt(0).toUpperCase() + selectedData.slice(1), // Capitalize the metric name
        data: data.map(point => point.value),
        borderColor: "#7c5f4d", // Line color
        backgroundColor: "rgba(124, 95, 77, 0.2)", // Fill color under the line
        fill: true,
        tension: 0.4, // Smoother line
        pointRadius: 4, // Radius of data points
        pointBackgroundColor: "#7c5f4d", // Data point color
        borderWidth: 2,
      },
    ],
  };

  // Chart.js options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            return `${tooltipItem.dataset.label}: ${tooltipItem.raw} ${selectedData === "weight" ? "kg" : selectedData === "height" ? "cm" : "calories"}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        title: {
          display: true,
          text: selectedData === "weight" ? "Weight (kg)" : selectedData === "height" ? "Height (cm)" : "Calories",
        },
        beginAtZero: false, // Avoid zero on y-axis for better visualization
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#f7f3ef] px-8 py-10">
      <h2 className="text-3xl font-bold text-[#7c5f4d] mb-6">Profile History</h2>

      <div className="flex justify-between mb-6">
        <button
          className={`px-6 py-3 rounded-full border-2 ${selectedData === "weight" ? "bg-[#7c5f4d] text-white" : "bg-white text-[#7c5f4d]"} transition-all`}
          onClick={() => setSelectedData("weight")}
        >
          Weight
        </button>
        <button
          className={`px-6 py-3 rounded-full border-2 ${selectedData === "pbf" ? "bg-[#7c5f4d] text-white" : "bg-white text-[#7c5f4d]"} transition-all`}
          onClick={() => setSelectedData("pbf")}
        >
          PBF
        </button>
        <button
          className={`px-6 py-3 rounded-full border-2 ${selectedData === "smm" ? "bg-[#7c5f4d] text-white" : "bg-white text-[#7c5f4d]"} transition-all`}
          onClick={() => setSelectedData("smm")}
        >
          SMM
        </button>
      </div>

      {/* Line Chart */}
      <div className="w-full mb-6">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Table for Detailed View */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg mt-6">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-[#e8ded6] text-[#7c5f4d] text-left">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Weight</th>
              <th className="px-6 py-3">Height</th>
              <th className="px-6 py-3">PBF</th>
              <th className="px-6 py-3">SMM</th>
              <th className="px-6 py-3">BMR</th>
              <th className="px-6 py-3">Calories</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-100">
                <td className="px-6 py-3">{new Date(item.created_at).toLocaleString()}</td>
                <td className="px-6 py-3">{item.weight} kg</td>
                <td className="px-6 py-3">{item.height} cm</td>
                <td className="px-6 py-3">{item.pbf} %</td>
                <td className="px-6 py-3">{item.smm} kg</td>
                <td className="px-6 py-3">{item.bmr?.toFixed(2)}</td>
                <td className="px-6 py-3">{item.calorie_target?.toFixed(2)}</td>
                <td className="px-6 py-3">
                  <Link
                    to={`/dashboard/clients/${id}/history/${idx}`}
                    className="text-gray-600 hover:text-[#7c5f4d] underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
