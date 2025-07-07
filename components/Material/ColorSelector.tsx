import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ColorSelectorProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  title?: string;
  subtitle?: string;
}

const PALETA_COLORES = [
  '#222', '#fff', '#e53935', '#1e88e5', '#43a047', '#fbc02d', '#fb8c00', '#8e24aa', '#757575', '#e0e0e0', '#ffd700', '#b0b0b0', '#b87333',
  '#ff69b4', '#00bcd4', '#a1887f', '#cddc39', '#ff5722', '#607d8b', '#9c27b0', '#4caf50', '#ff9800', '#795548', '#3f51b5', '#c62828'
];

const ColorSelector: React.FC<ColorSelectorProps> = ({ 
  selectedColor, 
  onColorSelect, 
  title = "Selecciona un color:",
  subtitle 
}) => {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.colorsGrid}>
        {PALETA_COLORES.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorButton,
              { backgroundColor: color },
              selectedColor === color ? styles.selectedColor : null
            ]}
            onPress={() => onColorSelect(color)}
          >
            {selectedColor === color && (
              <Text style={[
                styles.checkmark,
                { color: color === '#fff' ? '#222' : '#fff' }
              ]}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  title: {
    color: '#a0a0a0',
    marginBottom: 4,
    fontSize: 14,
  },
  subtitle: {
    color: '#666',
    marginBottom: 4,
    fontSize: 12,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColor: {
    borderColor: '#00e676',
    borderWidth: 3,
  },
  checkmark: {
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default ColorSelector; 