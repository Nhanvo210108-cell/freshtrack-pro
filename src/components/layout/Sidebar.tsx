import { LayoutGrid, Activity, Truck, ClipboardList, LogOut, Snowflake } from "lucide-react";
import { cn } from "../../lib/utils";
import type { User } from "../../types/freshtrack";

export type NavTab = "overview" | "live" | "fleet" | "logs";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: User;
  onLogout: () => void;
}

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Tổng quan đội xe", icon: LayoutGrid },
  { id: "live", label: "Giám sát chi tiết", icon: Activity },
  { id: "fleet", label: "Quản lý đội xe", icon: Truck },
  { id: "logs", label: "Nhật ký điều phối", icon: ClipboardList },
];

export function Sidebar({ activeTab, onSelectTab, user, onLogout }: SidebarProps) {
  return (
    <aside className="w-full md:w-64 shrink-0 bg-sidebar text-slate-300 flex flex-col border-b md:border-b-0 md:border-r border-slate-800/80 md:min-h-screen">
      <div className="h-16 px-6 flex items-center justify-between md:justify-start gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Snowflake className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">FreshTrack</div>
            <div className="text-[11px] text-slate-400">Control Tower v2.0</div>
          </div>
        </div>
      </div>

      <nav className="flex md:flex-col overflow-x-auto p-3 md:p-4 gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer whitespace-nowrap",
                active
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-sidebar-hover"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="hidden md:block p-4 border-t border-slate-800/80">
        <div className="px-3 py-2 mb-2 rounded-lg bg-slate-900/60">
          <div className="text-xs font-medium text-white truncate">{user.full_name}</div>
          <div className="text-[11px] text-slate-400 font-mono">{user.role}</div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
