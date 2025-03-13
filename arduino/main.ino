#include <Arduino.h>
#include "lorae5.h"
#include "config_application.h"
#include "config_board.h"

uint8_t sizePayloadUp;
uint8_t sizePayloadDown = 0;
uint8_t payloadDown[20] = {0};

const int buttonPin = 2;
const int sensorPin = 8;
const int transistorPin = 3;
const int co2Pin = A0;

int buttonState = 0;             
int lastButtonState = 0;        
int sensorState = 0;             
int lastSensorState = 0;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50; 

int co2Value = 0; 
int mosquitoKills = 0;          
unsigned long previousMillis = 0;
unsigned long fanStartMillis = 0;
const long interval = 30000;    
const long fanDuration = 5000;   

bool fanActive = false; 

LORAE5 lorae5(devEUI, appEUI, appKey, devAddr, nwkSKey, appSKey);

void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);
  
  lorae5.setup_hardware(&Serial, &Serial1);  
  lorae5.setup_lorawan(REGION, ACTIVATION_MODE, CLASS, SPREADING_FACTOR, ADAPTIVE_DR, CONFIRMED, PORT_UP, SEND_BY_PUSH_BUTTON, FRAME_DELAY);
  lorae5.printInfo();

  if (ACTIVATION_MODE == OTAA) {
    Serial.println("Join Procedure in progress...");
    while (lorae5.join() == false);
    delay(2000);
  }

  pinMode(buttonPin, INPUT);      
  pinMode(sensorPin, INPUT);
  pinMode(transistorPin, OUTPUT);
  digitalWrite(transistorPin, LOW);
  Serial.println("Configuration terminée. Attente du bouton ou du capteur...");
}

void loop() {
  int buttonReading = digitalRead(buttonPin);
  int sensorReading = digitalRead(sensorPin);
  


  if (buttonReading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
   
    if (buttonReading != buttonState) {
      buttonState = buttonReading;

      if (buttonState == HIGH) {
        Serial.println("Bouton pressé ! Activation du ventilateur...");
        fanActive = true;
        fanStartMillis = millis(); 

        digitalWrite(transistorPin, HIGH);
        Serial.println("Ventilateur activé par le bouton.");
        mosquitoKills++;
        Serial.print("Nombre de moustiques détectés : ");
        Serial.println(mosquitoKills);
      }
    }
  }

  // --- Détection du capteur optique ---
  if (sensorReading != lastSensorState) {
    lastDebounceTime = millis();
  }

 
  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (sensorReading != sensorState) {
      sensorState = sensorReading;

      if (sensorState == LOW) {
        Serial.println("Signal du capteur détecté ! Activation du ventilateur...");
        fanActive = true;
        fanStartMillis = millis();

        digitalWrite(transistorPin, HIGH);
        Serial.println("Ventilateur activé par le capteur.");


        mosquitoKills++;
        Serial.print("Nombre de moustiques détectés : ");
        Serial.println(mosquitoKills);
      }
    }
  }

  /
  if (fanActive && (millis() - fanStartMillis >= fanDuration)) {
    digitalWrite(transistorPin, LOW);
    fanActive = false;
    Serial.println("Ventilateur désactivé après délai.");
  }

  lastButtonState = buttonReading;
  lastSensorState = sensorReading;

  // Envoyer les données toutes les 30 secondes
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    co2Value = analogRead(co2Pin);

    Serial.print("Valeur CO2 : ");
    Serial.println(co2Value);
    Serial.print("Nombre de moustiques détectés : ");
    Serial.println(mosquitoKills);

    // Préparer le payload pour l'envoi
    uint8_t payloadUp[4];
    payloadUp[0] = (co2Value >> 8) & 0xFF; 
    payloadUp[1] = co2Value & 0xFF;        
    payloadUp[2] = (mosquitoKills >> 8) & 0xFF; 
    payloadUp[3] = mosquitoKills & 0xFF; 

    
    Serial.print("Données envoyées via LoRaWAN : CO2 (");
    Serial.print(payloadUp[0], HEX); Serial.print(payloadUp[1], HEX);
    Serial.print("), Moustiques (");
    Serial.print(payloadUp[2], HEX); Serial.print(payloadUp[3], HEX);
    Serial.println(")");


    lorae5.sendData(payloadUp, sizeof(payloadUp));
    Serial.println("Données envoyées via LoRaWAN.");

    mosquitoKills = 0;
  }

  delay(50);
}
