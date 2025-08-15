#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Thông tin Wi-Fi
const char* ssid = "realme 9";
const char* password = "1234568999";

// Địa chỉ server
const char* serverUrl = "http://192.168.234.127:3005/api/weather";
const int stationId = 6;

// Cảm biến DHT22
#define PIN_DHT 4
#define DHTTYPE DHT22
DHT dht(PIN_DHT, DHTTYPE);

// Cảm biến mưa và gió
#define PIN_HALL_RAIN 16
#define PIN_HALL_WIND 14
#define PIN_RAIN_DETECTOR 17

// Hằng số
const float rainPerTip_mm = 2.73;
const float windCircumference_m = 0.628;

// Biến toàn cục
volatile unsigned long rainCount = 0;
volatile unsigned long windCount = 0;
float lastTemperature = -999;
float lastHumidity = -999;
float lastRainAmount = -1;
float lastWindSpeed = -1;
unsigned long lastRainCalcTime = 0;
unsigned long lastSerialDisplayTime = 0;
const unsigned long rainInterval = 5 * 60 * 1000; // 5 phút
const unsigned long serialDisplayInterval = 5000; // 5 giây

// Đọc trạng thái cảm biến MH-RD với chống nhiễu
bool readRainSensor() {
  const int numReadings = 5;
  int rainCount = 0;
  for (int i = 0; i < numReadings; i++) {
    if (digitalRead(PIN_RAIN_DETECTOR) == LOW) {
      rainCount++;
    }
    delay(10);
  }
  return (rainCount >= numReadings / 2);
}

// Đảm bảo kết nối WiFi
void ensureWiFiConnected() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Mất kết nối WiFi, đang thử kết nối lại...");
    WiFi.disconnect();
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) { // Tăng số lần thử lên 20
      delay(1000); // Tăng thời gian chờ lên 1 giây
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nKết nối WiFi thành công!");
      Serial.println("IP: " + WiFi.localIP().toString());
    } else {
      Serial.println("\nKhông thể kết nối WiFi!");
    }
  }
}

// Hàm ngắt cho cảm biến mưa
void IRAM_ATTR onRainTip() {
  static unsigned long lastInterruptTime = 0;
  unsigned long interruptTime = millis();
  if (interruptTime - lastInterruptTime > 500) { // Chống nhiễu
    rainCount++;
    lastInterruptTime = interruptTime;
  }
}

// Hàm ngắt cho cảm biến gió
void IRAM_ATTR onWindSpin() {
  static unsigned long lastInterruptTime = 0;
  unsigned long interruptTime = millis();
  if (interruptTime - lastInterruptTime > 500) { // Chống nhiễu
    windCount++;
    lastInterruptTime = interruptTime;
  }
}

