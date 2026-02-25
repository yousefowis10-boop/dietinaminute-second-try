import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import API, {baseURL} from "../hooks/useApi";
import html2pdf from "html2pdf.js";
import toast from "react-hot-toast";

const DietPlanSplitView = () => {
  const { planId } = useParams();
  const [taggedItems, setTaggedItems] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [client, setClient] = useState(null);
  const [headerNames, setHeaderNames] = useState({});
  const [editingHeader, setEditingHeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const contentRef = useRef();
  const [logo, setLogo] = useState(null);

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
    const fetchSplitPlan = async () => {
      try {
        const response = await API.get(`/nutrition/plan/${planId}/split/`);
        const { client, split } = response.data;
        setTaggedItems(split);
        setClient(client);

        const keys = Object.keys(split);
        setColumnOrder(keys);

        // initialize headerNames with default values
        setHeaderNames(
          keys.reduce((acc, key) => {
            acc[key] = key;
            return acc;
          }, {})
        );
      } catch (err) {
        setError("Failed to fetch diet plan data.");
      } finally {
        setLoading(false);
      }
    };

    fetchSplitPlan();
  }, [planId]);

  const maxLength = Math.max(
    0,
    ...Object.values(taggedItems).map((list) => list.length)
  );

  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDrop = () => {
    const copiedOrder = [...columnOrder];
    const dragged = copiedOrder[dragItem.current];
    copiedOrder.splice(dragItem.current, 1);
    copiedOrder.splice(dragOverItem.current, 0, dragged);
    setColumnOrder(copiedOrder);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDownloadPDF = () => {
    const element = contentRef.current;

    const opt = {
      margin: 0.5,
      filename: `diet-plan-${planId}.pdf`,
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

      <div
        ref={contentRef}
        className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow"
      >
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

        {/* Client Info Section */}
        {client && (
          <div className="mb-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField label="Client Name" value={client.name} />
              <InfoField label="Age" value={client.age} />
              <InfoField label="Weight" value={client.weight} />
              <InfoField label="PBF" value={client.pbf} />
              <InfoField label="SMM" value={client.smm} />
              <InfoField label="Target Calories" value={client.target_calories} />
              <InfoField label="Target Carbs" value={client.target_carb} />
              <InfoField label="Target Fat" value={client.target_fat} />
              <InfoField label="Target Protein" value={client.target_protein} />
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : columnOrder.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded">
              <thead className="bg-[#c8b4a8] text-white">
                <tr>
                  {columnOrder.map((tag, index) => (
                    <th
                      key={tag}
                      className="px-4 py-2 text-center border-r last:border-r-0 cursor-move select-none"
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      title="Drag to reorder"
                    >
                      {editingHeader === tag ? (
                        <input
                          type="text"
                          value={headerNames[tag]}
                          onChange={(e) =>
                            setHeaderNames({
                              ...headerNames,
                              [tag]: e.target.value,
                            })
                          }
                          onBlur={() => setEditingHeader(null)}
                          autoFocus
                          className="border rounded px-1 text-black w-24"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => setEditingHeader(tag)}
                          className="cursor-text"
                        >
                          {headerNames[tag]}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(maxLength)].map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-t hover:bg-gray-50">
                    {columnOrder.map((tag, colIndex) => {
                      const item = taggedItems[tag]?.[rowIndex];
                      return (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          className="px-4 py-3 text-center border-r last:border-r-0"
                        >
                          {item ? (
                            <>
                              <div className="font-medium text-gray-800">
                                {item.food}
                              </div>
                              <div className="text-gray-500 text-sm">
                                {item.quantity}
                              </div>
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
        ) : (
          <p className="text-gray-500">
            No tagged items found for this diet plan.
          </p>
        )}
      </div>
    </div>
  );
};

export default DietPlanSplitView;
