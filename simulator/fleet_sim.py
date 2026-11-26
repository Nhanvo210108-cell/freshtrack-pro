import time
import random
import urllib.request
import json

ENDPOINT = "https://freshtrack-pro-ws6d.onrender.com/api/iot/telemetry"

DEVICES = [
    {"device_id": "HUB-00", "temp": 4.0, "hum": 88.0, "eth": 0.35, "co2": 750.0, "lat": 11.9404, "lng": 108.4583, "drift": 0.02},
    {"device_id": "HUB-23", "temp": 6.5, "hum": 82.0, "eth": 0.90, "co2": 1100.0, "lat": 20.4388, "lng": 106.1621, "drift": 0.12}
]

print(f"Đang gửi dữ liệu tới: {ENDPOINT}")
while True:
    for d in DEVICES:
        d["temp"] = round(d["temp"] + random.uniform(-0.15, d["drift"]), 2)
        d["hum"] = round(min(98.0, max(70.0, d["hum"] + random.uniform(-0.5, 0.5))), 1)
        d["eth"] = round(max(0.1, d["eth"] + random.uniform(0.01, 0.05)), 2)
        d["co2"] = round(d["co2"] + random.uniform(-10, 25), 1)
        d["lat"] = round(d["lat"] + random.uniform(0.001, 0.003), 5)
        d["lng"] = round(d["lng"] + random.uniform(0.001, 0.003), 5)

        data = json.dumps({
            "device_id": d["device_id"],
            "temp_c": d["temp"],
            "humidity": d["hum"],
            "ethylene_ppm": d["eth"],
            "co2": d["co2"],
            "lat": d["lat"],
            "lng": d["lng"]
        }).encode("utf-8")

        req = urllib.request.Request(ENDPOINT, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                print(f"[{d['device_id']}] {res.status} OK -> {res.read().decode()}")
        except Exception as e:
            print(f"[{d['device_id']}] Lỗi: {e}")
    time.sleep(3)
