import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MaterialCard from './MaterialCard';
import { useLanguage } from '../../utils/LanguageProvider';
import translations from '../../utils/locales';

interface Material {
  id: string;
  nombre: string;
  subtipo?: string;
  color?: string;
  cantidadRestante?: string;
  cantidad?: string;
  categoria?: string;
  precio?: string;
  precioBobina?: string;
  tipo?: string;
}

interface MaterialListProps {
  materiales: Material[];
  materialSeleccionado?: string;
  onMaterialSelect: (materialId: string) => void;
  maxItems?: number;
}

const MaterialList: React.FC<MaterialListProps> = ({ 
  materiales, 
  materialSeleccionado, 
  onMaterialSelect,
  maxItems 
}) => {
  const { lang } = useLanguage();
  const t = translations[lang];

  // --- INICIO DE LA CORRECCIÓN DE ESTILOS Y LÓGICA ---
  const screenWidth = Dimensions.get('window').width;
  // Se define un umbral para cambiar entre 1 y 2 columnas. 500 es un buen punto de quiebre.
  const isSmallDevice = screenWidth < 500; 

  const traducirCategoria = (categoria: string) => {
    const map = { 'Filamento': t.filament, 'Resina': t.resin, 'Pintura': t.paint, 'Aros de llavero': t.keychainRings, 'Sin categoría': t.uncategorized };
    return map[categoria] || categoria;
  };

  const traducirTipo = (tipo: string) => {
    const map = { 'PLA': 'PLA', 'ABS': 'ABS', 'PETG': 'PETG', 'TPU': 'TPU', 'Estándar': t.standard, 'Tough': t.tough, 'Flexible': t.flexible, 'Acrílica': 'Acrylic', 'Esmalte': 'Enamel', 'Sin tipo': 'No Type' };
    return map[tipo] || tipo;
  };

  const agruparMaterialesPorCategoriaYTipo = () => {
    const matsPorCategoria: { [categoria: string]: { [tipo: string]: Material[] } } = {};
    
    materiales.forEach(mat => {
      const categoria = mat.categoria || 'Sin categoría';
      // Si no hay 'tipo', usamos la 'categoría' como el grupo para que no se pierda.
      const tipo = mat.tipo || categoria; 
      
      if (!matsPorCategoria[categoria]) {
        matsPorCategoria[categoria] = {};
      }
      if (!matsPorCategoria[categoria][tipo]) {
        matsPorCategoria[categoria][tipo] = [];
      }
      matsPorCategoria[categoria][tipo].push(mat);
    });
    
    return matsPorCategoria;
  };

  const renderMaterialGroup = (tipo: string, materiales: Material[], categoria: string) => {
    const filas = [];
    const itemsPorFila = isSmallDevice ? 1 : 2; // 1 item por fila en celular, 2 en tablet
    for (let i = 0; i < materiales.length; i += itemsPorFila) {
      filas.push(materiales.slice(i, i + itemsPorFila));
    }

    const mostrarTituloGrupo = tipo !== categoria;

    return (
      <View key={tipo} style={styles.subGroupContainer}>
        {mostrarTituloGrupo && <Text style={styles.subGroupTitle}>{traducirTipo(tipo)}</Text>}
        {filas.map((fila, idx) => (
          <View key={idx} style={styles.row}>
            {fila.map((mat) => (
              <View key={mat.id} style={isSmallDevice ? styles.cardContainerSmall : styles.cardContainerLarge}>
                <MaterialCard
                  material={mat}
                  isSelected={materialSeleccionado === mat.id}
                  onPress={() => onMaterialSelect(mat.id)}
                />
              </View>
            ))}
            {/* Relleno para mantener la alineación si solo hay un item en la fila */}
            {fila.length === 1 && !isSmallDevice && <View style={styles.emptySpace} />}
          </View>
        ))}
      </View>
    );
  };

  const renderCategoria = (categoria: string, tipos: { [tipo: string]: Material[] }) => {
    return (
      <View key={categoria} style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{traducirCategoria(categoria)}</Text>
        {Object.entries(tipos).map(([tipo, materiales]) => 
          renderMaterialGroup(tipo, materiales, categoria)
        )}
      </View>
    );
  };
  // --- FIN DE LA CORRECCIÓN ---

  const materialesAgrupados = agruparMaterialesPorCategoriaYTipo();
  const categoriasAMostrar = maxItems 
    ? Object.entries(materialesAgrupados).slice(0, maxItems)
    : Object.entries(materialesAgrupados);

  return (
    <View style={styles.container}>
      {categoriasAMostrar.map(([categoria, tipos]) => 
        renderCategoria(categoria, tipos)
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  categoryContainer: { marginBottom: 16 },
  categoryTitle: { color: '#00e676', fontWeight: 'bold', fontSize: 18, marginBottom: 8, textTransform: 'uppercase' },
  subGroupContainer: { marginBottom: 8 },
  subGroupTitle: { color: '#a0a0a0', fontWeight: 'bold', fontSize: 14, marginBottom: 4, marginLeft: 8 },
  row: { 
    flexDirection: 'row', 
    width: '100%',
    justifyContent: 'flex-start', // Alinear items a la izquierda
  },
  // Contenedor para una sola columna en celulares
  cardContainerSmall: {
    width: '100%',
    paddingHorizontal: 8, // Añade un poco de espacio a los lados
    marginBottom: 8,
  },
  // Contenedor para dos columnas en tablets
  cardContainerLarge: {
    width: '50%', // Cada tarjeta ocupa la mitad del espacio
  },
  emptySpace: { 
    width: '50%', // Ocupa el espacio de la segunda tarjeta si no existe
  },
});

export default MaterialList;
