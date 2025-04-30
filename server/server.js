const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let esp32Connection = null;
let browserClients = [];

// Функція перекладу команд у формат для Arduino
const translateCommand = (cmd) => {
  switch (cmd) {
    case "forward": return "%F#";
    case "backward": return "%B#";
    case "left": return "%L#";
    case "right": return "%R#";
    case "stop": return "%S#";
    default: return cmd; // Якщо невідомо — шлемо як є
  }
};

wss.on('connection', (ws) => {
  console.log("New connection");

  ws.on('message', (message) => {
    const msgStr = message.toString().trim();
    console.log("[WS received]:", msgStr);

    // 🎮 Додаємо логування команд геймпаду
    if (msgStr.startsWith("%F") || msgStr.startsWith("%B") || msgStr.startsWith("%L") || msgStr.startsWith("%R") || msgStr.startsWith("%S")) {
      console.log("🎮 Команда з геймпаду:", msgStr);
    }

    try {
      const parsed = JSON.parse(msgStr);

      // Якщо це сенсорні дані з ESP32 ➔ тільки шлемо в браузер
      if (parsed.type === "sensor") {
        browserClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "sensor",
              payload: parsed.payload
            }));
          }
        });
      }
      // Якщо це обʼєкт з температурою ➔ теж тільки в браузер
      else if (parsed.temperature !== undefined) {
        browserClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsed));
          }
        });
      }

    } catch (e) {
      // Якщо це НЕ JSON

      if (msgStr === "ESP32") {
        esp32Connection = ws;
        console.log("✅ ESP32 підключено");
        return;
      }

      // Якщо це сенсорний текст (TMP:...), шлемо тільки в браузер
      if (msgStr.startsWith("TMP:")) {
        const parts = msgStr.split(',');
        const sensorData = {};

        parts.forEach(part => {
          const [key, value] = part.split(':');
          if (key && value) {
            if (key === "TMP") sensorData.temperature = parseFloat(value);
            if (key === "HUM") sensorData.humidity = parseFloat(value);
            if (key === "PRS") sensorData.pressure = parseFloat(value);
            if (key === "LGT") sensorData.light = parseInt(value);
            if (key === "SND") sensorData.sound = parseInt(value);
            if (key === "CO")  sensorData.co = parseInt(value);
          }
        });

        // Надсилаємо в браузер
        browserClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(sensorData));
          }
        });
        return;
      }

      // Якщо це проста команда ➔ перекладаємо і шлемо на ESP32
      if (esp32Connection && esp32Connection.readyState === WebSocket.OPEN) {
        const translated = translateCommand(msgStr);
        console.log("✅ Передаю команду на ESP32:", translated);
        esp32Connection.send(translated);
      }
    }
  });

  ws.on('close', () => {
    console.log("❌ З'єднання закрито");

    if (ws === esp32Connection) {
      console.log("⚠️ ESP32 втрачено");
      esp32Connection = null;
    }

    browserClients = browserClients.filter(c => c !== ws);
  });

  browserClients.push(ws);
});

app.get('/', (req, res) => {
  res.send('Robot server is running.');
});

server.listen(3000, () => {
  console.log('🚀 Сервер запущено на порту 3000');
});
