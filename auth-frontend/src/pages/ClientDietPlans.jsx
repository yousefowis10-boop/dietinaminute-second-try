
// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import API from "../hooks/useApi";
// import { ChevronDown, ChevronRight } from "lucide-react"; // icons for toggle

// export default function ClientDietPlans() {
//   const { id } = useParams(); // client_id
//   const navigate = useNavigate();
//   const [plans, setPlans] = useState([]);
//   const [client, setClient] = useState({});
//   const [collapsedDates, setCollapsedDates] = useState({});

//   useEffect(() => {
//     API.get(`/nutrition/clients/${id}/`).then(res => setClient(res.data));
//     API.get(`/nutrition/plan/client/${id}/`).then(res => {
//       setPlans(res.data);

//       // initialize collapsed state: all closed
//       const grouped = res.data.reduce((acc, plan) => {
//         const date = new Date(plan.created_at).toLocaleDateString();
//         acc[date] = false;
//         return acc;
//       }, {});
//       setCollapsedDates(grouped);
//     });
//   }, [id]);

//   const handleGenerate = () => {
//     navigate(`/dashboard/clients/${id}/build-meal`);
//   };

//   const toggleDate = (date) => {
//     setCollapsedDates((prev) => ({
//       ...prev,
//       [date]: !prev[date],
//     }));
//   };

//   // group plans by date
//   const groupedPlans = plans.reduce((acc, plan) => {
//     const date = new Date(plan.created_at).toLocaleDateString();
//     if (!acc[date]) acc[date] = [];
//     acc[date].push(plan);
//     return acc;
//   }, {});

//   return (
//     <div className="min-h-screen bg-[#f7f3ef] px-8 py-10">
//       <div className="flex items-center justify-between mb-8">
//         <h2 className="text-2xl font-bold text-[#7c5f4d]">
//           Meal Plans for {client?.name}
//         </h2>
//         <button
//           onClick={handleGenerate}
//           className="bg-[#7c5f4d] text-white px-4 py-2 rounded-full hover:bg-[#6a4d3d] transition"
//         >
//           Generate New Plan
//         </button>
//       </div>

//       {plans.length === 0 ? (
//         <p className="text-gray-600">No plans found.</p>
//       ) : (
//         <div className="overflow-x-auto bg-white shadow rounded-xl divide-y">
//           {Object.keys(groupedPlans)
//             .sort((a, b) => new Date(b) - new Date(a)) // latest first
//             .map((date) => (
//               <div key={date}>
//                 {/* Date header (collapsible toggle) */}
//                 <div
//                   onClick={() => toggleDate(date)}
//                   className="flex items-center justify-between bg-[#e8ded5] px-4 py-3 cursor-pointer hover:bg-[#d6c6ba] transition"
//                 >
//                   <span className="font-semibold text-[#7c5f4d]">{date}</span>
//                   {collapsedDates[date] ? (
//                     <ChevronDown className="w-5 h-5 text-[#7c5f4d]" />
//                   ) : (
//                     <ChevronRight className="w-5 h-5 text-[#7c5f4d]" />
//                   )}
//                 </div>

//                 {/* Plans for this date (collapsible section) */}
//                 {collapsedDates[date] && (
//                   <table className="min-w-full text-sm text-left">
//                     <thead className="bg-[#f1e9e3] text-[#7c5f4d] font-semibold">
//                       <tr>
//                         <th className="px-4 py-3">Time</th>
//                         <th className="px-4 py-3">Protein (g)</th>
//                         <th className="px-4 py-3">Carbs (g)</th>
//                         <th className="px-4 py-3">Fat (g)</th>
//                         <th className="px-4 py-3">Calorie Target</th>
//                         <th className="px-4 py-3"></th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {groupedPlans[date]
//                         .sort(
//                           (a, b) =>
//                             new Date(b.created_at) - new Date(a.created_at)
//                         )
//                         .map((plan) => (
//                           <tr
//                             key={plan.id}
//                             onClick={() =>
//                               navigate(`/dashboard/plans/${plan.id}`)
//                             }
//                             className="border-t hover:bg-gray-50 cursor-pointer"
//                           >
//                             <td className="px-4 py-3">
//                               {new Date(plan.created_at).toLocaleTimeString([], {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </td>
//                             <td className="px-4 py-3">
//                               {plan.total_protein.toFixed(2)}
//                             </td>
//                             <td className="px-4 py-3">
//                               {plan.total_carb.toFixed(2)}
//                             </td>
//                             <td className="px-4 py-3">
//                               {plan.total_fat.toFixed(2)}
//                             </td>
//                             <td className="px-4 py-3">
//                               {client?.target_calories}
//                             </td>
//                             <td className="px-4 py-3">
//                               <a
//                                 href={`/dashboard/plans/${plan.id}`}
//                                 className="text-[#7c5f4d] underline hover:text-[#6a4d3d]"
//                               >
//                                 Show Meal
//                               </a>
//                             </td>
//                           </tr>
//                         ))}
//                     </tbody>
//                   </table>
//                 )}
//               </div>
//             ))}
//         </div>
//       )}
//     </div>
//   );
// }


