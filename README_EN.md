# 🤖 React + ESP32 + Arduino Smart Robot Controller
WiFi Camera Smart Robot Car https://www.dropbox.com/sh/f0y6aez5y1nt1je/AAA8BG3GckIm3QefblaZmMdTa?dl=1
This project allows controlling a robot platform via:

- 🎮 **Gamepad** (R2/L2 triggers for smooth movement, R3 stick for speed adjustment)
- ⌨️ **Keyboard** (arrows)
- 📡 **Wireless control via ESP32 (WebSocket)** to **Arduino**
- 📊 **Sensor data display** (temperature, humidity, pressure, light, sound, CO)

## 🔧 Requirements

- Node.js (v16+)
- Arduino IDE
- ESP32 Dev Module
- Arduino board (e.g., UNO or Nano)
- Gamepad (XInput/DirectInput compatible)
- CP2102 or CH340 drivers (depending on your boards)

## 📁 Structure

```
project-root/
├── arduino/             # Arduino code with motor/sensor logic
├── esp32/               # ESP32 WebSocket ↔ Serial bridge
├── frontend/            # React-based control interface
```

## 🧠 How it works

1. **React (frontend)** detects gamepad/keyboard input and sends commands via WebSocket.
2. **ESP32** receives WebSocket commands and forwards them via UART to Arduino.
3. **Arduino** executes motion and returns sensor data via Serial.
4. **ESP32** forwards sensor data back to WebSocket → React shows it live.

## 🚀 Run the Project

### 1. React (frontend)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

> **Connect your gamepad before launching browser!**

---

### 2. ESP32 (`/esp32/main.ino`)

- Open with Arduino IDE
- Select board: **ESP32 Dev Module**
- Edit Wi-Fi credentials:

```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASS";
const char* websocket_server = "YOUR_PC_LOCAL_IP"; // e.g., 192.168.1.100
```

- Upload to ESP32

---

### 3. Arduino (`/arduino/main.ino`)

- Connect to ESP32 using Serial2 (cross TX-RX)
- Upload code to Arduino (UNO, Nano, etc.)
- It handles commands like `%F100#`, `%B75#`, `%V50#`, `%S#`
- Sends sensor data formatted like: `TMP:23.5,HUM:45.2,...`

## 🧪 Command Format

| Command | Description                   |
|---------|-------------------------------|
| `%F80#` | Move forward at speed 80      |
| `%B60#` | Move backward at speed 60     |
| `%L#`   | Turn left                     |
| `%R#`   | Turn right                    |
| `%S#`   | Stop                          |
| `%V40#` | Set motorSpeed to 40          |

## 📌 Notes

- Default speed from R2/L2 starts at **20**
- Base `motorSpeed` can be adjusted using R3 stick
- Speed updates from R3 are sent every **500 ms** for stability

## 📷 UI Preview

- Displays current command and motor speed
- Sensor data: 🌡️ Temperature, 💧 Humidity, 🏔️ Pressure, 💡 Light, 🔊 Sound, 🛢️ CO