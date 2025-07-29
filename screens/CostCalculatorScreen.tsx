import { Picker } from '@react-native-picker/picker';
import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, app } from '../api/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialList } from '../components/Material';
import { useMateriales } from '../hooks/useMateriales';
import { useCostCalculator } from '../hooks/useCostCalculator';
import { useLanguage } from '../utils/LanguageProvider';
import { getCurrency } from '../utils';
import translations from '../utils/locales';
import { limpiarPrecio } from '../utils/materialUtils';

const db = getFirestore(app);

// Define el tipo de proyecto para incluir 'archivado'
type Proyecto = {
  id: string;
  nombre: string;
  fechaCreacion?: string;
  archivado?: boolean;
};

// Dentro de CostCalculatorScreen, antes del return
const getStockUnidades = (material) => {
  if (!material) return 0;
  if (material.categoria === 'Filamento' || material.categoria === 'Resina') {
    const restante = parseFloat(material.cantidadRestante || '0');
    // CORRECCIÓN: Se añade "(material as any)" para evitar el error de TypeScript
    const pesoPorUnidad = parseFloat((material as any).peso || (material as any).pesoBobina || '1');
    if (pesoPorUnidad <= 0) return 0;
    return Math.ceil(restante / pesoPorUnidad);
  }
  return Math.floor(parseFloat(material.cantidadRestante || material.cantidad || '0'));
};

// MAPEO DE TRADUCCIÓN PARA SUBTIPOS EN UI (definido globalmente)
const SUBTIPOS_FILAMENTO_UI = {
  'Normal': 'Normal',
  'Silk': 'Silk',
  'Plus': 'Plus',
  'Madera': 'Wood',
  'Brillante': 'Shiny',
  'Mate': 'Matte',
  'Flexible': 'Flexible',
  'Glow': 'Glow',
  'Metal': 'Metal',
  'Transparente': 'Transparent',
  'Multicolor': 'Multicolor',
  'Reciclado': 'Recycled',
  'Carbono': 'Carbon',
  'Alta temperatura': 'High Temperature',
  'Ignífugo': 'Fireproof',
  'Vidrio': 'Glass',
  '85A': '85A',
  '95A': '95A',
};

// MAPEO DE TRADUCCIÓN PARA TIPOS EN UI (definido globalmente)
const TIPOS_FILAMENTO_UI = {
  'PLA': 'PLA',
  'ABS': 'ABS',
  'PETG': 'PETG',
  'TPU': 'TPU',
  'Nylon': 'Nylon',
  'PC': 'PC',
  'HIPS': 'HIPS',
  'ASA': 'ASA',
  'PVA': 'PVA',
  'PP': 'PP',
  'Wood': 'Wood',
  'Metal': 'Metal',
  'Flexible': 'Flexible',
};

// MAPEO DE TRADUCCIÓN PARA TIPOS DE RESINA EN UI (definido globalmente)
const TIPOS_RESINA_UI = {
  'Estándar': 'Standard',
  'Tough (tipo ABS)': 'Tough',
  'Flexible': 'Flexible Resin',
  'Alta temperatura': 'High Temp Resin',
  'Dental / Biocompatible': 'Dental',
  'Transparente': 'Transparent Resin',
  'Rápida': 'Fast',
  'Especiales': 'Special',
};

// MAPEO DE TRADUCCIÓN PARA TIPOS DE PINTURA EN UI (definido globalmente)
const TIPOS_PINTURA_UI = {
  'Acrílica': 'Acrylic',
  'Esmalte': 'Enamel',
  'Spray': 'Spray',
  'Óleo': 'Oil',
  'Vinílica': 'Vinyl',
  'Acuarela': 'Watercolor',
};

// MAPEO DE TRADUCCIÓN PARA COLORES EN UI (definido globalmente)
const COLORES_UI = {
  'Negro': 'Black',
  'Blanco': 'White',
  'Rojo': 'Red',
  'Rojo Oscuro': 'Dark Red',
  'Rosa': 'Pink',
  'Rosa Claro': 'Light Pink',
  'Naranja': 'Orange',
  'Naranja Claro': 'Light Orange',
  'Amarillo': 'Yellow',
  'Amarillo Claro': 'Light Yellow',
  'Verde': 'Green',
  'Verde Claro': 'Light Green',
  'Verde Azulado': 'Teal',
  'Azul': 'Blue',
  'Azul Claro': 'Light Blue',
  'Azul Oscuro': 'Dark Blue',
  'Índigo': 'Indigo',
  'Morado': 'Purple',
  'Morado Claro': 'Light Purple',
  'Violeta': 'Violet',
  'Gris': 'Gray',
  'Gris Claro': 'Light Gray',
  'Gris Oscuro': 'Dark Gray',
  'Marrón': 'Brown',
  'Marrón Claro': 'Light Brown',
  'Beige': 'Beige',
  'Transparente': 'Transparent',
  'Oro': 'Gold',
  'Plata': 'Silver',
  'Cobre': 'Copper',
  'Bronce': 'Bronze',
  'Turquesa': 'Turquoise',
  'Coral': 'Coral',
  'Lavanda': 'Lavender',
  'Menta': 'Mint',
  'Melocotón': 'Peach',
  'Lima': 'Lime',
  'Cian': 'Cyan',
  'Magenta': 'Magenta',
};

// Funciones de traducción globales
const getSubtipoTraducido = (subtipo: string, t?: any) => {
  if (!t) return SUBTIPOS_FILAMENTO_UI[subtipo] || subtipo;
  
  const mapping = {
    'Normal': t.normal,
    'normal': t.normal,
    'Silk': t.silk,
    'Seda': t.silk,
    'silk': t.silk,
    'seda': t.silk,
    'Plus': t.plus,
    'plus': t.plus,
    'Madera': t.woodType,
    'madera': t.woodType,
    'Wood': t.woodType,
    'wood': t.woodType,
    'Brillante': t.shiny,
    'brillante': t.shiny,
    'Glossy': t.shiny,
    'glossy': t.shiny,
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
    'Transparente': t.transparent,
    'transparent': t.transparent,
    'Transparent': t.transparent,
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
    'Alta temperatura': t.highTemperature,
    'alta temperatura': t.highTemperature,
    'High Temperature': t.highTemperature,
    'high temperature': t.highTemperature,
    'Ignífugo': t.fireproof,
    'ignífugo': t.fireproof,
    'Fire Resistant': t.fireproof,
    'fire resistant': t.fireproof,
    'Vidrio': t.glass,
    'vidrio': t.glass,
    'Glass': t.glass,
    'glass': t.glass,
    '85A': '85A',
    '95A': '95A',
  };
  return mapping[subtipo] || subtipo;
};

const getTipoTraducido = (tipo: string, t?: any) => {
  if (!t) return TIPOS_FILAMENTO_UI[tipo] || TIPOS_RESINA_UI[tipo] || TIPOS_PINTURA_UI[tipo] || tipo;
  
  const filamentoMapping = {
    'PLA': t.pla,
    'ABS': t.abs,
    'PETG': t.petg,
    'TPU': t.tpu,
    'Nylon': t.nylon,
    'PC': t.pc,
    'HIPS': t.hips,
    'ASA': t.asa,
    'PVA': t.pva,
    'PP': t.pp,
    'Madera': t.wood,
    'Metal': t.metal,
    'Flexible': t.flexible,
  };
  
  const resinaMapping = {
    'Estándar': t.standard,
    'Standard': t.standard,
    'Tough (tipo ABS)': t.tough,
    'Flexible': t.flexibleResin,
    'Alta temperatura': t.highTempResin,
    'High Temperature': t.highTempResin,
    'Dental / Biocompatible': t.dental,
    'Transparente': t.transparentResin,
    'Transparent': t.transparentResin,
    'Rápida': t.fast,
    'Fast': t.fast,
    'Especiales': t.special,
    'Special': t.special,
  };
  
  const pinturaMapping = {
    'Acrílica': t.acrylic,
    'Acrylic': t.acrylic,
    'Esmalte': t.enamel,
    'Enamel': t.enamel,
    'Spray': t.spray,
    'Óleo': t.oil,
    'Oil': t.oil,
    'Vinílica': t.vinyl,
    'Vinyl': t.vinyl,
    'Acuarela': t.watercolor,
    'Watercolor': t.watercolor,
  };
  
  return filamentoMapping[tipo] || resinaMapping[tipo] || pinturaMapping[tipo] || tipo;
};

const getColorTraducido = (color: string, t?: any) => {
  if (!t) return COLORES_UI[color] || color;
  
  const mapping = {
    'Negro': t.black,
    'Blanco': t.white,
    'Rojo': t.red,
    'Rojo Oscuro': t.darkRed,
    'Rosa': t.pink,
    'Rosa Claro': t.lightPink,
    'Naranja': t.orange,
    'Naranja Claro': t.lightOrange,
    'Amarillo': t.yellow,
    'Amarillo Claro': t.lightYellow,
    'Verde': t.green,
    'Verde Claro': t.lightGreen,
    'Verde Azulado': t.teal,
    'Azul': t.blue,
    'Azul Claro': t.lightBlue,
    'Azul Oscuro': t.darkBlue,
    'Índigo': t.indigo,
    'Morado': t.purple,
    'Morado Claro': t.lightPurple,
    'Violeta': t.violet,
    'Gris': t.gray,
    'Gris Claro': t.lightGray,
    'Gris Oscuro': t.darkGray,
    'Marrón': t.brown,
    'Marrón Claro': t.lightBrown,
    'Beige': t.beige,
    'Transparente': t.transparentColor,
    'Oro': t.gold,
    'Plata': t.silver,
    'Cobre': t.copper,
    'Bronce': t.bronze,
    'Turquesa': t.turquoise,
    'Coral': t.coral,
    'Lavanda': t.lavender,
    'Menta': t.mint,
    'Melocotón': t.peach,
    'Lima': t.lime,
    'Cian': t.cyan,
    'Magenta': t.magenta,
  };
  return mapping[color] || color;
};

// Añadir función de traducción de categoría al inicio del archivo (después de imports y antes de componentes):
const getCategoriaTraducida = (categoria, t) => {
  switch (categoria) {
    case 'Filamento':
    case t.filament:
      return t.filament;
    case 'Resina':
    case t.resin:
      return t.resin;
    case 'Pintura':
    case t.paint:
      return t.paint;
    case 'Aros de llavero':
    case t.keychainRings:
      return t.keychainRings;
    default:
      return categoria;
  }
};

