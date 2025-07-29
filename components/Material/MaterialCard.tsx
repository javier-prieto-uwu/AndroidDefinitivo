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

  // (Las funciones de traducción se quedan igual)
  const getNombreTraducido = (nombre: string) => {
    if (!nombre || lang !== 'en') return nombre;
    const nombreMap: { [key: string]: string } = { 'Aro de llavero': 'Keychain Ring', 'Aros de llavero': 'Keychain Rings', 'Acrílica': 'Acrylic', 'Esmalte': 'Enamel', 'Spray': 'Spray', 'Óleo': 'Oil', 'Vinílica': 'Vinyl', 'Acuarela': 'Watercolor', 'Estándar': 'Standard', 'Tough (tipo ABS)': 'Tough (ABS type)', 'Flexible': 'Flexible', 'Alta temperatura': 'High Temperature', 'Dental / Biocompatible': 'Dental / Biocompatible', 'Transparente': 'Transparent', 'Fast / Rápida': 'Fast / Rapid', 'Especiales': 'Special', 'PLA': 'PLA', 'ABS': 'ABS', 'PETG': 'PETG', 'TPU': 'TPU', 'Nylon': 'Nylon', 'PC': 'PC', 'HIPS': 'HIPS', 'ASA': 'ASA', 'PVA': 'PVA', 'PP': 'PP', 'Metal': 'Metal', 'Elioq': 'Elioq' };
    if (nombreMap[nombre]) { return nombreMap[nombre]; }
    for (const [original, traduccion] of Object.entries(nombreMap)) { if (nombre.startsWith(original)) { return nombre.replace(original, traduccion); } }
    return nombre;
  };
  const getSubtipoTraducido = (subtipo: string) => {
    if (!subtipo || !t) return subtipo;
    const subtipoMap: { [key: string]: string } = { 'Transparente': t.transparent, 'transparent': t.transparent, 'Seda': t.silk, 'Silk': t.silk, 'Madera': t.woodType, 'Wood': t.woodType, 'Normal': t.normal, 'Plus': t.plus, 'Brillante': t.glossy, 'Glossy': t.glossy, 'Mate': t.matte, 'Matte': t.matte, 'Flexible': t.flexible, 'Glow': t.glow, 'Metal': t.metal, 'Multicolor': t.multicolor, 'Reciclado': t.recycled, 'Recycled': t.recycled, 'Carbono': t.carbon, 'Carbon': t.carbon, 'Magnético': t.magnetic, 'Magnetic': t.magnetic, 'Conductivo': t.conductive, 'Conductive': t.conductive, 'Alta temperatura': t.highTemperature, 'High Temperature': t.highTemperature, 'Baja temperatura': t.lowTemperature, 'Low Temperature': t.lowTemperature, 'Ignífugo': t.fireResistant, 'Fire Resistant': t.fireResistant };
    return subtipoMap[subtipo] || subtipo;
  };
  const getPrecioDisplay = () => {
    const categoria = material.categoria;
    let precio = (categoria === 'Pintura' || categoria === 'Aros de llavero') 
      ? material.precio 
      : material.precioBobina || material.precio;
    return limpiarPrecio(precio || '0');
  };

  const getCantidadRestanteDisplay = () => {
    const cantidad = material.cantidadRestante || material.cantidad || '0';
    const categoria = material.categoria;
    let unidad = 'g';
    if (categoria === 'Pintura') unidad = 'ml';
    if (categoria === 'Aros de llavero') unidad = lang === 'en' ? ' units' : ' unidades';
    return `${cantidad}${unidad}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
    >
      <View style={[styles.colorIndicator, { backgroundColor: material.color || '#00e676' }]} />
      <View style={styles.content}>
        <Text style={[styles.nombre, isSelected && styles.nombreSelected]} numberOfLines={2} ellipsizeMode="tail">
          {getNombreTraducido(material.nombre)}
        </Text>
        {material.subtipo && (material.categoria === 'Filamento' || material.categoria === t.filament) && (
          <Text style={[styles.subtipo, isSelected && styles.textSelected]} numberOfLines={1} ellipsizeMode="tail">
            {getSubtipoTraducido(material.subtipo)}
          </Text>
        )}
        <View style={styles.infoRow}>
          <Text style={[styles.label, isSelected && styles.textSelected]}>
            {t.remaining}{'\n'}
            <Text style={[styles.value, isSelected && styles.valueSelected]}>{getCantidadRestanteDisplay()}</Text>
          </Text>
          <Text style={[styles.labelPrecio, isSelected && styles.textSelected]}>
            {t.price}{'\n'}
            <Text style={[styles.valuePrecio, isSelected && styles.valueSelected]}>${getPrecioDisplay()}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // --- INICIO DE CORRECCIÓN DE ESTILOS ---
  container: {
    flex: 1, // Permite que la tarjeta se expanda para llenar su contenedor
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#222',
    borderColor: '#333',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginVertical: 4,
    minHeight: 80,
    // Se elimina maxWidth para que sea flexible y se adapte al contenedor padre
  },
  // --- FIN DE CORRECCIÓN DE ESTILOS ---
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
    minHeight: 50, // Asegura un alto mínimo para alinear el contenido
  },
  nombre: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
    lineHeight: 16,
  },
  nombreSelected: {
    color: '#222',
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
    marginTop: 'auto',
    paddingTop: 4,
  },
  label: {
    color: '#a0a0a0',
    fontSize: 9,
    fontWeight: '500',
  },
  value: {
    color: '#00e676',
    fontSize: 10,
    fontWeight: '700',
  },
  labelPrecio: {
    color: '#a0a0a0',
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'right',
  },
  valuePrecio: {
    color: '#ffd600',
    fontSize: 10,
    fontWeight: '700',
  },
  textSelected: {
    color: '#333',
  },
  valueSelected: {
    color: '#222',
  },
});

export default MaterialCard;
