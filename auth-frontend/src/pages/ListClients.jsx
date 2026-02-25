import { useEffect, useState } from "react";
import API from "../hooks/useApi";
import { useNavigate, Link } from "react-router-dom";


export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const results = clients.filter((client) =>
      client.name.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(results);
  }, [search, clients]);

  const fetchClients = async () => {
    try {
      const res = await API.get("/nutrition/clients/");
      setClients(res.data);
      setFiltered(res.data);
    } catch (error) {
      console.error("Error fetching clients", error);
    }
  };

  const sortBy = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...filtered].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      if (typeof valA === "string") {
        return direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return direction === "asc" ? valA - valB : valB - valA;
      }
    });
    setFiltered(sorted);
  };

  const getSortArrow = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return (
    <div className="min-h-screen bg-[#f7f3ef] p-6">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold text-[#7c5f4d] mb-4">Client List</h1>

        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-[#c8b4a8]"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border border-gray-200 rounded">
            <thead className="bg-[#c8b4a8] text-white">
              <tr>
                <th
                  onClick={() => sortBy("name")}
                  className="px-4 py-2 cursor-pointer text-center align-middle"
                >
                  Name {getSortArrow("name")}
                </th>
                <th
                  onClick={() => sortBy("weight")}
                  className="px-4 py-2 cursor-pointer text-center align-middle"
                >
                  Weight (kg) {getSortArrow("weight")}
                </th>
                <th
                  onClick={() => sortBy("pbf")}
                  className="px-4 py-2 cursor-pointer text-center align-middle"
                >
                  PBF {getSortArrow("pbf")}
                </th>
                <th
                  onClick={() => sortBy("smm")}
                  className="px-4 py-2 cursor-pointer text-center align-middle"
                >
                  SMM {getSortArrow("smm")}
                </th>
                <th
                  onClick={() => sortBy("calorie_target")}
                  className="px-4 py-2 cursor-pointer text-center align-middle"
                >
                  Calorie Target {getSortArrow("calorie_target")}
                </th>
                <th className="px-4 py-2 text-center align-middle">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((client) => (
                  <tr key={client.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-center align-middle">
                      <Link to={`/dashboard/clients/${client.id}/history`} className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-center align-middle">{client.weight}</td>
                    <td className="px-4 py-2 text-center align-middle">{client.pbf}</td>
                    <td className="px-4 py-2 text-center align-middle">{client.smm}</td>
                    <td className="px-4 py-2 text-center align-middle">{client.target_calories.toFixed(2)}</td>
                    {/* <td className="px-4 py-2 space-x-2 text-center align-middle">
                      <button
                            onClick={() => navigate(`/dashboard/client-profile/${client.id}`)}
                            className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
                        >
                            Detailed Profile
                        </button>
                        <button
                            onClick={() => navigate(`/dashboard/clients/${client.id}/plans`)}
                            className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
                        >
                            Meals
                        </button>
                        <button
                            onClick={() => navigate(`/dashboard/clients/${client.id}/history`)}
                            className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
                        >
                            Profile
                        </button>
                        <button
                            onClick={() => navigate(`/dashboard/clients/${client.id}/edit`)}
                            className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
                        >
                            Edit
                        </button>
                    </td> */}
                    <td className="px-4 py-2 space-x-2 text-center align-middle">
                      <button
                        onClick={() => navigate(`/dashboard/client-profile/${client.id}`)}
                        className="text-sm text-gray-600 border border-gray-400 rounded px-3 py-1 hover:bg-gray-100 hover:border-gray-600 transition"
                      >
                        Detailed Profile
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/clients/${client.id}/plans`)}
                        className="text-sm text-gray-600 border border-gray-400 rounded px-3 py-1 hover:bg-gray-100 hover:border-gray-600 transition"
                      >
                        Meals
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/clients/${client.id}/history`)}
                        className="text-sm text-gray-600 border border-gray-400 rounded px-3 py-1 hover:bg-gray-100 hover:border-gray-600 transition"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/clients/${client.id}/edit`)}
                        className="text-sm text-gray-600 border border-gray-400 rounded px-3 py-1 hover:bg-gray-100 hover:border-gray-600 transition"
                      >
                        Edit
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-400">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
