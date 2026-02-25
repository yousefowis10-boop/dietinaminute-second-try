import React, { useState, useEffect, useRef } from "react";
import FormFieldRenderer from "../components/FormFieldRenderer";
import formConfig from "../config/formConfig";
import API from "../hooks/useApi";
import { useParams, useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";


function HistoryModal({ clientId, onClose }) {
  const [revisions, setRevisions] = useState([]);
  const [selectedRevision, setSelectedRevision] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) return;

    const fetchRevisions = async () => {
      try {
        const response = await API.get(`/nutrition/clients/${clientId}/detailed-profile-history/`);
        setRevisions(response.data);
      } catch (err) {
        setError("Failed to load history.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevisions();
  }, [clientId]);

  const formatField = (label, value) => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "—";
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    return value ?? "—";
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div
        className="bg-white rounded shadow-lg p-6 overflow-auto"
        style={{ width: "80vw", height: "80vh" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#7c5f4d]">History</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 border border-[#c8b4a8] rounded text-[#7c5f4d] hover:bg-[#f7f3ef] hover:border-[#bfa89c] transition"
          >
            Close
          </button>
        </div>

        {selectedRevision ? (
          <>
    <button
      onClick={() => setSelectedRevision(null)}
      className="mb-4 flex items-center text-[#7c5f4d] hover:underline"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to list
    </button>

    <div className="mb-6 p-4 border rounded-lg bg-[#f9f7f4] max-h-[70vh] overflow-auto">
      <h3 className="text-lg font-semibold mb-4 text-[#7c5f4d]">
        Please review the revision information:
      </h3>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {Object.entries(selectedRevision)
          .filter(([key]) => !["id", "client", "user", "detailed_profile", "modified_by"].includes(key))
          .map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <dt className="text-sm font-medium text-[#a08c7d] capitalize mb-1">
                {key.replace(/_/g, " ")}
              </dt>
              <dd className="text-base text-[#4a423a] break-words">
                {Array.isArray(value)
                  ? value.length > 0
                    ? value.join(", ")
                    : "—"
                  : typeof value === "boolean"
                  ? value ? "Yes" : "No"
                  : value ?? "—"}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  </>
        ) : (
          <>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && !error && (
              <div className="space-y-4">
                {revisions.length === 0 ? (
                  <p className="text-gray-500">No revisions found.</p>
                ) : (
                  revisions.map((rev) => {
                    const formattedDate = format(new Date(rev.modified_at), "PPPP 'at' p");
                    return (
                      <div
                        key={rev.id}
                        onClick={() => setSelectedRevision(rev)}
                        className="border border-gray-300 p-4 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
                      >
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Revision Date:</strong> {formattedDate}
                        </div>

                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Reason:</strong>{" "}
                          {rev.revision_reason || <em>No reason given</em>}
                        </div>

                        <div className="text-sm text-gray-700">
                          <strong>Height:</strong> {rev.height ? `${rev.height} cm` : "—"} <br />
                          <strong>Weight:</strong> {rev.weight ? `${rev.weight} kg` : "—"} <br />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    
  );
}


export default function ClientProfileForm() {
  const { clientId } = useParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const reviewRef = useRef(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);



  useEffect(() => {
    // Fetch client profile data when the component mounts
    API.get(`/nutrition/clients/${clientId}/detailed-profile/`)
      .then((response) => {
        setFormData(response.data); // Set the fetched data to state
        setLoading(false); // Stop loading once data is fetched
      })
      .catch(() => {
        setError("Failed to fetch client profile.");
        setLoading(false);
      });
  }, [clientId]);

  const handleDownloadPDF = () => {
  if (reviewRef.current) {
    const element = reviewRef.current;

    // Store original styles
    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;

    // Temporarily remove scroll constraints
    element.style.maxHeight = "none";
    element.style.overflow = "visible";

    // Use timeout to allow DOM to update
    setTimeout(() => {
      html2pdf()
        .set({
          margin: 0.5,
          filename: `client_profile_${clientId}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, scrollY: 0 }, // ignore scroll
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(element)
        .save()
        .then(() => {
          // Restore original styles
          element.style.maxHeight = originalMaxHeight;
          element.style.overflow = originalOverflow;
        });
    }, 0);
  }
};

//   const handleDownloadPDF = () => {
//   if (reviewRef.current) {
//     html2pdf()
//       .set({
//         margin: 0.5,
//         filename: `client_profile_${clientId}.pdf`,
//         image: { type: 'jpeg', quality: 0.98 },
//         html2canvas: { scale: 2 },
//         jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
//       })
//       .from(reviewRef.current)
//       .save();
//   }
// };


  const currentStep = formConfig[stepIndex];
  const isReviewStep = stepIndex === formConfig.length;

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (stepIndex < formConfig.length) setStepIndex(stepIndex + 1);
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const handleSubmit = () => {
    setSubmitting(true); // Disable the submit button
    API.put(`/nutrition/clients/${clientId}/detailed-profile/`, formData)
      .then(() => {
        navigate(`/client/${clientId}`); // Redirect or show success message
      })
      .catch(() => {
        setError("Failed to update profile.");
        setSubmitting(false); // Re-enable the submit button
      });
  };

  const handleStepClick = (index) => {
    setStepIndex(index);
  };

  if (loading) {
    return <div>Loading...</div>; // Consider adding a loading spinner here
  }

  return (
    <>
    <div className="w-full p-6 bg-white rounded shadow">
      {/* Fixed Label Showing Active Step Title */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#7c5f4d]">
          {isReviewStep
            ? "Review Your Information"
            : `Step ${stepIndex + 1}: ${currentStep.stepTitle}`}
        </h2>
        
        <button
          onClick={() => setShowHistoryModal(true)}
          className="px-4 py-2 bg-[#c8b4a8] text-white rounded hover:bg-[#bfa89c] transition"
        >
          History
        </button>
      </div>

      {/* Step Progress Bar */}
      <div className="flex items-center justify-between mb-6">
        {formConfig.map((step, idx) => (
          <div key={idx} className="flex-1">
            <div className="flex flex-col items-center">
              {/* Step Circle */}
              <div
                onClick={() => handleStepClick(idx)} // Navigate to step on click
                className={`
                  w-8 h-8 flex items-center justify-center rounded-full
                  text-sm font-semibold border cursor-pointer
                  ${idx === stepIndex
                    ? "bg-[#c8b4a8] text-white border-[#c8b4a8]"
                    : "bg-white text-[#7c5f4d] border-[#c8b4a8]"}
                `}
              >
                {idx + 1}
              </div>
            </div>
          </div>
        ))}
        {/* Review Step Circle */}
        <div className="flex-1">
          <div className="flex flex-col items-center">
            <div
              onClick={() => handleStepClick(formConfig.length)}
              className={`
                w-8 h-8 flex items-center justify-center rounded-full
                text-sm font-semibold border cursor-pointer
                ${isReviewStep
                  ? "bg-[#c8b4a8] text-white border-[#c8b4a8]"
                  : "bg-white text-[#7c5f4d] border-[#c8b4a8]"}
              `}
            >
              {formConfig.length + 1}
            </div>
            {/* <span className="text-xs mt-1 text-[#7c5f4d]">Review</span> */}
          </div>
        </div>
      </div>

      {/* Error Handling */}
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}
      {isReviewStep && (
  <button
    onClick={handleDownloadPDF}
    className="px-4 py-2 text-sm rounded-md border border-[#c8b4a8] bg-white text-[#7c5f4d] hover:bg-[#f0e9e3] hover:border-[#bfa89c] mb-4 ml-auto block"
  >
    Download as PDF
  </button>
)}

      {/* Render Fields for Current Step or Review */}
      {!isReviewStep ? (
        <div 
        className={`grid gap-4 mb-6 ${
    (currentStep.stepTitle === "Daily Lifestyle" || currentStep.stepTitle === 'Allergies') ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
  }`}
        // className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"
        >
          {currentStep.fields.map((field) => (
            <FormFieldRenderer
              key={field.name}
              field={field}
              value={formData[field.name] || ""}
              onChange={handleChange}
            />
            
            
          ))}
        </div>
      ) : (
        <div ref={reviewRef} className="mb-6 p-4 border rounded-lg bg-[#f9f7f4] max-h-96 overflow-auto">
          <h3 className="text-lg font-semibold mb-4 text-[#7c5f4d]">
            Please review your entered information:
          </h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {Object.entries(formData)
  .filter(([key]) => !["id", "client", "user"].includes(key))
  .map(([key, value]) => (
    <div key={key} className="flex flex-col">
      <dt className="text-sm font-medium text-[#a08c7d] capitalize mb-1">
        {key.replace(/_/g, " ")}
      </dt>
      <dd className="text-base text-[#4a423a] break-words">
        {String(value) || "—"}
      </dd>
    </div>
  ))}
            
          </dl>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 disabled:opacity-50"
        >
          Back
        </button>


        {!isReviewStep ? (
          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm rounded-md border border-[#c8b4a8] bg-[#f7f3ef] text-[#7c5f4d] hover:bg-[#e6dad1] hover:border-[#bfa89c]"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md border border-[#c8b4a8] bg-[#f7f3ef] text-[#7c5f4d] hover:bg-[#e6dad1] hover:border-[#bfa89c]"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
     {/* History modal */}
      {showHistoryModal && (
        <HistoryModal
          clientId={clientId}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </>
  );
}
