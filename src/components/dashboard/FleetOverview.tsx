import { motion } from "framer-motion";
import { Thermometer, Wind, Clock, MapPin, AlertTriangle, CheckCircle2, Radio } from "lucide-react";
import { cn } from "../../lib/utils";
import type { VehicleSummary } from "../../types/freshtrack";

interface FleetOverviewProps {
  vehicles: VehicleSummary[];
  onInspectVehicle: (vehicleId: string) => void;
}

function getStatusStyle(status?: string) {
  if (status === "Rủi ro cao") {
    return { badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
  }
  if (status === "Cảnh báo chín cục bộ") {
    return { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
  }
  if (status === "Đạt chuẩn") {
    return { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  }
  return { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
}

export function FleetOverview({ vehicles, onInspectVehicle }: FleetOverviewProps) {
  const highRisk = vehicles.filter((v) => v.latest_telemetry?.calc_status === "Rủi ro cao").length;
  const warning = vehicles.filter((v) => v.latest_telemetry?.calc_status === "Cảnh báo chín cục bộ").length;
  const healthy = vehicles.filter((v) => v.latest_telemetry?.calc_status === "Đạt chuẩn").length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Tổng xe đang hoạt động</div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900">{vehicles.length}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
            <span>Đạt chuẩn chuỗi lạnh</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900">{healthy}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-amber-700">
            <span>Cảnh báo chín cục bộ</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900">{warning}</div>
        </div>
        <div className="bg-white border border-red-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-red-700">
            <span>Rủi ro cao cần xử lý</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono text-red-600">{highRisk}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Trạng thái đội xe thời gian thực</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            Đồng bộ tự động mỗi 3 giây
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {vehicles.map((v) => {
            const t = v.latest_telemetry;
            const statusText = t?.calc_status || "Chờ tín hiệu IoT";
            const style = getStatusStyle(t?.calc_status);

            return (
              <motion.div
                key={v.vehicle_id}
                layout
                onClick={() => onInspectVehicle(v.vehicle_id)}
                className="bg-white border border-slate-200/80 hover:border-blue-400 rounded-xl p-6 shadow-xs transition cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-base font-semibold text-slate-900 group-hover:text-blue-600 transition">
                        {v.vehicle_id}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {v.plate_number}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {v.driver_name} · {v.cargo_type}
                    </p>
                  </div>

                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", style.badge)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                    {statusText}
                  </span>
                </div>

                {t ? (
                  <div className="grid grid-cols-3 gap-3 py-4 border-y border-slate-100">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                        <Thermometer className="w-3.5 h-3.5" /> Nhiệt độ
                      </div>
                      <div className="font-mono text-lg font-semibold text-slate-900">{t.temp_c}°C</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                        <Wind className="w-3.5 h-3.5" /> Ethylene
                      </div>
                      <div className="font-mono text-lg font-semibold text-slate-900">{t.ethylene_ppm} ppm</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                        <Clock className="w-3.5 h-3.5" /> RSL dự báo
                      </div>
                      <div className="font-mono text-lg font-semibold text-blue-600">{t.rsl_hours}h</div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 border-y border-slate-100">
                    Chưa nhận gói tin từ thiết bị <span className="font-mono">{v.device_id}</span>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {t?.location || v.route}
                  </span>
                  <span className="text-blue-600 font-medium shrink-0 group-hover:underline">
                    Xem biểu đồ →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
