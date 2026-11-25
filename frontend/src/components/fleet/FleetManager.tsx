import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type { User, VehicleCreatePayload, VehicleSummary } from "../../types/freshtrack";

interface FleetManagerProps {
  vehicles: VehicleSummary[];
  user: User;
  onRefresh: () => void;
}

const INITIAL_FORM: VehicleCreatePayload = {
  vehicle_id: "",
  device_id: "",
  plate_number: "",
  driver_name: "",
  route: "",
  cargo_type: "Chuối xuất khẩu",
  msl_hours: 72,
};

export function FleetManager({ vehicles, user, onRefresh }: FleetManagerProps) {
  const [form, setForm] = useState<VehicleCreatePayload>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isAdmin = user.role === "ADMIN";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.createVehicle({ ...form, msl_hours: Number(form.msl_hours) });
      setForm(INITIAL_FORM);
      setMessage({ type: "ok", text: "Đã đăng ký phương tiện và gán thiết bị IoT thành công." });
      onRefresh();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : "Không thể đăng ký xe",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    setMessage(null);
    try {
      await api.deleteVehicle(vehicleId);
      setMessage({ type: "ok", text: `Đã xóa xe ${vehicleId}.` });
      onRefresh();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : "Không thể xóa xe",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-6 h-fit">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Đăng ký xe & thiết bị IoT</h2>
        <p className="text-xs text-slate-500 mb-5">
          Gắn mã thiết bị cảm biến vào chuyến xe mới để bắt đầu nhận dữ liệu.
        </p>

        {message && (
          <div
            className={`mb-4 text-xs px-3.5 py-2.5 rounded-lg border ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mã xe</label>
              <input
                required
                value={form.vehicle_id}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                placeholder="VD: XE-09"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mã thiết bị IoT</label>
              <input
                required
                value={form.device_id}
                onChange={(e) => setForm({ ...form, device_id: e.target.value })}
                placeholder="VD: HUB-09"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Biển số</label>
              <input
                required
                value={form.plate_number}
                onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
                placeholder="VD: 51C-456.78"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Ngưỡng MSL (giờ)</label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={form.msl_hours}
                onChange={(e) => setForm({ ...form, msl_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tài xế phụ trách</label>
            <input
              required
              value={form.driver_name}
              onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
              placeholder="Họ và tên tài xế"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tuyến đường</label>
            <input
              required
              value={form.route}
              onChange={(e) => setForm({ ...form, route: e.target.value })}
              placeholder="VD: Tiền Giang - Hà Nội"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Loại hàng hóa</label>
            <input
              required
              value={form.cargo_type}
              onChange={(e) => setForm({ ...form, cargo_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? "Đang lưu..." : "Thêm phương tiện"}</span>
          </button>
        </form>
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Danh sách phương tiện ({vehicles.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-3 font-medium">Mã xe</th>
                <th className="py-2.5 px-3 font-medium">Biển số</th>
                <th className="py-2.5 px-3 font-medium">IoT</th>
                <th className="py-2.5 px-3 font-medium">Tài xế</th>
                <th className="py-2.5 px-3 font-medium">Tuyến</th>
                <th className="py-2.5 px-3 font-medium font-mono">MSL</th>
                {isAdmin && <th className="py-2.5 pl-3 font-medium text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.vehicle_id} className="text-slate-700">
                  <td className="py-3 pr-3 font-mono font-semibold text-slate-900">{v.vehicle_id}</td>
                  <td className="py-3 px-3 font-mono">{v.plate_number}</td>
                  <td className="py-3 px-3 font-mono text-blue-600">{v.device_id}</td>
                  <td className="py-3 px-3">{v.driver_name}</td>
                  <td className="py-3 px-3 text-slate-500">{v.route}</td>
                  <td className="py-3 px-3 font-mono">{v.msl_hours}h</td>
                  {isAdmin && (
                    <td className="py-3 pl-3 text-right">
                      <button
                        onClick={() => handleDelete(v.vehicle_id)}
                        title="Xóa xe"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
