#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid = "Xiaomi_AC2350_2.3Gz";
const char* password = "R123456789010R";
const char* websocket_server = "192.168.31.242"; // IP сервера
const uint16_t websocket_port = 3000;

WebSocketsClient webSocket;
String uartBuffer = "";

void setup() {
  Serial.begin(115200);         // Для моніторингу
  Serial2.begin(9600, SERIAL_8N1, 16, 13); // RX=16, TX=13 (до Arduino)

  Serial.println("[INIT] Connecting to WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[INIT] WiFi connected. IP: " + WiFi.localIP().toString());

  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
}

void loop() {
  webSocket.loop();

  while (Serial2.available() > 0) {
    char c = Serial2.read();
    if (c == '\n') {
      uartBuffer.trim();
      if (uartBuffer.length() > 0) {
        Serial.println("[UART] Отримано з Arduino: " + uartBuffer);

        if (uartBuffer == "PING") {
          Serial2.println("PONG");
        }
        else if (uartBuffer.startsWith("TMP:")) {
          webSocket.sendTXT(uartBuffer); // відправка сенсорів у браузер
        }
      }
      uartBuffer = "";
    } else {
      uartBuffer += c;
    }
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to server");
      webSocket.sendTXT("ESP32");
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from server");
      break;

    case WStype_TEXT:
      if (payload != nullptr) {
        String command = (char*)payload;
        command.trim();
        Serial.println("[WS] Received command: " + command);
        handleCommand(command);
      }
      break;
  }
}

void handleCommand(String cmd) {
  // Якщо це JSON (сенсорні дані), не пересилаємо назад на Arduino
  if (cmd.startsWith("{") && cmd.endsWith("}")) {
    return;
  }

  // Відправка усіх інших команд у Arduino
  Serial2.println(cmd);
  Serial.println("[UART -> Arduino]: " + cmd);
}