// -----------------------



// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import API from "../hooks/useApi";
// import { ChevronDown, ChevronRight } from "lucide-react"; // icons for toggle

// export default function ClientDietPlans() {
//   const { id } = useParams(); // client_id
//   const navigate = useNavigate();
//   const [plans, setPlans] = useState([]);
//   const [client, setClient] = useState({});
//   const [collapsedNames, setCollapsedNames] = useState({}); // to track collapsed state for names
//   const [collapsedDates, setCollapsedDates] = useState({}); // to track collapsed state for dates

//   useEffect(() => {
//     API.get(`/nutrition/clients/${id}/`).then(res => setClient(res.data));
//     API.get(`/nutrition/plan/client/${id}/`).then(res => {
//       setPlans(res.data);

//       // Initialize collapsed state for both names and dates: all closed
//       const nameGrouped = res.data.reduce((acc, plan) => {
//         const name = plan.name; // Assuming each plan has a `name` field
//         if (!acc[name]) acc[name] = { collapsed: false, dates: {} };
//         const date = new Date(plan.created_at).toLocaleDateString();
//         if (!acc[name].dates[date]) acc[name].dates[date] = false;
//         return acc;
//       }, {});
//       setCollapsedNames(nameGrouped);
//     });
//   }, [id]);

//   const handleGenerate = () => {
//     navigate(`/dashboard/clients/${id}/build-meal`);
//   };

//   const toggleName = (name) => {
//     setCollapsedNames((prev) => ({
//       ...prev,
//       [name]: {
//         ...prev[name],
//         collapsed: !prev[name].collapsed,
//       },
//     }));
//   };

//   const toggleDate = (name, date) => {
//     setCollapsedNames((prev) => ({
//       ...prev,
//       [name]: {
//         ...prev[name],
//         dates: {
//           ...prev[name].dates,
//           [date]: !prev[name].dates[date],
//         },
//       },
//     }));
//   };

//   // Group plans by name and then by date
//   const groupedByName = plans.reduce((acc, plan) => {
//     const name = plan.name;
//     const date = new Date(plan.created_at).toLocaleDateString();

//     if (!acc[name]) acc[name] = [];
//     // Ensure grouping by date inside an array
//     const dateIndex = acc[name].findIndex((group) => group.date === date);
//     if (dateIndex === -1) {
//       acc[name].push({ date, plans: [plan] });
//     } else {
//       acc[name][dateIndex].plans.push(plan);
//     }

//     return acc;
//   }, {});

//   return (
//     <div className="min-h-screen bg-[#f7f3ef] px-8 py-10">
//       <div className="flex items-center justify-between mb-8">
//         <h2 className="text-2xl font-bold text-[#7c5f4d]">
//           Meal Plans for {client?.name}
//         </h2>
//         <button
//           onClick={handleGenerate}
//           className="bg-[#7c5f4d] text-white px-4 py-2 rounded-full hover:bg-[#6a4d3d] transition"
//         >
//           Generate New Plan
//         </button>
//       </div>

//       {plans.length === 0 ? (
//         <p className="text-gray-600">No plans found.</p>
//       ) : (
//         <div className="overflow-x-auto bg-white shadow rounded-xl divide-y">
//           {/* Iterate over the grouped names */}
//           {Object.keys(groupedByName).map((name) => (
//             <div key={name}>
//               {/* Name header (collapsible toggle) */}
//               <div
//                 onClick={() => toggleName(name)}
//                 className="flex items-center justify-between bg-[#e8ded5] px-4 py-3 cursor-pointer hover:bg-[#d6c6ba] transition"
//               >
//                 <span className="font-semibold text-[#7c5f4d]">{name}</span>
//                 {collapsedNames[name]?.collapsed ? (
//                   <ChevronDown className="w-5 h-5 text-[#7c5f4d]" />
//                 ) : (
//                   <ChevronRight className="w-5 h-5 text-[#7c5f4d]" />
//                 )}
//               </div>

