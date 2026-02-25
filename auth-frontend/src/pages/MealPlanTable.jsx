import { useEffect, useState } from "react";
import toast from 'react-hot-toast';
import API from "../hooks/useApi";
import dayjs from "dayjs";

export default function MealPlanTable() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeal = async () => {
      try {
        const res = await API.get("/nutrition/plan/latest");
        setPlan(res.data);
      } catch (err) {
        console.error("Failed to fetch meal plan:", err);
        toast.error("Could not load recent meal plan.");
      } finally {
        setLoading(false);
      }
    };

    fetchMeal();
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-700">Loading...</div>;
  }

  if (!plan || !plan.items || plan.items.length === 0) {
    return <div className="p-8 text-gray-600">No meal plan found.</div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f3ef] px-6 py-10">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Your Most Recent Meal Plan
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Generated on {dayjs(plan.created_at).format("dddd, MMM D, YYYY h:mm A")}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#e4d9d3] text-left text-gray-700">
                <th className="p-3">Food Item</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Protein (g)</th>
                <th className="p-3">Carbs (g)</th>
                <th className="p-3">Fat (g)</th>
                <th className="p-3">Category</th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{item.food_name}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.protein}</td>
                  <td className="p-3">{item.carb}</td>
                  <td className="p-3">{item.fat}</td>
                  <td className="p-3 capitalize text-gray-600">{item.category}</td>
                </tr>
              ))}
              <tr className="bg-[#faf7f5] font-semibold text-gray-700">
                <td className="p-3">Total</td>
                <td className="p-3"></td>
                <td className="p-3">{plan.total_protein}</td>
                <td className="p-3">{plan.total_carb}</td>
                <td className="p-3">{plan.total_fat}</td>
                <td className="p-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded">
          <h4 className="font-semibold mb-1">Missing Macros (adjustments still needed):</h4>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Protein: {plan.missing_protein.toFixed(2)} g</li>
            <li>Carbs: {plan.missing_carb.toFixed(2)} g</li>
            <li>Fat: {plan.missing_fat.toFixed(2)} g</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
