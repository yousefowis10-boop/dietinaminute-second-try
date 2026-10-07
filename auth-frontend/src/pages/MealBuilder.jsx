// import { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import toast from 'react-hot-toast';
// import API from "../hooks/useApi";

// export default function MealBuilder() {
//   const { id } = useParams();
//   const [client, setClient] = useState(null);
//   const [foods, setFoods] = useState([]);

//   const [proteinItems, setProteinItems] = useState([]);
//   const [carbItems, setCarbItems] = useState([]);
//   const [fatItems, setFatItems] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     API.get(`/nutrition/clients/${id}/`).then((res) => setClient(res.data));
//     API.get("/nutrition/foods/").then((res) => {
//       setFoods(res.data);
//       setProteinItems(res.data.filter(f => f.food_type === "protein").map(f => ({ ...f, quantity: 0 })));
//       setCarbItems(res.data.filter(f => f.food_type === "carb").map(f => ({ ...f, quantity: 0 })));
//       setFatItems(res.data.filter(f => f.food_type === "fat").map(f => ({ ...f, quantity: 0 })));
//     });
//   }, [id]);

//   const removeItem = (type, id) => {
//     if (type === "protein") setProteinItems(items => items.filter(i => i.id !== id));
//     if (type === "carb") setCarbItems(items => items.filter(i => i.id !== id));
//     if (type === "fat") setFatItems(items => items.filter(i => i.id !== id));
//   };

//   const handleGenerateDietPlan = async () => {
//     const allItems = [
//       ...proteinItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "protein" })),
//       ...carbItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "carb" })),
//       ...fatItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "fat" })),
//     ];

//     try {
//       await API.post(`/nutrition/plan/custom/${client.id}/`, { items: allItems });
//       toast.success("Custom diet plan created!");
//       navigate(`/dashboard/clients/${client.id}/plans`);
//     } catch {
//       toast.error("Failed to create plan.");
//     }
//   };

//   const handleSelect = (e, type) => {
//     const id = parseInt(e.target.value);
//     const item = foods.find(f => f.id === id);
//     if (!item) return;

//     const foodWithQty = { ...item, quantity: 0 };
//     if (type === "protein" && !proteinItems.find(i => i.id === id)) setProteinItems([...proteinItems, foodWithQty]);
//     if (type === "carb" && !carbItems.find(i => i.id === id)) setCarbItems([...carbItems, foodWithQty]);
//     if (type === "fat" && !fatItems.find(i => i.id === id)) setFatItems([...fatItems, foodWithQty]);
//   };

//   const updateQty = (type, id, qty) => {
//     const normalizedQty = qty === "" ? 0 : parseInt(qty, 10);
//     if (isNaN(normalizedQty)) return;

//     const update = items =>
//       items.map(item =>
//         item.id === id ? { ...item, quantity: Math.max(0, normalizedQty) } : item
//       );

//     if (type === "protein") setProteinItems(update(proteinItems));
//     if (type === "carb") setCarbItems(update(carbItems));
//     if (type === "fat") setFatItems(update(fatItems));
//   };

//   const calcAllMacros = () => {
//     const allItems = [...proteinItems, ...carbItems, ...fatItems];
//     let totalProtein = 0;
//     let totalCarb = 0;
//     let totalFat = 0;

//     allItems.forEach(item => {
//       const q = parseFloat(item.quantity || 0);
//       totalProtein += (parseFloat(item.protein || 0) * q);
//       totalCarb += (parseFloat(item.carb || 0) * q);
//       totalFat += (parseFloat(item.fat || 0) * q);
//     });

//     return {
//       protein: totalProtein.toFixed(2),
//       carb: totalCarb.toFixed(2),
//       fat: totalFat.toFixed(2),
//     };
//   };

//   const totals = calcAllMacros();

//   const getMacroClass = (value, target) => {
//     if (!target) return "";
//     const num = parseFloat(value);
//     const tgt = parseFloat(target);
//     const ratio = num / tgt;

//     if (ratio >= 0.95 && ratio <= 1.05) return "bg-green-100 text-green-700";
//     if (ratio < 0.7 || ratio > 1.1) return "bg-red-100 text-red-700";
//     return "bg-yellow-100 text-yellow-700";
//   };

//   return (
//     <div className="h-screen flex flex-col bg-[#f7f3ef] px-8">
//   {/* --- 20% Fixed Top Area --- */}
//   <div className="flex-none pt-10 pb-6">
//     <h2 className="text-3xl font-bold text-[#7c5f4d] text-center mb-6">
//       Build Meal for {client?.name}
//     </h2>