//               {/* Plans for this name (collapsible section) */}
//               {collapsedNames[name]?.collapsed && (
//                 <div>
//                   {/* Iterate over dates for the selected name */}
//                   {groupedByName[name].map(({ date, plans: plansForDate }) => (
//                     <div key={date}>
//                       {/* Date header (collapsible toggle) */}
//                       <div
//                         onClick={() => toggleDate(name, date)}
//                         className="flex items-center justify-between bg-[#e8ded5] px-4 py-3 cursor-pointer hover:bg-[#d6c6ba] transition"
//                       >
//                         <span className="font-semibold text-[#7c5f4d]">- {date}</span>
//                         {collapsedNames[name]?.dates[date] ? (
//                           <ChevronDown className="w-5 h-5 text-[#7c5f4d]" />
//                         ) : (
//                           <ChevronRight className="w-5 h-5 text-[#7c5f4d]" />
//                         )}
//                       </div>

//                       {/* Plans for this date (collapsible section) */}
//                       {collapsedNames[name]?.dates[date] && (
//                         <table className="min-w-full text-sm text-left">
//                           <thead className="bg-[#f1e9e3] text-[#7c5f4d] font-semibold">
//                             <tr>
//                               <th className="px-4 py-3">Time</th>
//                               <th className="px-4 py-3">Protein (g)</th>
//                               <th className="px-4 py-3">Carbs (g)</th>
//                               <th className="px-4 py-3">Fat (g)</th>
//                               <th className="px-4 py-3">Calorie Target</th>
//                               <th className="px-4 py-3"></th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {plansForDate
//                               .sort(
//                                 (a, b) =>
//                                   new Date(b.created_at) - new Date(a.created_at)
//                               )
//                               .map((plan) => (
//                                 <tr
//                                   key={plan.id}
//                                   onClick={() =>
//                                     navigate(`/dashboard/plans/${plan.id}`)
//                                   }
//                                   className="border-t hover:bg-gray-50 cursor-pointer"
//                                 >
//                                   <td className="px-4 py-3">
//                                     {new Date(plan.created_at).toLocaleTimeString(
//                                       [],
//                                       { hour: "2-digit", minute: "2-digit" }
//                                     )}
//                                   </td>
//                                   <td className="px-4 py-3">
//                                     {plan.total_protein.toFixed(2)}
//                                   </td>
//                                   <td className="px-4 py-3">
//                                     {plan.total_carb.toFixed(2)}
//                                   </td>
//                                   <td className="px-4 py-3">
//                                     {plan.total_fat.toFixed(2)}
//                                   </td>
//                                   <td className="px-4 py-3">
//                                     {client?.target_calories}
//                                   </td>
//                                   <td className="px-4 py-3">
//                                     <a
//                                       href={`/dashboard/plans/${plan.id}`}
//                                       className="text-[#7c5f4d] underline hover:text-[#6a4d3d]"
//                                     >
//                                       Show Meal
//                                     </a>
//                                   </td>
//                                 </tr>
//                               ))}
//                           </tbody>
//                         </table>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../hooks/useApi";
import { ChevronDown, ChevronRight } from "lucide-react"; // icons for toggle