// Componente para seleccionar materiales múltiples
const MaterialMultipleSelector: React.FC<{
  index: number;
  materialesGuardados: any[];
  onMaterialChange: (index: number, material: any) => void;
  materialSeleccionado: any;
}> = ({ index, materialesGuardados, onMaterialChange, materialSeleccionado }) => {
  const { lang } = useLanguage();
  const t = translations[lang];

  const getNombreTraducido = (nombre: string) => {
    if (!nombre || lang !== 'en') return nombre;
    
    const nombreMap: { [key: string]: string } = {
      // Productos específicos
      'Aro de llavero': 'Keychain Ring',
      'Aros de llavero': 'Keychain Rings',
      // Tipos de pintura
      'Acrílica': 'Acrylic',
      'Esmalte': 'Enamel',
      'Spray': 'Spray',
      'Óleo': 'Oil',
      'Vinílica': 'Vinyl',
      'Acuarela': 'Watercolor',
      // Tipos de resina
      'Estándar': 'Standard',
      'Tough (tipo ABS)': 'Tough (ABS type)',
      'Flexible': 'Flexible',
      'Alta temperatura': 'High Temperature',
      'Dental / Biocompatible': 'Dental / Biocompatible',
      'Transparente': 'Transparent',
      'Fast / Rápida': 'Fast / Rapid',
      'Especiales': 'Special',
      // Tipos de filamento
      'PLA': 'PLA',
      'ABS': 'ABS',
      'PETG': 'PETG',
      'TPU': 'TPU',
      'Nylon': 'Nylon',
      'PC': 'PC',
      'HIPS': 'HIPS',
      'ASA': 'ASA',
      'PVA': 'PVA',
      'PP': 'PP',
      'Metal': 'Metal',
      'Elioq': 'Elioq'
    };
    
    // Buscar traducción exacta primero
    if (nombreMap[nombre]) {
      return nombreMap[nombre];
    }
    
    // Si no encuentra traducción exacta, buscar por el nombre base
    for (const [original, traduccion] of Object.entries(nombreMap)) {
      if (nombre.startsWith(original)) {
        return nombre.replace(original, traduccion);
      }
    }
    
    return nombre;
  };

  const getPrecioDisplay = (mat: any) => {
    const categoria = mat.categoria || t.filament;
    let precio: string;
    switch (categoria) {
      case t.paint:
      case t.keychainRings:
        precio = mat.precio || '0';
        break;
      default:
        precio = mat.precioBobina || mat.precio || '0';
        break;
    }
    return limpiarPrecio(precio);
  };

// Función para obtener la unidad del material
const getUnidadMaterial = (categoria: string) => {
  switch (categoria) {
    case 'Filamento':
    case 'Resina':
      return 'g';
    case 'Pintura':
      return 'ml';
    case 'Aros de llavero':
      return lang === 'en' ? ' units' : ' unidades';
    default:
      // Se asume 'g' por defecto para cualquier otra categoría personalizada.
      return 'g';
  }
};

  const getCantidadRestante = (mat: any) => {
    const cantidad = typeof mat.cantidadRestante !== 'undefined' 
      ? mat.cantidadRestante 
      : mat.cantidad || '0';
    return cantidad + getUnidadMaterial(mat.categoria);
  };

  const renderMaterialCard = (mat: any) => {
    const isSelected = materialSeleccionado?.id === mat.id;
    
    return (
      <TouchableOpacity
        key={mat.id}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: isSelected ? '#00e676' : '#222',
          borderColor: isSelected ? '#00e676' : '#333',
          borderWidth: 2,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginHorizontal: 6,
          marginVertical: 4,
          minHeight: 40,
          maxWidth: '48%',
        }}
        onPress={() => onMaterialChange(index, mat)}
      >
        <View style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: mat.color || '#00e676',
          borderWidth: 1,
          borderColor: '#333',
          marginRight: 10,
          marginTop: 2,
        }} />
        <View style={{ flex: 1, flexShrink: 1, justifyContent: 'space-between' }}>
          <Text style={{
            color: isSelected ? '#222' : '#fff',
            fontWeight: 'bold',
            fontSize: 13,
            flexWrap: 'wrap',
            marginBottom: 3,
            lineHeight: 16,
          }} numberOfLines={1} ellipsizeMode="tail">
            {getNombreTraducido(mat.nombre)}
          </Text>
          {mat.subtipo && mat.categoria === t.filament && (
            <Text style={{
              color: isSelected ? '#333' : '#a0a0a0',
              fontSize: 11,
              marginBottom: 4,
              lineHeight: 14,
            }} numberOfLines={1} ellipsizeMode="tail">
              {getSubtipoTraducido(mat.subtipo, t)}
            </Text>
          )}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginTop: 2,
          }}>
            <Text style={{
              color: isSelected ? '#333' : '#a0a0a0',
              fontSize: 9,
              fontWeight: '500',
              marginRight: 2,
            }}>
              {lang === 'en' ? 'Remaining: ' : 'Restante: '}{"\n"}
              <Text style={{
                color: isSelected ? '#222' : '#00e676',
                fontSize: 10,
                fontWeight: '700',
              }}>{getCantidadRestante(mat)}</Text>
            </Text>
            <Text style={{
              color: isSelected ? '#333' : '#a0a0a0',
              fontSize: 9,
              fontWeight: '500',
              marginRight: 2,
              textAlign: 'right',
            }}>
              {lang === 'en' ? 'Price: ' : 'Precio: '}{"\n"}
              <Text style={{
                color: isSelected ? '#222' : '#ffd600',
                fontSize: 10,
                fontWeight: '700',
              }}>${getPrecioDisplay(mat)}</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Función para obtener el campo de cantidad según el tipo de material
const getCampoCantidad = (categoria: string) => {
  switch (categoria) {
    case 'Filamento':
    case 'Resina':
      return 'gramosUtilizados';
    case 'Pintura':
      return 'cantidadPintura';
    case 'Aros de llavero':
      return 'cantidadLlaveros';
    default:
      return 'cantidadUtilizada';
  }
};

  // Función para obtener el label según el tipo de material
// Función para obtener el label según el tipo de material
const getLabelCantidad = (categoria: string) => {
  switch (categoria) {
    case 'Filamento':
    case 'Resina':
      return t.usedGrams;
    case 'Pintura':
      return t.usedMl;
    case 'Aros de llavero':
      return t.usedQuantity;
    default:
      return t.usedQuantity;
  }
};




  // Función para obtener el placeholder según el tipo de material
  const getPlaceholderCantidad = (categoria: string) => {
    switch (categoria) {
      case t.filament:
      case t.resin:
        return t.gramsExample;
      case t.paint:
        return t.quantityExample;
      case t.keychainRings:
        return t.unitsExample;
      default:
        return 'Ej: 1';
    }
  };

  // Función para obtener la información del material según su tipo
