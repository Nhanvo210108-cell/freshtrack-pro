import { useCallback, useEffect, useState } from "react";
import { api, clearToken, getToken } from "./lib/api";
import type { User, VehicleSummary } from "./types/freshtrack";
import { LoginView } from "./components/auth/LoginView";
import { Sidebar, type NavTab } from "./components/layout/Sidebar";
import { FleetOverview } from "./components/dashboard/FleetOverview";
import { LiveMonitor } from "./components/dashboard/LiveMonitor";
import { FleetManager } from "./components/fleet/FleetManager";
import { DispatchHistory } from "./components/dashboard/DispatchHistory";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setCheckingAuth(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setCheckingAuth(false));
  }, []);

  const fetchVehicles = useCallback(() => {
    api
      .getVehicles()
      .then((data) => {
        setVehicles(data);
        setSelectedVehicleId((prev) => prev || data[0]?.vehicle_id || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchVehicles();
    const timer = setInterval(fetchVehicles, 3000);
    return () => clearInterval(timer);
  }, [user, fetchVehicles]);

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  const handleInspectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setActiveTab("live");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-sm text-slate-500">
        Đang tải hệ thống...
      </div>
    );
  }

  if (!user) {
    return <LoginView onSuccess={setUser} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {activeTab === "overview" && "Tổng quan đội xe"}
            {activeTab === "live" &&
              `Giám sát chi tiết${selectedVehicleId ? ` — ${selectedVehicleId}` : ""}`}
            {activeTab === "fleet" && "Quản lý đội xe & thiết bị IoT"}
            {activeTab === "logs" && "Nhật ký điều phối & Báo cáo"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Trung tâm giám sát chuỗi lạnh nông sản theo thời gian thực
          </p>
        </header>

        {activeTab === "overview" && (
          <FleetOverview vehicles={vehicles} onInspectVehicle={handleInspectVehicle} />
        )}

        {activeTab === "live" && (
          <LiveMonitor
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
          />
        )}

        {activeTab === "fleet" && (
          <FleetManager vehicles={vehicles} user={user} onRefresh={fetchVehicles} />
        )}

        {activeTab === "logs" && <DispatchHistory />}
      </main>
    </div>
  );
}
