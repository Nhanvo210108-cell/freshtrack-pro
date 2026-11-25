import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Send, CheckCircle2, MapPin, ShieldAlert } from "lucide-react";
import { api } from "../../lib/api";
import type { TelemetryPoint, VehicleSummary } from "../../types/freshtrack";

interface LiveMonitorProps {
  vehicles: VehicleSummary[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

const DISPATCH_ACTIONS = [
  "Mở van xả khí tươi & hạ nhiệt 10.5°C",
  "Ghé trạm phân loại gần nhất",
  "Hoán đổi đơn hàng với xe tuyến gần",
  "Chuyển tuyến về kho/nhà máy xử lý gấp",
];

export function LiveMonitor({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
}: LiveMonitorProps) {
  const activeVehicle =
    vehicles.find((v) => v.vehicle_id === selectedVehicleId) || vehicles[0] || null;

  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [sendingAction, setSendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!activeVehicle) return;
    let mounted = true;

    const load = () => {
      api
        .getTelemetry(activeVehicle.vehicle_id, 35)
        .then((rows) => {
          if (mounted) setHistory(rows);
        })
        .catch(() => {});
    };

    load();
    const id = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [activeVehicle?.vehicle_id]);

  if (!activeVehicle) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center text-sm text-slate-500">
        Chưa có phương tiện nào. Hãy vào mục <strong>Quản lý đội xe</strong> để thêm xe.
      </div>
    );
  }

  const latest = history[history.length - 1] || null;
  const chartData = history.map((pt, idx) => ({
    index: idx + 1,
    time: new Date(pt.timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    temp_c: pt.temp_c,
    ethylene_ppm: pt.ethylene_ppm,
    rsl_hours: pt.rsl_hours,
    location: pt.location,
  }));

  const handleDispatch = async (action: string) => {
    setSendingAction(action);
    setFeedback(null);
    try {
      await api.createDispatch(
        activeVehicle.vehicle_id,
        action,
        customNote.trim() || `Vị trí: ${latest?.location || activeVehicle.route}`
      );
      setCustomNote("");
      setFeedback(`Đã ghi nhận lệnh: "${action}"`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Không thể gửi lệnh");
    } finally {
      setSendingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{latest?.location || activeVehicle.route}</span>
            <span>•</span>
            <span>Tài xế: <strong className="text-slate-700 font-medium">{activeVehicle.driver_name}</strong></span>
            <span>•</span>
            <span>Hàng: <strong className="text-slate-700 font-medium">{activeVehicle.cargo_type}</strong></span>
          </div>
          <div className="text-sm font-medium text-slate-800">
            Trạng thái hiện tại:{" "}
            <span className="font-mono text-blue-600">
              {latest?.calc_status || "Chờ tín hiệu IoT"}
            </span>
          </div>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Chọn xe giám sát
          </label>
          <select
            value={activeVehicle.vehicle_id}
            onChange={(e) => onSelectVehicle(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-600"
          >
            {vehicles.map((v) => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.vehicle_id} ({v.plate_number} · {v.device_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5">
          <div className="text-xs text-slate-500">Tuổi thọ còn lại (RSL)</div>
          <div className="mt-2 text-2xl font-semibold font-mono text-blue-600">
            {latest ? `${latest.rsl_hours}h` : "--"}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Ngưỡng MSL: {activeVehicle.msl_hours}h</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5">
          <div className="text-xs text-slate-500">Nhiệt độ thùng lạnh</div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900">
            {latest ? `${latest.temp_c}°C` : "--"}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Chuẩn an toàn: ít hơn 13.5°C</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5">
          <div className="text-xs text-slate-500">Nồng độ Ethylene</div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900">
            {latest ? `${latest.ethylene_ppm} ppm` : "--"}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Cảnh báo chín: từ 3.0 ppm</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5">
          <div className="text-xs text-slate-500">Số mẫu đã ghi nhận</div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900">
            {history.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Thiết bị: {activeVehicle.device_id}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">
            Biến thiên Nhiệt độ (°C) & Ethylene (ppm)
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    borderColor: "#E2E8F0",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="temp_c"
                  name="Nhiệt độ (°C)"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ethylene_ppm"
                  name="Ethylene (ppm)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">
            Dự báo RSL còn lại (giờ)
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    borderColor: "#E2E8F0",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={48}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{ value: "Mức 48h", position: "insideTopRight", fontSize: 11, fill: "#D97706" }}
                />
                <Area
                  type="monotone"
                  dataKey="rsl_hours"
                  name="RSL (giờ)"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.14}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>Phát lệnh điều phối</span>
          </div>

          {feedback && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Ghi chú thêm cho tài xế / trạm (tùy chọn)..."
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />

          <div className="space-y-2">
            {DISPATCH_ACTIONS.map((action) => (
              <button
                key={action}
                disabled={sendingAction !== null}
                onClick={() => handleDispatch(action)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/80 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                <span>{sendingAction === action ? "Đang gửi lệnh..." : action}</span>
                <Send className="w-3.5 h-3.5 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-900 mb-3">
            Lịch sử gói tin gần nhất
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Thời gian</th>
                  <th className="py-2 px-3 font-medium">Vị trí</th>
                  <th className="py-2 px-3 font-medium font-mono">Nhiệt</th>
                  <th className="py-2 px-3 font-medium font-mono">C2H4</th>
                  <th className="py-2 px-3 font-medium font-mono">RSL</th>
                  <th className="py-2 pl-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...history].reverse().slice(0, 8).map((row) => (
                  <tr key={row.id} className="text-slate-700">
                    <td className="py-2 pr-3 font-mono text-[11px] text-slate-500">
                      {new Date(row.timestamp).toLocaleTimeString("vi-VN")}
                    </td>
                    <td className="py-2 px-3">{row.location}</td>
                    <td className="py-2 px-3 font-mono">{row.temp_c}°C</td>
                    <td className="py-2 px-3 font-mono">{row.ethylene_ppm}</td>
                    <td className="py-2 px-3 font-mono text-blue-600 font-medium">{row.rsl_hours}h</td>
                    <td className="py-2 pl-3">{row.calc_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
