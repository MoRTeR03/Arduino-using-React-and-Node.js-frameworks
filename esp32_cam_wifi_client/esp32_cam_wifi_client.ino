#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid = "Xiaomi_AC2350_2.3Gz";
const char* password = "R123456789010R";
const char* websocket_server = "192.168.31.28";
const uint16_t websocket_port = 3000;

WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_TEXT:
      Serial.println("[WS] Received command:");
      Serial.println((char*)payload);
      Serial2.println((char*)payload);
      break;
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");

  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();

  static unsigned long lastSendTime = 0;
  if (millis() - lastSendTime > 3000) { // кожні 3 секунди
    lastSendTime = millis();
    
    // Псевдодані (підставиш свої значення з Arduino)
    String sensorJson = "{\"type\":\"sensor\",\"payload\":{\"temperature\":25.5,\"humidity\":60,\"pressure\":1013}}";
    webSocket.sendTXT(sensorJson);
  }
}
