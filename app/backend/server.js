// Importer les modules nécessaires
import mqtt from 'mqtt';
import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import dotenv from 'dotenv';
import { getPayload, listRoutes } from './utils.js';
import { addMosquitoKill, getGlobalStatistics, getDeviceData } from './database/index.js';

dotenv.config();

// Configurer le broker MQTT et le port WebSocket
const mqttBrokerUrl = process.env.MQTT_BROKER_URL;
const websocketPort = process.env.WEBSOCKET_PORT;

const mqttUsername = process.env.MQTT_USERNAME;
const mqttPassword = process.env.MQTT_PASSWORD;

// Configurer le serveur Express
const http = express();
const port = process.env.HTTP_PORT;

http.get('/', (req, res) => {
    const routes = listRoutes(http);
    res.header('Access-Control-Allow-Origin', '*'); 
    res.json({ routes });
  });

http.get('/get/global-statistics', (req, res) => {
    getGlobalStatistics().then(data => {
        res.header('Access-Control-Allow-Origin', '*'); 
        res.json(data);
    });
});

http.get('/get/device-data', (req, res) => {
    getDeviceData().then(data => {
        res.header('Access-Control-Allow-Origin', '*'); 
        res.json(data);
    });
});

const server = http.listen(port, () => {
    console.log(`✅ Serveur HTTP en cours d'exécution à http://localhost:${port}`);
});

// Créer un serveur WebSocket
const wss = new WebSocketServer({ port: websocketPort });

// Écouter les connexions WebSocket
wss.on('connection', function connection(ws) {
    console.log('✅ Client WebSocket connecté');
    ws.on('error', console.error);
  
    // Send global statistics to the client as soon as it connects
    getGlobalStatistics().then(globalStatistics => {
        ws.send(JSON.stringify(globalStatistics));
    });

    ws.on('close', () => {
        console.log('❌ Client WebSocket déconnecté');
    });
});

// Établir la connexion au broker MQTT
const mqttClient = mqtt.connect(mqttBrokerUrl, {
    username: mqttUsername,
    password: mqttPassword
});

// Écouter les événements de connexion MQTT
mqttClient.on('connect', () => {
    console.log(`✅ Connecté au broker MQTT : ${mqttBrokerUrl}`);

    // S'abonner à un sujet
    const topic = 'v3/mesuceapp@ttn/devices/+/up';
    mqttClient.subscribe(topic, (err) => {
        if (!err) {
            console.log(`✅ Abonné au topic : ${topic}`);
        } else {
            console.error('❌ Erreur lors de la souscription au topic :', err);
        }
    });
});

// Écouter les messages reçus du broker MQTT
mqttClient.on('message', (topic, message) => {
    try {
        const payload = getPayload(message);

        addMosquitoKill(payload.receivedAt, payload.co2Value, payload.mosquitoesNb)
            .then(() => {
                return getGlobalStatistics();
            })
            .then(globalStatistics => {
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(globalStatistics));
                    }
                });
            })
            .catch(error => {
                console.error('Error: ', error);
            });
    } catch (error) {
        console.error('Erreur lors du traitement du message :', error);
    }
});

// Gérer les erreurs MQTT
mqttClient.on('error', (err) => {
    console.error('Erreur de connexion au broker MQTT :', err);
});


