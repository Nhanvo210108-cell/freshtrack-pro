import csv
import io
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import numpy as np
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestRegressor
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, create_engine, desc
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# ==========================================
# 1. CẤU HÌNH HỆ THỐNG & DATABASE
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'freshtrack.db')}")
JWT_SECRET = os.getenv("JWT_SECRET", "freshtrack-prod-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# 2. LƯỢC ĐỒ CƠ SỞ DỮ LIỆU (SQLALCHEMY)
# ==========================================
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="STAFF")  # ADMIN | STAFF
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class VehicleDB(Base):
    __tablename__ = "vehicles"
    vehicle_id = Column(String, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True, nullable=False)
    plate_number = Column(String, nullable=False)
    driver_name = Column(String, nullable=False)
    route = Column(String, nullable=False)
    cargo_type = Column(String, default="Chuối xuất khẩu")
    msl_hours = Column(Float, default=72.0)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TelemetryDB(Base):
    __tablename__ = "telemetry"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String, ForeignKey("vehicles.vehicle_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    location = Column(String, default="Đang cập nhật")
    temp_c = Column(Float, nullable=False)
    ethylene_ppm = Column(Float, nullable=False)
    rsl_hours = Column(Float, nullable=False)
    calc_status = Column(String, nullable=False)


class DispatchLogDB(Base):
    __tablename__ = "dispatch_logs"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String, ForeignKey("vehicles.vehicle_id"), index=True, nullable=False)
    plate_number = Column(String, nullable=False)
    operator_name = Column(String, nullable=False)
    action_taken = Column(String, nullable=False)
    note = Column(String, default="")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


Base.metadata.create_all(bind=engine)

# ==========================================
# 3. MÔ HÌNH AI DỰ BÁO RSL (NHIỆT ĐỘ + ETHYLENE)
# ==========================================
def train_rsl_model():
    rng = np.random.default_rng(42)
    temps = rng.uniform(10.0, 25.0, 600)
    eths = rng.uniform(0.5, 15.0, 600)
    X = np.column_stack([temps, eths])
    y = np.clip(96.0 - (temps - 12.0) * 4.2 - eths * 4.8, 2.0, 96.0)
    model = RandomForestRegressor(n_estimators=40, max_depth=8, random_state=42)
    model.fit(X, y)
    return model

RSL_MODEL = train_rsl_model()

def evaluate_cold_chain(temp_c: float, ethylene_ppm: float, msl_hours: float):
    rsl = float(RSL_MODEL.predict([[temp_c, ethylene_ppm]])[0])
    rsl = round(min(rsl, msl_hours), 1)
    if temp_c >= 15.5 or ethylene_ppm >= 6.0 or rsl < 24.0:
        calc_status = "Rủi ro cao"
    elif temp_c >= 13.5 or ethylene_ppm >= 3.0 or rsl < 48.0:
        calc_status = "Cảnh báo chín cục bộ"
    else:
        calc_status = "Đạt chuẩn"
    return rsl, calc_status

