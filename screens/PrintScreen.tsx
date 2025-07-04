import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, app } from '../api/firebase';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

const db = getFirestore(app);

const PrintScreen: React.FC = () => {
  const [calculos, setCalculos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [materialDetalles, setMaterialDetalles] = useState<any | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [calculoAEliminar, setCalculoAEliminar] = useState<any | null>(null);

  const cargarCalculos = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setCalculos([]);
        setLoading(false);
        return;
      }
      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'calculos'));
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCalculos(datos);
    } catch (e) {
      setError('Error al cargar los cálculos.');
      setCalculos([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarCalculos();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarCalculos().finally(() => setRefreshing(false));
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const mostrarDetallesMaterial = (material: any) => {
    setMaterialDetalles(material);
    setModalVisible(true);
  };

  const confirmarEliminacion = (calculo: any) => {
    setCalculoAEliminar(calculo);
    setDeleteModalVisible(true);
  };

  const eliminarCalculo = async () => {
    if (!calculoAEliminar) return;
    
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para eliminar cálculos');
        return;
      }
      
      await deleteDoc(doc(db, 'usuarios', user.uid, 'calculos', calculoAEliminar.id));
      
      // Actualizar la lista local
      setCalculos(prev => prev.filter(calc => calc.id !== calculoAEliminar.id));
      
      setDeleteModalVisible(false);
      setCalculoAEliminar(null);
      
      Alert.alert('✅ Eliminado', 'El cálculo ha sido eliminado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar el cálculo. Intenta de nuevo.');
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Ionicons name="calculator" size={40} color="#00e676" />
        <Text style={styles.title}>Cálculos Guardados</Text>
        <Text style={styles.subtitle}>
          {calculos.length === 0 
            ? 'No hay cálculos guardados' 
            : `${calculos.length} cálculo${calculos.length !== 1 ? 's' : ''} guardado${calculos.length !== 1 ? 's' : ''}`
          }
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00e676" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>
      ) : calculos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#666" />
          <Text style={styles.emptyTitle}>No hay cálculos</Text>
          <Text style={styles.emptySubtitle}>
            Los cálculos que guardes en la calculadora aparecerán aquí
          </Text>
        </View>
      ) : (
        <View style={styles.calculationsContainer}>
          {calculos
            .slice()
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            .map((calculo, index) => {
              const total = calculo.costoTotal || '0.00';
              const costoProduccion = (
                parseFloat(calculo.filamento?.costoMaterialSolo || '0') +
                parseFloat(calculo.manoObra?.costoTotalManoObra || '0') +
                parseFloat(calculo.avanzados?.totalMaterialesExtra || '0') +
                parseFloat(calculo.avanzados?.costoLuz || '0')
              ).toFixed(2);
              return (
                <View key={calculo.id} style={styles.calculationCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.accordionHeader, { flex: 1 }]}
                      onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    >
                      <View style={styles.cardTitleContainer}>
                        <Ionicons name="calculator-outline" size={24} color="#00e676" />
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {calculo.nombre}
                        </Text>
                        {/* Etiqueta de estado */}
                        {calculo.fallo ? (
                          <Text style={{ color: '#e53935', fontWeight: 'bold', marginLeft: 8, fontSize: 13 }}>❌ Fallo</Text>
                        ) : (
                          <Text style={{ color: '#00e676', fontWeight: 'bold', marginLeft: 8, fontSize: 13 }}>✅ Éxito</Text>
                        )}
                      </View>
                      <Ionicons
                        name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                        size={24}
                        color="#00e676"
                      />
                    </TouchableOpacity>
                    {/* Botón de eliminar */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmarEliminacion(calculo)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                  {expandedIndex === index && (
                    <View style={styles.accordionBody}>
                      {/* Información del material utilizado */}
                      {calculo.materialSeleccionado && calculo.materialSeleccionado.id && (
                        <TouchableOpacity
                          style={styles.materialInfoContainer}
                          onPress={() => mostrarDetallesMaterial(calculo.materialSeleccionado)}
                        >
                          <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: calculo.materialSeleccionado.color || '#00e676',
                            borderWidth: 2,
                            borderColor: '#333',
                            marginRight: 12,
                          }} />
                          <Text style={styles.materialInfoText}>
                            {calculo.materialSeleccionado.nombre} ({calculo.materialSeleccionado.tipo} - {calculo.materialSeleccionado.subtipo})
                          </Text>
                          <Ionicons name="information-circle-outline" size={20} color="#00e676" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                      )}
                      {/* Detalles de impresión si están disponibles */}
                      {calculo.detallesImpresion && (
                        <View style={styles.detailsContainer}>
                          {calculo.detallesImpresion.relleno && (
                            <Text style={styles.detailText}>Relleno: {calculo.detallesImpresion.relleno}%</Text>
                          )}
                          {calculo.detallesImpresion.tiempoImpresion && (
                            <Text style={styles.detailText}>Tiempo: {calculo.detallesImpresion.tiempoImpresion}h</Text>
                          )}
                          {calculo.detallesImpresion.temperatura && (
                            <Text style={styles.detailText}>Temp: {calculo.detallesImpresion.temperatura}°C</Text>
                          )}
                        </View>
                      )}
                      {/* Costos */}
                      <Text style={[styles.infoValue, {color: '#00e676'}]}>{`Materiales: $${calculo.filamento?.costoMaterialSolo || '0'} MXN`}</Text>
                      <Text style={[styles.infoValue, {color: '#ffd600'}]}>{`Mano de obra: $${calculo.manoObra?.costoTotalManoObra || '0'} MXN`}</Text>
                      <Text style={[styles.infoValue, {color: '#ff9100'}]}>{`Materiales extra: $${calculo.avanzados?.totalMaterialesExtra || '0'} MXN`}</Text>
                      <Text style={[styles.infoValue, {color: '#40c4ff'}]}>{`Luz: $${calculo.avanzados?.costoLuz || '0'} MXN`}</Text>
                      <Text style={[styles.infoValue, {color: '#fff'}]}>{`Costo de producción: $${costoProduccion} MXN`}</Text>
                      <Text style={[styles.infoValue, {color: '#69f0ae', fontWeight: 'bold'}]}>{`Costo total: $${total} MXN`}</Text>
                    </View>
                  )}
                </View>
              );
            })}
        </View>
      )}

      {/* Modal para mostrar detalles del material */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350 }}>
            <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Detalles del material</Text>
            {materialDetalles ? (
              <>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>Nombre: <Text style={{ color: '#00e676' }}>{materialDetalles.nombre || '-'}</Text></Text>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>Tipo: <Text style={{ color: '#00e676' }}>{materialDetalles.tipo || '-'}</Text></Text>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>Subtipo: <Text style={{ color: '#00e676' }}>{materialDetalles.subtipo || '-'}</Text></Text>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>Color: <Text style={{ color: '#00e676' }}>{materialDetalles.color || '-'}</Text></Text>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>Peso: <Text style={{ color: '#00e676' }}>{materialDetalles.peso || '-'}</Text></Text>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>Precio: <Text style={{ color: '#00e676' }}>{materialDetalles.precio || '-'}</Text></Text>
                {/* Puedes agregar más campos si existen en el objeto */}
              </>
            ) : (
              <Text style={{ color: '#fff' }}>No hay detalles disponibles.</Text>
            )}
            <TouchableOpacity
              style={{ marginTop: 20, backgroundColor: '#00e676', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 16 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: '#e53935', borderWidth: 2 }}>
            <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>⚠️ Confirmar eliminación</Text>
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
              ¿Estás seguro de que quieres eliminar el cálculo "{calculoAEliminar?.nombre}"?
            </Text>
            <Text style={{ color: '#a0a0a0', fontSize: 14, marginBottom: 20 }}>
              Esta acción no se puede deshacer y afectará las estadísticas.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#333', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#666' }}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#e53935', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={eliminarCalculo}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    marginTop: 30,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#181818',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
  },
  calculationsContainer: {
    padding: 20,
  },
  calculationCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#181818',
    borderRadius: 8,
    marginBottom: 4,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  accordionBody: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  infoContainer: {
    backgroundColor: '#181818',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#00e676',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  testButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  materialInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialInfoText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#e53935',
  },
});

export default PrintScreen; 