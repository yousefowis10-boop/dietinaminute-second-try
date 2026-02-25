import { Link } from "react-router-dom";

export default function NotSubscribed() {
  return (
    <div className="min-h-screen bg-[#f7f3ef] flex items-center justify-center px-6">
      <div className="bg-white p-10 max-w-xl rounded-xl shadow-md text-center space-y-6">
        <h1 className="text-3xl font-bold text-[#7c5f4d]">Subscription Required</h1>
        <p className="text-gray-700 text-lg">
          Your current plan does not allow access to this feature.
        </p>
        <p className="text-gray-600">
          Subscribe now to unlock personalized meal planning, advanced features, and client tracking tools.
        </p>
        <Link
          to="/dashboard/settings"
          className="inline-block bg-[#7c5f4d] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#6a4d3d] transition"
        >
          Upgrade Plan
        </Link>
      </div>
    </div>
  );
}
