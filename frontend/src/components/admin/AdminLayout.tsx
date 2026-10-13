import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Languages,
  GraduationCap,
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  Shield,
  Image,
  FileUp,
  Cpu,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/ads", label: "Ads", icon: Megaphone, badge: "New" },
  { path: "/admin/ai-models", label: "AI Models", icon: Cpu },
  { path: "/admin/ai-prompts", label: "AI Prompt Limits", icon: Sparkles },
  { path: "/admin/life-skills", label: "Life Skills", icon: MessageSquare },
  { path: "/admin/stories", label: "Stories", icon: BookOpen },
  { path: "/admin/languages", label: "Languages", icon: Languages },
  { path: "/admin/lessons", label: "Lessons", icon: GraduationCap },
  { path: "/admin/media", label: "Media Library", icon: Image },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, badge: "Hot" },
  { path: "/admin/payments", label: "Payments", icon: DollarSign },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/import-history", label: "Import History", icon: FileUp },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`admin-shell ${darkMode ? "dark" : ""}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700;800&display=swap');
        
        .admin-shell {
          display: flex;
          min-height: 100vh;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        
        .admin-shell h1,
        .admin-shell h2,
        .admin-shell h3,
        .admin-shell h4,
        .admin-shell h5,
        .admin-shell h6 {
          font-family: 'Baloo 2', cursive !important;
          font-weight: 800 !important;
        }

        .admin-sidebar {
          background: linear-gradient(180deg, #2E2270 0%, #1A1040 100%);
          color: #f1f5f9;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          transition: width 0.2s ease;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .admin-sidebar nav,
        .admin-sidebar-nav {
          scrollbar-width: none !important; /* Firefox */
          -ms-overflow-style: none !important; /* IE and Edge */
        }

        .admin-sidebar nav::-webkit-scrollbar,
        .admin-sidebar-nav::-webkit-scrollbar {
          display: none !important; /* Chrome, Safari, Opera */
          width: 0 !important;
          height: 0 !important;
        }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .admin-topbar {
          background: hsla(0, 0%, 100%, 0.6) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.4);
          height: 64px;
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .admin-shell.dark .admin-topbar {
          background: rgba(26, 21, 60, 0.6) !important;
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .admin-shell.dark .admin-content {
          background: hsl(var(--background));
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 8px 14px;
          margin-bottom: 2px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: rgba(255, 255, 255, 0.65);
          text-decoration: none;
          white-space: nowrap;
          position: relative;
        }

        .admin-nav-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .admin-nav-item.active {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .admin-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 60%;
          background: linear-gradient(180deg, hsl(var(--accent)), hsl(var(--secondary)));
          border-radius: 0 4px 4px 0;
        }

        .admin-content {
          flex: 1;
          padding: 32px;
          background: hsl(var(--background));
          min-height: calc(100vh - 64px);
        }

        /* Styling overrides to align all page contents with the site palette */
        .admin-shell table {
          font-family: 'Nunito', sans-serif !important;
        }

        .admin-shell thead tr {
          background: rgba(0, 0, 0, 0.02) !important;
        }
        .admin-shell.dark thead tr {
          background: rgba(255, 255, 255, 0.02) !important;
        }

        .admin-shell table th {
          font-family: 'Baloo 2', cursive !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          color: hsl(var(--foreground)) !important;
          opacity: 0.8;
        }

        .admin-shell tbody tr {
          transition: background-color 0.15s ease;
        }

        .admin-shell tbody tr:hover {
          background-color: rgba(255, 255, 255, 0.4) !important;
        }
        .admin-shell.dark tbody tr:hover {
          background-color: rgba(255, 255, 255, 0.03) !important;
        }

        /* Override generic white cards and lists to look glassmorphic */
        .admin-shell .admin-content div[style*="background: white"],
        .admin-shell .admin-content div[style*="background: rgb(255, 255, 255)"],
        .admin-shell .admin-content div[style*="background: #fff"] {
          background: hsla(0, 0%, 100%, 0.65) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-color: rgba(255, 255, 255, 0.4) !important;
          border-radius: 1.5rem !important;
          box-shadow: 0 10px 30px rgba(31, 38, 135, 0.04) !important;
        }

        .admin-shell.dark .admin-content div[style*="background: white"],
        .admin-shell.dark .admin-content div[style*="background: rgb(255, 255, 255)"],
        .admin-shell.dark .admin-content div[style*="background: #fff"] {
          background: rgba(26, 21, 60, 0.4) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
        }

        /* Subscriptions filter list */
        .admin-shell div[style*="background: #f1f5f9"],
        .admin-shell div[style*="background: rgb(241, 245, 249)"] {
          background: rgba(0, 0, 0, 0.04) !important;
          border-radius: 1rem !important;
        }
        .admin-shell.dark div[style*="background: #f1f5f9"],
        .admin-shell.dark div[style*="background: rgb(241, 245, 249)"] {
          background: rgba(255, 255, 255, 0.05) !important;
        }

        /* Override primary button colors and gradients to fit brand style */
        .admin-shell button[style*="linear-gradient"],
        .admin-shell div[style*="linear-gradient(135deg,#6366f1,#8b5cf6)"],
        .admin-shell div[style*="linear-gradient(135deg, #6366f1, #8b5cf6)"] {
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--lavender))) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 6px 18px -4px rgba(124, 92, 191, 0.4) !important;
        }
        
        .admin-shell button[style*="linear-gradient"]:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        /* Map hardcoded indigo icon/svg colors to primary theme colors */
        .admin-shell svg[color="#6366f1"] {
          color: hsl(var(--primary)) !important;
          stroke: hsl(var(--primary)) !important;
        }

        @media (max-width: 768px) {
          .admin-content { padding: 16px; }
        }
      `}</style>

      {/* Sidebar */}
      <motion.div
        className="admin-sidebar"
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--secondary)))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={18} color="white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "white", fontFamily: "'Baloo 2', cursive" }}>StoryNest</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Shield size={10} /> Admin Panel
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="admin-sidebar-nav" style={{ flex: 1, padding: "8px 6px", overflowY: "auto", overflowX: "hidden" }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`admin-nav-item ${active ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontSize: 14, flex: 1 }}>
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && item.badge && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white" }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="admin-nav-item"
            style={{ width: "100%", border: "none", background: "none" }}
          >
            {collapsed ? <ChevronRight size={18} style={{ flexShrink: 0 }} /> : <ChevronLeft size={18} style={{ flexShrink: 0 }} />}
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 14 }}>Collapse</motion.span>}
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="admin-main" style={{ marginLeft: collapsed ? 72 : 240, transition: "margin-left 0.2s ease" }}>
        {/* Top Bar */}
        <div className="admin-topbar">
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, maxWidth: 400 }}>
            <Search size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <input
              placeholder="Search users, stories, payments..."
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "inherit", width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </Button>

            <Button variant="ghost" size="icon" style={{ position: "relative" }}>
              <Bell size={16} />
              <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: "2px solid white" }} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 8px" }}>
                  <Avatar style={{ width: 32, height: 32 }}>
                    <AvatarFallback style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--lavender)))", color: "white", fontSize: 13, fontWeight: 700 }}>
                      {user?.name?.[0]?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || "Admin"}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Administrator</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} style={{ color: "#ef4444" }}>
                  <LogOut size={14} style={{ marginRight: 8 }} /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Page Content */}
        <motion.div
          className="admin-content"
          key={location.pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
