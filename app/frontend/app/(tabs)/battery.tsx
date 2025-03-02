import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
//import { useColorScheme } from '@/hooks/useColorScheme';
import { useColorScheme as RNUseColorScheme } from 'react-native';
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

const serverIp = process.env.SERVER_IP;

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [alert, setAlert] = useState('');
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
      setAlert(error.message);
      return null;
    }
  };

  function useColorScheme() {
    const scheme = RNUseColorScheme();
    return scheme === 'dark' || scheme === 'light' ? scheme : 'light'; // Valeur par défaut
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
      setAlert('Impossible de se connecter au serveur, veuillez réessayer...');
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
      <Stack.Screen options={{ title: 'Battery' }} />
      <ThemedView style={styles.container}>
      
        <ThemedView style={[styles.page, { backgroundColor: Colors[colorScheme].backgroundWhite}]}>
          <ThemedText style={styles.titlegray}>État de l’appareil</ThemedText>
          <ThemedText style={styles.lightergrey}>Appareil localisé au Bourget-du-Lac</ThemedText>

          {/* Activity Section */}
          <ThemedView style={[styles.section, { backgroundColor: Colors[colorScheme].backgroundGrey}]}>
            <ThemedText style={styles.titlegray}>Statistiques de la veille</ThemedText>
            <ThemedText>
            A été activé pendant 1h30
            </ThemedText>
            <ThemedText>Environ {/*globalStatistics ? globalStatistics.totalKillsLastDay : '0'*/}2 activations par heure</ThemedText>
          </ThemedView>

          {/* Cards Section */}
          <ThemedView style={[styles.pagerow, { backgroundColor: Colors[colorScheme].backgroundWhite}]}>
            {/* First Card - Battery */}
            <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].backgroundGrey}]}>
              <ThemedText style={styles.topLeft}>Batterie</ThemedText>
              <ThemedText style={styles.center}>{/*deviceData ? deviceData.currentBattery : '0'*/}87 %</ThemedText>
              <ThemedText style={styles.bottomCenter}>de la batterie restante</ThemedText>
            </ThemedView>

            {/* Second Card - Diffuseur */}
            <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].backgroundGrey}]}>
              <ThemedText style={styles.topLeft}>Diffuseur</ThemedText>
              <ThemedText style={styles.center}>{/*globalStatistics ? globalStatistics.CO2LastChange : '0'*/}22 h</ThemedText>
              <ThemedText style={styles.bottomCenter}>depuis dernier changement</ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Performance Section */}
          <ThemedView style={[styles.section, { backgroundColor: Colors[colorScheme].backgroundGrey}]}>
            <ThemedText style={styles.titlegray}>État du réservoir</ThemedText>
            <ThemedText>{/*globalStatistics ? globalStatistics.totalKillsLastChange : '0'*/}3 % de la capacité maximum utilisée</ThemedText>
            <ThemedText>Prévision réservoir plein dans {/*globalStatistics ? globalStatistics.PrevisionFull : '0'*/}20 h</ThemedText>
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
    borderRadius: 70, // Bordure arrondie
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