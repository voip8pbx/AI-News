import React from "react";
import {
  LayoutDashboard,
  Settings,
  Newspaper,
  Users,
  LogOut,
  Zap,
  Terminal,
  Tag,
  Sun,
  Moon
} from "lucide-react";
import { logoutUser } from "../../api/auth";
import { useNavigate } from "react-router-dom";

const Sidebar = ({ activeTab, setActiveTab, counts = {}, isDark, toggleTheme }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = "/login";
  };

  const menuItems = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { id: "content", label: "Articles", icon: <Newspaper size={18} /> },
    {
      id: "categories",
      label: "Categories",
      icon: <Tag size={18} />,
      badge: counts.categories
    },
    { id: "users", label: "Users", icon: <Users size={18} /> },
    {
      id: "ingestion",
      label: "Injection",
      icon: <Zap size={18} />,
      badge: counts.ingestion
    },
    { id: "cron-settings", label: "Cronjobs", icon: <Terminal size={18} /> },
    { id: "system-settings", label: "System", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="w-72 flex flex-col shrink-0 border-r border-border bg-paper transition-colors duration-300">

      {/* Brand Header & Theme Toggle */}
      <div className="flex items-center justify-between p-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/20 transition-transform hover:scale-105">
            <Terminal size={20} />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-ink">
            verbis<span className="text-accent italic">.</span>
          </h1>
        </div>

        {/* Simple Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-surface text-muted hover:text-accent transition-all active:scale-90"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Menu Groups */}
      <div className="space-y-8 flex-1 px-4">
        <div>
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4">
            Management
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-2xl
                    transition-all duration-200 group
                    ${isActive
                      ? "bg-accent/10 text-accent shadow-sm ring-1 ring-accent/10"
                      : "text-muted hover:bg-surface hover:text-ink"
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`transition-colors ${isActive ? "text-accent" : "group-hover:text-ink"}`}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-bold tracking-tight">
                      {item.label}
                    </span>
                  </div>

                  {item.badge > 0 && (
                    <span className={`
                      font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg
                      ${isActive ? "bg-accent text-white" : "bg-surface text-muted"}
                    `}>
                      {item.badge.toString().padStart(2, '0')}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User / Footer Section */}
      <div className="p-6 border-t border-border">
        <div className="flex items-center gap-3 p-3 bg-surface rounded-3xl mb-4 border border-border">
          <div className="h-9 w-9 bg-accent/10 rounded-full flex items-center justify-center text-accent font-black text-xs shadow-inner">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-black text-ink truncate">Admin User</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-muted hover:text-red-500 hover:bg-red-500/5 transition-all font-bold text-xs uppercase tracking-widest"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;