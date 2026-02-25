
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../hooks/useApi";
import toast from 'react-hot-toast';

export default function MealPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [tags, setTags] = useState([]);
  const [itemTags, setItemTags] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const planRes = await API.get(`/nutrition/plan/${id}/`);
      setPlan(planRes.data);

      const initialTags = {};
      planRes.data.items.forEach((item) => {
        initialTags[item.id] = item.tag_ids || [];
      });
      setItemTags(initialTags);

      const tagRes = await API.get("/nutrition/tags/");
      setTags(tagRes.data);
    };
    fetchData();
  }, [id]);

  const handleTagSelect = (itemId, tagId) => {
    if (!tagId) return;

    const numericTagId = parseInt(tagId);
    setItemTags((prev) => {
      const existingTags = prev[itemId] || [];
      if (existingTags.includes(numericTagId)) return prev;
      return {
        ...prev,
        [itemId]: [...existingTags, numericTagId],
      };
    });
  };

  const handleRemoveTag = (itemId, tagId) => {
    setItemTags((prev) => ({
      ...prev,
      [itemId]: prev[itemId].filter((id) => id !== tagId),
    }));
  };

  const updateTags = async () => {
    await API.put(`/nutrition/plan/${id}/update-tags/`, {
      items: Object.entries(itemTags).map(([itemId, tagList]) => ({
        item_id: Number(itemId),
        tag_ids: tagList,
      })),
    });
    toast.success("Tags updated successfully!");
    // alert("Tags updated successfully!");
  };

  if (!plan || tags.length === 0)
    return <div className="p-10 text-center">Loading plan...</div>;

  return (
    <div className="min-h-screen bg-[#f7f3ef] px-8 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#7c5f4d]">
          Meal Plan on {new Date(plan.created_at).toLocaleString()}
        </h2>
        <div className="space-x-2">
          <button
            onClick={() => navigate(`/dashboard/plans/${plan.id}/edit-meal`)}
            className="bg-[#7c5f4d] text-white px-4 py-2 rounded-full hover:bg-[#6a4d3d] transition"
          >
            Edit Meal
          </button>
          <button
            onClick={updateTags}
            className="bg-[#7c5f4d] text-white px-4 py-2 rounded-full hover:bg-[#6a4d3d] transition"
          >
            Save Tags
          </button>
          <button
            onClick={() => 
            {
              const hasMissingTags = plan.items.some(
                (item) => !itemTags[item.id] || itemTags[item.id].length === 0
              );

              if (hasMissingTags) {
                toast.error("Assign meal to all items.");
                return;
              }
              navigate(`/dashboard/plan-view/${plan.id}`)
            }
            }
            className="bg-[#7c5f4d] text-white px-4 py-2 rounded-full hover:bg-[#6a4d3d] transition"
          >
            Show Meal
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[#e8ded5] text-[#7c5f4d] font-semibold">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Food Item</th>
              <th className="px-4 py-3">Food Name (Arabic)</th>
              <th className="px-4 py-3">Adjusted Qty</th>
              <th className="px-4 py-3">Unit (Arabic)</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3 w-[10%]">Select Meals</th>
              <th className="px-4 py-3 w-[30%]">Assigned Meals</th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((item) => (
              <tr
                key={item.id}
                className="border-t hover:bg-gray-50 align-top"
              >
                <td className="px-4 py-2 capitalize">{item.category}</td>
                <td className="px-4 py-2">{item.food_name}</td>
                <td className="px-4 py-2">{item.food_name_ar}</td>
                <td className="px-4 py-2">{item.adjusted_quantity}</td>
                <td className="px-4 py-2">{item.unit_ar}</td>
                <td className="px-4 py-2">{item.quantity}</td>
                <td className="px-4 py-2">
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-sm"
                    onChange={(e) => {
                      handleTagSelect(item.id, e.target.value);
                      e.target.value = ""; // reset after selection
                    }}
                  >
                    <option value="">Select Tag</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 w-[40%]">
                  <div className="flex flex-wrap gap-1">
                    {itemTags[item.id]?.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      return (
                        <span
                          key={tagId}
                          className="bg-[#f0e3d9] text-[#7c5f4d] px-2 py-1 text-xs rounded-full cursor-pointer"
                          onClick={() => handleRemoveTag(item.id, tagId)}
                        >
                          {tag?.name} ×
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}