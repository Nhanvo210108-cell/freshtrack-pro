import { useState } from "react";
import { motion } from "framer-motion";
import { Snowflake, Lock, User as UserIcon, ArrowRight, AlertCircle } from "lucide-react";
import { api, setToken } from "../../lib/api";
import type { User } from "../../types/freshtrack";

interface LoginViewProps {
  onSuccess: (user: User) => void;
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(username, password);
      setToken(data.access_token);
      onSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xs p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-sidebar text-white flex items-center justify-center">
            <Snowflake className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">FreshTrack</h1>
            <p className="text-xs text-slate-500">Cold-Chain Control Tower</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-slate-900 mb-1">Đăng nhập hệ thống</h2>
        <p className="text-sm text-slate-500 mb-6">
          Truy cập trung tâm giám sát nhiệt độ, khí Ethylene và điều phối chuỗi lạnh.
        </p>

        {error && (
          <div className="mb-5 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200/80 rounded-lg px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên đăng nhập</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                placeholder="admin hoặc staff"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-sidebar hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Đang xác thực..." : "Vào trung tâm điều hành"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
          <span>Admin: admin / admin123</span>
          <span>Staff: staff / staff123</span>
        </div>
      </motion.div>
    </div>
  );
}
