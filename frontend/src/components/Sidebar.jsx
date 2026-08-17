import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearToken } from "../api/client";

const menuItems = [
  { path: "/dashboard", label: "Home", icon: "home" },
  { path: "/projects", label: "All Projects", icon: "folder_open" },
  { path: "/my-tasks", label: "My tasks", icon: "checklist" },
  { path: "/team", label: "Team", icon: "group" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#FFF1E7] cartoon-border border-r-2 z-50 flex-col p-6 hidden lg:flex">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 rounded-full bg-[#FFD34E] cartoon-border flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">bolt</span>
        </div>
        <h1 className="font-baloo text-xl text-[#4A3F35]">TrickTask</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                isActive
                  ? "bg-[#FFD34E] cartoon-border text-[#4A3F35]"
                  : "text-[#A08D7A] hover:bg-[#FFD34E]/20"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-[#E85D5D] hover:bg-[#E85D5D]/10 rounded-xl transition-all text-sm font-semibold"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}