import { useEffect, useState } from 'react';

function App() {
    const [socket, setSocket] = useState(null);
    const [inputCommand, setInputCommand] = useState('');
    const [sensorData, setSensorData] = useState({ temperature: "-", humidity: "-", pressure: "-" });

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:3000');

        ws.onopen = () => {
            console.log('Connected to server');
        };

        ws.onmessage = (message) => {
            try {
                const data = JSON.parse(message.data);
                if (data.type === "sensor") {
                    setSensorData(data.payload);
                }
            } catch (e) {
                console.error('Invalid message:', message.data);
            }
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, []);

    const sendCommand = (command) => {
        if (socket) {
            socket.send(command);
        }
    };

    const handleSendCustom = () => {
        if (inputCommand.trim() !== '') {
            sendCommand(inputCommand.trim());
            setInputCommand('');
        }
    };

    return (
        <div style={{textAlign: "center", marginTop: "50px"}}>
            <h1>Управління Роботом</h1>

            <button onClick={() => sendCommand('forward')}>Вперед</button><br/><br/>
            <button onClick={() => sendCommand('left')}>Вліво</button>
            <button onClick={() => sendCommand('stop')}>Стоп</button>
            <button onClick={() => sendCommand('right')}>Вправо</button><br/><br/>
            <button onClick={() => sendCommand('backward')}>Назад</button>

            <h2>Ручна команда:</h2>
            <input
                type="text"
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                placeholder="Введи команду..."
            />
            <button onClick={handleSendCustom}>Надіслати</button>

            <h2>Показники сенсорів</h2>
            <div>
                <p>🌡️ Температура: {sensorData.temperature} °C</p>
                <p>💧 Вологість: {sensorData.humidity} %</p>
                <p>🏔️ Тиск: {sensorData.pressure} hPa</p>
            </div>
        </div>
    );
}

export default App;
