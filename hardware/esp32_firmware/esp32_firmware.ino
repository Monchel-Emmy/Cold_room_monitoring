// ==========================================
// Cold Room Monitoring Device
// ESP32 + DHT11 + MQ135 + LCD
// ==========================================
// GSM 
// | Component     | GPIO    |
// | ------------- | ------- |
// | DHT11 Sensor 1 | GPIO 4 |
// | DHT11 Sensor 2 | GPIO 5 |
// | MQ135 Air      | GPIO 34|
// | LCD SDA        | GPIO 26|
// | LCD SCL        | GPIO 27|
// | Red LED        | GPIO 22|
// | Green LED      | GPIO 23|

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// =========================
// WIFI CONFIGURATION
// =========================
const char* ssid = "Monchel";
const char* password = "Monchel1236";
const char* backendUrl = "http://172.24.128.1:5001/api/telemetry";

// =========================
// DEVICE CONFIGURATION
// =========================
const char* deviceId = "ESP32-001";
const unsigned long telemetryIntervalMs = 1000;

// =========================
// DHT CONFIGURATION
// =========================
#define DHTTYPE DHT11
#define DHT_SENSOR_1_PIN 4
#define DHT_SENSOR_2_PIN 5

DHT dhtSensor1(DHT_SENSOR_1_PIN, DHTTYPE);
DHT dhtSensor2(DHT_SENSOR_2_PIN, DHTTYPE);

// =========================
// MQ135 PIN
// =========================
#define MQ135_PIN 34

// =========================
// STATUS LEDS
// =========================
#define RED_LED 22
#define GREEN_LED 23

// =========================
// LCD CONFIGURATION
// =========================
LiquidCrystal_I2C lcd(0x27, 20, 4);

// =========================
// SENSOR DATA
// =========================
float temp1 = 0.0;
float hum1 = 0.0;
float temp2 = 0.0;
float hum2 = 0.0;
int airQuality = 0;

String safeFloat(float value, int decimals = 1) {
  if (isnan(value) || isinf(value)) return "0.0";
  return String(value, decimals);
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

void updateStatusLed(bool online) {
  digitalWrite(RED_LED, online ? LOW : HIGH);
  digitalWrite(GREEN_LED, online ? HIGH : LOW);
}

void sendTelemetryToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, retrying connection...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      updateStatusLed(false);
      return;
    }
  }

  HTTPClient http;
  http.begin(backendUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"deviceId\":\"" + String(deviceId) + "\",";
  payload += "\"airQuality\":" + String(airQuality) + ",";
  payload += "\"readings\":[";
  payload += "{\"sensorId\":\"SENS-001\",\"temperature\":" + safeFloat(temp1) + ",\"humidity\":" + safeFloat(hum1) + "},";
  payload += "{\"sensorId\":\"SENS-002\",\"temperature\":" + safeFloat(temp2) + ",\"humidity\":" + safeFloat(hum2) + "}";
  payload += "]}";

  Serial.println("Sending telemetry to backend...");
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("HTTP ");
    Serial.println(httpCode);
    Serial.println(response);
    updateStatusLed(true);
  } else {
    Serial.print("HTTP POST failed: ");
    Serial.println(httpCode);
    updateStatusLed(false);
  }

  http.end();
}

void displaySensorValues() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("S1:");
  lcd.print(temp1, 1);
  lcd.print("C ");
  lcd.print(hum1, 0);
  lcd.print("%");

  lcd.setCursor(0, 1);
  lcd.print("S2:");
  lcd.print(temp2, 1);
  lcd.print("C ");
  lcd.print(hum2, 0);
  lcd.print("%");
}

void setup() {
  Serial.begin(115200);

  dhtSensor1.begin();
  dhtSensor2.begin();

  pinMode(MQ135_PIN, INPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);

  Wire.begin(26, 27);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ColdRoom");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  delay(1500);
  connectWiFi();
  updateStatusLed(true);
}

void loop() {
  temp1 = dhtSensor1.readTemperature();
  hum1 = dhtSensor1.readHumidity();

  temp2 = dhtSensor2.readTemperature();
  hum2 = dhtSensor2.readHumidity();

  if (isnan(temp1) || isnan(hum1)) {
    temp1 = 0.0;
    hum1 = 0.0;
  }

  if (isnan(temp2) || isnan(hum2)) {
    temp2 = 0.0;
    hum2 = 0.0;
  }

  airQuality = analogRead(MQ135_PIN);

  Serial.println("================================");
  Serial.print("Sensor 1: ");
  Serial.print(temp1);
  Serial.print(" C / ");
  Serial.print(hum1);
  Serial.println(" %");

  Serial.print("Sensor 2: ");
  Serial.print(temp2);
  Serial.print(" C / ");
  Serial.print(hum2);
  Serial.println(" %");

  Serial.print("Air Quality: ");
  Serial.println(airQuality);

  displaySensorValues();
  sendTelemetryToBackend();

  delay(telemetryIntervalMs);
}
