// import mqtt from 'mqtt';

// const options = {
//   clientId: `clientId-${Math.random().toString(16).substr(2, 8)}`,
//   username: 'mesuceapp@ttn',
//   password: 'NNSXS.OB4UYBGJJ5TEHLTWX6WRJEDTOQEIHXXG25JNS3A.BJNRL4NHMDTMLCT7EUJ7FEFVNREBJ6FM6LSPLCRPFXMTXBGONKJA'
// };

// let client;

// export const connectMQTT = () => {
//   const url = 'mqtt://eu1.cloud.thethings.network:1883';
//   client = mqtt.connect(url, options);

//   client.on('connect', () => {
//     console.log('Connected to MQTT broker');
//     subscribeMQTT('v3/mesuceapp@ttn/devices/+/up');
//   });

//   client.on('error', (err) => {
//     console.error('Connection error: ', err);
//   });

//   client.on('message', (topic, message) => {
//     console.log(`Received message: ${message.toString()} from topic: ${topic}`);
//   });

//   client.on('close', () => {
//     console.log('MQTT connection closed');
//   });

//   return client;
// };

// export const subscribeMQTT = (topic) => {
//   if (client) {
//     client.subscribe(topic, (err) => {
//       if (!err) {
//         console.log(`Subscribed to topic: ${topic}`);
//       } else {
//         console.error(`Subscription error: ${err}`);
//       }
//     });
//   }
// };

// export const disconnectMQTT = (client) => {
//   if (client) {
//     client.end();
//   }
// };


import AsyncStorage from '@react-native-async-storage/async-storage';
import init from 'react_native_mqtt';

init({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: 1000 * 3600 * 24,
  enableCache: true,
  sync : {}
});

// Connect to the MQTT broker
export const connect = () => {
  client.connect({
    onSuccess: client.onConnect,
    useSSL: false,
    timeout: 3,
    onFailure: client.onFailure,
  });
};

// Subscribe to a topic
export const subscribeTopic = (topic) => {
  client.subscribe(topic, { qos: 0 });
};

// Unsubscribe from a topic
export const unsubscribeTopic = (topic) => {
  client.unsubscribe(topic);
};

// Send a message
export const sendMessage = (topic, message) => {
  const msg = new Paho.MQTT.Message(message);
  msg.destinationName = topic;
  client.send(msg);
};