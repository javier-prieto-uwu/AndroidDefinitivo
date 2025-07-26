import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { limpiarPrecio } from '../../utils/materialUtils';
import { useLanguage } from '../../utils/LanguageProvider';
import translations from '../../utils/locales';

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
  const { lang } = useLanguage();
  const t = translations[lang];

  // Función para traducir subtipos
  const getSubtipoTraducido = (subtipo: string) => {
    if (!subtipo || !t) return subtipo;
    
    const subtipoMap: { [key: string]: string } = {
      // Español a traducción
      'Transparente': t.transparent,
      'transparent': t.transparent,
      'Seda': t.silk,
      'Silk': t.silk,
      'Madera': t.woodType,
      'madera': t.woodType,
      'Wood': t.woodType,
      'wood': t.woodType,
      'Normal': t.normal,
      'normal': t.normal,
      'Plus': t.plus,
      'plus': t.plus,
      'Brillante': t.glossy,
      'brillante': t.glossy,
      'Glossy': t.glossy,
      'glossy': t.glossy,
      'Mate': t.matte,
      'mate': t.matte,
      'Matte': t.matte,
      'matte': t.matte,
      'Flexible': t.flexible,
      'flexible': t.flexible,
      'Glow': t.glow,
      'glow': t.glow,
      'Metal': t.metal,
      'metal': t.metal,
      'Multicolor': t.multicolor,
      'multicolor': t.multicolor,
      'Reciclado': t.recycled,
      'reciclado': t.recycled,
      'Recycled': t.recycled,
      'recycled': t.recycled,
      'Carbono': t.carbon,
      'carbono': t.carbon,
      'Carbon': t.carbon,
      'carbon': t.carbon,
      'Magnético': t.magnetic,
      'magnético': t.magnetic,
      'Magnetic': t.magnetic,
      'magnetic': t.magnetic,
      'Conductivo': t.conductive,
      'conductivo': t.conductive,
      'Conductive': t.conductive,
      'conductive': t.conductive,
      'Alta temperatura': t.highTemperature,
      'alta temperatura': t.highTemperature,
      'High Temperature': t.highTemperature,
      'high temperature': t.highTemperature,
      'Baja temperatura': t.lowTemperature,
      'baja temperatura': t.lowTemperature,
      'Low Temperature': t.lowTemperature,
      'low temperature': t.lowTemperature,
      'Ignífugo': t.fireResistant,
      'ignífugo': t.fireResistant,
      'Fire Resistant': t.fireResistant,
      'fire resistant': t.fireResistant
    };
    
    return subtipoMap[subtipo] || subtipo;
  };
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
          {getSubtipoTraducido(material.subtipo || '')}
        </Text>
        <View style={styles.infoRow}>
          <Text style={[
            styles.cantidadRestante,
            isSelected ? styles.textSelected : null
          ]}>
            {t?.remainingQuantity || 'Restante'}: {getCantidadRestante()}
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
    alignItems: 'flex-start',
    backgroundColor: '#222',
    borderColor: '#333',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 6,
    marginVertical: 4,
    minHeight: 80,
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
    marginRight: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'space-between',
  },
  nombre: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    flexWrap: 'wrap',
    marginBottom: 3,
    lineHeight: 16,
  },
  nombreSelected: {
    color: '#222',
    fontWeight: 'bold',
  },
  subtipo: {
    color: '#a0a0a0',
    fontSize: 11,
    marginBottom: 4,
    lineHeight: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  cantidadRestante: {
    color: '#00e676',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    lineHeight: 13,
  },
  precio: {
    color: '#ffd600',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 13,
    textAlign: 'right',
  },
  textSelected: {
    color: '#333',
  },
});

export default MaterialCard;