# ==========================================
# 4. BẢO MẬT (BCRYPT & JWT)
# ==========================================
security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user: UserDB) -> str:
    payload = {
        "sub": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserDB:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập hết hạn")
    user = db.query(UserDB).filter(UserDB.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tài khoản không tồn tại")
    return user

def seed_default_data():
    db = SessionLocal()
    try:
        if not db.query(UserDB).filter(UserDB.username == "admin").first():
            db.add(UserDB(username="admin", password_hash=hash_password("admin123"), full_name="Quản trị viên Hệ thống", role="ADMIN"))
        if not db.query(UserDB).filter(UserDB.username == "staff").first():
            db.add(UserDB(username="staff", password_hash=hash_password("staff123"), full_name="Điều phối viên Chuỗi lạnh", role="STAFF"))
        db.commit()
    finally:
        db.close()

seed_default_data()

# ==========================================
# 5. SCHEMAS (PYDANTIC)
# ==========================================
class LoginRequest(BaseModel):
    username: str
    password: str

class VehicleCreate(BaseModel):
    vehicle_id: str = Field(..., min_length=2)
    device_id: str = Field(..., min_length=2)
    plate_number: str = Field(..., min_length=4)
    driver_name: str = Field(..., min_length=2)
    route: str = Field(..., min_length=3)
    cargo_type: str = "Chuối xuất khẩu"
    msl_hours: float = Field(72.0, gt=0)

class TelemetryIn(BaseModel):
    device_id: str
    temp_c: float
    ethylene_ppm: float
    location: str = "Đang di chuyển"

class DispatchCreate(BaseModel):
    vehicle_id: str
    action_taken: str
    note: str = ""

# ==========================================
# 6. API ROUTES
# ==========================================
app = FastAPI(title="FreshTrack Cold-Chain API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")
    return {
        "access_token": create_token(user),
        "token_type": "bearer",
        "user": {"username": user.username, "full_name": user.full_name, "role": user.role},
    }

@app.get("/api/auth/me")
def get_me(current_user: UserDB = Depends(get_current_user)):
    return {"username": current_user.username, "full_name": current_user.full_name, "role": current_user.role}

@app.get("/api/vehicles")
def list_vehicles(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    vehicles = db.query(VehicleDB).order_by(desc(VehicleDB.created_at)).all()
    results = []
    for v in vehicles:
        latest = (
            db.query(TelemetryDB)
            .filter(TelemetryDB.vehicle_id == v.vehicle_id)
            .order_by(desc(TelemetryDB.timestamp))
            .first()
        )
        results.append({
            "vehicle_id": v.vehicle_id,
            "device_id": v.device_id,
            "plate_number": v.plate_number,
            "driver_name": v.driver_name,
            "route": v.route,
            "cargo_type": v.cargo_type,
            "msl_hours": v.msl_hours,
            "status": v.status,
            "latest_telemetry": {
                "timestamp": latest.timestamp.isoformat(),
                "location": latest.location,
                "temp_c": latest.temp_c,
                "ethylene_ppm": latest.ethylene_ppm,
                "rsl_hours": latest.rsl_hours,
                "calc_status": latest.calc_status,
            } if latest else None,
        })
    return results

@app.post("/api/vehicles", status_code=201)
def create_vehicle(req: VehicleCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if db.query(VehicleDB).filter((VehicleDB.vehicle_id == req.vehicle_id) | (VehicleDB.device_id == req.device_id)).first():
        raise HTTPException(status_code=400, detail="Mã xe hoặc mã thiết bị IoT đã tồn tại")
    vehicle = VehicleDB(**req.model_dump())
    db.add(vehicle)
    db.commit()
    return {"message": "Đăng ký xe thành công", "vehicle_id": vehicle.vehicle_id}

@app.delete("/api/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới có quyền xóa xe")
    vehicle = db.query(VehicleDB).filter(VehicleDB.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Không tìm thấy xe")
    db.query(TelemetryDB).filter(TelemetryDB.vehicle_id == vehicle_id).delete()
    db.query(DispatchLogDB).filter(DispatchLogDB.vehicle_id == vehicle_id).delete()
    db.delete(vehicle)
    db.commit()
    return {"message": "Đã xóa xe khỏi hệ thống"}

@app.post("/api/iot/telemetry")
def ingest_telemetry(data: TelemetryIn, db: Session = Depends(get_db)):
    vehicle = db.query(VehicleDB).filter(VehicleDB.device_id == data.device_id, VehicleDB.status == "ACTIVE").first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Thiết bị {data.device_id} chưa được gán cho xe nào")
    rsl, calc_status = evaluate_cold_chain(data.temp_c, data.ethylene_ppm, vehicle.msl_hours)
    point = TelemetryDB(
        vehicle_id=vehicle.vehicle_id,
        location=data.location,
        temp_c=data.temp_c,
        ethylene_ppm=data.ethylene_ppm,
        rsl_hours=rsl,
        calc_status=calc_status,
    )
    db.add(point)
    db.commit()
    return {"status": "ok", "vehicle_id": vehicle.vehicle_id, "rsl_hours": rsl, "calc_status": calc_status}

@app.get("/api/vehicles/{vehicle_id}/telemetry")
def get_vehicle_telemetry(vehicle_id: str, limit: int = 40, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    rows = (
        db.query(TelemetryDB)
        .filter(TelemetryDB.vehicle_id == vehicle_id)
        .order_by(desc(TelemetryDB.timestamp))
        .limit(limit)
        .all()
    )
    rows.reverse()
    return [
        {
            "id": r.id,
            "vehicle_id": r.vehicle_id,
            "timestamp": r.timestamp.isoformat(),
            "location": r.location,
            "temp_c": r.temp_c,
            "ethylene_ppm": r.ethylene_ppm,
            "rsl_hours": r.rsl_hours,
            "calc_status": r.calc_status,
        }
        for r in rows
    ]

@app.get("/api/dispatch")
def list_dispatch_logs(limit: int = 50, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    logs = db.query(DispatchLogDB).order_by(desc(DispatchLogDB.timestamp)).limit(limit).all()
    return [
        {
            "id": l.id,
            "vehicle_id": l.vehicle_id,
            "plate_number": l.plate_number,
            "operator_name": l.operator_name,
            "action_taken": l.action_taken,
            "note": l.note,
            "timestamp": l.timestamp.isoformat(),
        }
        for l in logs
    ]

@app.post("/api/dispatch", status_code=201)
def create_dispatch_log(req: DispatchCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    vehicle = db.query(VehicleDB).filter(VehicleDB.vehicle_id == req.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Không tìm thấy xe")
    log = DispatchLogDB(
        vehicle_id=vehicle.vehicle_id,
        plate_number=vehicle.plate_number,
        operator_name=current_user.full_name,
        action_taken=req.action_taken,
        note=req.note,
    )
    db.add(log)
    db.commit()
    return {"message": "Đã phát lệnh điều phối thành công", "id": log.id}

@app.get("/api/reports/export")
def export_telemetry_csv(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    rows = db.query(TelemetryDB).order_by(desc(TelemetryDB.timestamp)).limit(500).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Ma Xe", "Thoi Gian", "Vi Tri", "Nhiet Do (C)", "Ethylene (ppm)", "RSL (Gio)", "Trang Thai"])
    for r in rows:
        writer.writerow([r.id, r.vehicle_id, r.timestamp.isoformat(), r.location, r.temp_c, r.ethylene_ppm, r.rsl_hours, r.calc_status])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=freshtrack_report.csv"},
    )

# ==========================================
# 7. PHỤC VỤ GIAO DIỆN WEB KHI ĐÓNG GÓI (PRODUCTION)
# ==========================================
DIST_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))
if os.path.isdir(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
