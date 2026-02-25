import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import API, {baseURL} from "../hooks/useApi";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";

const BulkMealView = () => {
  const { mealIds } = useParams(); // Expecting comma-separated meal IDs
  const mealIdList = mealIds.split(","); // Split into array

  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingColumn, setEditingColumn] = useState(null); // For editing column names
  const [logo, setLogo] = useState(null);

  const contentRef = useRef();

  // Handle drag state for each meal plan's columns
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await API.get("/nutrition/profile/"); // Adjust endpoint accordingly
        if (res.data.logo) setLogo(baseURL + '' + res.data.logo);
      } catch (error) {
        toast.error("Failed to load profile.");
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchMealPlans = async () => {
      try {
        setLoading(true);
        const responses = await Promise.all(
          mealIdList.map((id) => API.get(`/nutrition/plan/${id}/split/`))
        );
        
        const plans = responses.map((response) => {
          const { client, split, name } = response.data;
          return { client, split, name, mealId: response.data.id, columnOrder: Object.keys(split), columnNames: {} };
        });
        setMealPlans(plans);
      } catch (err) {
        setError("Failed to fetch meal plan data.");
      } finally {
        setLoading(false);
      }
    };

    fetchMealPlans();
  }, [mealIds]);

  const maxLength = Math.max(
    ...mealPlans.flatMap((plan) => Object.values(plan.split).map((list) => list.length))
  );

  const handleDragStart = (mealId, columnKey) => {
    dragItem.current = { mealId, columnKey };
  };

  const handleDragEnter = (mealId, columnKey) => {
    dragOverItem.current = { mealId, columnKey };
  };

  const handleDrop = (mealId) => {
    const copiedMealPlans = [...mealPlans];
    const draggedPlanIndex = copiedMealPlans.findIndex(plan => plan.mealId === dragItem.current.mealId);
    const draggedColumnKey = dragItem.current.columnKey;

    const draggedMealPlan = copiedMealPlans[draggedPlanIndex];
    const draggedColumnOrder = [...draggedMealPlan.columnOrder];

    // Remove dragged column and insert it at the new position
    const draggedIndex = draggedColumnOrder.indexOf(draggedColumnKey);
    draggedColumnOrder.splice(draggedIndex, 1);
    const dropIndex = draggedColumnOrder.indexOf(dragOverItem.current.columnKey);
    draggedColumnOrder.splice(dropIndex, 0, draggedColumnKey);

    // Update the column order for the meal plan
    copiedMealPlans[draggedPlanIndex].columnOrder = draggedColumnOrder;
    setMealPlans(copiedMealPlans);

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleRenameColumn = (mealId, columnKey, newName) => {
    const copiedMealPlans = [...mealPlans];
    const mealPlanIndex = copiedMealPlans.findIndex((plan) => plan.mealId === mealId);
    copiedMealPlans[mealPlanIndex].columnNames[columnKey] = newName;
    setMealPlans(copiedMealPlans);
    setEditingColumn(null);
  };

  const handleDownloadPDF = () => {
    const element = contentRef.current;
    const opt = {
      margin: 0.5,
      filename: `bulk-meal-plans.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true  },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().from(element).set(opt).save();
  };

  const InfoField = ({ label, value }) => (
    <div className="rounded-lg border border-[#e6ded7] bg-[#faf7f4] px-4 py-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-[#7c5f4d]/80 font-semibold">
        {label}
      </div>
      <div className="mt-1 text-sm text-gray-800">
        {value !== null && value !== undefined && value !== "" ? value : "—"}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f3ef] p-6">
      {/* PDF Download */}
      <div className="mb-4 text-right">
        <button
          onClick={handleDownloadPDF}
          className="bg-[#7c5f4d] text-white px-4 py-2 rounded hover:bg-[#5e4435] transition"
        >
          Download PDF
        </button>
      </div>

      <div ref={contentRef} className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#7c5f4d]">
            Diet Plan Breakdown
          </h1>

          {/* Show logo only if it exists */}
          {logo && (
            <img
              src={logo}
              alt="User Logo"
              className="h-16 w-16 rounded-md object-cover border"
            />
          )}
        </div>

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          mealPlans.map((mealPlan, mealPlanIndex) => (
            <div key={mealPlan.mealId} className="mb-12">
              {/* Client Info Section */}
              {/* {mealPlan.client && mealPlanIndex === 0 && (
                <div className="mb-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoField label="Client Name" value={mealPlan.client.name} />
                    <InfoField label="Age" value={mealPlan.client.age} />
                    <InfoField label="Weight" value={mealPlan.client.weight} />
                    <InfoField label="PBF" value={mealPlan.client.pbf} />
                    <InfoField label="SMM" value={mealPlan.client.smm} />
                    <InfoField label="Target Calories" value={mealPlan.client.target_calories} />
                    <InfoField label="Target Carbs" value={mealPlan.client.target_carb} />
                    <InfoField label="Target Fat" value={mealPlan.client.target_fat} />
                    <InfoField label="Target Protein" value={mealPlan.client.target_protein} />
                  </div>
                </div>
              )} */}

              {/* Meal Plan Table */}
              <h2 className="text-xl font-semibold text-[#7c5f4d] mb-4">
                {mealPlan.name}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border border-gray-200 rounded">
                  <thead className="bg-[#c8b4a8] text-white sticky top-0 z-10">
                    <tr>
                      {mealPlan.columnOrder.map((columnKey) => (
                        <th
                          key={columnKey}
                          className="px-4 py-2 text-center border-r last:border-r-0 cursor-move select-none"
                          draggable
                          onDragStart={() => handleDragStart(mealPlan.mealId, columnKey)}
                          onDragEnter={() => handleDragEnter(mealPlan.mealId, columnKey)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(mealPlan.mealId)}
                          title="Drag to reorder"
                        >
                          {editingColumn === columnKey+'-'+mealPlanIndex ? (
                            <input
                              type="text"
                              value={mealPlan.columnNames[columnKey] || columnKey}
                              onChange={(e) => {
                                const newName = e.target.value;
                                const copiedMealPlans = [...mealPlans];
                                copiedMealPlans[mealPlanIndex].columnNames[columnKey] = newName;
                                debugger;
                                setMealPlans(copiedMealPlans);
                              }}
                              onBlur={() => setEditingColumn(null)}
                              // onKeyDown={(e) => {
                              //   if (e.key === "Enter") {
                              //     handleRenameColumn(mealPlan.mealId, columnKey, e.target.value);
                              //   }
                              // }}
                              className="border border-gray-300 p-1 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-[#7c5f4d] bg-white"
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:underline"
                              onClick={() => setEditingColumn(columnKey+'-'+mealPlanIndex)}
                            >
                              {mealPlan.columnNames[columnKey] || columnKey}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(maxLength)].map((_, rowIndex) => (
                      <tr key={rowIndex} className="border-t hover:bg-gray-50">
                        {mealPlan.columnOrder.map((columnKey) => {
                          const item = mealPlan.split[columnKey]?.[rowIndex];
                          return (
                            <td
                              key={`${rowIndex}-${columnKey}`}
                              className="px-4 py-3 text-center border-r last:border-r-0"
                            >
                              {item ? (
                                <>
                                  <div className="font-medium text-gray-800">{item.food}</div>
                                  <div className="text-gray-500 text-sm">{item.quantity}</div>
                                </>
                              ) : (
                                <div className="text-gray-300 text-sm italic">–</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BulkMealView;
