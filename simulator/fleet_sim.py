import math
import random
import time
import requests

BASE_URL = "http://127.0.0.1:8000"
TELEMETRY_URL = f"{BASE_URL}/api/iot/telemetry"

ROUTES = [
    "Kho lạnh Tiền Giang",
    "Cao tốc TP.HCM - Long Thành",
    "Trạm dừng Dầu Giây",
    "Quốc lộ 1A - Phan Thiết",
    "Đèo Hải Vân - Đà Nẵng",
    "Kho trung chuyển Hà Nội",
]

def get_token():
    try:
        res = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=5,
        )
        if res.status_code == 200:
            return res.json().get("access_token")
    except requests.RequestException:
        return None
    return None

def get_active_devices(token: str):
    try:
        res = requests.get(
            f"{BASE_URL}/api/vehicles",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        if res.status_code == 200:
            return [v for v in res.json() if v.get("status") == "ACTIVE"]
    except requests.RequestException:
        return []
    return []

def run():
    print("Đang kết nối FreshTrack API tại http://127.0.0.1:8000...")
    step = 0
    token = None

    while True:
        if not token:
            token = get_token()
            if not token:
                print("Chưa kết nối được Backend. Thử lại sau 3s...")
                time.sleep(3)
                continue

        vehicles = get_active_devices(token)
        if not vehicles:
            print("Chưa có xe ACTIVE nào. Đang chờ...")
            time.sleep(3)
            continue

        step += 1
        for idx, v in enumerate(vehicles):
            phase = (step + idx * 5) % 24
            location = ROUTES[(step // 3 + idx) % len(ROUTES)]

            if phase < 8:
                temp_c = round(12.0 + 0.35 * math.sin(phase) + random.uniform(-0.1, 0.1), 1)
                ethylene_ppm = round(1.1 + phase * 0.14 + random.uniform(-0.05, 0.05), 2)
            elif phase < 16:
                temp_c = round(13.2 + random.uniform(-0.25, 0.35), 1)
                ethylene_ppm = round(3.2 + (phase - 8) * 0.32, 2)
            else:
                temp_c = round(15.6 + (phase - 16) * 0.5, 1)
                ethylene_ppm = round(6.2 + (phase - 16) * 0.45, 2)

            payload = {
                "device_id": v["device_id"],
                "temp_c": temp_c,
                "ethylene_ppm": ethylene_ppm,
                "location": location,
            }

            try:
                r = requests.post(TELEMETRY_URL, json=payload, timeout=5)
                if r.status_code == 200:
                    info = r.json()
                    print(
                        f"[{v['vehicle_id']} | {v['device_id']}] {location} | "
                        f"{temp_c}°C | C2H4: {ethylene_ppm} ppm -> RSL: {info['rsl_hours']}h ({info['calc_status']})"
                    )
                elif r.status_code == 401:
                    token = None
            except requests.RequestException as e:
                print(f"[Lỗi gửi tín hiệu] {e}")

        time.sleep(3)

if __name__ == "__main__":
    run()
