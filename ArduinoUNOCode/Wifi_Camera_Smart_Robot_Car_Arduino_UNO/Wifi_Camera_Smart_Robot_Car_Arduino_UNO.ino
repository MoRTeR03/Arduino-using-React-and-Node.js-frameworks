#include "IR_remote.h"
#include "keymap.h"
#include <Servo.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include "Adafruit_BME680.h"

IRremote ir(3);
Servo servo_10;
Adafruit_BME680 bme;

unsigned long lastSensorSend = 0;
const unsigned long sensorInterval = 3000;
unsigned long lastPing = 0;

String uartBuffer = "";
int motorSpeed = 40;
volatile float V_Servo_angle = 90;
volatile int Front_Distance = 0;
volatile char IR_Car_Mode = ' ';
volatile boolean IR_Mode_Flag = false;

void updateSensorsAndSend() {
  if (millis() - lastSensorSend < sensorInterval) return;
  lastSensorSend = millis();

  int lightValue = analogRead(A0);
  int soundValue = analogRead(A1);
  int mq7Value = analogRead(A2);

  float temp = 0, press = 0, hum = 0;
  if (bme.performReading()) {
    temp = bme.temperature;
    press = bme.pressure / 100.0;
    hum = bme.humidity;
  }

  Serial.print("TMP:"); Serial.print(temp, 2);
  Serial.print(",HUM:"); Serial.print(hum, 2);
  Serial.print(",PRS:"); Serial.print(press, 2);
  Serial.print(",LGT:"); Serial.print(lightValue);
  Serial.print(",SND:"); Serial.print(soundValue);
  Serial.print(",CO:");  Serial.println(mq7Value);
  Serial.flush();
}

void Move_Forward(int s)  { digitalWrite(2, HIGH); analogWrite(5, s); digitalWrite(4, LOW);  analogWrite(6, s); }
void Move_Backward(int s) { digitalWrite(2, LOW);  analogWrite(5, s); digitalWrite(4, HIGH); analogWrite(6, s); }
void Rotate_Left(int s)   { digitalWrite(2, LOW);  analogWrite(5, s); digitalWrite(4, LOW);  analogWrite(6, s); }
void Rotate_Right(int s)  { digitalWrite(2, HIGH); analogWrite(5, s); digitalWrite(4, HIGH); analogWrite(6, s); }
void STOP()               { digitalWrite(2, LOW);  analogWrite(5, 0); digitalWrite(4, HIGH); analogWrite(6, 0); }

float checkdistance() {
  digitalWrite(12, LOW); delayMicroseconds(2);
  digitalWrite(12, HIGH); delayMicroseconds(10);
  digitalWrite(12, LOW);
  return pulseIn(13, HIGH) / 58.00;
}

void Ultrasonic_Avoidance() {
  Front_Distance = checkdistance();
  if (Front_Distance <= 10) {
    Move_Backward(100); delay(200);
    (random(1, 100) <= 50) ? Rotate_Left(100) : Rotate_Right(100); delay(500);
  } else if (Front_Distance <= 20) {
    STOP(); delay(200);
    (random(1, 100) <= 50) ? Rotate_Left(100) : Rotate_Right(100); delay(500);
  } else {
    Move_Forward(70);
  }
}

void Ultrasonic_Follow() {
  Front_Distance = checkdistance();
  if (Front_Distance <= 5) Move_Backward(80);
  else if (Front_Distance <= 10) STOP();
  else Move_Forward(100);
}

