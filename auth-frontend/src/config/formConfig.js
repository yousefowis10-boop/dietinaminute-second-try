// formConfig.js
const formConfig = [
  {
    stepTitle: "General Information",
    fields: [
      { name: "name", label: "Name", type: "short" },
      { name: "email", label: "Email", type: "short" },
      { name: "date_of_participation", label: "Date of Participation", type: "date" },
      { name: "last_visit", label: "Last Visit", type: "date" },
      { name: "total_visits", label: "Total Number of Visits", type: "short" },
    ],
  },
  {
      stepTitle: "Personal Information",
    fields: [
      { name: "first_name", label: "First Name", type: "short" },
      { name: "last_name", label: "Last Name", type: "short" },
      { name: "last_visit_weight", label: "Last Visit Weight", type: "number" },
      { name: "height", label: "Height", type: "number" },
      {
        name: "gender",
        label: "Gender",
        type: "option",
        options: ["Male", "Female"],
      },
      {
        name: "marital_status",
        label: "Marital Status",
        type: "option",
        options: ["Single", "Married"],
      },
      { name: "occupation", label: "Occupation", type: "short" },
      { name: "symptoms", label: "Main Symptoms or Reason for Consultation", type: "long" },
    ],
  },
  {
    stepTitle: "Allergies",
    fields: [
      {
        name: "food_allergies",
        label: "Food Allergies",
        type: "checkbox",
        options: [
          "Peanuts",
          "Shellfish",
          "Dairy",
          "Eggs",
          "Wheat",
          "Soy",
          "Gluten",
          "Other",
        ],
      },
      {
        name: "diseases",
        label: "Prior or Current Diseases",
        type: "checkbox",
        options: [
          "Asthma",
          "Diabetes",
          "Heart Disease",
          "High Blood Pressure",
          "Cancer",
          "Thyroid Disease",
          "Other",
        ],
      },
      { name: "allergy_notes", label: "Notes", type: "long" },
    ],
  },
  {
    stepTitle: "Current Dietary Assessment",
    fields: [
      {
        name: "protein",
        label: "Protein",
        type: "option",
        options: ["High", "Moderate", "Low"],
      },
      {
        name: "fat",
        label: "Fat",
        type: "option",
        options: ["High", "Moderate", "Low"],
      },
      {
        name: "carbs",
        label: "Carbs",
        type: "option",
        options: ["High", "Moderate", "Low"],
      },
      {
        name: "grains",
        label: "Grains",
        type: "option",
        options: ["High", "Moderate", "Low"],
      },
      {
        name: "vegetables",
        label: "Vegetables",
        type: "option",
        options: ["High", "Moderate", "Low"],
      },
      {
        name: "fruit",
        label: "Fruit",
        type: "option",
        options: ["High", "Moderate", "Low"],
      },
      {
        name: "dairy",
        label: "Dairy",
        type: "option",
        options: ["High", "Moderate", "Low"],
      },
      {
        type: 'break',
      },
      { name: "food_to_eat_more", label: "Food To Eat More Of", type: "long" },
      { name: "food_to_eat_less", label: "Food To Eat Less Of", type: "long" },
      { name: "food_to_avoid", label: "Food To Avoid", type: "long" },
    ],
  },
  {
    stepTitle: "Supplements Intake",
    fields: [
        {
        name: "current_supplement_intake",
        label: "Current Supplement Intake",
        type: "long"
        }
    ]
},
{
  stepTitle: "Medical History",
  fields: [
    {
      name: "current_medications",
      label: "Current Medications",
      type: "long"
    },
    {
      name: "medicine_history",
      label: "Medicine History",
      type: "long"
    },
    {
      name: "surgical_history",
      label: "Surgical History",
      type: "long"
    }
  ]
},
{
  stepTitle: "Goals",
  fields: [
    {
      name: "lifestyle_goal",
      label: "What is your lifestyle goal",
      type: "long"
    },
    {
      name: "dietary_goal",
      label: "What is your dietary goal",
      type: "long"
    },
    {
      name: "fitness_goal",
      label: "What is your fitness goal",
      type: "long"
    },
    {
      name: "additional_concerns",
      label: "Additional concerns or points you would like to address",
      type: "long"
    }
  ]
},
{
  stepTitle: "Daily Lifestyle",
  fields: [
    {
      name: "smoke_cigarettes",
      label: "Smoke Cigarettes",
      type: "boolean"
    },
    {
      name: "how_many_smoke_a_day",
      label: "How Many A Day",
      type: "option",
      options: ["1/2 Pack", "1 Pack", "1.5 Pack", "2 Pack"]
    },
    {
      name: "smoking_duration",
      label: "For How Long",
      type: "option",
      options: ["Months", "Years"]
    },
    {
      name: "alcohol",
      label: "Alcohol",
      type: "boolean"
    },
    {
      name: "how_many_drinks_a_day",
      label: "How Many Drinks A Day",
      type: "option",
      options: ["1", "2", "3", "4 or more"]
    },
    {
      name: "alcohol_duration",
      label: "For How Long You Have Been Drinking",
      type: "option",
      options: ["Months", "Years"]
    },
    {
      name: "caffeine",
      label: "Caffeine",
      type: "boolean"
    },
    {
      name: "how_many_caffeine_a_day",
      label: "How Many A Day",
      type: "option",
      options: ["1", "2", "3", "4 or more"]
    },
    {
      name: "caffeine_duration",
      label: "For How Long",
      type: "option",
      options: ["Months", "Years"]
    },
    {
      name: "exercise",
      label: "Do You Exercise",
      type: "boolean"
    },
    {
      name: "exercise_duration",
      label: "How Long A Time",
      type: "option",
      options: ["30 Min", "45 Min", "1 Hour", "2+ Hours"]
    },
    {
      name: "exercise_times_per_week",
      label: "How Many Times Per Week",
      type: "option",
      options: ["1", "2", "3", "4", "5", "6", "7"]
    },
    {
      name: "workout_intensity",
      label: "Workout Intensity",
      type: "option",
      options: ["Low", "Medium", "High", "Very High"]
    },
    {
      name: "types_of_workout",
      label: "Types of Workout",
      type: "checkbox",
      options: [
        "Walking",
        "Jogging",
        "Running",
        "Cycling",
        "Sports (Badminton, Basketball)",
        "Gym Workout (Bodybuilding, Powerlifting, Strength Training)"
      ]
    },
    {
      name: "sleep_time",
      label: "What Time Do You Sleep",
      type: "time"
    },
    {
      name: "sleep_duration",
      label: "How Many Hours Do You Sleep",
      type: "number"
    }
  ]
},
{
  stepTitle: "Digestive Issues",
  fields: [
    {
      name: "bowel_movements_per_day",
      label: "Bowel Movements Per Day",
      type: "option",
      options: ["1", "2", "3", "4", "5"]
    },
    {
      name: "urinate_frequency",
      label: "Urinate Frequency (times per day)",
      type: "option",
      options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"]
    },
    {
      name: "overall_energy_levels",
      label: "Overall Energy Levels",
      type: "option",
      options: ["Low", "Moderate", "High"]
    }
  ]
},
{
  stepTitle: "Women Only",
  fields: [
    {
      name: "pregnant",
      label: "Pregnant",
      type: "boolean"
    },
    {
      name: "breastfeeding",
      label: "Breastfeeding",
      type: "boolean"
    },
    {
      name: "weeks_pregnant",
      label: "Weeks Pregnant",
      type: "option",
      options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36"]
    },
    {
      name: "due_date",
      label: "Due Date",
      type: "date"
    },
    {
      name: "women_health_comments",
      label: "Women's Health Comments",
      type: "long"
    }
  ]
},
{
  stepTitle: "Measurements",
  fields: [
    {
      name: "weight",
      label: "Weight (kg)",
      type: "number"
    },
    {
      name: "body_fat_percentage",
      label: "Body Fat Percentage",
      type: "number"
    },
    {
      name: "skeletal_muscle_mass",
      label: "Skeletal Muscle Mass (kg)",
      type: "number"
    },
    {
      name: "waist_to_hip_ratio",
      label: "Waist to Hip Ratio",
      type: "number"
    },
    {
      name: "chest",
      label: "Chest (cm)",
      type: "short"
    },
    {
      name: "right_arm",
      label: "Right Arm (cm)",
      type: "short"
    },
    {
      name: "left_arm",
      label: "Left Arm (cm)",
      type: "short"
    },
    {
      name: "right_forearm",
      label: "Right Forearm (cm)",
      type: "short"
    },
    {
      name: "left_forearm",
      label: "Left Forearm (cm)",
      type: "short"
    },
    {
      name: "belly",
      label: "Belly (cm)",
      type: "short"
    },
    {
      name: "hip",
      label: "Hip (cm)",
      type: "short"
    },
    {
      name: "glutes",
      label: "Glutes (cm)",
      type: "short"
    },
    {
      name: "left_thigh",
      label: "Left Thigh (cm)",
      type: "short"
    },
    {
      name: "right_thigh",
      label: "Right Thigh (cm)",
      type: "short"
    },
    {
      name: "left_calve",
      label: "Left Calve (cm)",
      type: "short"
    },
    {
      name: "right_calve",
      label: "Right Calve (cm)",
      type: "short"
    },
    {
      name: "date_of_measurement",
      label: "Date of Measurement",
      type: "date"
    }
  ]
}

];

export default formConfig;
