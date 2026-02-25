import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const linkClass = (path) =>
    `block px-4 py-2 rounded-md hover:bg-blue-100 ${
      pathname === path ? "bg-blue-200 font-semibold" : ""
    }`;

  return (
    <div className="min-h-screen flex bg-[#f7f3ef]">
      {/* Sidebar */}
      <aside className="w-64 bg-white p-6 shadow-md border-r border-[#e2d5ca]">
        <div>
          <h2 className="text-xl font-bold text-[#7c5f4d] mb-6">My Dashboard</h2>
          <nav className="space-y-2">
            <Link to="/dashboard" className={linkClass("/dashboard")}>Manage Clients</Link>
            <Link to="/dashboard/create-client" className={linkClass("/dashboard/create-client")}>Create Clients</Link>
            <Link to="/dashboard/settings" className={linkClass("/dashboard/settings")}>Settings</Link>
          </nav>
        </div>

        {/* Logout button at bottom */}
        <div className="mt-10">
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-[#7c5f4d] hover:bg-[#6a4d3d] text-white rounded-md"
          >
            Logout {user?.username?.split("@")[0]}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
    // <div className="min-h-screen flex">
    //   {/* Sidebar */}
    //   <aside className="w-64 bg-blue-50 p-6 shadow-md">
    //     <div>
    //         <h2 className="text-xl font-bold text-blue-700 mb-6">My Dashboard</h2>
    //         <nav className="space-y-2">
    //         <Link to="/dashboard" className={linkClass("/dashboard")}>Home</Link>
    //         <Link to="/dashboard/create-client" className={linkClass("/dashboard/create-client")}>Create Client</Link>
    //         {/* <Link to="/dashboard/list-client" className={linkClass("/dashboard/list-client")}>List Client</Link>
    //         <Link to="/dashboard/mealplan" className={linkClass("/dashboard/mealplan")}>Meal Plan</Link>
    //         <Link to="/dashboard/custom" className={linkClass("/dashboard/custom")}>Customised Plan</Link> */}
    //         <Link to="/dashboard/settings" className={linkClass("/dashboard/settings")}>Settings</Link>
    //         </nav>
    //     </div>
    //     {/* Logout button at bottom */}
    //     <div>
    //       <button
    //         onClick={logout}
    //         className="w-full mt-6 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md"
    //       >
    //         Logout {user?.username?.split("@")[0]}
    //       </button>
    //     </div>
    //   </aside>

    //   {/* Content */}
    //   <main className="flex-1 bg-white p-6 overflow-auto">
    //     <Outlet />
    //   </main>
    // </div>
  );
}
