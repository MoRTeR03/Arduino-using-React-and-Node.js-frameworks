const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let esp32Connection = null;
let browserClients = [];

wss.on('connection', (ws) => {
  console.log("New connection");

  ws.on('message', (message) => {
    console.log('Received:', message);

    try {
      const parsed = JSON.parse(message);

      if (parsed.type === "sensor") {
        // Сенсорні дані від ESP32
        browserClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "sensor", payload: parsed.payload }));
          }
        });
      } else {
        if (message.toString() === "ESP32") {
          esp32Connection = ws;
          console.log('ESP32 connected');
        } else {
          // Команда для ESP32
          if (esp32Connection) {
            esp32Connection.send(message);
          }
        }
      }
    } catch (e) {
      // Це просто текстова команда
      if (message.toString() === "ESP32") {
        esp32Connection = ws;
        console.log('ESP32 connected');
      } else {
        if (esp32Connection) {
          esp32Connection.send(message);
        }
      }
    }
  });

  ws.on('close', () => {
    if (ws === esp32Connection) {
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
  console.log('Server started on port 3000');
});
