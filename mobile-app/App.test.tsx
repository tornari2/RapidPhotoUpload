import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar style="light" />
      <Text style={{ color: '#fff', fontSize: 24 }}>Hello World + StatusBar</Text>
    </View>
  );
}

