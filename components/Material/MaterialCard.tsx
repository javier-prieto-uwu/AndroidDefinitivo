import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { limpiarPrecio } from '../../utils/materialUtils';

interface MaterialCardProps {
  material: {
    id: string;
    nombre: string;
    subtipo?: string;
    color?: string;
    cantidadRestante?: string;
    cantidad?: string;
    categoria?: string;
    precio?: string;
    precioBobina?: string;
  };
  isSelected: boolean;
  onPress: () => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material, isSelected, onPress }) => {
  const getPrecioDisplay = () => {
    const categoria = material.categoria || 'Filamento';
    let precio: string;
    switch (categoria) {
      case 'Pintura':
      case 'Aros de llavero':
        precio = material.precio || '0';
        break;
      case 'Filamento':
      case 'Resina':
      default:
        precio = material.precioBobina || material.precio || '0';
        break;
    }
    return limpiarPrecio(precio);
  };

  const getCantidadRestante = () => {
    const cantidad = typeof material.cantidadRestante !== 'undefined' 
      ? material.cantidadRestante 
      : material.cantidad || '0';
    
    const categoria = material.categoria || 'Filamento';
    let unidad = '';
    switch (categoria) {
      case 'Filamento':
      case 'Resina':
        unidad = 'g';
        break;
      case 'Pintura':
        unidad = 'ml';
        break;
      case 'Aros de llavero':
      default:
        unidad = ' unidades';
        break;
    }
    
    return cantidad + unidad;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected ? styles.selected : null
      ]}
      onPress={onPress}
    >
      <View style={[
        styles.colorIndicator,
        { backgroundColor: material.color || '#00e676' }
      ]} />
      <View style={styles.content}>
        <Text style={[
          styles.nombre,
          isSelected ? styles.nombreSelected : null
        ]} numberOfLines={1} ellipsizeMode="tail">
          {material.nombre}
        </Text>
        <Text style={[
          styles.subtipo,
          isSelected ? styles.textSelected : null
        ]} numberOfLines={1} ellipsizeMode="tail">
          {material.subtipo}
        </Text>
        <View style={styles.infoRow}>
          <Text style={[
            styles.cantidadRestante,
            isSelected ? styles.textSelected : null
          ]}>
            Restante: {getCantidadRestante()}
          </Text>
          <Text style={[
            styles.precio,
            isSelected ? styles.textSelected : null
          ]}>
            ${getPrecioDisplay()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderColor: '#333',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    minHeight: 40,
    maxWidth: '48%',
  },
  selected: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  colorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 6,
  },
  content: {
    flexShrink: 1,
  },
  nombre: {
    color: '#fff',
    fontWeight: 'normal',
    fontSize: 12,
    flexWrap: 'wrap',
  },
  nombreSelected: {
    color: '#222',
    fontWeight: 'bold',
  },
  subtipo: {
    color: '#a0a0a0',
    fontSize: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  cantidadRestante: {
    color: '#00e676',
    fontSize: 9,
    marginRight: 8,
  },
  precio: {
    color: '#ffd600',
    fontSize: 9,
  },
  textSelected: {
    color: '#333',
  },
});

export default MaterialCard; 