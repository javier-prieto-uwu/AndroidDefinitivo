import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState, useRef, useCallback } from 'react'
import { auth, app } from '../api/firebase'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Simulación de materiales locales

const InventoryScreen: React.FC = () => {
  // Estado para materiales reales
  const [materiales, setMateriales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const isFocused = useIsFocused();
  const [materialAEliminar, setMaterialAEliminar] = useState<any>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const db = getFirestore(app);

  // Leer materiales desde Firestore cada vez que la pestaña se enfoca
  useFocusEffect(
    useCallback(() => {
      const cargarMateriales = async () => {
        setCargando(true);
        setError(null);
        const user = auth.currentUser;
        if (!user) {
          setMateriales([]);
          setCargando(false);
          return;
        }
        try {
          const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'materiales'));
          const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMateriales(mats);
        } catch (e) {
          setError('Error al cargar materiales');
          setMateriales([]);
        } finally {
          setCargando(false);
        }
      };
      if (isFocused) cargarMateriales();
    }, [isFocused])
  );

  // Filtro de materiales por búsqueda
  const materialesFiltrados = materiales.filter(mat => {
    const texto = `${mat.nombre || ''} ${mat.tipo || ''} ${mat.subtipo || ''}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  // Agrupar materiales por categoría
  const categorias = Array.from(new Set(materialesFiltrados.map(m => m.categoria)))

  // Función para navegar a una categoría específica
  const navegarACategoria = (categoria: string) => {
    setCategoriaSeleccionada(categoria)
    const categoriaIndex = categorias.indexOf(categoria)
    if (categoriaIndex !== -1) {
      const baseOffset = 300
      const categoriaOffset = categoriaIndex * 400
      const targetY = baseOffset + categoriaOffset
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true })
    }
  }

  const handleEliminarMaterial = async () => {
    if (!materialAEliminar) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      await deleteDoc(doc(db, 'usuarios', user.uid, 'materiales', materialAEliminar.id));
      setMaterialAEliminar(null);
      setShowDeleteAlert(false);
      // Recargar materiales
      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'materiales'));
      const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMateriales(mats);
    } catch (e) {
      setShowDeleteAlert(false);
    }
  };

  return (
    <ScrollView style={styles.container} ref={scrollViewRef}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Inventario</Text>
          <Text style={styles.username}>Materiales disponibles</Text>
        </View>

        {/* Filtro de búsqueda */}
        <View style={{ marginBottom: 16 }}>
          <TextInput
            style={{
              backgroundColor: '#181818',
              color: '#fff',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#333',
              padding: 12,
              fontSize: 16,
            }}
            placeholder="Buscar material por nombre, tipo o subtipo..."
            placeholderTextColor="#888"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {/* Selector de categorías */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>Categorías</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriasScroll}
            contentContainerStyle={styles.categoriasContent}
          >
            {categorias.length === 0 ? (
              <Text style={{ color: '#a0a0a0', marginLeft: 10 }}>Sin categorías</Text>
            ) : (
              categorias.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoriaBoton,
                    categoriaSeleccionada === cat && styles.categoriaBotonActivo
                  ]}
                  onPress={() => navegarACategoria(cat)}
                >
                  <Text style={[
                    styles.categoriaBotonText,
                    categoriaSeleccionada === cat && styles.categoriaBotonTextActivo
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Resumen del inventario */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Total de materiales</Text>
          <View style={styles.summaryAmountContainer}>
            <Text style={styles.summaryAmount}>{cargando ? '...' : materialesFiltrados.length}</Text>
            <Text style={styles.summaryUnit}>materiales</Text>
          </View>
        </View>

        {/* Lista de materiales por categoría */}
        <View style={styles.materialsContainer}>
          <Text style={styles.sectionTitle}>Materiales por categoría</Text>
          {cargando ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 20 }}>Cargando materiales...</Text>
          ) : error ? (
            <Text style={{ color: 'red', textAlign: 'center', marginVertical: 20 }}>{error}</Text>
          ) : materialesFiltrados.length === 0 ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 20 }}>No hay materiales registrados.</Text>
          ) : (
            categorias.map((cat) => (
              <View 
                key={cat} 
                style={styles.categoriaContainer}
              >
                <Text style={styles.categoriaTitulo}>{cat}</Text>
                <View style={styles.materialesGrid}>
                  {materialesFiltrados.filter(m => m.categoria === cat).map((mat) => (
                    <View key={mat.id} style={styles.materialCapsula}>
                      {/* Bolita de color prominente */}
                      <View style={[styles.colorCirculo, { backgroundColor: mat.color || '#00e676' }]} />
                      {/* Botón eliminar material */}
                      <TouchableOpacity
                        style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                        onPress={() => { setMaterialAEliminar(mat); setShowDeleteAlert(true); }}
                      >
                        <Ionicons name="trash" size={20} color="#e53935" />
                      </TouchableOpacity>
                      {/* Información del material */}
                      <View style={styles.materialInfo}>
                        <Text style={styles.materialNombre} numberOfLines={2} ellipsizeMode="tail">
                          {mat.nombre}
                        </Text>
                        {cat === 'Filamento' ? (
                          <Text style={styles.materialSubtipo} numberOfLines={1} ellipsizeMode="tail">
                            {mat.subtipo}
                          </Text>
                        ) : (
                          <Text style={styles.materialSubtipo} numberOfLines={1} ellipsizeMode="tail">
                            {mat.tipo || 'Sin tipo'}
                          </Text>
                        )}
                      </View>
                      {/* Detalles del material */}
                      <View style={styles.materialDetalles}>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>Precio:</Text>
                          <Text style={styles.detalleValor}>${mat.precio}</Text>
                        </View>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>Inicial:</Text>
                          <Text style={styles.detalleValor}>{mat.peso || mat.pesoBobina || '-'}g</Text>
                        </View>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>Restante:</Text>
                          <Text style={styles.detalleValor}>
                            {typeof mat.cantidadRestante !== 'undefined' ? mat.cantidadRestante + 'g' : '-'}
                          </Text>
                        </View>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>Stock:</Text>
                          <Text style={styles.detalleValor}>{mat.cantidadDisponible || mat.cantidad || '-'} unidades</Text>
                        </View>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>Ingresado el:</Text>
                          <Text style={styles.detalleValor}>
                            {mat.fechaRegistro ? new Date(mat.fechaRegistro).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
        {/* Espacio visual para la barra de tabs */}
        <View style={{ height: 70, backgroundColor: '#0d0d0d' }} />
        {/* Modal de confirmación de eliminación */}
        {showDeleteAlert && (
          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: '#e53935', borderWidth: 2 }}>
              <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>⚠️ Eliminar material</Text>
              <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
                ¿Estás seguro de que quieres eliminar el material "{materialAEliminar?.nombre}"?
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowDeleteAlert(false)} style={{ padding: 10, borderRadius: 8, backgroundColor: '#a0a0a0', marginRight: 8 }}>
                  <Text style={{ color: '#222', fontWeight: 'bold' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleEliminarMaterial} style={{ padding: 10, borderRadius: 8, backgroundColor: '#e53935' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0d0d',
    flex: 1,
    padding: 16,
    marginTop: 30,
    paddingBottom: 70,
  },
  header: {
    marginBottom: 24,
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
  selectorContainer: {
    marginBottom: 20,
  },
  selectorTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriasScroll: {
    flexGrow: 0,
  },
  categoriasContent: {
    paddingRight: 16,
  },
  categoriaBoton: {
    backgroundColor: '#181818',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  categoriaBotonActivo: {
    borderColor: '#00e676',
    backgroundColor: '#00e676',
  },
  categoriaBotonText: {
    color: '#a0a0a0',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriaBotonTextActivo: {
    color: '#000',
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  summaryLabel: {
    color: '#a0a0a0',
    fontSize: 16,
    marginBottom: 8,
  },
  summaryAmountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  summaryAmount: {
    color: '#00e676',
    fontSize: 32,
    fontWeight: 'bold',
  },
  summaryUnit: {
    color: '#a0a0a0',
    fontSize: 16,
    marginLeft: 8,
    marginBottom: 4,
  },
  materialsContainer: {
    marginBottom: 0,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoriaContainer: {
    marginBottom: 0,
  },
  categoriaTitulo: {
    color: '#a0a0a0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'left',
  },
  materialesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  materialCapsula: {
    backgroundColor: '#181818',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    padding: 16,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#333',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  materialInfo: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  materialNombre: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  materialSubtipo: {
    color: '#a0a0a0',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  materialDetalles: {
    width: '100%',
  },
  detalleFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: '#222',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  detalleLabel: {
    color: '#a0a0a0',
    fontSize: 11,
    fontWeight: '500',
  },
  detalleValor: {
    color: '#00e676',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default InventoryScreen; 