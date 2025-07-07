import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface CategorySelectorProps {
  categoriasBase: string[];
  categoriasPersonalizadas: string[];
  categoriaSeleccionada: string;
  onCategoriaSelect: (categoria: string) => void;
  onNuevaCategoria: () => void;
  onEliminarCategoria?: (categoria: string) => void;
  showDeleteButton?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categoriasBase,
  categoriasPersonalizadas,
  categoriaSeleccionada,
  onCategoriaSelect,
  onNuevaCategoria,
  onEliminarCategoria,
  showDeleteButton = false
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.pastillasContainer}>
        {/* Categorías base */}
        {categoriasBase.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.pastilla,
              categoriaSeleccionada === cat ? styles.pastillaSeleccionada : null
            ]}
            onPress={() => onCategoriaSelect(cat)}
          >
            <Text style={[
              styles.pastillaTexto,
              categoriaSeleccionada === cat ? styles.pastillaTextoSeleccionada : null
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Categorías personalizadas */}
        {categoriasPersonalizadas.map((cat) => (
          <View key={cat} style={styles.pastillaContainer}>
            <TouchableOpacity
              style={[
                styles.pastilla,
                categoriaSeleccionada === cat ? styles.pastillaSeleccionada : null,
                styles.pastillaConBoton
              ]}
              onPress={() => onCategoriaSelect(cat)}
            >
              <Text style={[
                styles.pastillaTexto,
                categoriaSeleccionada === cat ? styles.pastillaTextoSeleccionada : null
              ]}>
                {cat}
              </Text>
              {showDeleteButton && onEliminarCategoria && (
                <TouchableOpacity 
                  onPress={() => onEliminarCategoria(cat)} 
                  style={styles.botonEliminar}
                >
                  <Text style={styles.botonEliminarTexto}>×</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        ))}
        
        {/* Botón agregar nueva categoría */}
        <TouchableOpacity
          style={[styles.pastilla, styles.pastillaAgregar]}
          onPress={onNuevaCategoria}
        >
          <Text style={styles.pastillaTextoAgregar}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  pastillasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  pastilla: {
    backgroundColor: '#222',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  pastillaSeleccionada: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  pastillaTexto: {
    color: 'white',
    fontSize: 14,
  },
  pastillaTextoSeleccionada: {
    color: '#222',
    fontWeight: 'bold',
  },
  pastillaConBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  botonEliminar: {
    marginLeft: 6,
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 2,
  },
  botonEliminarTexto: {
    color: '#e53935',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pastillaAgregar: {
    backgroundColor: '#222',
    borderColor: '#00e676',
    borderWidth: 2,
  },
  pastillaTextoAgregar: {
    color: '#00e676',
    fontSize: 22,
    fontWeight: 'bold',
  },
  pastillaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
});

export default CategorySelector; 