void IR_remote_control() {
  switch (IR_Car_Mode) {
    case 'b': Move_Backward(motorSpeed); delay(300); STOP(); break;
    case 'f': Move_Forward(motorSpeed);  delay(300); STOP(); break;
    case 'l': Rotate_Left(motorSpeed);   delay(300); STOP(); break;
    case 'r': Rotate_Right(motorSpeed);  delay(300); STOP(); break;
    case 's': STOP(); break;
    case '+': V_Servo_angle = min(180, V_Servo_angle + 3); servo_10.write(round(V_Servo_angle)); break;
    case '-': V_Servo_angle = max(0, V_Servo_angle - 3);   servo_10.write(round(V_Servo_angle)); break;
  }
  IR_Car_Mode = ' ';

  byte code = ir.getIrKey(ir.getCode(), 1);
  if      (code == IR_KEYCODE_UP)    IR_Car_Mode = 'f';
  else if (code == IR_KEYCODE_LEFT)  IR_Car_Mode = 'l';
  else if (code == IR_KEYCODE_DOWN)  IR_Car_Mode = 'b';
  else if (code == IR_KEYCODE_RIGHT) IR_Car_Mode = 'r';
  else if (code == IR_KEYCODE_OK)    IR_Car_Mode = 's';
  else if (code == IR_KEYCODE_2)     IR_Car_Mode = '+';
  else if (code == IR_KEYCODE_8)     IR_Car_Mode = '-';
  else if (code == IR_KEYCODE_1)     { motorSpeed = min(120, motorSpeed + 10); Serial.print("Швидкість: "); Serial.println(motorSpeed); }
  else if (code == IR_KEYCODE_3)     { motorSpeed = max(0, motorSpeed - 10); Serial.print("Швидкість: "); Serial.println(motorSpeed); }
}

void handleSerialCommand(String fullCmd) {
  fullCmd.trim();

  int idx = 0;
  while ((idx = fullCmd.indexOf('%')) != -1) {
    fullCmd = fullCmd.substring(idx); // видаляємо все до символу %
    int end = fullCmd.indexOf('#');
    if (end == -1) {
      Serial.println("⛔ Команда не завершена символом #");
      return;
    }

    String cmd = fullCmd.substring(0, end + 1);
    fullCmd = fullCmd.substring(end + 1); // далі йде наступна команда

    Serial.print("[Arduino] Отримано команду: "); Serial.println(cmd);

    if (!cmd.startsWith("%") || !cmd.endsWith("#")) {
      Serial.println("⛔ Команда не відповідає формату %...#");
      continue;
    }

    char command = cmd.charAt(1);
    int value = -1;

    if (cmd.length() > 3 && isDigit(cmd.charAt(2))) {
      String valStr = cmd.substring(2, cmd.length() - 1);
      value = valStr.toInt();
    }

    if (command == 'V') {
      motorSpeed = constrain(value, 0, 120);
      Serial.print("✅ Нове motorSpeed з геймпада (R3): ");
      Serial.println(motorSpeed);
      continue;
    }

    Serial.print("🔧 Команда: "); Serial.print(command);
    Serial.print(" | Швидкість: ");
    if (value != -1) Serial.println(value);
    else Serial.println(motorSpeed);

    switch (command) {
      case 'F': Move_Forward(value != -1 ? value : motorSpeed); break;
      case 'B': Move_Backward(value != -1 ? value : motorSpeed); break;
      case 'L': Rotate_Left(motorSpeed); break;
      case 'R': Rotate_Right(motorSpeed); break;
      case 'S': STOP(); break;
      case 'H': V_Servo_angle = min(180, V_Servo_angle + 4); servo_10.write(round(V_Servo_angle)); break;
      case 'G': V_Servo_angle = max(0, V_Servo_angle - 4);   servo_10.write(round(V_Servo_angle)); break;
      case 'A': Ultrasonic_Avoidance(); break;
      case 'Z': Ultrasonic_Follow(); break;
    }
  }
}

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (!bme.begin()) {
    Serial.println("Не знайдено BME680!"); while (1);
  }
  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setGasHeater(320, 150);

  servo_10.attach(10);
  servo_10.write(V_Servo_angle);

  pinMode(2, OUTPUT); pinMode(4, OUTPUT);
  pinMode(5, OUTPUT); pinMode(6, OUTPUT);
  pinMode(12, OUTPUT); pinMode(13, INPUT);
}

void loop() {
  updateSensorsAndSend();
  IR_remote_control();

  if (millis() - lastPing >= 3000) {
    Serial.println("PING");
    lastPing = millis();
  }

  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n') {
      uartBuffer.trim();
      if (uartBuffer.length() > 0) {
        if (uartBuffer == "PONG") {
          Serial.println("ESP32 відповів: PONG");
        } else {
          handleSerialCommand(uartBuffer);
        }
      }
      uartBuffer = "";
    } else {
      uartBuffer += c;
    }
  }
}
