
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import API from "../hooks/useApi";

export default function CreateClient() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    age: "",
    weight: "",
    height: "",
    gender: "M",
    goal: "maintain",
    work_style: "bed_bound",
    smm: "",
    pbf: "",
  });

  const [formulas, setFormulas] = useState([]);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [activityAdjustedBMR, setActivityAdjustedBMR] = useState(null);
  const [finalCalories, setFinalCalories] = useState(null);
  const [bmrAdjustment, setBmrAdjustment] = useState(0);
  const [calculatedBMR, setCalculatedBMR] = useState(0);
  const [isManual, setIsManual] = useState(false);
  const [fatPercentage, setFatPercentage] = useState(33); // Default value for Fat Percentage
  const [carbPercentage, setCarbPercentage] = useState(33); // Default value for Carb Percentage
  const [proteinPercentage, setProteinPercentage] = useState(34); // Default value for Protein Percentage

  // Handle changes to the percentage values
  const handlePercentageChange = (field, value) => {
    const parsedValue = value === "" ? "" : parseInt(value, 10);
    if (isNaN(parsedValue)) return; // Do not update if the value is not a number

    if (field === "fatPercentage") setFatPercentage(parsedValue);
    if (field === "carbPercentage") setCarbPercentage(parsedValue);
    if (field === "proteinPercentage") setProteinPercentage(parsedValue);
  };

  useEffect(() => {
    const { gender, weight, height, age, work_style, goal } = form;

    if (selectedFormula && weight && height && age) {
      const w = parseFloat(weight);
      const h = parseFloat(height);
      const a = parseFloat(age);

      const genderCode = gender === "M" ? "M" : "F";
      const formulaObj = selectedFormula.gender_formulas.find(g => g.gender === genderCode);

      if (formulaObj) {
        try {
          const expr = new Function("weight", "height", "age", `return ${formulaObj.expression};`);
          const baseBMR = expr(w, h, a);
          setCalculatedBMR(Math.round(baseBMR));

          // Find activity multiplier
          const activityObj = selectedFormula.activity_levels.find(act => act.level === work_style);
          const multiplier = activityObj ? activityObj.multiplier : 1;

          const adjustedBMR = (baseBMR) * multiplier;
          setActivityAdjustedBMR(Math.round(adjustedBMR));

          // Apply goal
          let calorieGoal = adjustedBMR + bmrAdjustment;

          setFinalCalories(Math.round(calorieGoal));
        } catch (err) {
          console.error("Error evaluating formula", err);
          setCalculatedBMR(0);
          setActivityAdjustedBMR(0);
          setFinalCalories(0);
        }
      }
    }
  }, [form, selectedFormula, bmrAdjustment]);

  // Validate if the sum of the percentages is exactly 100
  const isSumValid = () => {
    const total = fatPercentage + carbPercentage + proteinPercentage;
    return total === 100;
  };

  useEffect(() => {
  async function fetchFormulas() {
    try {
      const res = await API.get("/nutrition/bmr-formulas/");
      setFormulas(res.data);
      setSelectedFormula(res.data[0]); // default
    } catch (err) {
      console.error("Failed to load formulas", err);
      toast.error("Error loading BMR formulas.");
    }
  }

  fetchFormulas();
}, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/nutrition/clients/", {
        ...form,
        bmr: calculatedBMR,
        activity_value: activityAdjustedBMR,
        target_calories: finalCalories,
      });
      toast.success("Client created!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create client");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ef] flex items-center justify-center px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-4xl p-10 rounded-xl shadow-lg space-y-6"
      >
        <h2 className="text-2xl font-bold text-[#7c5f4d] mb-4">Create New Client</h2>

        {/* Name & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">Client Name</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">Client Description</span>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">SMM (kg)</span>
            <input
              type="number"
              name="smm"
              value={form.smm}
              onChange={handleChange}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">PBF (%)</span>
            <input
              type="number"
              name="pbf"
              value={form.pbf}
              onChange={handleChange}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
          </label>
        </div>

        {/* Profile Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">Age</span>
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">Weight (kg)</span>
            <input
              type="number"
              name="weight"
              value={form.weight}
              onChange={handleChange}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">Height (cm)</span>
            <input
              type="number"
              name="height"
              value={form.height}
              onChange={handleChange}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            />
          </label>
        </div>

        {/* Gender / Goal / Work Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">Gender</span>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </label>
          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">BMR Formula</span>
            <select
              value={selectedFormula?.name || ""}
              onChange={(e) => {
                const f = formulas.find((fml) => fml.name === e.target.value);
                setSelectedFormula(f);
              }}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            >
              {formulas.map((fml) => (
                <option key={fml.name} value={fml.name}>
                  {fml.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-1 font-medium text-sm text-gray-700">Work Style</span>
            <select
              name="work_style"
              value={form.work_style}
              onChange={handleChange}
              className="px-5 py-3 border rounded-md focus:ring-2 focus:ring-[#c8b4a8]"
            >
              <option value="bed_bound">Chair bound/bed bound</option>
              <option value="seated_static">Seated work with no movement</option>
              <option value="seated_moving">Seated work with minimal movement</option>
              <option value="standing">Standing work (e.g. housework)</option>
              <option value="sport">Significant amounts of sport</option>
              <option value="strenuous">Strenuous/highly active</option>
            </select>
          </label>

        </div>

      

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-700">BMR (calculated): <strong>{calculatedBMR} kcal</strong></p>
          </div>

          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-700">Activity Adjusted BMR: <strong>{activityAdjustedBMR || '0'} kcal</strong></p>
          </div>

          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-700">Daily Calorie Goal : <strong>{finalCalories || '0'} kcal</strong></p>
          </div>
          
        </div>

        <div className="mb-6 flex items-center space-x-4">
        <span className="font-medium text-gray-700">Auto</span>
          <button
            type="button"
            onClick={() => setIsManual(!isManual)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none ${
              isManual ? "bg-[#7c5f4d]" : "bg-gray-300"
            }`}
            aria-pressed={isManual}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${
                isManual ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="font-medium text-gray-700">Manual</span>
        </div> 

        {/* Manual Fields */}
        {isManual && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="fatPercentage" className="block text-sm font-medium text-gray-700">Fat Percentage</label>
              <input
                id="fatPercentage"
                type="number"
                value={fatPercentage}
                onChange={(e) => handlePercentageChange("fatPercentage", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm ${isSumValid() ? 'border-gray-300' : 'border-red-500'}`}
              />
            </div>
            <div>
              <label htmlFor="carbPercentage" className="block text-sm font-medium text-gray-700">Carb Percentage</label>
              <input
                id="carbPercentage"
                type="number"
                value={carbPercentage}
                onChange={(e) => handlePercentageChange("carbPercentage", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm ${isSumValid() ? 'border-gray-300' : 'border-red-500'}`}
              />
            </div>
            <div>
              <label htmlFor="proteinPercentage" className="block text-sm font-medium text-gray-700">Protein Percentage</label>
              <input
                id="proteinPercentage"
                type="number"
                value={proteinPercentage}
                onChange={(e) => handlePercentageChange("proteinPercentage", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm ${isSumValid() ? 'border-gray-300' : 'border-red-500'}`}
              />
            </div>
            <br></br>
          </div>
        )} 

        {/* BMR Display + Slider */}
        <div className="space-y-4 pt-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Adjust Calorie Target ({bmrAdjustment} kcal):</span>
       
            <input
              type="range"
              min={-1000}
              max={1000}
              step={10}
              value={bmrAdjustment}
              onChange={(e) => setBmrAdjustment(parseInt(e.target.value))}
              className="w-full mt-2 appearance-none h-2 rounded-lg"
              style={{
                background: `linear-gradient(to right,
                #de4c4c 0%,
                #41c141 50%,
                #de4c4c 100%)`,
              }}
            />
          </label>
        </div>


        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-[#7c5f4d] text-white font-semibold py-3 rounded-full hover:bg-[#6a4d3d] transition"
          >
            Create Client
          </button>
        </div>
      </form>
    </div>
  );
}

