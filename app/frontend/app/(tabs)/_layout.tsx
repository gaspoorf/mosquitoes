import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { StyleSheet, Alert } from 'react-native';

interface GlobalStatistics {
  totalKillsFromBeginning: number;
  totalKillsOfTheMonth: number;
  totalKillsLastMonth: number;
  totalKillsLastWeek: number;
  totalKillsLastDay: number;
  averageKillsByDay: number;
}

const serverIp = process.env.EXPO_PUBLIC_SERVER_IP;

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        header: () => <CustomHeader />, // Utilisation d'un composant personnalisé pour le header
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].backgroundWhite,
          shadowOpacity: 0, // Remove shadow
          elevation: 0, // Remove elevation (for Android)
        },
        headerTitleStyle: {
          color: Colors[colorScheme ?? 'light'].tint,
          fontSize: 64,
        },
        tabBarStyle: Platform.select({
          default: {
            backgroundColor: Colors[colorScheme ?? 'light'].backgroundWhite,
            paddingTop: 10,
            paddingBottom: 10,
            elevation: 0,
            shadowOpacity: 0,
            borderTopWidth: 0,
          },
        }),
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? 'house.fill' : 'house'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="battery"
        options={{
          title: 'Battery',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? 'battery.100' : 'battery.50'} color={color} />,
        }}
      />
    </Tabs>
  );
}


// Composant pour le header personnalisé
function CustomHeader() {
  const [globalStatistics, setGlobalStatistics] = useState<GlobalStatistics | null>(null);
  
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

    return () => {
      ws.close();
    };
  }, []);

  return (
    <ThemedView style={styles.row}>
      <ThemedView style={styles.number}>
        <ThemedText type="title">{globalStatistics ? globalStatistics.totalKillsOfTheMonth : '0'}</ThemedText>
      </ThemedView>
      <ThemedView style={styles.numbershow}>
        <ThemedText type="defaultSemiBold" style={styles.lighter}>moustiques</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.lighter}>attrapés</ThemedText>
        <ThemedText type="defaultSemiBold">ce mois-ci</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}



const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', // Alignement horizontal des éléments
    justifyContent: 'space-evenly', // Espacement entre les cartes
    alignContent: 'center',
    paddingTop: 120,
    paddingBottom: 50,
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
});