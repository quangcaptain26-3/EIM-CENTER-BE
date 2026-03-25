import * as dotenv from "dotenv";

// Nạp các biến môi trường từ file .env
dotenv.config();

// Các biến môi trường cần thiết
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || "3000";
const DATABASE_URL = process.env.DATABASE_URL || "";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "secret";
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const ATTENDANCE_WARNING_THRESHOLD = parseInt(process.env.ATTENDANCE_WARNING_THRESHOLD || "3", 10);

// Bắt lỗi nếu thiếu các biến môi trường quan trọng
if (!PORT) {
  throw new Error("Thiếu biến môi trường PORT");
}
if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("Thiếu cấu hình JWT secret trong biến môi trường");
}

export const env = {
  NODE_ENV,
  PORT: parseInt(PORT, 10),
  DATABASE_URL,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  ATTENDANCE_WARNING_THRESHOLD,
};
