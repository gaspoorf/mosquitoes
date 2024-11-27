#include <Arduino.h>
#include "lorae5.h"
#include "config_application.h"
#include "config_board.h"

// Variables pour le LoRaWAN
uint8_t sizePayloadUp;  // Taille du payload calculée à l'exécution
uint8_t sizePayloadDown = 0;
uint8_t payloadDown[20] = {0};

// Pins pour le bouton, transistor et capteur CO2
const int buttonPin = 2;         // Pin bouton poussoir
const int sensorPin = 8;         // Pin capteur optique de fourche
const int transistorPin = 3;     // Pin transistor pour contrôler le relais
const int co2Pin = A0;           // Pin capteur CO2

int buttonState = 0;             // Variable pour stocker l'état actuel du bouton
int lastButtonState = 0;         // Variable pour stocker le dernier état du bouton
int sensorState = 0;             // Variable pour stocker l'état actuel du capteur
int lastSensorState = 0;         // Variable pour stocker le dernier état du capteur
unsigned long lastDebounceTime = 0;  // Temps du dernier changement d'état
unsigned long debounceDelay = 50;    // Délai pour le debounce (en ms)

int co2Value = 0;                // Variable pour stocker la lecture du capteur CO2
int mosquitoKills = 0;           // Compteur pour le nombre de moustiques détectés
unsigned long previousMillis = 0; // Pour mesurer les intervalles de temps pour l'envoi LoRa
unsigned long fanStartMillis = 0; // Pour mesurer le temps de fonctionnement du ventilateur
const long interval = 30000;     // Intervalle de 30 secondes pour l'envoi des données
const long fanDuration = 5000;   // Durée de fonctionnement du ventilateur (en ms)

bool fanActive = false;          // Indique si le ventilateur est activé

LORAE5 lorae5(devEUI, appEUI, appKey, devAddr, nwkSKey, appSKey);

void setup() {
  Serial.begin(9600);            // Initialise la communication série pour le débogage
  Serial1.begin(9600);           // Initialise Serial1 pour la communication avec le module LoRa
  
  // Utilisation de Serial pour le débogage et Serial1 pour le module LoRa
  lorae5.setup_hardware(&Serial, &Serial1);  
  lorae5.setup_lorawan(REGION, ACTIVATION_MODE, CLASS, SPREADING_FACTOR, ADAPTIVE_DR, CONFIRMED, PORT_UP, SEND_BY_PUSH_BUTTON, FRAME_DELAY);
  lorae5.printInfo();

  if (ACTIVATION_MODE == OTAA) {
    Serial.println("Join Procedure in progress...");
    while (lorae5.join() == false);
    delay(2000);
  }

  // Configuration des broches
  pinMode(buttonPin, INPUT);      // Configure le bouton poussoir comme entrée
  pinMode(sensorPin, INPUT);      // Configure le capteur optique comme entrée
  pinMode(transistorPin, OUTPUT); // Configure la broche de contrôle du relais comme sortie
  digitalWrite(transistorPin, LOW); // Assure que le relais est désactivé au départ
  Serial.println("Configuration terminée. Attente du bouton ou du capteur...");
}

void loop() {
  // Lecture de l'état du bouton poussoir
  int buttonReading = digitalRead(buttonPin);

  // Lecture de l'état du capteur optique
  int sensorReading = digitalRead(sensorPin);
  

  // --- Debounce pour le bouton ---
  if (buttonReading != lastButtonState) {
    lastDebounceTime = millis();  // Enregistre le temps du changement d'état
  }

  // Si le changement est stable pendant plus de 50 ms (anti-rebond)
  if ((millis() - lastDebounceTime) > debounceDelay) {
    // Si l'état du bouton a changé
    if (buttonReading != buttonState) {
      buttonState = buttonReading;

      // Si le bouton vient d'être pressé (passage de LOW à HIGH)
      if (buttonState == HIGH) {
        Serial.println("Bouton pressé ! Activation du ventilateur...");
        fanActive = true;
        fanStartMillis = millis(); // Enregistre le moment où le ventilateur a été activé

        // Activer le transistor (et donc le relais pour allumer le ventilateur)
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
    lastDebounceTime = millis();  // Enregistre le temps du changement d'état
  }

  // Si le changement est stable pendant plus de 50 ms (anti-rebond)
  if ((millis() - lastDebounceTime) > debounceDelay) {
    // Si l'état du capteur a changé
    if (sensorReading != sensorState) {
      sensorState = sensorReading;

      // Si le capteur détecte une coupure du faisceau (LOW ou HIGH selon ton capteur)
      if (sensorState == LOW) {  // LOW si le faisceau est coupé (selon ton capteur)
        Serial.println("Signal du capteur détecté ! Activation du ventilateur...");
        fanActive = true;
        fanStartMillis = millis(); // Enregistre le moment où le ventilateur a été activé

        // Activer le transistor (et donc le relais pour allumer le ventilateur)
        digitalWrite(transistorPin, HIGH);
        Serial.println("Ventilateur activé par le capteur.");

        // Incrémenter le compteur de moustiques et afficher la valeur
        mosquitoKills++;
        Serial.print("Nombre de moustiques détectés : ");
        Serial.println(mosquitoKills);
      }
    }
  }

  // Si le ventilateur est activé, vérifier si le délai est écoulé pour l'arrêter
  if (fanActive && (millis() - fanStartMillis >= fanDuration)) {
    digitalWrite(transistorPin, LOW); // Désactiver le ventilateur
    fanActive = false;
    Serial.println("Ventilateur désactivé après délai.");
  }

  // Mémorisation des états actuels pour la prochaine boucle
  lastButtonState = buttonReading;
  lastSensorState = sensorReading;

  // Envoyer les données toutes les 30 secondes
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Lire la valeur du capteur CO2
    co2Value = analogRead(co2Pin);

    // Afficher les valeurs lues pour le débogage
    Serial.print("Valeur CO2 : ");
    Serial.println(co2Value);
    Serial.print("Nombre de moustiques détectés : ");
    Serial.println(mosquitoKills);

    // Préparer le payload pour l'envoi
    uint8_t payloadUp[4];
    payloadUp[0] = (co2Value >> 8) & 0xFF; // Octet de poids fort du CO2
    payloadUp[1] = co2Value & 0xFF;        // Octet de poids faible du CO2
    payloadUp[2] = (mosquitoKills >> 8) & 0xFF; // Octet de poids fort pour moustiques
    payloadUp[3] = mosquitoKills & 0xFF;        // Octet de poids faible pour moustiques

    // Afficher les données avant envoi
    Serial.print("Données envoyées via LoRaWAN : CO2 (");
    Serial.print(payloadUp[0], HEX); Serial.print(payloadUp[1], HEX);
    Serial.print("), Moustiques (");
    Serial.print(payloadUp[2], HEX); Serial.print(payloadUp[3], HEX);
    Serial.println(")");

    // Envoyer les données via LoRaWAN
    lorae5.sendData(payloadUp, sizeof(payloadUp));

    // Afficher un message de confirmation d'envoi
    Serial.println("Données envoyées via LoRaWAN.");

    // Réinitialiser le compteur de moustiques après envoi
    mosquitoKills = 0;
  }

  // Petite pause pour éviter une lecture trop rapide
  delay(50);
}
