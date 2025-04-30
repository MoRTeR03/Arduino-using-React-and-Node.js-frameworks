import { useEffect, useState } from 'react';

function App() {
    const [socket, setSocket] = useState(null);
    const [inputCommand, setInputCommand] = useState('');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [connected, setConnected] = useState(false);
    const [sensorData, setSensorData] = useState({
        temperature: '-', humidity: '-', pressure: '-',
        light: '-', sound: '-', co: '-'
    });
    const [currentCommand, setCurrentCommand] = useState('stop');
    const [motorSpeed, setMotorSpeed] = useState(40);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:3000');

        ws.onopen = () => {
            console.log('Connected to server');
            setConnected(true);
        };

        ws.onclose = () => {
            console.log('Disconnected from server');
            setConnected(false);
            setLastUpdate(null);
        };

        ws.onmessage = (message) => {
            try {
                const data = JSON.parse(message.data);
                if (data.type === "sensor" || data.temperature) {
                    const incoming = data.payload || data;
                    setSensorData(prev => {
                        const updated = { ...prev };
                        for (const key in incoming) {
                            if (incoming[key] !== undefined && incoming[key] !== null && !Number.isNaN(incoming[key])) {
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
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(command);
            setCurrentCommand(command);
        }
    };

    const handleSendCustom = () => {
        if (inputCommand.trim() !== '') {
            sendCommand(inputCommand.trim());
            setInputCommand('');
        }
    };

    useEffect(() => {
        let lastCommand = '';
        let lastVUpdateTime = 0;

        const checkGamepad = () => {
            const gamepads = navigator.getGamepads();
            const gp = Array.from(gamepads).find(g => g);
            if (!gp) {
                requestAnimationFrame(checkGamepad);
                return;
            }

            const r2 = gp.buttons[7]?.value || 0;
            const l2 = gp.buttons[6]?.value || 0;
            const l1 = gp.buttons[4]?.pressed;
            const r1 = gp.buttons[5]?.pressed;
            const r3 = gp.axes[3] || 0;
            const dpadUp = gp.buttons[12]?.pressed;
            const dpadDown = gp.buttons[13]?.pressed;
            const dpadLeft = gp.buttons[14]?.pressed;
            const dpadRight = gp.buttons[15]?.pressed;

            // --- R3 регулювання з інтервалом 200мс ---
            const now = Date.now();
            if (r3 < -0.3 && now - lastVUpdateTime > 200) {
                setMotorSpeed(prev => {
                    const newSpeed = Math.min(120, prev + 1);
                    sendCommand(`%V${newSpeed}#`);
                    lastVUpdateTime = now;
                    return newSpeed;
                });
            } else if (r3 > 0.3 && now - lastVUpdateTime > 200) {
                setMotorSpeed(prev => {
                    const newSpeed = Math.max(0, prev - 1);
                    sendCommand(`%V${newSpeed}#`);
                    lastVUpdateTime = now;
                    return newSpeed;
                });
            }

            let command = '%S#';
            let dynamicSpeed = 0;

            if (r2 > 0.05) {
                dynamicSpeed = Math.max(20, Math.round(r2 * 120));
                command = `%F${dynamicSpeed}#`;
            } else if (l2 > 0.05) {
                dynamicSpeed = Math.max(20, Math.round(l2 * 120));
                command = `%B${dynamicSpeed}#`;
            } else if (dpadUp) {
                command = '%F#';
            } else if (dpadDown) {
                command = '%B#';
            } else if (dpadLeft) {
                command = '%L#';
            } else if (dpadRight) {
                command = '%R#';
            } else if (l1) {
                command = '%L#';
            } else if (r1) {
                command = '%R#';
            }

            if (command !== lastCommand) {
                sendCommand(command);
                lastCommand = command;
            }

            requestAnimationFrame(checkGamepad);
        };

        requestAnimationFrame(checkGamepad);
    }, [socket]);


    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.repeat) return;
            switch (event.key) {
                case "ArrowUp": sendCommand('%F#'); break;
                case "ArrowDown": sendCommand('%B#'); break;
                case "ArrowLeft": sendCommand('%L#'); break;
                case "ArrowRight": sendCommand('%R#'); break;
                default: break;
            }
        };

        const handleKeyUp = (event) => {
            switch (event.key) {
                case "ArrowUp":
                case "ArrowDown":
                case "ArrowLeft":
                case "ArrowRight":
                    sendCommand('%S#'); break;
                default: break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [socket]);

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Управління Роботом</h1>

            <p>🔧 Поточна швидкість: {motorSpeed}</p>

            <button onClick={() => sendCommand('%F#')}>Вперед</button>
            <br /><br />
            <button onClick={() => sendCommand('%L#')}>Вліво</button>
            <button onClick={() => sendCommand('%S#')}>Стоп</button>
            <button onClick={() => sendCommand('%R#')}>Вправо</button>
            <br /><br />
            <button onClick={() => sendCommand('%B#')}>Назад</button>

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

            <h2>🔵 Поточна команда: {currentCommand.toUpperCase()}</h2>
            <p style={{ marginTop: "10px", color: connected ? "green" : "red" }}>
                {connected ? `🟢 Підключено, останнє оновлення: ${lastUpdate}` : "🔴 Немає зв'язку з пристроєм"}
            </p>
        </div>
    );
}

export default App;
