#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid = "Xiaomi_AC2350_2.3Gz";
const char* password = "R123456789010R";
const char* websocket_server = "192.168.31.28";
const uint16_t websocket_port = 3000;

WebSocketsClient webSocket;
String uartBuffer = "";

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

        Serial2.println(command);  // Надсилаємо на Arduino
        Serial.println("[UART -> Arduino]: " + command);
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, 16, 13);  // 16 = RX, 13 = TX

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
        Serial.println("[UART] Отримано: " + uartBuffer);

        if (uartBuffer == "PING") {
          Serial.println("[UART] Отримано PING -> надсилаємо PONG");
          Serial2.println("PONG"); // Відповідаємо назад Arduino
        }
        else if (uartBuffer.startsWith("TMP:")) {
          // ТІЛЬКИ сенсорні дані передаємо в WebSocket
          Serial.println("[SENSOR DATA] " + uartBuffer);
          webSocket.sendTXT(uartBuffer);
        }
        else {
          // Команди (%F# і т.д.) не пересилаємо в WebSocket, тільки виводимо в термінал
          Serial.println("[CMD] Команда з Arduino: " + uartBuffer);
        }
      }
      uartBuffer = "";
    } else {
      uartBuffer += c;
    }
  }
}
