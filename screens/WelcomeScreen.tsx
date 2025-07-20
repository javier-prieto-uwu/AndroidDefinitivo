import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function WelcomeScreen({ goToLogin }) {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo3dmaterial.png')} style={styles.logo} />
      <Text style={styles.subtitle}>El mejor sistema gestor de materiales de impresión 3D</Text>
      <TouchableOpacity style={styles.startButton} onPress={goToLogin}>
        <Text style={styles.startButtonText}>Comenzar</Text>
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
    marginBottom:100
    // marginTop: 50, // Eliminado para subir el contenido
  },
  logo: {
    width: 360,
    height: 360, // Reducido para acercar el subtítulo
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00e676',
    marginBottom: 24,
  },
  subtitle: {
    color: '#a0a0a0',
    fontSize: 22,
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
    margin: 20,
    marginTop: -70, // Eliminado para evitar solapamiento y subir el contenido
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