export default function ClientDietPlans() {
  const { id } = useParams(); // client_id
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [client, setClient] = useState({});
  const [collapsedNames, setCollapsedNames] = useState({}); // to track collapsed state for names
  const [collapsedDates, setCollapsedDates] = useState({}); // to track collapsed state for dates
  const [selectedPlans, setSelectedPlans] = useState([]); // to track selected plans

  useEffect(() => {
    API.get(`/nutrition/clients/${id}/`).then(res => setClient(res.data));
    API.get(`/nutrition/plan/client/${id}/`).then(res => {
      setPlans(res.data);

      // Initialize collapsed state for both names and dates: all closed
      const nameGrouped = res.data.reduce((acc, plan) => {
        const name = plan.name; // Assuming each plan has a `name` field
        if (!acc[name]) acc[name] = { collapsed: false, dates: {} };
        const date = new Date(plan.created_at).toLocaleDateString();
        if (!acc[name].dates[date]) acc[name].dates[date] = false;
        return acc;
      }, {});
      setCollapsedNames(nameGrouped);
    });
  }, [id]);

  const handleGenerate = () => {
    navigate(`/dashboard/clients/${id}/build-meal`);
  };

  const toggleName = (name) => {
    setCollapsedNames((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        collapsed: !prev[name].collapsed,
      },
    }));
  };

  const toggleDate = (name, date) => {
    setCollapsedNames((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        dates: {
          ...prev[name].dates,
          [date]: !prev[name].dates[date],
        },
      },
    }));
  };

  const toggleSelectPlan = (planId) => {
    setSelectedPlans((prevSelectedPlans) =>
      prevSelectedPlans.includes(planId)
        ? prevSelectedPlans.filter((id) => id !== planId)
        : [...prevSelectedPlans, planId]
    );
  };

  const handleGeneratePDF = () => {
    // For now, just log the selected plans
    console.log("Generating PDF for plans:", selectedPlans);
    // Here you can integrate with a PDF library like `jsPDF` to generate the PDF
  };

  // Group plans by name and then by date
  const groupedByName = plans.reduce((acc, plan) => {
    const name = plan.name;
    const date = new Date(plan.created_at).toLocaleDateString();

    if (!acc[name]) acc[name] = [];
    // Ensure grouping by date inside an array
    const dateIndex = acc[name].findIndex((group) => group.date === date);
    if (dateIndex === -1) {
      acc[name].push({ date, plans: [plan] });
    } else {
      acc[name][dateIndex].plans.push(plan);
    }

    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f7f3ef] px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-[#7c5f4d]">
          Meal Plans for {client?.name}
        </h2>
        {/* Show Generate PDF button if any plans are selected */}
      
      <div className="mb-4">
        {selectedPlans.length > 1 && (
        
          <button
            onClick={() => {

              navigate(`/dashboard/bulk-plans/${selectedPlans.join(',')}`)
            }}
            className="bg-[#7c5f4d] text-white px-4 py-2 rounded-full hover:bg-[#6a4d3d] transition"
          >
            Generate PDF
          </button>
      )}
      <span>  </span>
        <button
          onClick={handleGenerate}
          className="bg-[#7c5f4d] text-white px-4 py-2 rounded-full hover:bg-[#6a4d3d] transition"
        >
          Generate New Plan
        </button>
        </div>
      </div>

      

      {plans.length === 0 ? (
        <p className="text-gray-600">No plans found.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-xl divide-y">
          {/* Iterate over the grouped names */}
          {Object.keys(groupedByName).map((name) => (
            <div key={name}>
              {/* Name header (collapsible toggle) */}
              <div
                onClick={() => toggleName(name)}
                className="flex items-center justify-between bg-[#e8ded5] px-4 py-3 cursor-pointer hover:bg-[#d6c6ba] transition"
              >
                <span className="font-semibold text-[#7c5f4d]">{name}</span>
                {collapsedNames[name]?.collapsed ? (
                  <ChevronDown className="w-5 h-5 text-[#7c5f4d]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[#7c5f4d]" />
                )}
              </div>

              {/* Plans for this name (collapsible section) */}
              {collapsedNames[name]?.collapsed && (
                <div>
                  {/* Iterate over dates for the selected name */}
                  {groupedByName[name].map(({ date, plans: plansForDate }) => (
                    <div key={date}>
                      {/* Date header (collapsible toggle) */}
                      <div
                        onClick={() => toggleDate(name, date)}
                        className="flex items-center justify-between bg-[#e8ded5] px-4 py-3 cursor-pointer hover:bg-[#d6c6ba] transition"
                      >
                        <span className="font-semibold text-[#7c5f4d]">{date}</span>
                        {collapsedNames[name]?.dates[date] ? (
                          <ChevronDown className="w-5 h-5 text-[#7c5f4d]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[#7c5f4d]" />
                        )}
                      </div>

                      {/* Plans for this date (collapsible section) */}
                      {collapsedNames[name]?.dates[date] && (
                        <table className="min-w-full text-sm text-left">
                          <thead className="bg-[#f1e9e3] text-[#7c5f4d] font-semibold">
                            <tr>
                              <th className="px-4 py-3">Select</th>
                              <th className="px-4 py-3">Time</th>
                              <th className="px-4 py-3">Protein (g)</th>
                              <th className="px-4 py-3">Carbs (g)</th>
                              <th className="px-4 py-3">Fat (g)</th>
                              <th className="px-4 py-3">Calorie Target</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {plansForDate
                              .sort(
                                (a, b) =>
                                  new Date(b.created_at) - new Date(a.created_at)
                              )
                              .map((plan) => (
                                <tr
                                  key={plan.id}
                                  className="border-t hover:bg-gray-50 cursor-pointer"
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedPlans.includes(plan.id)}
                                      onChange={() => toggleSelectPlan(plan.id)}
                                      className="form-checkbox"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    {new Date(plan.created_at).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" }
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {plan.total_protein.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {plan.total_carb.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {plan.total_fat.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {client?.target_calories}
                                  </td>
                                  <td className="px-4 py-3">
                                    <a
                                      href={`/dashboard/plans/${plan.id}`}
                                      className="text-[#7c5f4d] underline hover:text-[#6a4d3d]"
                                    >
                                      Show Meal
                                    </a>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
