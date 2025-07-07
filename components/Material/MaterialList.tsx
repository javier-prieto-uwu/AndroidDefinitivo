import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCard from './MaterialCard';

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
  // Agrupar materiales por tipo
  const agruparMaterialesPorTipo = () => {
    const matsPorTipo: { [tipo: string]: Material[] } = {};
    materiales.forEach(mat => {
      const tipo = mat.tipo || 'Sin tipo';
      if (!matsPorTipo[tipo]) matsPorTipo[tipo] = [];
      matsPorTipo[tipo].push(mat);
    });
    return matsPorTipo;
  };

  // Renderizar grupo de materiales
  const renderMaterialGroup = (tipo: string, materiales: Material[]) => {
    const filas = [];
    for (let i = 0; i < materiales.length; i += 2) {
      filas.push(materiales.slice(i, i + 2));
    }

    return (
      <View key={tipo} style={styles.groupContainer}>
        <Text style={styles.groupTitle}>{tipo}</Text>
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

  const materialesAgrupados = agruparMaterialesPorTipo();
  const materialesAMostrar = maxItems 
    ? Object.entries(materialesAgrupados).slice(0, maxItems)
    : Object.entries(materialesAgrupados);

  return (
    <View style={styles.container}>
      {materialesAMostrar.map(([tipo, materiales]) => 
        renderMaterialGroup(tipo, materiales)
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  groupContainer: {
    marginBottom: 8,
  },
  groupTitle: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 15,
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