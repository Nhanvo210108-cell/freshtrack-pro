export type UserRole = "ADMIN" | "STAFF";

export interface User {
  username: string;
  full_name: string;
  role: UserRole;
}

export type ColdChainStatus =
  | "Đạt chuẩn"
  | "Cảnh báo chín cục bộ"
  | "Rủi ro cao"
  | "Chờ tín hiệu IoT";

export interface TelemetryPoint {
  id: number;
  vehicle_id: string;
  timestamp: string;
  location: string;
  temp_c: number;
  ethylene_ppm: number;
  rsl_hours: number;
  calc_status: ColdChainStatus;
}

export interface VehicleSummary {
  vehicle_id: string;
  device_id: string;
  plate_number: string;
  driver_name: string;
  route: string;
  cargo_type: string;
  msl_hours: number;
  status: string;
  latest_telemetry: Omit<TelemetryPoint, "id" | "vehicle_id"> | null;
}

export interface VehicleCreatePayload {
  vehicle_id: string;
  device_id: string;
  plate_number: string;
  driver_name: string;
  route: string;
  cargo_type: string;
  msl_hours: number;
}

export interface DispatchLog {
  id: number;
  vehicle_id: string;
  plate_number: string;
  operator_name: string;
  action_taken: string;
  note: string;
  timestamp: string;
}