const getInfoMaterial = (material: any) => {
  const categoria = material.categoria;
  const campoCantidad = getCampoCantidad(categoria);
  const cantidad = material[campoCantidad] || '0';

  // 👇 LA CORRECCIÓN ESTÁ EN ESTOS 'CASE' 👇
  switch (categoria) {
    case 'Filamento':
    case 'Resina':
      const pesoTotalDisponible = typeof material.cantidadRestante !== 'undefined' 
        ? material.cantidadRestante 
        : ((parseFloat(material.cantidad || '0')) * (parseFloat(material.pesoBobina || material.peso || '0'))).toString();
      
      return {
        precio: limpiarPrecio(material.precioBobina || material.precio || '0.00'),
        peso: pesoTotalDisponible,
        unidad: getUnidadMaterial(categoria),
        labelPeso: t.remainingQuantity,
        labelCosto: t.materialCost
      };

    case 'Pintura':
      return {
        precio: limpiarPrecio(material.precio || '0.00'),
        peso: material.cantidadRestante || material.cantidad || '0', 
        unidad: getUnidadMaterial(categoria),
        labelPeso: t.remainingQuantity,
        labelCosto: t.materialCost
      };

    case 'Aros de llavero':
      return {
        precio: limpiarPrecio(material.precio || '0.00'),
        peso: material.cantidadRestante || material.cantidad || '0',
        unidad: getUnidadMaterial(categoria),
        labelPeso: t.availableQuantity,
        labelCosto: t.materialCost
      };

    default:
      return {
        precio: limpiarPrecio(material.precio || '0.00'),
        peso: material.cantidadRestante || material.cantidad || '0',
        unidad: lang === 'en' ? ' units' : ' unidades',
        labelPeso: t.remainingQuantity,
        labelCosto: t.materialCost
      };
  }
};

  const renderMaterialGroup = (tipo: string, materiales: any[]) => {
    const filas = [];
    for (let i = 0; i < materiales.length; i += 2) {
      filas.push(materiales.slice(i, i + 2));
    }
    
    return (
      <View key={tipo} style={{ marginBottom: 8 }}>
        <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{tipo}</Text>
        {filas.map((fila, idx) => (
          <View key={idx} style={{ flexDirection: 'row', marginBottom: 4, justifyContent: 'center', alignSelf: 'center', maxWidth: 340, width: '100%' }}>
            {fila.map(renderMaterialCard)}
            {fila.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>
    );
  };

  const agruparMaterialesPorTipo = () => {
    const matsPorTipo: { [tipo: string]: any[] } = {};
    materialesGuardados.forEach(mat => {
      const tipo = mat.tipo || 'Sin tipo';
      if (!matsPorTipo[tipo]) matsPorTipo[tipo] = [];
      matsPorTipo[tipo].push(mat);
    });
    return matsPorTipo;
  };

const calcularCostoMaterial = () => {
  if (!materialSeleccionado) return '0.00';

  const categoria = materialSeleccionado.categoria;
  const campoCantidad = getCampoCantidad(categoria); // Usamos la función corregida de abajo
  const cantidadUtilizada = parseFloat(materialSeleccionado[campoCantidad] || '0');

  // 👇 Usamos los nombres fijos de las categorías en español 👇
  switch (categoria) {
    case 'Filamento':
    case 'Resina': {
      const precioBobina = parseFloat(limpiarPrecio(materialSeleccionado.precioBobina || materialSeleccionado.precio || '0'));
      const pesoBobina = parseFloat(materialSeleccionado.pesoBobina || materialSeleccionado.peso || '0');
      if (!precioBobina || !pesoBobina || !cantidadUtilizada || pesoBobina <= 0) return '0.00';
      const costoPorGramo = precioBobina / pesoBobina;
      const costoFilamento = costoPorGramo * cantidadUtilizada;
      return isNaN(costoFilamento) || !isFinite(costoFilamento) ? '0.00' : costoFilamento.toFixed(2);
    }
    case 'Pintura': {
      const precioPintura = parseFloat(limpiarPrecio(materialSeleccionado.precio || '0'));
      const cantidadTotalPintura = parseFloat(materialSeleccionado.cantidad || '0');
      const mlUtilizados = parseFloat(materialSeleccionado.cantidadPintura || '0');
      if (!precioPintura || !cantidadTotalPintura || !mlUtilizados || cantidadTotalPintura <= 0) return '0.00';
      const costoPorMl = precioPintura / cantidadTotalPintura;
      const costoPintura = costoPorMl * mlUtilizados;
      return isNaN(costoPintura) || !isFinite(costoPintura) ? '0.00' : costoPintura.toFixed(2);
    }
    case 'Aros de llavero': {
      const precioLlavero = parseFloat(limpiarPrecio(materialSeleccionado.precio || '0'));
      const cantidadUtilizada = parseFloat(materialSeleccionado.cantidadLlaveros || '0');
      const costoLlaveros = precioLlavero * cantidadUtilizada;
      return isNaN(costoLlaveros) || !isFinite(costoLlaveros) ? '0.00' : costoLlaveros.toFixed(2);
    }
    default: {
      const precio = parseFloat(limpiarPrecio(materialSeleccionado.precio || '0'));
      // Asegurarse de que 'cantidadUtilizada' exista como campo en el default
      const cantidad = parseFloat(materialSeleccionado.cantidadUtilizada || '0');
      const costoDefault = precio * cantidad;
      return isNaN(costoDefault) || !isFinite(costoDefault) ? '0.00' : costoDefault.toFixed(2);
    }
  }
};

  const handleCantidadChange = (text: string) => {
    const categoria = materialSeleccionado.categoria;
    const campoCantidad = getCampoCantidad(categoria);
    
    const materialActualizado = { 
      ...materialSeleccionado, 
      [campoCantidad]: text,
    };
    onMaterialChange(index, materialActualizado);
  };

  const handleBlur = () => {
    const categoria = materialSeleccionado.categoria;
    const campoCantidad = getCampoCantidad(categoria);
    if (!materialSeleccionado[campoCantidad] || materialSeleccionado[campoCantidad] === '') {
      handleCantidadChange('0');
    }
  };

  return (
    <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#222', borderRadius: 8 }}>
      <Text style={{ color: '#00e676', fontWeight: 'bold', marginBottom: 8 }}>{t.material} {index + 1}</Text>
      
      <View style={{ flexDirection: 'column', flexWrap: 'wrap', marginBottom: 8 }}>
        {materialesGuardados.length === 0 ? (
          <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 10 }}>{t.noSavedMaterials}</Text>
        ) : (
          Object.entries(agruparMaterialesPorTipo()).map(([tipo, materiales]) => 
            renderMaterialGroup(tipo, materiales)
          )
        )}
      </View>

      {materialSeleccionado && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#fff', fontSize: 12, marginBottom: 4 }}>
            {getLabelCantidad(materialSeleccionado.categoria)} para {materialSeleccionado.nombre}:
          </Text>
          <TextInput
            style={styles.input}
            value={materialSeleccionado[getCampoCantidad(materialSeleccionado.categoria)] ?? ''}
            onChangeText={handleCantidadChange}
            onBlur={handleBlur}
            placeholder={getPlaceholderCantidad(materialSeleccionado.categoria)}
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            maxLength={10}
          />
          
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#fff', fontSize: 11, marginBottom: 4 }}>{t.materialInfo}</Text>
            
            {(() => {
              const info = getInfoMaterial(materialSeleccionado);
              return (
                <>
                  <View style={styles.infoDisplayContainer}>
                    <View style={styles.infoDisplayRow}>
                      <Ionicons name="cash-outline" size={14} color="#ffd600" />
                      <Text style={[styles.infoDisplayText, { fontSize: 12 }]}>
                        ${info.precio} ${getCurrency(lang)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoDisplayContainer}>
                    <View style={styles.infoDisplayRow}>
                      <Ionicons name="scale-outline" size={14} color="#00e676" />
                      <Text style={[styles.infoDisplayText, { fontSize: 12 }]}>
                        {info.peso} {info.unidad}
                      </Text>
                    </View>
                  </View>
                </>
              );
            })()}
          </View>

          <View style={{ backgroundColor: '#222', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: '#a0a0a0', fontSize: 12, marginBottom: 4 }}>
              {getInfoMaterial(materialSeleccionado).labelCosto}:
            </Text>
            <Text style={{ color: '#00e676', fontSize: 18, fontWeight: 'bold' }}>
              ${calcularCostoMaterial()} ${getCurrency(lang)}
            </Text>
            <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>
              {t.usedAmount.replace('{amount}', materialSeleccionado[getCampoCantidad(materialSeleccionado.categoria)] || '0').replace('{unit}', getUnidadMaterial(materialSeleccionado.categoria))}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const CostCalculatorScreen: React.FC = () => {
  const { lang } = useLanguage();
  const t = translations[lang];
  // Usar hooks para materiales y cálculo de costos
  const { materiales: materialesGuardados, loading: cargandoMateriales, error: errorMateriales } = useMateriales();
  const {
    calculo,
    setCalculo,
    esMultifilamento,
    setEsMultifilamento,
    cantidadMateriales,
    setCantidadMateriales,
    limpiarFormulario: limpiarFormularioHook,
    calcularCostoFilamento: calcularCostoFilamentoHook,
    calcularManoObra: calcularManoObraHook,
    calcularAvanzado: calcularAvanzadoHook,
    getTotal: getTotalHook,
    getProduccion: getProduccionHook,
  } = useCostCalculator({ materialesGuardados, proyectos: [] });

  // Estados locales que no están en el hook
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [verMasMateriales, setVerMasMateriales] = useState(false);
  const [mostrarDetallesImpresion, setMostrarDetallesImpresion] = useState(false);
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);
  const [porcentajeGanancia, setPorcentajeGanancia] = useState(30);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [descontarCantidad, setDescontarCantidad] = useState(true);
  const [descontarCantidadMultiples, setDescontarCantidadMultiples] = useState(true);
  const [descontarMaterialesIndividuales, setDescontarMaterialesIndividuales] = useState<{ [key: string]: boolean }>({});

  // Estados para proyectos
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null);
  const [crearProyectoModal, setCrearProyectoModal] = useState(false);
  const [nuevoProyectoNombre, setNuevoProyectoNombre] = useState('');
  const [proyectoAEliminar, setProyectoAEliminar] = useState<Proyecto | null>(null);
  const [modalEliminarProyecto, setModalEliminarProyecto] = useState(false);

    const tiposFilamento = [
    t.pla, t.abs, t.petg, t.tpu, t.nylon, t.resin, t.hips,
    t.pc, t.flexible, t.wood
  ];

  // Subtipos de filamento (igual que en agregarM)
  const subtiposFilamento = [
    { tipo: 'PLA', subtipos: ['Normal', 'Silk', 'Plus', 'Madera', 'Brillante', 'Mate', 'Flexible', 'Glow', 'Metal', 'Transparente', 'Multicolor', 'Reciclado', 'Carbono', 'Magnético', 'Conductivo', 'Alta temperatura', 'Baja temperatura'] },
    { tipo: 'ABS', subtipos: ['Normal', 'Plus', 'Reciclado', 'Transparente', 'Ignífugo', 'Carbono'] },
    { tipo: 'PETG', subtipos: ['Normal', 'Transparente', 'Reciclado', 'Carbono'] },
    { tipo: 'TPU', subtipos: ['85A', '95A', 'Flexible', 'Transparente'] },
    { tipo: 'Nylon', subtipos: ['Normal', 'Carbono', 'Vidrio'] },
    { tipo: 'PC', subtipos: ['Normal', 'Carbono'] },
    { tipo: 'HIPS', subtipos: ['Normal'] },
    { tipo: 'ASA', subtipos: ['Normal'] },
    { tipo: 'PVA', subtipos: ['Normal'] },
    { tipo: 'PP', subtipos: ['Normal'] },
    { tipo: 'Metal', subtipos: ['Normal'] },
    { tipo: 'Flexible', subtipos: ['Normal'] },
    { tipo: 'Conductivo', subtipos: ['Normal'] },
  ];



  // El hook useMateriales ya maneja la carga automática de materiales

  // Cargar proyectos al montar
  useEffect(() => {
    const cargarProyectos = async () => {
      const user = auth.currentUser;
      if (!user) {
        setProyectos([]);
        return;
      }
      try {
        const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos'));
        const datos: Proyecto[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nombre: data.nombre || '',
            fechaCreacion: data.fechaCreacion,
            archivado: data.archivado || false,
          };
        });
        setProyectos(datos.filter(p => !p.archivado));
      } catch (e) {
        setProyectos([]);
      }
    };
    cargarProyectos();
    setProyectoSeleccionado(null); // Reiniciar selección de carpeta al entrar
  }, []);

  // Recalcular costo de materiales múltiples cuando cambien
  useEffect(() => {
    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      calcularCostoFilamento();
    }
  }, [calculo.materialesMultiples, esMultifilamento]);

  // Recalcular cuando cambien los checkboxes individuales
  useEffect(() => {
    if (esMultifilamento && Object.keys(descontarMaterialesIndividuales).length > 0) {
      calcularCostoFilamento();
    }
  }, [descontarMaterialesIndividuales, esMultifilamento]);

  // Handlers para actualizar el objeto de cálculo
  const handleFilamentoChange = (name: string, value: string) => {
    setCalculo(prev => ({
      ...prev,
      filamento: {
        ...prev.filamento,
        [name]: value
      }
    }));
  };

  const handleManoObraChange = (name: string, value: string) => {
    setCalculo(prev => ({
      ...prev,
      manoObra: {
        ...prev.manoObra,
        [name]: value
      }
    }));
  };

  const handleAvanzadoChange = (name: string, value: string) => {
    setCalculo(prev => ({
      ...prev,
      avanzados: {
        ...prev.avanzados,
        [name]: value
      }
    }));
  };

  const handleDetallesImpresionChange = (name: string, value: string) => {
    setCalculo(prev => ({
      ...prev,
      detallesImpresion: {
        ...prev.detallesImpresion,
        [name]: value
      }
    }));
  };

  // Función para calcular el costo total de materiales múltiples
  const calcularCostoMaterialesMultiples = () => {
    if (!esMultifilamento || !calculo.materialesMultiples?.length) return 0;
    
    return calculo.materialesMultiples.reduce((total, material) => {
      if (!material) return total;
      
      const categoria = material.categoria;
      let costo = 0;
      
      switch (categoria) {
        case 'Filamento':
        case 'Resina':
          if (material.precioBobina && material.pesoBobina && material.gramosUtilizados) {
            const costoPorGramo = parseFloat(limpiarPrecio(material.precioBobina)) / parseFloat(material.pesoBobina);
            costo = costoPorGramo * parseFloat(material.gramosUtilizados);
          }
          break;
        case 'Pintura':
          if (material.precio && material.cantidad && material.cantidadPintura) {
            const cantidadTotalPintura = parseFloat(material.cantidad);
            const mlUtilizados = parseFloat(material.cantidadPintura);
            const costoPorMl = parseFloat(limpiarPrecio(material.precio)) / cantidadTotalPintura;
            costo = costoPorMl * mlUtilizados;
          }
          break;
        case 'Aros de llavero':
          if (material.precio && material.cantidadLlaveros) {
            costo = parseFloat(limpiarPrecio(material.precio)) * parseFloat(material.cantidadLlaveros);
          }
          break;
        default:
          if (material.precio && material.cantidadUtilizada) {
            costo = parseFloat(limpiarPrecio(material.precio)) * parseFloat(material.cantidadUtilizada);
          }
      }
      
      return total + costo;
    }, 0);
  };

  // Función para manejar el checkbox individual de descuento de materiales
  const handleDescontarMaterialIndividual = (materialId: string, descontar: boolean) => {
    setDescontarMaterialesIndividuales(prev => ({
      ...prev,
      [materialId]: descontar
    }));
  };
