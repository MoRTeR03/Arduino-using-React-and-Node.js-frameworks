import { useEffect, useState } from 'react';

function App() {
    const [socket, setSocket] = useState(null);
    const [inputCommand, setInputCommand] = useState('');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [connected, setConnected] = useState(false); // ✅ Виправлено
    const [sensorData, setSensorData] = useState({
        temperature: "-", humidity: "-", pressure: "-",
        light: "-", sound: "-", co: "-"
    });

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:3000');

        ws.onopen = () => {
            console.log('Connected to server');
            setConnected(true); // ✅ просто викликаємо, не створюємо
        };

        ws.onclose = () => {
            console.log('Disconnected from server');
            setConnected(false);
            setLastUpdate(null);
        };

        ws.onmessage = (message) => {
            try {
                console.log("WS data:", message.data);
                const data = JSON.parse(message.data);
                if (data.type === "sensor" || data.temperature) {
                    const incoming = data.payload || data;
                    setSensorData(prev => {
                        const updated = { ...prev };
                        for (const key in incoming) {
                            if (
                                incoming[key] !== undefined &&
                                incoming[key] !== null &&
                                !Number.isNaN(incoming[key])
                            ) {
                                updated[key] = incoming[key];
                            }
                        }
                        return updated;
                    });
                    setLastUpdate(new Date().toLocaleTimeString());
                }
            } catch (e) {
                console.error('Invalid sensor data:', message.data);
            }
        };

        setSocket(ws);

        return () => ws.close();
    }, []);

    const sendCommand = (command) => {
        if (socket) socket.send(command);
    };

    const handleSendCustom = () => {
        if (inputCommand.trim() !== '') {
            sendCommand(inputCommand.trim());
            setInputCommand('');
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Управління Роботом</h1>
            <button onClick={() => sendCommand('forward')}>Вперед</button>
            <br /><br />
            <button onClick={() => sendCommand('left')}>Вліво</button>
            <button onClick={() => sendCommand('stop')}>Стоп</button>
            <button onClick={() => sendCommand('right')}>Вправо</button>
            <br /><br />
            <button onClick={() => sendCommand('backward')}>Назад</button>

            <h2>Ручна команда:</h2>
            <input type="text" value={inputCommand}
                   onChange={(e) => setInputCommand(e.target.value)}
                   placeholder="Введи команду..." />
            <button onClick={handleSendCustom}>Надіслати</button>

            <h2>Показники сенсорів</h2>
            <div>
                <p>🌡️ Температура: {sensorData.temperature !== "-" ? `${sensorData.temperature.toFixed(1)} °C` : "-"}</p>
                <p>💧 Вологість: {sensorData.humidity !== "-" ? `${sensorData.humidity.toFixed(1)} %` : "-"}</p>
                <p>🏔️ Тиск: {sensorData.pressure !== "-" ? `${sensorData.pressure.toFixed(1)} hPa` : "-"}</p>
                <p>💡 Освітленість: {sensorData.light}</p>
                <p>🔊 Звук: {sensorData.sound}</p>
                <p>🛢️ CO (MQ-7): {sensorData.co}</p>
            </div>

            <p style={{ marginTop: "10px", color: connected ? "green" : "red" }}>
                {connected ? `🟢 Підключено, останнє оновлення: ${lastUpdate}` : "🔴 Немає зв'язку з пристроєм"}
            </p>
        </div>
    );
}

export default App;
