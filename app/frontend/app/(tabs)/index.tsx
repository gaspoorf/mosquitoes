import { Image, Alert, StyleSheet, Platform } from 'react-native';

import { HelloWave } from '@/components/HelloWave';

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { useColorScheme as RNUseColorScheme } from 'react-native';

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface MostActiveTimeSlot {
  startHour: number;
  endHour: number;
  totalKills: number;
}

interface MostActiveTimeSlotLastDay {
  mostActiveTimeSlot: MostActiveTimeSlot;
  percentage: number;
}

interface GlobalStatistics {
  totalKillsFromBeginning: number;
  totalKillsOfTheMonth: number;
  totalKillsLastMonth: number;
  totalKillsLastWeek: number;
  totalKillsLastDay: number;
  averageKillsByDay: number;
  mostActiveTimeSlotLastDay: MostActiveTimeSlotLastDay;
}

interface DeviceData {
  currentCO2Level: number;
}

const serverIp = process.env.EXPO_PUBLIC_SERVER_IP;

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [globalStatistics, setGlobalStatistics] = useState<GlobalStatistics | null>(null);
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);

  const fetchDataStatic = async (endpoint: string) => {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data;
    } catch (error: any) {
      Alert.alert("Error", error.message);  // Show the alert popup with error message
      return null;
    }
  };

  function useColorScheme() {
    const scheme = RNUseColorScheme();
    return scheme === 'dark' || scheme === 'light' ? scheme : 'light'; // Default to 'light'
  }

  useEffect(() => {
    let ws = new WebSocket(`ws://${serverIp}:8080`);

    ws.onopen = () => {};

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data !== undefined) {
        setGlobalStatistics(data);
      } else {
        fetchDataStatic(`http://${serverIp}:8082/get/global-statistics`).then((dataApi) => {
          setGlobalStatistics(dataApi);
        });
      }
    };

    ws.onclose = () => {
      Alert.alert('Error', 'Impossible de se connecter au serveur, veuillez réessayer...'); // Display connection error
    };

    fetchDataStatic(`http://${serverIp}:8082/get/device-data`).then((data) => {
      setDeviceData(data);
    });

    const intervalId = setInterval(() => {
      fetchDataStatic(`http://${serverIp}:8082/get/device-data`).then((data) => {
        setDeviceData(data);
      });
    }, 900000);

    return () => {
      clearInterval(intervalId);
      ws.close();
    };
  }, []);

  return (
    <>
    <Stack.Screen options={{ title: 'Home' }} />
      <ThemedView style={styles.container}>

        <ThemedView style={[styles.page, { backgroundColor: Colors[colorScheme].backgroundWhite }]}>
          <ThemedText style={styles.titlegray}>Données du jour</ThemedText>
          <ThemedText style={styles.lightergrey}>Appareil localisé au Bourget-du-Lac</ThemedText>

          {/* Cards Section */}
          <ThemedView style={[styles.pagerow, { backgroundColor: Colors[colorScheme].backgroundWhite }]}>
            {/* First Card - CO2 */}
            <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].backgroundGrey }]}>
              <ThemedText style={styles.topLeft}>CO2</ThemedText>
              <ThemedText style={styles.center}>{deviceData ? deviceData.currentCO2Level : '0'} ppm</ThemedText>
              <ThemedText style={styles.bottomCenter}>concentration idéale</ThemedText>
            </ThemedView>

            {/* Second Card - Temperature */}
            <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].backgroundGrey }]}>
              <ThemedText style={styles.topLeft}>Température</ThemedText>
              <ThemedText style={styles.center}>25 °C</ThemedText>
              <ThemedText style={styles.bottomCenter}>température idéale</ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Activity Section */}
          <ThemedView style={[styles.section, { backgroundColor: Colors[colorScheme].backgroundGrey }]}>
            <ThemedText style={styles.titlegray}>Activité de la veille</ThemedText>
            <ThemedText>
              {globalStatistics && globalStatistics.mostActiveTimeSlotLastDay.percentage && globalStatistics.mostActiveTimeSlotLastDay.mostActiveTimeSlot.startHour && globalStatistics.mostActiveTimeSlotLastDay.mostActiveTimeSlot.endHour ? (
                <>
                  {globalStatistics.mostActiveTimeSlotLastDay.percentage
                    ? globalStatistics.mostActiveTimeSlotLastDay.percentage + '%'
                    : '0'}{' '}
                  des captures entre{' '}

                  {globalStatistics.mostActiveTimeSlotLastDay.mostActiveTimeSlot.startHour && globalStatistics.mostActiveTimeSlotLastDay.mostActiveTimeSlot.endHour && (
                      globalStatistics.mostActiveTimeSlotLastDay.mostActiveTimeSlot.startHour + ' h - ' + globalStatistics.mostActiveTimeSlotLastDay.mostActiveTimeSlot.endHour + ' h'
                  )}
                </>
              ) : (
                'Aucune activité enregistrée'
              )}
            </ThemedText>
            <ThemedText>{globalStatistics && globalStatistics.totalKillsLastDay > 0 ? globalStatistics.totalKillsLastDay : 'Aucuns'} moustiques tués hier</ThemedText>
          </ThemedView>

          {/* Performance Section */}
          <ThemedView style={[styles.section, { backgroundColor: Colors[colorScheme].backgroundGrey }]}>
            <ThemedText style={styles.titlegray}>Mesure de la performance</ThemedText>
            <ThemedText>{globalStatistics ? globalStatistics.averageKillsByDay : '0'} moustiques tués par jour (en moyenne)</ThemedText>
            <ThemedText>{globalStatistics ? globalStatistics.totalKillsFromBeginning : '0'} moustiques tués depuis l'installation</ThemedText>
          </ThemedView>

        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  number: {
    justifyContent: 'space-between',
    alignSelf: 'flex-end',
    fontSize: 50,
  },
  numbershow: {
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
  },
  lighter: {
    color: '#9FE6BB',
  },
  lightergrey: {
    color: '#CCC8C8',
    marginBottom: 20,
  },
  page: {
    width: 440,
    borderTopLeftRadius: 70, // Arrondi en haut à gauche
    borderTopRightRadius: 70, // Arrondi en haut à droite
    borderBottomLeftRadius: 0, // Pas d'arrondi en bas à gauche
    borderBottomRightRadius: 0, // Pas d'arrondi en bas à droite
    padding: 30, // Espacement interne
    marginLeft: 10, // Espacement interne
    marginRight: 10, // Espacement interne
    marginBottom: 20,
  },
  section: {
    borderRadius: 10, // Bordure arrondie
    padding: 15, // Espacement interne
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row', // Alignement horizontal des éléments
    justifyContent: 'space-between', // Espacement entre les cartes
    alignContent: 'center',
    gap: 10,
  },
  pagerow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    padding: 15,
    justifyContent: 'space-between',
  },
  topLeft: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CCC8C8',
  },
  center: {
    alignSelf: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
  },
  bottomCenter: {
    alignSelf: 'center',
    fontSize: 12,
  },
  titlegray: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A59F9F',
    marginBottom: 10,
  },
});