// Handler para seleccionar material y rellenar campos
  const handleSeleccionMaterial = (id: string) => {
    setMaterialSeleccionado(id);
    const mat = materialesGuardados.find((m: any) => m.id === id);
    if (mat) {
      setCalculo(prev => {
        const gramosActuales = prev.filamento.gramosUtilizados;
        const debeActualizarGramos = !gramosActuales || gramosActuales === '0';
        
        // CORRECCIÓN: Se añade "(mat as any)" para evitar el error de TypeScript
        const precioCampo = (mat as any)?.precioBobina || mat?.precio || '';
        const cantidadCampo = (mat as any)?.pesoBobina || mat?.peso || '';

        return {
          ...prev,
          materialSeleccionado: {
            id: mat.id,
            nombre: mat.nombre || '',
            tipo: mat.tipo || '',
            subtipo: mat.subtipo || '',
            color: mat.color || '',
            categoria: mat.categoria || '',
          },
          filamento: {
            ...prev.filamento,
            tipo: mat.tipo || '',
            subtipo: mat.subtipo || '',
            precioBobina: precioCampo,
            pesoBobina: cantidadCampo,
            color: mat.color || '',
            gramosUtilizados: debeActualizarGramos ? '0' : gramosActuales,
          }
        };
      });
    }
  };

  // Cálculo de filamento optimizado - USAR HOOK
  const calcularCostoFilamento = () => {
    calcularCostoFilamentoHook();
  };

  // Cálculo de mano de obra optimizado - USAR HOOK
  const calcularManoObra = () => {
    calcularManoObraHook();
  };

  // Cálculo de materiales extra y luz optimizado - USAR HOOK
  const calcularAvanzado = () => {
    calcularAvanzadoHook();
  };

  // Cálculo total optimizado - USAR HOOK
  const getTotal = () => {
    return getTotalHook();
  };

  // Cálculo de producción - USAR HOOK
  const getProduccion = () => {
    return getProduccionHook();
  };

  // Guardar cálculo en Firestore optimizado
  const guardarEnBaseDeDatos = async () => {
    if (!calculo.nombre.trim()) {
      showCustomAlert(t.error, t.calculationNameRequired, 'error');
      return;
    }
    
    // Verificar que se haya seleccionado un material
    if (!esMultifilamento && !calculo.materialSeleccionado.id) {
      showCustomAlert(t.error, t.selectMaterialRequired, 'error');
      return;
    }
    
    if (esMultifilamento && (!calculo.materialesMultiples || calculo.materialesMultiples.length === 0)) {
      showCustomAlert(t.error, t.selectMaterialsRequired, 'error');
      return;
    }
    
    // Verificar que el material seleccionado existe en la base de datos
    if (!esMultifilamento && calculo.materialSeleccionado.id) {
      const materialExiste = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
      if (!materialExiste) {
        showCustomAlert(t.error, t.materialNotExists, 'error');
        return;
      }
    }
    
    const user = auth.currentUser;
    if (!user) {
      showCustomAlert(t.error, t.loginRequiredToSave, 'error');
      return;
    }
    
    showCustomAlert(t.saving, t.savingCalculation, 'info');
    
    try {
      const fecha = new Date();
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const nuevoCalculo = {
        ...calculo,
        fecha: fecha.toISOString(),
        fechaFormateada: fechaFormateada,
        costoTotal: getTotal(),
        esMultifilamento: esMultifilamento,
      };
      
      // Guardar en la colección correspondiente
      if (proyectoSeleccionado) {
        await addDoc(collection(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones'), nuevoCalculo);
      } else {
      await addDoc(collection(db, 'usuarios', user.uid, 'calculos'), nuevoCalculo);
      }
      
      // Restar gramos utilizados de los materiales
      await actualizarCantidadesMateriales();
      
      showCustomAlert(t.calculationSaved, `${t.calculationSavedMessage.replace('{name}', calculo.nombre)}\n\n${t.total}: $${getTotal()} ${getCurrency(lang)}\n\n${t.checkHistoryMessage}`, 'success');
      
      // Limpiar formulario
      limpiarFormularioHook();
      
    } catch (error) {
      showCustomAlert(t.error, t.saveCalculationError, 'error');
    }
  };

  // Función para actualizar cantidades de materiales
  const actualizarCantidadesMateriales = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Verificar si se debe descontar según el tipo de material
    if (!esMultifilamento && !descontarCantidad) return; // Si no se debe descontar material único, salir

    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      // Restar cantidades de múltiples materiales
      for (const material of calculo.materialesMultiples) {
        if (!material?.id) continue;
        
        // Verificar si este material específico debe ser descontado
        const debeDescontar = descontarMaterialesIndividuales[material.id];
        if (!debeDescontar) continue; // Saltar este material si no debe ser descontado
        
        const categoria = material.categoria;
        let cantidadUsada = 0;
        
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            cantidadUsada = parseFloat(material.gramosUtilizados || '0');
            break;
          case 'Pintura':
            cantidadUsada = parseFloat(material.cantidadPintura || '0');
            break;
          case 'Aros de llavero':
            cantidadUsada = parseFloat(material.cantidadLlaveros || '0');
            break;
          default:
            cantidadUsada = parseFloat(material.cantidadUtilizada || '0');
        }
        
        if (!isNaN(cantidadUsada) && cantidadUsada > 0) {
          const mat = materialesGuardados.find((m: any) => m.id === material.id);
          if (mat) {
            // Obtener la cantidad actual - SIEMPRE usar cantidadRestante si existe
            let cantidadActual = 0;
            if (typeof mat.cantidadRestante !== 'undefined' && mat.cantidadRestante !== null) {
              cantidadActual = parseFloat(mat.cantidadRestante);
            } else {
              // Fallback para materiales antiguos que no tienen cantidadRestante
              if (categoria === 'Filamento' || categoria === 'Resina') {
                cantidadActual = parseFloat(mat?.peso || '0');
              } else if (categoria === 'Pintura') {
                cantidadActual = parseFloat(mat?.cantidad || '0');
              } else {
                cantidadActual = parseFloat(mat?.cantidad || '0');
              }
            }
            
            if (!isNaN(cantidadActual)) {
              let nuevaCantidadRestante = cantidadActual - cantidadUsada;
              if (nuevaCantidadRestante < 0) nuevaCantidadRestante = 0;
              
              let nuevaCantidadUnidades = 0;
              if (categoria === 'Filamento' || categoria === 'Resina') {
                const pesoBobina = parseFloat(mat?.peso || '1'); // gramos por rollo
                nuevaCantidadUnidades = pesoBobina > 0 ? Math.floor(nuevaCantidadRestante / pesoBobina) : 0;
              } else if (categoria === 'Pintura') {
                const mlPorFrasco = parseFloat(mat?.cantidad || '1'); // ml por frasco
                nuevaCantidadUnidades = mlPorFrasco > 0 ? Math.floor(nuevaCantidadRestante / mlPorFrasco) : 0;
              } else {
                // Para materiales por unidades (llaveros, etc.)
                nuevaCantidadUnidades = Math.floor(nuevaCantidadRestante);
              }
              
              // Actualizar el inventario - NO actualizar cantidadInicial, solo cantidadRestante y cantidad
              await updateDoc(
                doc(db, 'usuarios', user.uid, 'materiales', material.id),
                { cantidadRestante: nuevaCantidadRestante.toString(), cantidad: nuevaCantidadUnidades.toString() }
              );
              
              // Guardar la cantidad restante histórica en el material del cálculo
              material.cantidadRestante = nuevaCantidadRestante.toString();
            }
          }
        }
      }
    } else if (!esMultifilamento && calculo.materialSeleccionado.id && calculo.filamento.gramosUtilizados) {
      // Restar cantidades de material único
      const materialId = calculo.materialSeleccionado.id;
      const gramosUsados = parseFloat(calculo.filamento.gramosUtilizados);
      if (!isNaN(gramosUsados) && gramosUsados > 0) {
        const mat = materialesGuardados.find((m: any) => m.id === materialId);
        if (mat) {
          // Obtener la cantidad actual - SIEMPRE usar cantidadRestante si existe
          const categoria = mat.categoria;
          let cantidadActual = 0;
          if (typeof mat.cantidadRestante !== 'undefined' && mat.cantidadRestante !== null) {
            cantidadActual = parseFloat(mat.cantidadRestante);
          } else {
            // Fallback para materiales antiguos que no tienen cantidadRestante
            if (categoria === 'Filamento' || categoria === 'Resina') {
              cantidadActual = parseFloat(mat?.peso || '0');
            } else if (categoria === 'Pintura') {
              cantidadActual = parseFloat(mat?.cantidad || '0');
            } else {
              cantidadActual = parseFloat(mat?.cantidad || '0');
            }
          }
          
          if (!isNaN(cantidadActual)) {
            let nuevaCantidadRestante = cantidadActual - gramosUsados;
            if (nuevaCantidadRestante < 0) nuevaCantidadRestante = 0;
            
            let nuevaCantidadUnidades = 0;
            if (categoria === 'Filamento' || categoria === 'Resina') {
              const pesoBobina = parseFloat(mat?.peso || '1');
              nuevaCantidadUnidades = pesoBobina > 0 ? Math.floor(nuevaCantidadRestante / pesoBobina) : 0;
            } else if (categoria === 'Pintura') {
              const mlPorFrasco = parseFloat(mat?.cantidad || '1');
              nuevaCantidadUnidades = mlPorFrasco > 0 ? Math.floor(nuevaCantidadRestante / mlPorFrasco) : 0;
            } else {
              // Para materiales por unidades (llaveros, etc.)
              nuevaCantidadUnidades = Math.floor(nuevaCantidadRestante);
            }
            
            // Actualizar el inventario - NO actualizar cantidadInicial, solo cantidadRestante y cantidad
            await updateDoc(
              doc(db, 'usuarios', user.uid, 'materiales', materialId),
              { cantidadRestante: nuevaCantidadRestante.toString(), cantidad: nuevaCantidadUnidades.toString() }
            );
            
            // Guardar la cantidad restante histórica en el material seleccionado
            setCalculo(prev => ({
              ...prev,
              materialSeleccionado: {
                ...prev.materialSeleccionado,
                cantidadRestante: nuevaCantidadRestante.toString()
              }
            }));
          }
        }
      }
    }
  };

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
      setCalculo({
        nombre: '',
        usuario: '',
        materialSeleccionado: {
          id: '',
          nombre: '',
          tipo: '',
          subtipo: '',
          color: '',
        },
      materialesMultiples: [],
        detallesImpresion: {
          relleno: '',
          tiempoImpresion: '',
          temperatura: '',
          velocidad: '',
          alturaCapa: '',
          notas: '',
        },
        filamento: {
          tipo: '',
          subtipo: '',
          precioBobina: '',
          pesoBobina: '',
        gramosUtilizados: '0',
        costoFilamento: '0',
        costoMaterialSolo: '0',
        },
        manoObra: {
          preparacionTiempo: '',
          preparacionCosto: '',
        costoTotalManoObra: '0',
        },
        avanzados: {
          arosLlavero: '',
          imanes: '',
          otrosMateriales: '',
          consumoKwh: '',
          costoKwh: '',
          costoLuz: '0',
        horasimpresion: '0',
          totalMaterialesExtra: '0',
        },
        fecha: new Date().toISOString(),
      });
      setMaterialSeleccionado('');
    setEsMultifilamento(false);
    setCantidadMateriales(1);
      setMostrarDetallesImpresion(false);
      setDescontarMaterialesIndividuales({});
  };

  // Cálculo del precio de venta con ganancia
  const getPrecioVenta = () => {
    const produccion = parseFloat(getProduccion()) || 0;
    return (produccion * (1 + porcentajeGanancia / 100)).toFixed(2);
  };

  // Función para mostrar alertas personalizadas
  const showCustomAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  // Renderizar selector de materiales usando el componente MaterialList
  const renderSelectorMateriales = () => {
    if (cargandoMateriales) {
      return <ActivityIndicator size="small" color="#00e676" style={{ marginVertical: 10 }} />;
    }
    
    if (errorMateriales) {
      return <Text style={{ color: '#ff9800', textAlign: 'center', marginVertical: 10 }}>{errorMateriales}</Text>;
    }
    
    if (materialesGuardados.length === 0) {
      return <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 10 }}>{t.noSavedMaterials}</Text>;
    }
    
    const materialesAMostrar = verMasMateriales 
      ? materialesGuardados 
      : materialesGuardados.slice(0, 5);
    
    return (
      <MaterialList
        materiales={materialesAMostrar}
        materialSeleccionado={materialSeleccionado}
        onMaterialSelect={handleSeleccionMaterial}
      />
    );
  };

  // Renderizar botones de ver más/menos
  const renderBotonesVerMas = () => {
    if (cargandoMateriales || errorMateriales || materialesGuardados.length <= 5) return null;
    
    return (
      <TouchableOpacity
        style={{
          backgroundColor: '#181818',
          borderColor: verMasMateriales ? '#ff9800' : '#00e676',
          borderWidth: 2,
          borderRadius: 20,
          paddingVertical: 8,
          paddingHorizontal: 14,
          marginRight: 8,
          marginBottom: 8,
          marginTop: 16,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
        }}
        onPress={() => setVerMasMateriales(!verMasMateriales)}
      >
        <Text style={{ 
          color: verMasMateriales ? '#ff9800' : '#00e676', 
          fontWeight: 'bold', 
          fontSize: 14 
        }}>
          {verMasMateriales ? t.seeLess : t.seeMore}
        </Text>
      </TouchableOpacity>
    );
  };



  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0d0d0d' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
    <ScrollView style={styles.container}>

        {/* Encabezado */}
        <View style={styles.header}>
          {/* Encabezado sin nombre de usuario */}
        </View>

        {/* Campo de nombre del cálculo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.calculationName}</Text>
          <Text style={styles.label}>{t.projectOrCalculationName} <Text style={styles.requiredText}>*</Text></Text>
          <TextInput
            style={[styles.input, !calculo.nombre.trim() && styles.inputRequired]}
            value={calculo.nombre}
            onChangeText={(text) => setCalculo(prev => ({ ...prev, nombre: text }))}
            placeholder={t.projectNameExample}
            placeholderTextColor="#aaa"
          />
          {!calculo.nombre.trim() && (
            <Text style={styles.requiredMessage}>{t.projectNameRequired}</Text>
          )}
        </View>

          {/* Nueva sección: Multifilamento/Multimaterial */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.multifilamentMultimaterial}</Text>
            <Text style={styles.label}>{t.useMultipleMaterialsColors}</Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !esMultifilamento ? styles.toggleButtonActive : null
                ]}
                onPress={() => setEsMultifilamento(false)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  !esMultifilamento ? styles.toggleButtonTextActive : null
                ]}>{t.singleMaterial}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  esMultifilamento ? styles.toggleButtonActive : null
                ]}
                onPress={() => setEsMultifilamento(true)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  esMultifilamento ? styles.toggleButtonTextActive : null
                ]}>{t.multipleMaterials}</Text>
              </TouchableOpacity>
            </View>

            {esMultifilamento && (
              <>
                <Text style={styles.label}>{t.differentMaterialsColorsQuantity}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setCantidadMateriales(Math.max(1, cantidadMateriales - 1))}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{cantidadMateriales}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setCantidadMateriales(Math.min(10, cantidadMateriales + 1))}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Lista de materiales múltiples */}
                <Text style={styles.label}>{t.selectedMaterials}</Text>
                {Array.from({ length: cantidadMateriales }, (_, index) => (
                  <MaterialMultipleSelector
                    key={index}
                    index={index}
                    materialesGuardados={materialesGuardados}
                    onMaterialChange={(materialIndex, material) => {
                      const nuevosMateriales = [...(calculo.materialesMultiples || [])];
                      
                      nuevosMateriales[materialIndex] = {
                        ...material,
                        gramosUtilizados: material.gramosUtilizados !== undefined ? material.gramosUtilizados : '0',
                        // Asegurar que se preserven los datos del material
                        precioBobina:  limpiarPrecio(material.precioBobina || material.precio),
                        pesoBobina: material.pesoBobina || material.peso,
                        cantidadRestante: material.cantidadRestante || material.cantidad,
                      };
                      
                      setCalculo(prev => ({
                        ...prev,
                        materialesMultiples: nuevosMateriales
                      }));
                      
                      // Inicializar el checkbox de descuento para este material (por defecto true)
                      setDescontarMaterialesIndividuales(prev => ({
                        ...prev,
                        [material.id]: true
                      }));
                      
                      // Calcular el costo del filamento después de actualizar los materiales
                      setTimeout(() => {
                        calcularCostoFilamento();
                      }, 100);
                    }}
                    materialSeleccionado={calculo.materialesMultiples?.[index] || null}
                  />
                ))}
              </>
            )}
          </View>
          {/* Selección de proyecto/carpeta (mover aquí, justo después del nombre) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.projectFolder}</Text>
            {proyectos.length === 0 ? (
              <Text style={{ color: '#a0a0a0', marginBottom: 8 }}>{t.noProjectsCreateNew}</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {/* Botón "Sin proyecto" para deseleccionar */}
                <TouchableOpacity
                  style={{
                    backgroundColor: !proyectoSeleccionado ? '#00e676' : '#222',
                    borderColor: !proyectoSeleccionado ? '#00e676' : '#333',
                    borderWidth: 2,
                    borderRadius: 16,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => setProyectoSeleccionado(null)}
                >
                  <Text style={{ color: !proyectoSeleccionado ? '#222' : '#fff', fontWeight: 'bold' }}>{t.noProject}</Text>
                </TouchableOpacity>
                
                {proyectos.map((proy) => (
                  <View key={proy.id} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 8 }}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: proyectoSeleccionado?.id === proy.id ? '#00e676' : '#222',
                        borderColor: proyectoSeleccionado?.id === proy.id ? '#00e676' : '#333',
                        borderWidth: 2,
                        borderRadius: 16,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        marginRight: 4,
                      }}
                      onPress={() => setProyectoSeleccionado(proy)}
                    >
                      <Text style={{ color: proyectoSeleccionado?.id === proy.id ? '#222' : '#fff', fontWeight: 'bold' }}>{proy.nombre}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => {
                      setProyectoAEliminar(proy);
                      setModalEliminarProyecto(true);
                    }} style={{ marginLeft: 0, padding: 2 }}>
                      <Text style={{ color: '#ffd600', fontWeight: 'bold', fontSize: 18 }}>⧉</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={{ backgroundColor: '#181818', borderColor: '#00e676', borderWidth: 2, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}
              onPress={() => setCrearProyectoModal(true)}
            >
              <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 14 }}>{t.newProject}</Text>
            </TouchableOpacity>
          </View>


          {/* Información de Múltiples Materiales */}
          {esMultifilamento && calculo.materialesMultiples && calculo.materialesMultiples.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.selectedMaterials}</Text>
              
              {/* Título de la sección */}
              <Text style={styles.label}>Materiales seleccionados:</Text>
                              {calculo.materialesMultiples.map((material, index) => (
                  material && (
                    <View key={index} style={[styles.materialInfoContainer, { marginBottom: 12, padding: 12, backgroundColor: '#222', borderRadius: 8 }]}>
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: material.color || '#00e676',
                        borderWidth: 2,
                        borderColor: '#333',
                        marginRight: 12,
                      }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.materialName}>{material.nombre} ({getCategoriaTraducida(material.categoria, t)} - {getSubtipoTraducido(material.subtipo, t)})</Text>
                        <Text style={styles.materialInfoDetails}>
                          {getTipoTraducido(material.tipo, t)} - {getSubtipoTraducido(material.subtipo, t)}
                        </Text>
                        <Text style={styles.materialInfoDetails}>
                          {(() => {
                            switch (material.categoria) {
                              case t.paint:
                              case 'Pintura':
                                return `${t.milliliters}: ${material.cantidadPintura || '0'}ml`;
                              case t.keychainRings:
                              case 'Aros de llavero':
                                return `${t.quantity}: ${material.cantidadLlaveros || '0'} ${t.units}`;
                              case t.filament:
                              case t.resin:
                              case 'Filamento':
                              case 'Resina':
                              default:
                                return `${t.grams}: ${material.gramosUtilizados || '0'}g`;
                            }
                          })()}
                        </Text>
                        {/* Información contextual del material múltiple */}
                        <Text style={[styles.materialInfoDetails, { color: '#00e676' }]}>
                          {t.remainingQuantity}: {(typeof material.cantidadRestante !== 'undefined' ? material.cantidadRestante : material.cantidad || '0')}{(() => {
                            const categoria = material.categoria || t.filament;
                            switch (categoria) {
                              case t.filament:
                              case t.resin:
                              case 'Filamento':
                                return 'g';
                              case 'Resina':
                                return 'g';
                              case t.paint:
                              case 'Pintura':
                                return 'ml';
                              case t.keychainRings:
                              case 'Aros de llavero':
                              default:
                                return ' ' + t.units;
                            }
                          })()}
                        </Text>
                        <Text style={[styles.materialInfoDetails, { color: '#ffd600' }]}>
                          {t.price}: ${(() => {
                            const categoria = material.categoria || t.filament;
                            switch (categoria) {
                              case t.paint:
                              case t.keychainRings:
                              case 'Pintura':
                              case 'Aros de llavero':
                                return limpiarPrecio(material.precio || '0');
                              case t.filament:
                              case t.resin:
                              case 'Filamento':
                              case 'Resina':
                            default:
                                return limpiarPrecio(material.precioBobina || material.precio || '0');
                            }
                          })()} ${getCurrency(lang)}
                        </Text>
                        
                        {/* Checkbox individual para descuento de este material */}
                        <View style={[styles.checkboxContainer, { marginTop: 8 }]}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => handleDescontarMaterialIndividual(material.id, !descontarMaterialesIndividuales[material.id])}
                          >
                            {descontarMaterialesIndividuales[material.id] && (
                              <Ionicons name="checkmark" size={18} color="#00e676" />
                            )}
                          </TouchableOpacity>
                          <Text style={styles.checkboxLabel}>
                            {t.discountIndividualMaterial.replace('{material}', material.nombre)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )
                ))}
            </View>
          )}


        {/* Sección de Detalles de Impresión */}
        <View style={styles.section}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
            <Text style={styles.sectionTitle}>{t.printDetails}</Text>
            <TouchableOpacity
              style={styles.secondaryToggleBtn}
              onPress={() => setMostrarDetallesImpresion(!mostrarDetallesImpresion)}
            >
              <Text style={styles.secondaryToggleText}>{mostrarDetallesImpresion ? t.hide : t.show}</Text>
            </TouchableOpacity>
          </View>
          
          {mostrarDetallesImpresion && (
            <>
              <Text style={styles.label}>{t.fillPercentage}</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.relleno}
                onChangeText={(text) => handleDetallesImpresionChange('relleno', text)}
                placeholder={t.fillExample}
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>{t.printTime}</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.tiempoImpresion}
                onChangeText={(text) => handleDetallesImpresionChange('tiempoImpresion', text)}
                placeholder={t.timeExample}
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>{t.temperature}</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.temperatura}
                onChangeText={(text) => handleDetallesImpresionChange('temperatura', text)}
                placeholder={t.temperatureExample}
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>{t.printSpeed}</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.velocidad}
                onChangeText={(text) => handleDetallesImpresionChange('velocidad', text)}
                placeholder={t.speedExample}
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>{t.layerHeight}</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.alturaCapa}
                onChangeText={(text) => handleDetallesImpresionChange('alturaCapa', text)}
                placeholder={t.layerHeightExample}
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>{t.additionalNotes}</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={calculo.detallesImpresion.notas}
                onChangeText={(text) => handleDetallesImpresionChange('notas', text)}
                placeholder={t.notesExample}
                placeholderTextColor="#aaa"
                multiline
              />
            </>
          )}
        </View>

        {/* Sección de Filamento */}
          {!esMultifilamento && (
        <View style={styles.section}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>

            {/* cuadro general de calculo de filamento */}
            <Text style={styles.sectionTitle}>{t.materialCalculation}</Text>

          </View>
          <Text style={styles.label}>{t.selectSavedMaterial}</Text>

              {/* Selector de material guardado optimizado */}
          <View style={{ flexDirection: 'column', flexWrap: 'wrap', marginBottom: 8 }}>
                {renderSelectorMateriales()}
                {renderBotonesVerMas()}
          </View>

          {/* Selector de subtipo de filamento */}
          {(() => {
            const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
            if (mat?.categoria === 'Filamento') {
              return (
                <>
                  {calculo.filamento.tipo && (
                    <>
                      <Text style={styles.label}>{t.filamentSubtype}</Text>
                      <View style={styles.pastillasContainer}>
                        {(subtiposFilamento.find(t => t.tipo === calculo.filamento.tipo)?.subtipos || []).map((sub, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.pastilla,
                              calculo.filamento.subtipo === sub ? styles.pastillaSeleccionada : null
                            ]}
                            onPress={() => handleFilamentoChange('subtipo', sub)}
                          >
                            <Text style={[
                              styles.pastillaTexto,
                              calculo.filamento.subtipo === sub ? styles.pastillaTextoSeleccionada : null
                            ]}>{getSubtipoTraducido(sub)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  <Text style={styles.label}>{t.filamentType}</Text>
                  <View style={styles.pastillasContainer}>
                    {tiposFilamento.map((tipo, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.pastilla,
                          calculo.filamento.tipo === tipo ? styles.pastillaSeleccionada : null
                        ]}
                        onPress={() => handleFilamentoChange('tipo', tipo)}
                      >
                        <Text style={[
                          styles.pastillaTexto,
                          calculo.filamento.tipo === tipo ? styles.pastillaTextoSeleccionada : null
                        ]}>{getTipoTraducido(tipo)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              );
            }
            return null;
          })()}

          
              <Text style={styles.label}>{t.materialPrice}</Text>
              <View style={styles.infoDisplayContainer}>
                <View style={styles.infoDisplayRow}>
                  <Ionicons name="cash-outline" size={16} color="#ffd600" />
                  <Text style={styles.infoDisplayText}>
                    ${calculo.filamento.precioBobina || '0.00'} ${getCurrency(lang)}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>
                {(() => {
                  const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                  const categoria = mat?.categoria || 'Filamento';
                  switch (categoria) {
                    case 'Filamento':
                      return t.remainingQuantity;
                    case 'Resina':
                      return t.remainingQuantity;
                    case 'Pintura':
                      return t.remainingQuantity;
                    case 'Aros de llavero':
                      return t.remainingQuantity;
                    default:
                      return t.remainingQuantity;
                  }
                })()}
              </Text>
              <View style={styles.infoDisplayContainer}>
                <View style={styles.infoDisplayRow}>
                  <Ionicons name="scale-outline" size={16} color="#00e676" />
                  <Text style={styles.infoDisplayText}>
                    {(() => {
                      const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                      const categoria = mat?.categoria || 'Filamento';
                      let cantidadDisponible;
                      
                      switch (categoria) {
                        case 'Filamento':
                        case 'Resina':
                          // Usar la cantidad restante del material
                          if (!mat) {
                            return `0 ${t.grams}`;
                          }
                          cantidadDisponible = (typeof mat?.cantidadRestante !== 'undefined' ? mat.cantidadRestante : mat?.cantidad || '0');
                          return `${cantidadDisponible} ${t.grams}`;
                        case 'Pintura':
                          if (!mat) {
                            return `0 ml`;
                          }
                          cantidadDisponible = (typeof mat?.cantidadRestante !== 'undefined' ? mat.cantidadRestante : mat?.cantidad || '0');
                          return `${cantidadDisponible} ml`;
                        case 'Aros de llavero':
                          if (!mat) {
                            return `0 ${t.units}`;
                          }
                          cantidadDisponible = (typeof mat?.cantidadRestante !== 'undefined' ? mat.cantidadRestante : mat?.cantidad || '0');
                          return `${cantidadDisponible} ${t.units}`;
                        default:
                          if (!mat) {
                            return `0 ${t.units}`;
                          }
                          cantidadDisponible = (typeof mat?.cantidadRestante !== 'undefined' ? mat.cantidadRestante : mat?.cantidad || '0');
                          return `${cantidadDisponible} ${t.units}`;
                      }
                    })()}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>
                {(() => {
                  const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                  const categoria = mat?.categoria || 'Filamento';
                  switch (categoria) {
                    case 'Pintura':
                      return t.usedMilliliters;
                    case 'Aros de llavero':
                      return t.usedQuantity;
                    case 'Filamento':
                    case 'Resina':
                    default:
                      return t.usedGrams;
                  }
                })()}
              </Text>
              
              {/* Checkbox para controlar si se descuenta el material */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setDescontarCantidad(!descontarCantidad)}
                >
                  {descontarCantidad && (
                    <Ionicons name="checkmark" size={18} color="#00e676" />
                  )}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>
                  {t.discountMaterialFromInventory}
                </Text>
              </View>
              
          <TextInput
            style={styles.input}
            value={calculo.filamento.gramosUtilizados}
            onChangeText={(text) => handleFilamentoChange('gramosUtilizados', text)}
            onBlur={calcularCostoFilamento}
            placeholder={descontarCantidad ? ((() => {
              const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
              const categoria = mat?.categoria || 'Filamento';
              switch (categoria) {
                case 'Pintura':
                  return t.quantityExample;
                case 'Aros de llavero':
                  return t.unitsExample;
                case 'Filamento':
                case 'Resina':
                default:
                  return t.gramsExample;
              }
            })()) : t.notApplicableForThisMaterial}
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            editable={descontarCantidad}
          />
          
          <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>{t.totalMaterialCost}</Text>
            <Text style={styles.resultValue}>${calculo.filamento.costoFilamento}{getCurrency(lang)}</Text>
                <Text style={styles.detailText}>
                  {t.for} {(() => {
                    const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                    const categoria = mat?.categoria || 'Filamento';
                    const cantidad = calculo.filamento.gramosUtilizados;
                    switch (categoria) {
                      case 'Pintura':
                        return `${cantidad}ml`;
                      case 'Aros de llavero':
                        return `${cantidad} ${t.units}`;
                      case 'Filamento':
                      case 'Resina':
                      default:
                        return `${cantidad}g`;
                    }
                  })()}
                </Text>
              </View>
            </View>
          )}

                    {/* Información del Material Seleccionado */}
                    {!esMultifilamento && calculo.materialSeleccionado.id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.selectedMaterial}</Text>
            <View style={styles.materialInfoContainer}>
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: calculo.materialSeleccionado.color || '#00e676',
                borderWidth: 2,
                borderColor: '#333',
                marginRight: 12,
              }} />
              <View style={{ flex: 1 }}>
                  <Text style={styles.materialInfoName}>{calculo.materialSeleccionado.nombre}</Text>
                  <Text style={styles.materialInfoDetails}>
                  {getTipoTraducido(calculo.materialSeleccionado.tipo, t)} - {getSubtipoTraducido(calculo.materialSeleccionado.subtipo, t)}
                </Text>
                  <Text style={styles.materialInfoDetails}>
                  {t.color}: {getColorTraducido(calculo.materialSeleccionado.color, t) || t.notSpecified}
                  </Text>
                  {/* Información contextual del material seleccionado */}
                  {(() => {
                    const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                    if (mat) {
                      return (
                      <View style={{ marginTop: 4 }}>
  {/* ESTA ES LA LÍNEA PRINCIPAL CORREGIDA */}
  <Text style={[styles.materialInfoDetails, { color: '#00e676' }]}>
    {t.stockInUnits}: {getStockUnidades(mat)} {t.units}
  </Text>
  
  {/* ESTA LÍNEA ES ADICIONAL PARA NO PERDER LA VISIBILIDAD DE LOS GRAMOS */}
  <Text style={[styles.materialInfoDetails, { color: '#a0a0a0', fontSize: 11 }]}>
    ({t.remaining}: {(mat.cantidadRestante || mat.cantidad || '0')}g)
  </Text>

  {/* La parte del precio se queda igual que como la tenías */}
  <Text style={[styles.materialInfoDetails, { color: '#ffd600' }]}>
    {t.price}: ${(() => {
      const categoria = mat.categoria || 'Filamento';
      switch (categoria) {
        case 'Pintura':
        case 'Aros de llavero':
          return mat.precio || '0';
        case 'Filamento':
        case 'Resina':
        default:
          const precioPorBobina = parseFloat(limpiarPrecio(mat.precioBobina || mat.precio || '0'));
          const cantidadBobinas = parseFloat(mat.cantidad || '1');
          const precioTotal = precioPorBobina * cantidadBobinas;
          return precioTotal.toString();
      }
    })()} {t.currency}
  </Text>
</View>
                      );
                    }
                    return null;
                  })()}
              </View>
            </View>
          </View>
        )}

          {/* Botón de opciones avanzadas */}
          <View style={styles.section}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
              <Text style={styles.sectionTitle}>{t.advancedOptions}</Text>
              <TouchableOpacity
                style={styles.advancedToggleBtn} 
                onPress={() => setMostrarAvanzado(!mostrarAvanzado)}
              >
                <Text style={styles.advancedToggleText}>{mostrarAvanzado ? t.hide : t.show}</Text>
              </TouchableOpacity>
          </View>
        </View>

        {/* Opciones avanzadas */}
        {mostrarAvanzado && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.advancedCosts}</Text>
            <Text style={styles.label}>{t.otherMaterials}</Text>
            <TextInput
              style={styles.input}
              value={calculo.avanzados.otrosMateriales}
              onChangeText={(text) => handleAvanzadoChange('otrosMateriales', text)}
              placeholder={t.exampleOtherMaterials}
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />
            <Text style={styles.label}>{t.powerConsumption}</Text>
            <TextInput
              style={styles.input}
              value={calculo.avanzados.consumoKwh}
              onChangeText={(text) => handleAvanzadoChange('consumoKwh', text)}
              placeholder={t.examplePowerConsumption}
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />
            <Text style={styles.label}>{t.costPerKwh}</Text>
            <TextInput
              style={styles.input}
              value={calculo.avanzados.costoKwh}
              onChangeText={(text) => handleAvanzadoChange('costoKwh', text)}
              placeholder={t.exampleCostPerKwh}
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t.printingHours}</Text>
            <TextInput
              style={styles.input}
              value={calculo.avanzados.horasimpresion}
              onChangeText={(text) => handleAvanzadoChange('horasimpresion', text)}
              placeholder={t.examplePrintingHours}
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.calculateButton} onPress={calcularAvanzado}>
              <Text style={styles.calculateButtonText}>{t.calculateAdvanced}</Text>
            </TouchableOpacity>
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>{t.totalExtraMaterials} <Text style={styles.costoBasico}>${calculo.avanzados.totalMaterialesExtra} {t.currency}</Text></Text>
              <Text style={styles.resultLabel}>{t.powerCost} <Text style={styles.costoBasico}>${calculo.avanzados.costoLuz} {t.currency}</Text></Text>
            </View>
          </View>
        )}

        {/* Sección de Mano de Obra */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.laborCalculation}</Text>
          <Text style={styles.subsectionTitle}>{t.preparationPrint}</Text>
          <Text style={styles.label}>{t.timeInHours}</Text>
          <TextInput
            style={styles.input}
            value={calculo.manoObra.preparacionTiempo}
            onChangeText={(text) => handleManoObraChange('preparacionTiempo', text)}
            placeholder={t.exampleTimeInHours}
            placeholderTextColor="#aaa"
            keyboardType="numeric"
          />
          <Text style={styles.label}>{t.costPerHour}</Text>
          <TextInput
            style={styles.input}
            value={calculo.manoObra.preparacionCosto}
            onChangeText={(text) => handleManoObraChange('preparacionCosto', text)}
            placeholder={t.exampleCostPerHour}
            placeholderTextColor="#aaa"
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.calculateButton} onPress={calcularManoObra}>
            <Text style={styles.calculateButtonText}>{t.calculateLabor}</Text>
          </TouchableOpacity>
        </View>

        {/* Resumen total de costos */}
        <View style={[styles.section, styles.totalSection]}>
          <Text style={styles.sectionTitle}>{t.costSummary}</Text>
          {/* Barra de porcentaje de ganancia */}
          <View style={{marginBottom: 20, flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{color: '#fff', fontSize: 15, marginRight: 8}}>{t.profitPercentage}</Text>
            <TextInput
              style={{
                color: '#00e676',
                fontWeight: 'bold',
                backgroundColor: '#181818',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#00e676',
                paddingHorizontal: 10,
                paddingVertical: 4,
                width: 60,
                textAlign: 'center',
                fontSize: 15,
              }}
              value={porcentajeGanancia.toString()}
              onChangeText={text => {
                // Solo permitir números
                const num = text.replace(/[^0-9]/g, '');
                setPorcentajeGanancia(num === '' ? 0 : parseInt(num));
              }}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={{color: '#00e676', fontWeight: 'bold', marginLeft: 4}}>%</Text>
          </View>
          {/* Información del material */}
            {!esMultifilamento && calculo.materialSeleccionado.id && (
            <View style={styles.summaryMaterialContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="cube-outline" size={20} color="#00e676" style={{ marginRight: 8 }} />
                <Text style={styles.summarySectionTitle}>{t.usedMaterial}</Text>
              </View>
              <View style={styles.summaryMaterialInfo}>
                <View style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: calculo.materialSeleccionado.color || '#00e676',
                  borderWidth: 1,
                  borderColor: '#333',
                  marginRight: 8,
                }} />
                <Text style={styles.summaryMaterialText}>
                  {calculo.materialSeleccionado.nombre} ({getCategoriaTraducida(calculo.materialSeleccionado.categoria, t)} - {getSubtipoTraducido(calculo.materialSeleccionado.subtipo, t)})
                </Text>
              </View>
              <Text style={styles.summaryDetailText}>
                  {(() => {
                    const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                    const categoria = mat?.categoria || 'Filamento';
                    const cantidad = calculo.filamento.gramosUtilizados;
                    
                    switch (categoria) {
                      case 'Pintura':
                        return `${t.usedMilliliters}: ${cantidad}ml`;
                      case 'Aros de llavero':
                        return `${t.usedQuantity}: ${cantidad} ${t.units}`;
                      case 'Filamento':
                      case 'Resina':
                      default:
                        return `${t.usedGrams}: ${cantidad}g`;
                    }
                  })()}
              </Text>
            </View>
          )}

            {/* Información de múltiples materiales */}
            {esMultifilamento && calculo.materialesMultiples && calculo.materialesMultiples.length > 0 && (
              <View style={styles.summaryMaterialContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="cube-outline" size={20} color="#00e676" style={{ marginRight: 8 }} />
                  <Text style={styles.summarySectionTitle}>{t.usedMaterials}</Text>
                </View>
                {calculo.materialesMultiples.map((material, index) => (
                  material && (
                    <View key={index} style={[styles.summaryMaterialInfo, { marginBottom: 8 }]}>
                      <View style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: material.color || '#00e676',
                        borderWidth: 1,
                        borderColor: '#333',
                        marginRight: 8,
                      }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryMaterialText}>
                          {material.nombre} ({getCategoriaTraducida(material.categoria, t)} - {getSubtipoTraducido(material.subtipo, t)})
                        </Text>
                        <Text style={styles.summaryDetailText}>
                          {(() => {
                            switch (material.categoria) {
                              case 'Pintura':
                                return `${t.usedMilliliters}: ${material.cantidadPintura || '0'}ml`;
                              case 'Aros de llavero':
                                return `${t.usedQuantity}: ${material.cantidadLlaveros || '0'} ${t.units}`;
                              case 'Filamento':
                              case 'Resina':
                              default:
                                return `${t.usedGrams}: ${material.gramosUtilizados || '0'}g`;
                            }
                          })()}
                        </Text>
                        {/* Información contextual del material múltiple */}
                        <Text style={[styles.materialInfoDetails, { color: '#00e676' }]}>
                          {t.remainingQuantity}: {(typeof material.cantidadRestante !== 'undefined' ? material.cantidadRestante : material.cantidad || '0')}{(() => {
                            const categoria = material.categoria || 'Filamento';
                            switch (categoria) {
                              case 'Filamento':
                              case 'Resina':
                                return 'g';
                              case 'Pintura':
                                return 'ml';
                              case 'Aros de llavero':
                              default:
                                return ' ' + t.units;
                            }
                          })()}
                        </Text>
                        <Text style={[styles.materialInfoDetails, { color: '#ffd600' }]}>
                          {t.price}: ${limpiarPrecio(material.precioBobina || material.precio || '0')} {t.currency}
                        </Text>
                      </View>
                    </View>
                  )
                ))}
              </View>
            )}

          {/* Detalles de impresión si están disponibles */}
          {mostrarDetallesImpresion && (calculo.detallesImpresion.relleno || calculo.detallesImpresion.tiempoImpresion) && (
            <View style={styles.summaryDetailsContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="settings-outline" size={20} color="#00e676" style={{ marginRight: 8 }} />
              <Text style={styles.summarySectionTitle}>{t.printConfig}</Text>
            </View>
              {calculo.detallesImpresion.relleno && (
                <Text style={styles.summaryDetailText}>{t.fillPercentage}: {calculo.detallesImpresion.relleno}%</Text>
              )}
              {calculo.detallesImpresion.tiempoImpresion && (
                <Text style={styles.summaryDetailText}>{t.printTime}: {calculo.detallesImpresion.tiempoImpresion}h</Text>
              )}
              {calculo.detallesImpresion.temperatura && (
                <Text style={styles.summaryDetailText}>{t.temperature}: {calculo.detallesImpresion.temperatura}°C</Text>
              )}
              {calculo.detallesImpresion.velocidad && (
                <Text style={styles.summaryDetailText}>{t.printSpeed}: {calculo.detallesImpresion.velocidad} mm/s</Text>
              )}
              {calculo.detallesImpresion.alturaCapa && (
                <Text style={styles.summaryDetailText}>{t.layerHeight}: {calculo.detallesImpresion.alturaCapa}mm</Text>
              )}
              {calculo.detallesImpresion.notas && (
                <Text style={styles.summaryDetailText}>{t.additionalNotes}: {calculo.detallesImpresion.notas}</Text>
              )}
            </View>
          )}

          {/* Costos */}
          <View style={styles.summaryCostsContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="cash-outline" size={20} color="#ffd600" style={{ marginRight: 8 }} />
              <Text style={styles.summarySectionTitle}>{t.costBreakdown}</Text>
            </View>
            <Text style={styles.resumenLabel}>{t.materials}: <Text style={styles.costoBasico}>${esMultifilamento ? calcularCostoMaterialesMultiples().toFixed(2) : calculo.filamento.costoMaterialSolo} {t.currency}</Text></Text>
            <Text style={styles.resumenLabel}>{t.labor}: <Text style={styles.costoBasico}>${calculo.manoObra.costoTotalManoObra} {t.currency}</Text></Text>
            <Text style={styles.resumenLabel}>{t.extraMaterials}: <Text style={styles.costoBasico}>${calculo.avanzados.totalMaterialesExtra} {t.currency}</Text></Text>
            <Text style={styles.resumenLabel}>{t.power}: <Text style={styles.costoBasico}>${calculo.avanzados.costoLuz} {t.currency}</Text></Text>
            <Text style={[styles.resumenLabel, {color: '#ff9800'}]}>{t.productionCost}: <Text style={styles.costoProduccion}>${getProduccion()} {t.currency}</Text></Text>
            <Text style={[styles.resumenLabel, {color: '#00e676'}]}>{t.salePrice}: <Text style={styles.costoVenta}>${getPrecioVenta()} {t.currency}</Text></Text>
          </View>

          {/* Totales */}
          
          
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={guardarEnBaseDeDatos}>
          <Text style={styles.saveButtonText}>{t.saveCalculation}</Text>
        </TouchableOpacity>

        {/* Botón para registrar fallo de impresión */}
                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#d32f2f', marginTop: 10 }]} onPress={async () => {
          if (!calculo.nombre.trim()) {
            showCustomAlert(t.error, t.projectNameRequired, 'error');
            return;
          }
          const user = auth.currentUser;
          if (!user) {
            showCustomAlert(t.error, t.loginRequiredToSave, 'error');
            return;
          }
          showCustomAlert(t.saving, t.registeringFailure, 'info');
          try {
            const fecha = new Date();
            const fechaFormateada = fecha.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const nuevoCalculo = {
              ...calculo,
              fecha: fecha.toISOString(),
              fechaFormateada: fechaFormateada,
              costoTotal: getTotal(),
              fallo: true,
            };
              if (proyectoSeleccionado) {
                await addDoc(collection(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones'), nuevoCalculo);
              } else {
            await addDoc(collection(db, 'usuarios', user.uid, 'calculos'), nuevoCalculo);
              }
            showCustomAlert(t.printFailure, t.printFailureRegistered, 'error');
            // Limpiar el formulario después de guardar
            setCalculo({
              nombre: '',
              usuario: '',
              materialSeleccionado: {
                id: '',
                nombre: '',
                tipo: '',
                subtipo: '',
                color: '',
              },
                materialesMultiples: [],
              detallesImpresion: {
                relleno: '',
                tiempoImpresion: '',
                temperatura: '',
                velocidad: '',
                alturaCapa: '',
                notas: '',
              },
              filamento: {
                tipo: '',
                subtipo: '',
                precioBobina: '',
                pesoBobina: '',
                gramosUtilizados: '40',
                costoFilamento: '12',
                costoMaterialSolo: '10',
              },
              manoObra: {
                preparacionTiempo: '',
                preparacionCosto: '',
                costoTotalManoObra: '12',
              },
              avanzados: {
                arosLlavero: '',
                imanes: '',
                otrosMateriales: '',
                consumoKwh: '',
                costoKwh: '',
                costoLuz: '0',
                horasimpresion:'0',
                totalMaterialesExtra: '0',
              },
              fecha: new Date().toISOString(),
            });
            setMaterialSeleccionado('');
            setMostrarDetallesImpresion(false);
          } catch (error) {
            showCustomAlert(t.error, t.failureRegistrationError, 'error');
          }
        }}>
          <Text style={[styles.saveButtonText, { color: '#fff' }]}>{t.registerFailure}</Text>
        </TouchableOpacity>

        {/* Modal de alerta personalizada para web */}
        <Modal
          visible={showAlert}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlert(false)}
        >
          <View style={styles.alertOverlay}>
            <View style={[
              styles.alertContainer,
              alertType === 'success' ? styles.alertSuccess : null,
              alertType === 'error' ? styles.alertError : null,
              alertType === 'info' ? styles.alertInfo : null,
            ]}>
              <Text style={styles.alertTitle}>{alertTitle}</Text>
              <Text style={styles.alertMessage}>{alertMessage}</Text>
              <TouchableOpacity
                style={[
                  styles.alertButton,
                  alertType === 'success' ? styles.alertButtonSuccess : null,
                  alertType === 'error' ? styles.alertButtonError : null,
                  alertType === 'info' ? styles.alertButtonInfo : null,
                ]}
                onPress={() => setShowAlert(false)}
              >
                <Text style={[
                  styles.alertButtonText,
                  alertType === 'success' ? { color: '#fff' } : null,
                  alertType === 'error' ? { color: '#fff' } : null,
                  alertType === 'info' ? { color: '#fff' } : null,
                ]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
          {/* Modal para crear proyecto */}
          <Modal
            visible={crearProyectoModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setCrearProyectoModal(false)}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
              <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350 }}>
                <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>{t.newProject}</Text>
                <TextInput
                  style={{ backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 12 }}
                  value={nuevoProyectoNombre}
                  onChangeText={setNuevoProyectoNombre}
                  placeholder={t.projectName}
                  placeholderTextColor="#bbb"
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <TouchableOpacity onPress={() => setCrearProyectoModal(false)} style={{ backgroundColor: '#a0a0a0', borderRadius: 8, padding: 10, marginRight: 8 }}>
                    <Text style={{ color: '#fff' }}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const user = auth.currentUser;
                      if (!user || !nuevoProyectoNombre.trim()) return;
                      try {
                        await addDoc(collection(db, 'usuarios', user.uid, 'proyectos'), {
                          nombre: nuevoProyectoNombre.trim(),
                          fechaCreacion: new Date().toISOString(),
                        });
                        setCrearProyectoModal(false);
                        setNuevoProyectoNombre('');
                        // Recargar proyectos
                        const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos'));
                        const datos: Proyecto[] = snapshot.docs.map(docSnap => {
                          const data = docSnap.data();
                          return {
                            id: docSnap.id,
                            nombre: data.nombre || '',
                            fechaCreacion: data.fechaCreacion,
                            archivado: data.archivado || false,
                          };
                        });
                        setProyectos(datos.filter(p => !p.archivado));
                      } catch (e) {}
                    }}
                    style={{ backgroundColor: '#00e676', borderRadius: 8, padding: 10 }}
                    disabled={!nuevoProyectoNombre.trim()}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.create}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* Modal de confirmación para archivar proyecto */}
          <Modal
            visible={modalEliminarProyecto}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalEliminarProyecto(false)}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
              <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: '#ffd600', borderWidth: 2 }}>
                <Text style={{ color: '#ffd600', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>⧉ {t.archiveProject}</Text>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
                  {t.archiveProjectConfirm.replace('{project}', proyectoAEliminar?.nombre || '')}
                </Text>
                <Text style={{ color: '#a0a0a0', fontSize: 14, marginBottom: 20 }}>
                  {t.archiveProjectInfo}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <TouchableOpacity onPress={() => setModalEliminarProyecto(false)} style={{ backgroundColor: '#a0a0a0', borderRadius: 8, padding: 10, marginRight: 8 }}>
                    <Text style={{ color: '#fff' }}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!proyectoAEliminar) return;
                      const user = auth.currentUser;
                      if (!user) return;
                      await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoAEliminar.id), { archivado: true });
                      setModalEliminarProyecto(false);
                      setProyectoAEliminar(null);
                      // Recargar proyectos
                      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos'));
                      const datos: Proyecto[] = snapshot.docs.map(docSnap => {
                        const data = docSnap.data();
                        return {
                          id: docSnap.id,
                          nombre: data.nombre || '',
                          fechaCreacion: data.fechaCreacion,
                          archivado: data.archivado || false,
                        };
                      });
                      setProyectos(datos.filter(p => !p.archivado));
                      if (proyectoSeleccionado?.id === proyectoAEliminar.id) setProyectoSeleccionado(null);
                    }}
                    style={{ backgroundColor: '#ffd600', borderRadius: 8, padding: 10 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.archive}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        {/* Espacio visual para la barra de tabs */}
        <View style={{ height: 70, backgroundColor: '#0d0d0d' }} />
      </ScrollView>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    padding: 16,
    marginTop: 30,
    paddingBottom: 70,
  },
  header: {
    marginBottom: 20,
  },
  welcomeText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '300',
  },
  username: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionTitle: {
    color: '#00e676',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subsectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  label: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#181818',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: '#181818',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 5,
    overflow: 'hidden',
  },
  picker: {
    color: 'white',
    height: 50,
    backgroundColor: '#181818',
  },
  resultContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  resultLabel: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 4,
  },
  resultValue: {
    color: '#00e676',
    fontSize: 24,
    fontWeight: 'bold',
  },
  detailText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  totalSection: {
    borderColor: '#00e676',
    borderWidth: 1,
  },
  totalLabel: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  totalValue: {
    color: '#00e676',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#00e676',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 0,
    elevation: 5,
    shadowColor: '#00e676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resumenLabel: {
    color: '#a0a0a0',
    fontSize: 15,
    marginBottom: 2,
  },
  resumenValue: {
    color: 'white',
    fontWeight: 'bold',
  },
  costoProduccion: {
    color: '#2196f3',
    fontWeight: 'bold',
    fontSize: 18,
  },
  costoVenta: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 18,
  },
  advancedToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#222',
    marginLeft: 8,
  },
  advancedToggleText: {
    color: '#00e676',
    fontSize: 13,
    fontWeight: 'bold',
  },
  costoBasico: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  materialInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialInfoName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  materialInfoDetails: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  secondaryToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#333',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  secondaryToggleText: {
    color: '#00e676',
    fontSize: 12,
    fontWeight: 'bold',
  },
  calculateButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00e676',
  },
  calculateButtonText: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryMaterialContainer: {
    marginBottom: 16,
  },
  summarySectionTitle: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryMaterialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMaterialText: {
    color: 'white',
    fontSize: 14,
  },
  summaryDetailText: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  summaryDetailsContainer: {
    marginBottom: 16,
  },
  summaryCostsContainer: {
    marginBottom: 16,
  },
  finalTotalsContainer: {
    marginBottom: 16,
  },
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertContainer: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  alertTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  alertMessage: {
    color: 'white',
    fontSize: 14,
  },
  alertButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#00e676',
  },
  alertButtonText: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertSuccess: {
    borderColor: '#00e676',
    borderWidth: 2,
  },
  // Paleta de colores suaves para indicar gastos y costos
  // Naranja suave (#ff9800) para advertencias y campos requeridos
  // Verde (#00e676) para valores positivos y éxito
  // Amarillo (#ffd600) para precios y valores monetarios
  // Azul (#2196f3) para información
  alertError: {
    borderColor: '#ff9800', // Naranja suave en lugar de rojo agresivo
    borderWidth: 2,
  },
  alertInfo: {
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  alertButtonSuccess: {
    backgroundColor: '#00e676',
  },
  alertButtonError: {
    backgroundColor: '#ff9800', // Naranja suave en lugar de rojo agresivo
  },
  alertButtonInfo: {
    backgroundColor: '#2196f3',
  },
  requiredText: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  inputRequired: {
    borderColor: '#ff9800',
    borderWidth: 1,
  },
  requiredMessage: {
    color: '#ff9800',
    fontSize: 12,
    marginTop: 4,
  },
  pastillasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  pastilla: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222',
    marginRight: 8,
    marginBottom: 4,
  },
  pastillaSeleccionada: {
    backgroundColor: '#00e676',
  },
  pastillaTexto: {
    color: 'white',
    fontSize: 14,
  },
  pastillaTextoSeleccionada: {
    fontWeight: 'bold',
  },
  toggleButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#666',
  },
  toggleButtonActive: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  toggleButtonText: {
    color: '#a0a0a0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  quantityButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#666',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  infoDisplayContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoDisplayText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  // Nuevos estilos optimizados
  materialCard: {
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
  materialCardSelected: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  materialColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 6,
  },
  materialInfo: {
    flexShrink: 1,
  },
  materialName: {
    color: '#fff',
    fontSize: 12,
    flexWrap: 'wrap',
  },
  materialNameSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  materialSubtype: {
    color: '#a0a0a0',
    fontSize: 10,
  },
  materialStats: {
    flexDirection: 'row',
    marginTop: 2,
  },
  materialStat: {
    fontSize: 9,
    marginRight: 8,
  },
  materialStatRestante: {
    color: '#00e676',
  },
  materialStatPrecio: {
    color: '#ffd600',
  },
  materialGroup: {
    marginBottom: 8,
  },
  materialGroupTitle: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  materialRow: {
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: 340,
    width: '100%',
  },
  verMasButton: {
    backgroundColor: '#181818',
    borderColor: '#00e676',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  verMasButtonArchivado: {
    borderColor: '#ff9800',
  },
  verMasText: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 14,
  },
  verMasTextArchivado: {
    color: '#ff9800',
  },
  // Estilos para el checkbox de descuento
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#00e676',
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxText: {
    color: '#00e676',
    fontSize: 16, // Aumenta el tamaño para centrar mejor
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center', // Esto ayuda en Android
  },
  checkboxLabel: {
    color: '#a0a0a0',
    fontSize: 14,
    flex: 1,
  },
});

export default CostCalculatorScreen;