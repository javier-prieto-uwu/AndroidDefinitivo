import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function WelcomeScreen({ goToLogin }) {
  return (
    <View style={styles.container}>
      <Text style={styles.appName}>3D Material</Text>
      <Text style={styles.subtitle}>dskljdfkljdfsklj</Text>
      <TouchableOpacity style={styles.startButton} onPress={goToLogin}>
        <Text style={styles.startButtonText}>comenzar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00e676',
    marginBottom: 24,
  },
  subtitle: {
    color: '#a0a0a0',
    fontSize: 20,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: '#00e676',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 