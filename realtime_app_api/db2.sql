-- Tạo bảng stations
CREATE TABLE stations (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    status ENUM('active', 'inactive', 'error', 'maintenance') NOT NULL DEFAULT 'active',
    latitude FLOAT NOT NULL DEFAULT 0.0,
    longitude FLOAT NOT NULL DEFAULT 0.0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stations_status (status)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo bảng station_parameters
CREATE TABLE station_parameters (
    id VARCHAR(255) PRIMARY KEY,
    station_id INTEGER NOT NULL,
    parameter_type VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    INDEX idx_station_parameters_station_id (station_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo bảng weather_data
CREATE TABLE weather_data (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    station_id INTEGER NOT NULL,
    parameter_type VARCHAR(50) NOT NULL,
    value FLOAT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    INDEX idx_weather_data_station_id (station_id),
    INDEX idx_weather_data_parameter_type (parameter_type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo bảng thresholds
CREATE TABLE thresholds (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    parameter_type VARCHAR(50) NOT NULL,
    min_value FLOAT,
    max_value FLOAT,
    level VARCHAR(20) NOT NULL,
    message VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    combined_conditions VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT valid_parameter_type CHECK (parameter_type REGEXP '^[a-zA-Z_]+$'),
    INDEX idx_thresholds_parameter_type (parameter_type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo bảng alerts
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    station_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    message VARCHAR(255),
    value FLOAT,
    level VARCHAR(50) NOT NULL,
    action VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_reminder BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    INDEX idx_alerts_station_id (station_id),
    INDEX idx_alerts_type (type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo bảng notification_logs
CREATE TABLE notification_logs (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    station_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    INDEX idx_notification_logs_station_id (station_id),
    INDEX idx_notification_logs_type (type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;



-- Chèn dữ liệu vào bảng stations
INSERT INTO stations (id, name, location, status, latitude, longitude, created_at, updated_at)
VALUES 
    (1, 'Trạm Cầu Giấy', 'Cầu Giấy, Hà Nội', 'active', 21.0362, 105.7900, NOW(), NOW()),
    (6, 'Trạm Đại học Tài nguyên và Môi trường', 'Số 41A Phú Diễn, Bắc Từ Liêm, Hà Nội', 'active', 21.0585, 105.7460, NOW(), NOW());

-- Chèn dữ liệu vào bảng station_parameters
INSERT INTO station_parameters (id, station_id, parameter_type, unit, created_at, updated_at)
VALUES
    ('param_temp_6', 6, 'temperature', '°C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('param_hum_6', 6, 'humidity', '%', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('param_wind_6', 6, 'wind', 'm/s', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('param_rain_6', 6, 'rainfall', 'mm/h', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('param_temp_1', 1, 'temperature', '°C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('param_wind_1', 1, 'wind', 'm/s', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Chèn dữ liệu vào bảng weather_data
INSERT INTO weather_data (station_id, parameter_type, value, created_at)
VALUES 
    (6, 'temperature', 25.5, CURRENT_TIMESTAMP),
    (6, 'humidity', 70.0, CURRENT_TIMESTAMP),
    (1, 'temperature', 15.0, CURRENT_TIMESTAMP),
    (1, 'wind', 5.2, CURRENT_TIMESTAMP);

-- Chèn dữ liệu vào bảng thresholds
INSERT INTO thresholds (parameter_type, min_value, max_value, level, message, action, combined_conditions, created_at, updated_at)
VALUES
    -- Mưa (mm/h)
    ('rainfall', 0, 10, 'Bình thường', 'Mưa nhỏ hoặc không mưa, không gây nguy hiểm', 'Không cần hành động đặc biệt', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rainfall', 10, 30, 'Nhẹ', 'Mưa vừa, có thể gây trơn trượt đường', 'Mang áo mưa, chú ý khi đi đường trơn', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rainfall', 30, 50, 'Trung bình', 'Mưa lớn cục bộ, nguy cơ ngập nhẹ ở nút giao, khu dân cư thấp', 'Theo dõi cảnh báo, tránh ra ngoài nếu không cần thiết', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rainfall', 50, 100, 'Nguy hiểm', 'Ngập úng đô thị, đặc biệt ở khu vực trũng (Cầu Giấy, Đống Đa)', 'Hạn chế di chuyển, tránh vùng trũng, cảnh giác ngập sâu', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rainfall', 100, NULL, 'Rất nguy hiểm cấp 4', 'Mưa cực lớn, nguy cơ lũ quét, sạt lở đất', 'Sơ tán khỏi khu vực nguy hiểm, liên hệ cơ quan chức năng (113, 115)', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Gió (m/s)
    ('wind', NULL, 8.0, 'Bình thường', 'Gió nhẹ, không gây nguy hiểm', 'Không cần hành động đặc biệt', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wind', 8.0, 13.8, 'Trung bình', 'Gió mạnh, có thể bật gốc cây yếu, gây mất lái xe máy', 'Cẩn thận khi đi xe máy, tránh dừng gần cây lớn', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wind', 13.9, NULL, 'Nguy hiểm', 'Gió mạnh, có thể làm đổ cây, bảng hiệu, mái tôn', 'Ở trong nhà, tránh đi dưới cây to, công trình yếu', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Gió giật (m/s)
    ('wind_gust', 17.2, NULL, 'Nguy hiểm', 'Gió giật mạnh, nguy cơ đổ cây, hư hỏng công trình', 'Ở trong nhà, gia cố công trình, theo dõi cảnh báo bão', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Nhiệt độ (°C)
    ('temperature', 15, 35, 'Bình thường', 'Nhiệt độ dễ chịu, không gây nguy hiểm', 'Không cần hành động đặc biệt', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('temperature', 35, 38, 'Trung bình', 'Nắng nóng, dễ gây mệt mỏi, mất nước', 'Hạn chế ra ngoài buổi trưa, đội mũ, uống đủ nước', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('temperature', 38, NULL, 'Nguy hiểm', 'Nắng nóng gay gắt, nguy cơ sốc nhiệt, đặc biệt với người lao động ngoài trời', 'Uống nhiều nước, ở nơi mát mẻ, tránh hoạt động ngoài trời', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('temperature', NULL, 15, 'Nguy hiểm', 'Lạnh sâu, nguy cơ đột quỵ cho người già, trẻ nhỏ', 'Mặc đủ ấm, không tắm khuya, theo dõi sức khỏe người có bệnh nền', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Độ ẩm (%)
    ('humidity', 40, 90, 'Bình thường', 'Độ ẩm ổn định, không gây nguy hiểm', 'Không cần hành động đặc biệt', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('humidity', NULL, 40, 'Trung bình', 'Không khí khô, gây kích ứng hô hấp, tăng nguy cơ cháy nổ', 'Dùng máy tạo ẩm, uống đủ nước', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('combined_humidity_temp', NULL, NULL, 'Nguy hiểm', 'Oi bức cực độ: Độ ẩm ≥ 90% & Nhiệt độ ≥ 32°C, nguy cơ sốc nhiệt', 'Ở nơi thoáng mát, hạn chế lao động ngoài trời', '{"humidity": 90, "temperature": 32}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Tổ hợp cấp 4
    ('combined_rain_wind_temp_4', 60, NULL, 'Rất nguy hiểm cấp 4', 'Mưa lớn ≥ 60 mm/h + Gió mạnh ≥ 10.0 m/s + Nhiệt độ ≥ 35°C, gây ngập lụt, đổ cây, nguy cơ sốc nhiệt', 'Gửi cảnh báo qua Telegram/Zalo, dừng hoạt động ngoài trời, theo dõi liên tục', '{"rainfall": 60, "wind": 10.0, "temperature": 35}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Tổ hợp cấp 5
    ('combined_rain_wind_temp_humidity_5', 80, NULL, 'Rất nguy hiểm cấp 5', 'Tình huống khẩn cấp: Mưa cực lớn ≥ 80 mm/h + Gió mạnh ≥ 12.0 m/s + Nhiệt độ ≥ 38°C + Độ ẩm ≥ 90%, gây ngập sâu, giao thông gián đoạn', 'Kích hoạt cảnh báo khẩn cấp, sơ tán nếu cần, liên hệ cơ quan chức năng (113, 115)', '{"rainfall": 80, "wind": 12.0, "temperature": 38, "humidity": 90}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);