import { useEffect, useState } from "react";
import API from "../hooks/useApi";

export default function CustomPlanGenerator() {
  const [foods, setFoods] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function fetchFoods() {
      const res = await API.get("/nutrition/foods/");
      setFoods(res.data);
    }
    fetchFoods();
  }, []);

  const handleSelect = (e) => {
    const id = parseInt(e.target.value);
    if (!selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRemove = (id) => {
    setSelectedIds(selectedIds.filter((itemId) => itemId !== id));
  };

  const handleGenerate = async () => {
    const res = await API.post("/nutrition/plan/custom/", { preferred_food_ids: selectedIds });
    setResult(res.data);
  };

  const selectedFoods = foods.filter((food) => selectedIds.includes(food.id));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Generate Custom Meal Plan</h2>

      <div className="flex gap-4 mb-4">
        <select onChange={handleSelect} className="p-2 border rounded-md">
          <option value="">-- Select Food Item --</option>
          {foods.map((food) => (
            <option key={food.id} value={food.id}>
              {food.name} ({food.food_type})
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Generate
        </button>
      </div>

      {selectedFoods.length > 0 && (
        <table className="w-full table-auto border mt-4 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 border">Name</th>
              <th className="px-2 py-1 border">Type</th>
              <th className="px-2 py-1 border">Protein</th>
              <th className="px-2 py-1 border">Carb</th>
              <th className="px-2 py-1 border">Fat</th>
              <th className="px-2 py-1 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {selectedFoods.map((food) => (
              <tr key={food.id}>
                <td className="px-2 py-1 border">{food.name}</td>
                <td className="px-2 py-1 border">{food.food_type}</td>
                <td className="px-2 py-1 border">{food.protein}</td>
                <td className="px-2 py-1 border">{food.carb}</td>
                <td className="px-2 py-1 border">{food.fat}</td>
                <td className="px-2 py-1 border">
                  <button
                    onClick={() => handleRemove(food.id)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result && (
        <div className="mt-6 p-4 border rounded-md bg-green-50">
          <h3 className="font-semibold text-green-800 mb-2">Meal Plan Created</h3>
          <p><strong>Completed:</strong> {result.completed ? "✅ Yes" : "❌ No"}</p>
          <p><strong>Missing Macros:</strong></p>
          <ul className="list-disc ml-6 text-sm">
            <li>Protein: {result.missing.protein}</li>
            <li>Carb: {result.missing.carb}</li>
            <li>Fat: {result.missing.fat}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
