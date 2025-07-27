import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCard from './MaterialCard';
import { useLanguage } from '../../utils/LanguageProvider';

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

  // Función para traducir categorías
  const traducirCategoria = (categoria: string) => {
    if (lang === 'en') {
      switch (categoria) {
        case 'Filamento': return 'Filament';
        case 'Resina': return 'Resin';
        case 'Pintura': return 'Paint';
        case 'Aros de llavero': return 'Keychain Rings';
        case 'Sin categoría': return 'No Category';
        default: return categoria;
      }
    }
    return categoria;
  };

  // Función para traducir tipos
  const traducirTipo = (tipo: string) => {
    if (lang === 'en') {
      switch (tipo) {
        case 'Sin tipo': return 'No Type';
        case 'Aro de llavero': return 'Keychain Ring';
        default: return tipo;
      }
    }
    return tipo;
  };
  // Agrupar materiales por categoría y luego por tipo
  const agruparMaterialesPorCategoriaYTipo = () => {
    const matsPorCategoria: { [categoria: string]: { [tipo: string]: Material[] } } = {};
    
    materiales.forEach(mat => {
      const categoria = mat.categoria || 'Sin categoría';
      const tipo = mat.tipo || 'Sin tipo';
      
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

  // Renderizar grupo de materiales por tipo
  const renderMaterialGroup = (tipo: string, materiales: Material[]) => {
    const filas = [];
    for (let i = 0; i < materiales.length; i += 2) {
      filas.push(materiales.slice(i, i + 2));
    }

    return (
      <View key={tipo} style={styles.subGroupContainer}>
        <Text style={styles.subGroupTitle}>{traducirTipo(tipo)}</Text>
        {filas.map((fila, idx) => (
          <View key={idx} style={styles.row}>
            {fila.map((mat) => (
              <MaterialCard
                key={mat.id}
                material={mat}
                isSelected={materialSeleccionado === mat.id}
                onPress={() => onMaterialSelect(mat.id)}
              />
            ))}
            {fila.length === 1 && <View style={styles.emptySpace} />}
          </View>
        ))}
      </View>
    );
  };

  // Renderizar categoría completa
  const renderCategoria = (categoria: string, tipos: { [tipo: string]: Material[] }) => {
    return (
      <View key={categoria} style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{traducirCategoria(categoria)}</Text>
        {Object.entries(tipos).map(([tipo, materiales]) => 
          renderMaterialGroup(tipo, materiales)
        )}
      </View>
    );
  };

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
  container: {
    width: '100%',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryTitle: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subGroupContainer: {
    marginBottom: 8,
    marginLeft: 8,
  },
  subGroupTitle: {
    color: '#a0a0a0',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: 340,
    width: '100%',
  },
  emptySpace: {
    flex: 1,
  },
});

export default MaterialList;