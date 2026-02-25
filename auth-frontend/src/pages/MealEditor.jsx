import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import Select from 'react-select';


export default function MealEditor() {
  const { id } = useParams(); // plan_id
  const [client, setClient] = useState(null);
  const [foods, setFoods] = useState([]);
  const [proteinItems, setProteinItems] = useState([]);
  const [carbItems, setCarbItems] = useState([]);
  const [fatItems, setFatItems] = useState([]);
  const [name, setName] = useState("");  // Add state for name
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch plan details (with client info)
    API.get(`/nutrition/plan/${id}/`)
      .then((res) => {
        const { client, items, name } = res.data;
        setName(name);
        API.get(`/nutrition/clients/${client}/`).then((res) => setClient(res.data));

        // Load all foods for dropdowns
        API.get("/nutrition/foods/").then((fRes) => {
          setFoods(fRes.data);

          // Pre-fill quantities from the plan
          const mapCategory = (cat) =>
            items
              .filter((i) => i.category === cat)
              .map((i) => {
                const food = fRes.data.find((f) => f.id === i.food_id);
                return { ...food, quantity: i.quantity };
              });

          setProteinItems(mapCategory("protein"));
          setCarbItems(mapCategory("carb"));
          setFatItems(mapCategory("fat"));
        });
      })
      .catch(() => toast.error("Failed to load meal plan"));
  }, [id]);

  const removeItem = (type, foodId) => {
    if (type === "protein")
      setProteinItems((items) => items.filter((i) => i.id !== foodId));
    if (type === "carb")
      setCarbItems((items) => items.filter((i) => i.id !== foodId));
    if (type === "fat")
      setFatItems((items) => items.filter((i) => i.id !== foodId));
  };

  const handleSavePlan = async () => {
    const allItems = [
      ...proteinItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "protein" })),
      ...carbItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "carb" })),
      ...fatItems.filter(i => i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity, category: "fat" })),
    ];

    try {
      await API.post(`/nutrition/plan/custom/${client.id}/`, { items: allItems, name:name });
      toast.success("Meal plan created!");
      navigate(`/client/${client.id}/meal-plan`);
    } catch {
      toast.error("Failed to update meal plan");
    }
  };

  const handleUpdatePlan = async () => {
    const allItems = [
      ...proteinItems
        .filter((i) => i.quantity > 0)
        .map((i) => ({
          item_id: i.id,
          quantity: i.quantity,
          category: "protein",
        })),
      ...carbItems
        .filter((i) => i.quantity > 0)
        .map((i) => ({
          item_id: i.id,
          quantity: i.quantity,
          category: "carb",
        })),
      ...fatItems
        .filter((i) => i.quantity > 0)
        .map((i) => ({
          item_id: i.id,
          quantity: i.quantity,
          category: "fat",
        })),
    ];

    try {
      await API.put(`/nutrition/plan/${id}/`, { items: allItems, name: name });
      toast.success("Meal plan updated!");
      navigate(`/client/${client.id}/meal-plan`);
    } catch {
      toast.error("Failed to update meal plan");
    }
  };

  const handleSelect = (e, type) => {
    const foodId = parseInt(e.value);
    const food = foods.find((f) => f.id === foodId);
    if (!food) return;

    const foodWithQty = { ...food, quantity: 0 };
    if (type === "protein" && !proteinItems.find((i) => i.id === foodId))
      setProteinItems([...proteinItems, foodWithQty]);
    if (type === "carb" && !carbItems.find((i) => i.id === foodId))
      setCarbItems([...carbItems, foodWithQty]);
    if (type === "fat" && !fatItems.find((i) => i.id === foodId))
      setFatItems([...fatItems, foodWithQty]);
  };

  const updateQty = (type, foodId, qty) => {
    const normalizedQty = qty === "" ? 0 : parseFloat(qty, 10);
    if (isNaN(normalizedQty)) return;

    const update = (items) =>
      items.map((item) =>
        item.id === foodId
          ? { ...item, quantity: Math.max(0, normalizedQty) }
          : item
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

    allItems.forEach((item) => {
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
      {/* --- Top area --- */}
      <div className="flex-none pt-10 pb-6">
        <h2 className="text-3xl font-bold text-[#7c5f4d] text-center mb-6">
          Edit Meal Plan for {client?.name}
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
          <div className="pb-6 border-b grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className={`p-2 rounded-md ${getMacroClass(totals.carb, client.target_carb)}`}>
              Total Carbs: {totals.carb} / {client.target_carb}
            </div>
            <div className={`p-2 rounded-md ${getMacroClass(totals.protein, client.target_protein)}`}>
              Total Protein: {totals.protein} / {client.target_protein}
            </div>
            <div className={`p-2 rounded-md ${getMacroClass(totals.fat, client.target_fat)}`}>
              Total Fat: {totals.fat} / {client.target_fat}
            </div>
          </div>
        )}
      </div>

      {/* --- Scrollable content --- */}
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
          {[["Carbs", carbItems, "carb"], ["Protein", proteinItems, "protein"], ["Fats", fatItems, "fat"]].map(
            ([label, items, key]) => (
              <div key={key} className="flex flex-col">
                <h4 className="text-base font-semibold mb-1 text-[#7c5f4d]">{label}</h4>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white p-2 rounded shadow-sm border"
                    >
                      <span className="flex-1 mr-2">
                        {item.name} <span className="text-gray-500">({item[key]} / {item.unit})</span>
                      </span>
                      <input
                        type="number"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => updateQty(key, item.id, e.target.value)}
                        className="w-14 px-2 py-1 border rounded-md"
                        step="any"
                      />
                      <button
                        onClick={() => removeItem(key, item.id)}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
<div className="mt-6 flex gap-4">
  <button
    onClick={handleSavePlan}
    className="bg-[#7c5f4d] text-white px-6 py-3 rounded-full hover:bg-[#6a4d3d]"
  >
    Save New Plan
  </button>

  <button
    onClick={handleUpdatePlan}
    className="bg-[#7c5f4d] text-white px-6 py-3 rounded-full hover:bg-[#6a4d3d]"
  >
    Update Plan
  </button>
</div>

        {/* <button
          onClick={handleSavePlan}
          className="mt-6 bg-[#7c5f4d] text-white px-6 py-3 rounded-full hover:bg-[#6a4d3d]"
        >
          Save New Plan
        </button>

        <button
          onClick={handleUpdatePlan}
          className="mt-6 bg-[#7c5f4d] text-white px-6 py-3 rounded-full hover:bg-[#6a4d3d]"
        >
          Update Plan
        </button> */}
      </div>
    </div>
  );
}