// Gửi dữ liệu lên server
void sendDataToServer(float temperature, float humidity, float rainAmount, float windSpeed) {
  // Kiểm tra giá trị không hợp lệ
  if (isnan(temperature)) {
    temperature = lastTemperature;
    Serial.println("Lỗi đọc nhiệt độ, sử dụng giá trị trước: " + String(temperature));
  }
  if (isnan(humidity)) {
    humidity = lastHumidity;
    Serial.println("Lỗi đọc độ ẩm, sử dụng giá trị trước: " + String(humidity));
  }
  if (rainAmount < 0) {
    rainAmount = 0;
  }
  if (windSpeed < 0) {
    windSpeed = 0;
  }

  // Kiểm tra thay đổi dữ liệu
  bool shouldSend = (
    abs(temperature - lastTemperature) > 0.5 || // Ngưỡng thay đổi nhiệt độ
    abs(humidity - lastHumidity) > 1.0 ||       // Ngưỡng thay đổi độ ẩm
    abs(rainAmount - lastRainAmount) > 0.1 ||   // Ngưỡng thay đổi lượng mưa
    abs(windSpeed - lastWindSpeed) > 0.1       // Ngưỡng thay đổi tốc độ gió
  );

  if (!shouldSend) {
    Serial.println("Dữ liệu không thay đổi nhiều → Không gửi");
    return;
  }

  ensureWiFiConnected();
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<512> jsonDoc;
    JsonArray dataArray = jsonDoc.to<JsonArray>();

    // Thêm bản ghi cho nhiệt độ
    JsonObject tempData = dataArray.createNestedObject();
    tempData["station_id"] = stationId;
    tempData["parameter_type"] = "temperature";
    tempData["value"] = round(temperature * 100) / 100.0; // Làm tròn 2 chữ số thập phân

    // Thêm bản ghi cho độ ẩm
    JsonObject humidityData = dataArray.createNestedObject();
    humidityData["station_id"] = stationId;
    humidityData["parameter_type"] = "humidity";
    humidityData["value"] = round(humidity * 100) / 100.0;

    // Thêm bản ghi cho lượng mưa
    JsonObject rainData = dataArray.createNestedObject();
    rainData["station_id"] = stationId;
    rainData["parameter_type"] = "rainfall";
    rainData["value"] = round(rainAmount * 100) / 100.0;

    // Thêm bản ghi cho tốc độ gió
    JsonObject windData = dataArray.createNestedObject();
    windData["station_id"] = stationId;
    windData["parameter_type"] = "wind";
    windData["value"] = round(windSpeed * 100) / 100.0;

    String jsonStr;
    serializeJson(jsonDoc, jsonStr);

    Serial.println("Gửi JSON: " + jsonStr); // Log để debug
    int httpResponseCode = http.POST(jsonStr);
    if (httpResponseCode > 0) {
      Serial.printf("Gửi dữ liệu thành công, mã: %d\n", httpResponseCode);
      String response = http.getString();
      Serial.println("Phản hồi từ server: " + response);
      // Cập nhật giá trị cuối cùng
      lastTemperature = temperature;
      lastHumidity = humidity;
      lastRainAmount = rainAmount;
      lastWindSpeed = windSpeed;
    } else {
      Serial.printf("Lỗi khi gửi dữ liệu: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  } else {
    Serial.println("WiFi chưa kết nối");
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  // Cấu hình các chân
  pinMode(PIN_HALL_RAIN, INPUT_PULLUP);
  pinMode(PIN_HALL_WIND, INPUT_PULLUP);
  pinMode(PIN_RAIN_DETECTOR, INPUT);

  // Gắn hàm ngắt
  attachInterrupt(digitalPinToInterrupt(PIN_HALL_RAIN), onRainTip, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_HALL_WIND), onWindSpin, FALLING);

  // Kết nối WiFi
  Serial.print("Đang kết nối WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nKết nối WiFi thành công!");
  Serial.println("IP: " + WiFi.localIP().toString());
}

void loop() {
  unsigned long currentTime = millis();

  // Đọc dữ liệu từ cảm biến
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  bool isRaining = readRainSensor();

  // Cập nhật dữ liệu định kỳ (mỗi 5 giây)
  if (currentTime - lastSerialDisplayTime >= serialDisplayInterval) {
    noInterrupts();
    // Tính lượng mưa (chỉ nếu có mưa)
    float rainAmount = isRaining ? rainCount * rainPerTip_mm : 0;
    // Tính tốc độ gió
    float windSpeed = (windCount * windCircumference_m) / (serialDisplayInterval / 1000.0);
    // Kiểm tra tín hiệu Hall
    if (rainCount == 0) rainAmount = 0;
    if (windCount == 0) windSpeed = 0;
    interrupts();

    // Hiển thị dữ liệu trên Serial
    Serial.printf("Nhiệt độ: %.2f °C\n", temperature);
    Serial.printf("Độ ẩm: %.2f %%\n", humidity);
    Serial.printf("Có mưa: %s\n", isRaining ? "Có" : "Không");
    Serial.printf("Lượng mưa: %.2f mm\n", rainAmount);
    Serial.printf("Tốc độ gió: %.2f m/s\n", windSpeed);
    Serial.println("---------------------------------------");

    // Gửi dữ liệu lên server
    sendDataToServer(temperature, humidity, rainAmount, windSpeed);

    lastSerialDisplayTime = currentTime;
  }

  // Cập nhật lượng mưa và tốc độ gió định kỳ (mỗi 5 phút)
  if (currentTime - lastRainCalcTime >= rainInterval) {
    noInterrupts();
    // Tính lượng mưa (chỉ nếu có mưa)
    float rainAmount = isRaining ? rainCount * rainPerTip_mm : 0;
    // Tính tốc độ gió
    float windSpeed = (windCount * windCircumference_m) / (rainInterval / 1000.0);
    // Kiểm tra tín hiệu Hall
    if (rainCount == 0) rainAmount = 0;
    if (windCount == 0) windSpeed = 0;
    // Reset bộ đếm
    rainCount = 0;
    windCount = 0;
    interrupts();

    // Hiển thị dữ liệu trên Serial
    Serial.printf("🌧️ Lượng mưa: %.2f mm\n", rainAmount);
    Serial.printf("💨 Tốc độ gió: %.2f m/s\n", windSpeed);
    Serial.printf("Nhiệt độ: %.2f °C\n", temperature);
    Serial.printf("Độ ẩm: %.2f %%\n", humidity);
    Serial.printf("Có mưa: %s\n", isRaining ? "Có" : "Không");
    Serial.println("---------------------------------------");

    // Gửi dữ liệu lên server
    sendDataToServer(temperature, humidity, rainAmount, windSpeed);

    lastRainCalcTime = currentTime;
  }
}