//     {client && (
//       <div className="pb-6 border-b text-base font-semibold text-gray-700 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left bg-[#f7f3ef]">
//         <div className={`p-2 rounded-md ${getMacroClass(totals.carb, client.target_carb)}`}>
//           Total Carbs: <span className="text-[#7c5f4d] text-lg">{totals.carb} / {client.target_carb}</span>
//         </div>
//         <div className={`p-2 rounded-md ${getMacroClass(totals.protein, client.target_protein)}`}>
//           Total Protein: <span className="text-[#7c5f4d] text-lg">{totals.protein} / {client.target_protein}</span>
//         </div>
//         <div className={`p-2 rounded-md ${getMacroClass(totals.fat, client.target_fat)}`}>
//           Total Fat: <span className="text-[#7c5f4d] text-lg">{totals.fat} / {client.target_fat}</span>
//         </div>
//       </div>
//     )}
//   </div>

//   {/* --- 80% Scrollable Bottom Area --- */}
//   <div className="flex-1 overflow-y-auto pb-32">
//     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
//       {["carb", "protein", "fat"].map(type => (
//         <div key={type}>
//           <label className="block mb-1 font-medium capitalize text-gray-700 text-sm">
//             {type}
//           </label>
//           <select
//             className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-[#c8b4a8] text-sm"
//             onChange={e => handleSelect(e, type)}
//             defaultValue=""
//           >
//             <option value="" disabled>Select a {type}</option>
//             {foods
//               .filter(f => f.food_type === type)
//               .map(item => (
//                 <option key={item.id} value={item.id}>{item.name}</option>
//               ))}
//           </select>
//         </div>
//       ))}
//     </div>

//     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//       {[["Carbs", carbItems, "carb"], ["Protein", proteinItems, "protein"], ["Fats", fatItems, "fat"]].map(([label, items, key]) => (
//         <div key={key} className="flex flex-col">
//           <h4 className="text-base font-semibold mb-1 text-[#7c5f4d]">{label}</h4>
//           <div className="flex-1 space-y-2 overflow-auto">
//             {items.map((item, i) => (
//               <div key={i} className="flex items-center justify-between bg-white p-2 rounded shadow-sm border text-sm">
//                 <span className="text-gray-800 w-full mr-2">
//                   {item.name} <span className="text-gray-500">({item[key]} / {item.unit})</span>
//                 </span>
//                 <input
//                   type="number"
//                   // value={Number(item.quantity)}
//                   value={item.quantity === 0 ? "" : item.quantity}
//                   onChange={e => updateQty(key, item.id, e.target.value)}
//                   className="w-14 px-2 py-1 border rounded-md text-sm focus:ring-2 focus:ring-[#c8b4a8]"
//                   min={0}
//                 />
//                 <button
//                   onClick={() => removeItem(key, item.id)}
//                   className="ml-2 text-gray-400 hover:text-red-500 text-sm"
//                   title="Remove"
//                 >
//                   ✕
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div>
//       ))}
//     </div>

//     <button
//       onClick={handleGenerateDietPlan}
//       className="mt-6 bg-[#7c5f4d] text-white px-6 py-3 rounded-full hover:bg-[#6a4d3d]"
//     >
//       Save Meal Plan
//     </button>
//   </div>
// </div>
//   );
// }

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import API from "../hooks/useApi";
import Select from 'react-select';

