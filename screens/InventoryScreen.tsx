import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Image, Modal, Dimensions } from 'react-native'
import React, { useState, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons';
import { useMateriales } from '../hooks';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales';

const InventoryScreen: React.FC = ({ navigation }: any) => {
  const { lang } = useLanguage();
  const t = translations[lang];
  // Usar el hook de materiales
  const { 
    materiales, 
    loading: cargando, 
    error, 
    eliminarMaterial,
    setFiltro 
  } = useMateriales();
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [materialAEliminar, setMaterialAEliminar] = useState<any>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Detectar si el dispositivo es pequeño
  const screenWidth = Dimensions.get('window').width;
  const isSmallDevice = screenWidth < 400;

  // El hook useMateriales ya maneja la carga automática de materiales

  // Filtro de materiales por búsqueda
  const materialesFiltrados = materiales.filter(mat => {
    const texto = `${mat.nombre || ''} ${mat.tipo || ''} ${mat.subtipo || ''}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  // Filtrar materiales agotados y disponibles
  const materialesAgotados = materialesFiltrados.filter(m => parseFloat(m.cantidadRestante || m.cantidad || '0') <= 0);
  const materialesDisponibles = materialesFiltrados.filter(m => parseFloat(m.cantidadRestante || m.cantidad || '0') > 0);

  // Agrupar materiales por categoría (solo disponibles)
  const categorias = Array.from(new Set(materialesDisponibles.map(m => m.categoria)))

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
      await eliminarMaterial(materialAEliminar.id);
      setMaterialAEliminar(null);
      setShowDeleteAlert(false);
    } catch (e) {
      setShowDeleteAlert(false);
    }
  };

  // Relación entre valor de imagen y require correspondiente
  const ICONOS_PNG = {
    filamento: require('../assets/filamento.png'),
    gancho: require('../assets/gancho.png'),
    resina: require('../assets/resina.png'),
    pinturas: require('../assets/pinturas.png'),
    pegamentos: require('../assets/pegamentos.png'),
    niidea: require('../assets/niidea.png'),
    brochas: require('../assets/brochas.png'),
    arosllaveros: require('../assets/arosllaveros.png'),
  };

  // Función para calcular el stock en unidades
  const getStockUnidades = (mat) => {
    const categoria = mat.categoria || t.filament;
    const restante = parseFloat(mat.cantidadRestante || mat.cantidad || '0');
    if (categoria === t.filament || categoria === t.resin) {
      const peso = parseFloat(mat.peso || mat.pesoBobina || '1');
      return peso > 0 ? Math.floor(restante / peso) : 0;
    } else if (categoria === t.paint) {
      const cantidadFrasco = parseFloat(mat.cantidad || '1');
      return cantidadFrasco > 0 ? Math.floor(restante / cantidadFrasco) : 0;
    } else {
      // Para aros de llavero y categorías personalizadas, usar cantidad (stock actual en unidades)
      return Math.floor(parseFloat(mat.cantidad || '0'));
    }
  };

  // Función para calcular el porcentaje restante del material
  const getPorcentajeRestante = (mat) => {
    const categoria = mat.categoria || t.filament;
    const cantidadInicial = parseFloat((mat as any).cantidadInicial || mat.cantidad || '0');
    const cantidadRestante = parseFloat(mat.cantidadRestante || mat.cantidad || '0');
    
    if (cantidadInicial <= 0) return 0;
    
    if (categoria === t.filament || categoria === t.resin) {
      // Para filamento y resina: calcular basado en peso total vs peso restante
      const pesoInicial = cantidadInicial * parseFloat(mat.peso || mat.pesoBobina || '1');
      const pesoRestante = cantidadRestante;
      return Math.max(0, Math.min(100, (pesoRestante / pesoInicial) * 100));
    } else if (categoria === t.paint) {
      // Para pintura: calcular basado en ml total vs ml restante
      const mlInicial = cantidadInicial * parseFloat(mat.cantidad || '1');
      const mlRestante = cantidadRestante;
      return Math.max(0, Math.min(100, (mlRestante / mlInicial) * 100));
    } else {
      // Para aros de llavero y otros: calcular basado en unidades
      return Math.max(0, Math.min(100, (cantidadRestante / cantidadInicial) * 100));
    }
  };

  return (
    <ScrollView style={styles.container} ref={scrollViewRef}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>{t.inventoryTitle}</Text>
          <Text style={styles.username}>{t.availableMaterials}</Text>
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
            placeholder={t.searchMaterialPlaceholder}
            placeholderTextColor="#888"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {/* Selector de categorías */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>{t.categories}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriasScroll}
            contentContainerStyle={styles.categoriasContent}
          >
            {categorias.length === 0 ? (
              <Text style={{ color: '#a0a0a0', marginLeft: 10 }}>{t.noCategories}</Text>
            ) : (
              categorias.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoriaBoton,
                    categoriaSeleccionada === cat ? styles.categoriaBotonActivo : null
                  ]}
                  onPress={() => navegarACategoria(cat)}
                >
                  <Text style={[
                    styles.categoriaBotonText,
                    categoriaSeleccionada === cat ? styles.categoriaBotonTextActivo : null
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
          <Text style={styles.summaryLabel}>{t.totalMaterials}</Text>
          <View style={styles.summaryAmountContainer}>
            <Text style={styles.summaryAmount}>{cargando ? '...' : materialesDisponibles.length}</Text>
            <Text style={styles.summaryUnit}>{t.materials}</Text>
          </View>
        </View>

        {/* Lista de materiales por categoría */}
        <View style={styles.materialsContainer}>
          <Text style={styles.sectionTitle}>{t.materialsByCategory}</Text>
          {cargando ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 20 }}>{t.loadingMaterials}</Text>
          ) : error ? (
            <Text style={{ color: 'red', textAlign: 'center', marginVertical: 20 }}>{error}</Text>
          ) : materialesDisponibles.length === 0 ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 20 }}>{t.noMaterialsRegistered}</Text>
          ) : (
            categorias.map((cat) => (
              <View 
                key={cat} 
                style={styles.categoriaContainer}
              >
                <Text style={styles.categoriaTitulo}>{cat}</Text>
                <View style={styles.materialesGrid}>
                  {materialesDisponibles.filter(m => m.categoria === cat).map((mat) => (
                    <View key={mat.id} style={[
                      styles.materialCapsula,
                      isSmallDevice ? { width: '100%' } : { width: '48%' }
                    ]}>
                      {/* Botones de acción */}
                      <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, flexDirection: 'row' }}>
                        <TouchableOpacity
                          style={{ marginRight: 8 }}
                          onPress={() => navigation.navigate('EditMaterial', { material: mat })}
                        >
                          <Ionicons name="create" size={20} color="#00e676" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { setMaterialAEliminar(mat); setShowDeleteAlert(true); }}
                        >
                          <Ionicons name="trash" size={20} color="#e53935" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Imagen del material como título visual */}
                      <Image
                        source={
                          mat.imagen && ICONOS_PNG[mat.imagen]
                            ? ICONOS_PNG[mat.imagen]
                            : require('../assets/filamento.png') // Imagen por defecto
                        }
                        style={styles.materialImage}
                        resizeMode="contain"
                      />
                      
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
                      
                      {/* Bolita de color prominente */}
                      <View style={[styles.colorCirculo, { backgroundColor: mat.color || '#00e676' }]} />
                      
                      {/* Mini gráfica de stock restante */}
                      <View style={styles.usageChartContainer}>
                        <View style={styles.usageChart}>
                          <View style={[
                            styles.usageChartFill, 
                            { 
                              width: `${getPorcentajeRestante(mat)}%`,
                              backgroundColor: getPorcentajeRestante(mat) < 20 ? '#e53935' : 
                                             getPorcentajeRestante(mat) < 50 ? '#ff9800' : '#00e676'
                            }
                          ]} />
                        </View>
                        <Text style={styles.usagePercentage}>
                          {getPorcentajeRestante(mat).toFixed(0)}% {t.remaining}
                        </Text>
                      </View>
                      
                      {/* Detalles del material */}
                      <View style={styles.materialDetalles}>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>{t.price}</Text>
                          <Text style={styles.detalleValor}>${mat.precio}</Text>
                        </View>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>{t.initialStock}</Text>
                          <Text style={styles.detalleValor}>
                            {((mat as any).cantidadInicial || mat.cantidad || '-') + ' ' + t.units}
                          </Text>
                        </View>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>{t.currentStock}</Text>
                          <Text style={styles.detalleValor}>
                            {mat.categoria === t.filament || mat.categoria === t.resin
                              ? (() => {
                                  const restante = parseFloat(mat.cantidadRestante || '0');
                                  const peso = parseFloat(mat.peso || '1');
                                  return peso > 0 ? Math.floor(restante / peso) : 0;
                                })() + ' ' + t.units
                              : mat.categoria === t.paint
                                ? (() => {
                                    const restante = parseFloat(mat.cantidadRestante || '0');
                                    const cantidadFrasco = parseFloat(mat.cantidad || '1');
                                    return cantidadFrasco > 0 ? Math.floor(restante / cantidadFrasco) : 0;
                                  })() + ' ' + t.units
                                : (mat.cantidad || '-') + ' ' + t.units}
                          </Text>
                        </View>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>{t.remaining}</Text>
                          <Text style={styles.detalleValor}>
                            {typeof mat.cantidadRestante !== 'undefined' 
                              ? mat.cantidadRestante + (() => {
                                  const categoria = mat.categoria || 'Filamento';
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
                                })()
                              : '-'
                            }
                          </Text>
                        </View>
                        <View style={styles.detalleFila}>
                          <Text style={styles.detalleLabel}>{t.registeredOn}</Text>
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
          <Modal
            visible={showDeleteAlert}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowDeleteAlert(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>⚠️ {t.deleteMaterial}</Text>
                <Text style={styles.modalMessage}>
                  {t.confirmDeleteMaterialMessage.replace('{0}', materialAEliminar?.nombre || '')}
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setShowDeleteAlert(false)} style={styles.modalButtonCancel}>
                    <Text style={styles.modalButtonTextCancel}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleEliminarMaterial} style={styles.modalButtonDelete}>
                    <Text style={styles.modalButtonTextDelete}>{t.delete}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
        {materialesAgotados.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>{t.outOfStock}</Text>
            <View style={styles.materialesGrid}>
              {materialesAgotados.map((mat) => (
                <View key={mat.id} style={[
                  styles.materialCapsula,
                  { opacity: 0.5 },
                  isSmallDevice ? { width: '100%' } : { width: '48%' }
                ]}> 
                  {/* Botones de acción para materiales agotados */}
                  <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={{ marginRight: 8 }}
                      onPress={() => navigation.navigate('EditMaterial', { material: mat })}
                    >
                      <Ionicons name="create" size={20} color="#00e676" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setMaterialAEliminar(mat); setShowDeleteAlert(true); }}
                    >
                      <Ionicons name="trash" size={20} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                  
                  <Image
                    source={
                      mat.imagen && ICONOS_PNG[mat.imagen]
                        ? ICONOS_PNG[mat.imagen]
                        : require('../assets/filamento.png')
                    }
                    style={styles.materialImage}
                    resizeMode="contain"
                  />
                  <View style={styles.materialInfo}>
                    <Text style={[styles.materialNombre, { color: '#e53935' }]} numberOfLines={2} ellipsizeMode="tail">
                      {mat.nombre}
                    </Text>
                    <Text style={styles.materialSubtipo} numberOfLines={1} ellipsizeMode="tail">
                      {mat.tipo || mat.subtipo || 'Sin tipo'}
                    </Text>
                  </View>
                  <View style={[styles.colorCirculo, { backgroundColor: mat.color || '#00e676' }]} />
                  
                  {/* Mini gráfica de stock restante para materiales agotados */}
                  <View style={styles.usageChartContainer}>
                    <View style={styles.usageChart}>
                      <View style={[
                        styles.usageChartFill, 
                        { 
                          width: '0%',
                          backgroundColor: '#e53935'
                        }
                      ]} />
                    </View>
                    <Text style={styles.usagePercentage}>
                      0% {t.remaining}
                    </Text>
                  </View>
                  
                  <View style={styles.materialDetalles}>
                    <View style={styles.detalleFila}>
                      <Text style={styles.detalleLabel}>{t.price}</Text>
                      <Text style={styles.detalleValor}>${mat.precio}</Text>
                    </View>
                    <View style={styles.detalleFila}>
                      <Text style={styles.detalleLabel}>{t.initialStock}</Text>
                      <Text style={styles.detalleValor}>
                        {((mat as any).cantidadInicial || mat.cantidad || '-') + ' ' + t.units}
                      </Text>
                    </View>
                    <View style={styles.detalleFila}>
                      <Text style={styles.detalleLabel}>{t.currentStock}</Text>
                      <Text style={[styles.detalleValor, { color: '#e53935' }]}>0 {t.units} ({t.outOfStock})</Text>
                    </View>
                    <View style={styles.detalleFila}>
                      <Text style={styles.detalleLabel}>{t.remaining}</Text>
                      <Text style={styles.detalleValor}>0</Text>
                    </View>
                    <View style={styles.detalleFila}>
                      <Text style={styles.detalleLabel}>{t.registeredOn}</Text>
                      <Text style={styles.detalleValor}>
                        {mat.fechaRegistro ? new Date(mat.fechaRegistro).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
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
  materialImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 350,
    borderColor: '#e53935',
    borderWidth: 2,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#e53935',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
  },
  modalMessage: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButtonCancel: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#a0a0a0',
  },
  modalButtonTextCancel: {
    color: '#222',
    fontWeight: 'bold',
  },
  modalButtonDelete: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e53935',
  },
  modalButtonTextDelete: {
    color: '#fff',
    fontWeight: 'bold',
  },
  usageChartContainer: {
    width: '100%',
    marginBottom: 8,
    alignItems: 'center',
  },
  usageChart: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  usageChartFill: {
    height: '100%',
    borderRadius: 3,
  },
  usagePercentage: {
    color: '#a0a0a0',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default InventoryScreen; 