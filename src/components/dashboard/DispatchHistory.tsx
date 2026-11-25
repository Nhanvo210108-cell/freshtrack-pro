import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "../../lib/api";
import type { DispatchLog } from "../../types/freshtrack";

export function DispatchHistory() {
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.getDispatchLogs(60).then(setLogs).catch(() => {});
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.downloadReportCsv();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Nhật ký lệnh điều phối</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận toàn bộ quyết định can thiệp chuỗi lạnh và người thực hiện.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer disabled:opacity-60 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{exporting ? "Đang xuất..." : "Xuất báo cáo CSV"}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2.5 pr-3 font-medium">Thời gian</th>
              <th className="py-2.5 px-3 font-medium">Mã xe</th>
              <th className="py-2.5 px-3 font-medium">Biển số</th>
              <th className="py-2.5 px-3 font-medium">Lệnh điều phối</th>
              <th className="py-2.5 px-3 font-medium">Người ra lệnh</th>
              <th className="py-2.5 pl-3 font-medium">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Chưa có lệnh điều phối nào được ghi nhận.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="text-slate-700">
                  <td className="py-3 pr-3 font-mono text-[11px] text-slate-500">
                    {new Date(log.timestamp).toLocaleString("vi-VN")}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-900">{log.vehicle_id}</td>
                  <td className="py-3 px-3 font-mono">{log.plate_number}</td>
                  <td className="py-3 px-3 font-medium text-blue-700">{log.action_taken}</td>
                  <td className="py-3 px-3">{log.operator_name}</td>
                  <td className="py-3 pl-3 text-slate-500">{log.note || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