export default function MealBuilder() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [foods, setFoods] = useState([]);

  const [proteinItems, setProteinItems] = useState([]);
  const [carbItems, setCarbItems] = useState([]);
  const [fatItems, setFatItems] = useState([]);
  const [name, setName] = useState("");  // Add state for name
  const navigate = useNavigate();


  useEffect(() => {
    API.get(`/nutrition/clients/${id}/`).then((res) => setClient(res.data));
    API.get("/nutrition/foods/").then((res) => {
      setFoods(res.data);
      setProteinItems(res.data.filter(f => f.food_type === "protein").map(f => ({ ...f, quantity: 0 })));
      setCarbItems(res.data.filter(f => f.food_type === "carb").map(f => ({ ...f, quantity: 0 })));
      setFatItems(res.data.filter(f => f.food_type === "fat").map(f => ({ ...f, quantity: 0 })));
    });
  }, [id]);

  const removeItem = (type, id) => {
    if (type === "protein") setProteinItems(items => items.filter(i => i.id !== id));
    if (type === "carb") setCarbItems(items => items.filter(i => i.id !== id));
    if (type === "fat") setFatItems(items => items.filter(i => i.id !== id));
  };

  const handleGenerateDietPlan = async () => {
    const allItems = [
      ...proteinItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "protein" })),
      ...carbItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "carb" })),
      ...fatItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "fat" })),
    ];

    try {
      await API.post(`/nutrition/plan/custom/${client.id}/`, { items: allItems, name: name});
      toast.success("Custom diet plan created!");
      navigate(`/dashboard/clients/${client.id}/plans`);
    } catch {
      toast.error("Failed to create plan.");
    }
  };

  const handleSelect = (e, type) => {
    const id = parseInt(e.value);
    const item = foods.find(f => f.id === id);
    if (!item) return;

    const foodWithQty = { ...item, quantity: 0 };
    if (type === "protein" && !proteinItems.find(i => i.id === id)) setProteinItems([...proteinItems, foodWithQty]);
    if (type === "carb" && !carbItems.find(i => i.id === id)) setCarbItems([...carbItems, foodWithQty]);
    if (type === "fat" && !fatItems.find(i => i.id === id)) setFatItems([...fatItems, foodWithQty]);
  };

  const updateQty = (type, id, qty) => {
    const normalizedQty = qty === "" ? 0 : parseFloat(qty, 10);
    if (isNaN(normalizedQty)) return;

    const update = items =>
      items.map(item =>
        item.id === id ? { ...item, quantity: Math.max(0, normalizedQty) } : item
      );

    if (type === "protein") setProteinItems(update(proteinItems));
    if (type === "carb") setCarbItems(update(carbItems));
    if (type === "fat") setFatItems(update(fatItems));
  };

  const calcAllMacros = () => {
    const allItems = [...proteinItems, ...carbItems, ...fatItems];
    let totalProtein = 0;
    let totalCarb = 0;
    let totalFat = 0;

    allItems.forEach(item => {
      const q = parseFloat(item.quantity || 0);
      totalProtein += (parseFloat(item.protein || 0) * q);
      totalCarb += (parseFloat(item.carb || 0) * q);
      totalFat += (parseFloat(item.fat || 0) * q);
    });

    return {
      protein: totalProtein.toFixed(2),
      carb: totalCarb.toFixed(2),
      fat: totalFat.toFixed(2),
    };
  };

  const totals = calcAllMacros();


  const getMacroClass = (value, target) => {
    if (!target) return "";
    const num = parseFloat(value);
    const tgt = parseFloat(target);
    const ratio = num / tgt;

    if (ratio >= 0.95 && ratio <= 1.05) return "bg-green-100 text-green-700";
    if (ratio < 0.7 || ratio > 1.1) return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="h-screen flex flex-col bg-[#f7f3ef] px-8">
      {/* --- 20% Fixed Top Area --- */}
      <div className="flex-none pt-10 pb-6">
        <h2 className="text-3xl font-bold text-[#7c5f4d] text-center mb-6">
          Build Meal for {client?.name}
        </h2>

        {/* Name Field */}
        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#c8b4a8] text-sm"
            placeholder="Enter Meal name"
          />
        </div>

        {client && (
          <div className="pb-6 border-b text-base font-semibold text-gray-700 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left bg-[#f7f3ef]">
            <div className={`p-2 rounded-md ${getMacroClass(totals.carb, client.target_carb)}`}>
              Total Carbs: <span className="text-[#7c5f4d] text-lg">{totals.carb} / {client.target_carb}</span>
            </div>
            <div className={`p-2 rounded-md ${getMacroClass(totals.protein, client.target_protein)}`}>
              Total Protein: <span className="text-[#7c5f4d] text-lg">{totals.protein} / {client.target_protein}</span>
            </div>
            <div className={`p-2 rounded-md ${getMacroClass(totals.fat, client.target_fat)}`}>
              Total Fat: <span className="text-[#7c5f4d] text-lg">{totals.fat} / {client.target_fat}</span>
            </div>
          </div>
        )}
      </div>

      {/* --- 80% Scrollable Bottom Area --- */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
          {["carb", "protein", "fat"].map((type) => {
            const options = foods
              .filter((f) => f.food_type === type)
              .map((item) => ({
                value: item.id,
                label: item.name,
              }));

            return (
              <div key={type} className="mb-4">
                <label className="block mb-1 font-medium capitalize">{type}</label>
                <Select
                  options={options}
                  onChange={(selected) =>
                    handleSelect(selected, type)
                  }
                  placeholder={`Select a ${type}`}
                  isClearable
                  className="text-sm"
                  classNamePrefix="react-select"
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[["Carbs", carbItems, "carb"], ["Protein", proteinItems, "protein"], ["Fats", fatItems, "fat"]].map(([label, items, key]) => (
            <div key={key} className="flex flex-col">
              <h4 className="text-base font-semibold mb-1 text-[#7c5f4d]">{label}</h4>
              <div className="flex-1 space-y-2 overflow-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-2 rounded shadow-sm border text-sm">
                    <span className="text-gray-800 w-full mr-2">
                      {item.name} <span className="text-gray-500">({item[key]} / {item.unit})</span>
                    </span>
                    <input
                      type="number"
                      value={item.quantity === 0 ? "" : item.quantity}
                      onChange={e => updateQty(key, item.id, e.target.value)}
                      className="w-14 px-2 py-1 border rounded-md text-sm focus:ring-2 focus:ring-[#c8b4a8]"
                      min={0}
                      step="any"
                    />
                    <button
                      onClick={() => removeItem(key, item.id)}
                      className="ml-2 text-gray-400 hover:text-red-500 text-sm"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerateDietPlan}
          className="mt-6 bg-[#7c5f4d] text-white px-6 py-3 rounded-full hover:bg-[#6a4d3d]"
        >
          Save Meal Plan
        </button>
      </div>
    </div>
  );
}
