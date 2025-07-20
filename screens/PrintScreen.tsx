import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, app } from '../api/firebase';
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales';

const db = getFirestore(app);

// Componente hijo para manejar la lógica de cada proyecto
const ProyectoCard: React.FC<{
  proyecto: any;
  onSeleccionar: (proyecto: any) => void;
  onDesarchivar: (proyectoId: string) => void;
  onRecargar: () => void;
  onEliminar?: (proyecto: any) => void;
}> = ({ proyecto, onSeleccionar, onDesarchivar, onRecargar, onEliminar }) => {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [impresionesCarpeta, setImpresionesCarpeta] = useState<any[]>([]);
  const [loadingImpresiones, setLoadingImpresiones] = useState(true);

  useEffect(() => {
    const cargarImpresiones = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        setLoadingImpresiones(true);
        const snap = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos', proyecto.id, 'impresiones'));
        setImpresionesCarpeta(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error cargando impresiones:', error);
        setImpresionesCarpeta([]);
      } finally {
        setLoadingImpresiones(false);
      }
    };
    cargarImpresiones();
  }, [proyecto.id]);

  // Calcular estadísticas del proyecto
  const estadisticas = {
    costoTotal: impresionesCarpeta.reduce((sum, imp) => sum + (parseFloat(imp.costoTotal) || 0), 0),
    materiales: Array.from(new Set(impresionesCarpeta.map(imp => imp.materialSeleccionado?.nombre).filter(Boolean))),
    cantidadImpresiones: impresionesCarpeta.length
  };

  return (
    <View style={[styles.proyectoCard, proyecto.archivado ? styles.proyectoArchivado : null]}>
      <View style={styles.proyectoHeader}>
        <Text style={[styles.proyectoNombre, proyecto.archivado ? styles.proyectoArchivadoText : null]}>
          {proyecto.nombre}
        </Text>
        <View style={styles.proyectoActions}>
          {proyecto.archivado && (
            <TouchableOpacity onPress={async () => {
              const user = auth.currentUser;
              if (!user) return;
              await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyecto.id), { archivado: false });
              onRecargar();
            }}>
              <Text style={styles.desarchivarButton}>{t.unarchive}</Text>
            </TouchableOpacity>
          )}
          {onEliminar && (
            <TouchableOpacity 
              style={styles.eliminarProyectoButton}
              onPress={() => onEliminar(proyecto)}
            >
              <Ionicons name="trash-outline" size={16} color="#e53935" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {loadingImpresiones ? (
        <ActivityIndicator size="small" color="#00e676" style={styles.loadingIndicator} />
      ) : (
        <View style={styles.proyectoStats}>
          <Text style={styles.statText}>{t.impressions}: {estadisticas.cantidadImpresiones}</Text>
          <Text style={styles.statText}>{t.totalCost}: ${estadisticas.costoTotal.toFixed(2)} MXN</Text>
          <Text style={styles.statText}>
            {t.materialsUsed}: {estadisticas.materiales.join(', ') || '-'}
          </Text>
        </View>
      )}
      
      {proyecto.archivado && (
        <Text style={styles.archivadoText}>{t.archived}</Text>
      )}
      
      <TouchableOpacity style={styles.verDetallesButton} onPress={() => onSeleccionar(proyecto)}>
        <Text style={styles.verDetallesText}>{t.viewDetails}</Text>
      </TouchableOpacity>
    </View>
  );
};

const PrintScreen: React.FC = () => {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<any | null>(null);
  const [impresiones, setImpresiones] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [materialDetalles, setMaterialDetalles] = useState<any | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [impresionAEliminar, setImpresionAEliminar] = useState<any | null>(null);
  const [crearProyectoModal, setCrearProyectoModal] = useState(false);
  const [nuevoProyectoNombre, setNuevoProyectoNombre] = useState('');
  const [filtro, setFiltro] = useState('');
  const [proyectoAEliminar, setProyectoAEliminar] = useState<any | null>(null);
  const [modalEliminarProyecto, setModalEliminarProyecto] = useState(false);
  const [tab, setTab] = useState<'carpetas' | 'sueltos'>('carpetas');
  const [proyectosArchivados, setProyectosArchivados] = useState<any[]>([]);
  const [proyectosSueltos, setProyectosSueltos] = useState<any[]>([]);
  const [materialesActualizados, setMaterialesActualizados] = useState<any[]>([]);

  // Cargar materiales actualizados
  const cargarMaterialesActualizados = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setMaterialesActualizados([]);
        return;
      }
      
      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'materiales'));
      const materiales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterialesActualizados(materiales);
    } catch (error) {
      console.error('Error cargando materiales actualizados:', error);
      setMaterialesActualizados([]);
    }
  };

  // Cargar proyectos y sueltos optimizado
  const cargarProyectosYSueltos = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setProyectos([]);
        setProyectosArchivados([]);
        setProyectosSueltos([]);
        setLoading(false);
        return;
      }
      
      // Cargar proyectos, sueltos y materiales en paralelo
      const [proyectosSnap, sueltosSnap] = await Promise.all([
        getDocs(collection(db, 'usuarios', user.uid, 'proyectos')),
        getDocs(collection(db, 'usuarios', user.uid, 'calculos'))
      ]);
      
      const carpetas = proyectosSnap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          archivado: data.archivado || false,
        };
      });
      
      const sueltos = sueltosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setProyectos(carpetas.filter(p => !p.archivado));
      setProyectosArchivados(carpetas.filter(p => p.archivado));
      setProyectosSueltos(sueltos);
      
      // Cargar materiales actualizados
      await cargarMaterialesActualizados();
      
      setLoading(false);
    } catch (e) {
      setError('Error al cargar los proyectos.');
      setProyectos([]);
      setProyectosArchivados([]);
      setProyectosSueltos([]);
      setLoading(false);
    }
  };

  // Cargar impresiones de un proyecto optimizado
  const cargarImpresiones = async (proyectoId: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setImpresiones([]);
        setLoading(false);
        return;
      }
      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos', proyectoId, 'impresiones'));
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setImpresiones(datos);
    } catch (e) {
      setError('Error al cargar las impresiones.');
      setImpresiones([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarProyectosYSueltos();
      setProyectoSeleccionado(null);
      setImpresiones([]);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    if (proyectoSeleccionado) {
      cargarImpresiones(proyectoSeleccionado.id).finally(() => setRefreshing(false));
    } else {
      cargarProyectosYSueltos().finally(() => setRefreshing(false));
    }
    cargarMaterialesActualizados();
  };

  // Crear nuevo proyecto optimizado
  const crearProyecto = async () => {
    const user = auth.currentUser;
    if (!user || !nuevoProyectoNombre.trim()) return;
    try {
      await addDoc(collection(db, 'usuarios', user.uid, 'proyectos'), {
        nombre: nuevoProyectoNombre.trim(),
        fechaCreacion: new Date().toISOString(),
      });
      setCrearProyectoModal(false);
      setNuevoProyectoNombre('');
      cargarProyectosYSueltos();
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear el proyecto.');
    }
  };

  // Eliminar impresión optimizado
  const eliminarImpresion = async () => {
    if (!impresionAEliminar) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      if (proyectoSeleccionado) {
        // Eliminar impresión de un proyecto específico
        await deleteDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones', impresionAEliminar.id));
        cargarImpresiones(proyectoSeleccionado.id);
      } else {
        // Eliminar proyecto suelto
        await deleteDoc(doc(db, 'usuarios', user.uid, 'calculos', impresionAEliminar.id));
        cargarProyectosYSueltos();
      }
      
      setImpresionAEliminar(null);
      setDeleteModalVisible(false);
    } catch (e) {
      setDeleteModalVisible(false);
    }
  };

  // Eliminar proyecto completo
  const eliminarProyecto = async () => {
    if (!proyectoAEliminar) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Eliminar todas las impresiones del proyecto
      const impSnap = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos', proyectoAEliminar.id, 'impresiones'));
      for (const docu of impSnap.docs) {
        await deleteDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoAEliminar.id, 'impresiones', docu.id));
      }
      // Eliminar el proyecto
      await deleteDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoAEliminar.id));
      
      setModalEliminarProyecto(false);
      setProyectoAEliminar(null);
      cargarProyectosYSueltos();
      if (proyectoSeleccionado?.id === proyectoAEliminar.id) setProyectoSeleccionado(null);
    } catch (e) {
      setModalEliminarProyecto(false);
    }
  };

  // Renderizar impresión individual
  // Estado para controlar el desplegable de materiales por impresión
  const [materialesExpandidos, setMaterialesExpandidos] = useState<{[key: string]: boolean}>({});

  // Función para obtener la cantidad restante histórica de un material
  const getCantidadRestanteHistorica = (materialId: string, cantidadRestanteHistorica: string) => {
    // Si hay cantidad restante histórica guardada, usarla; si no, buscar en materiales actualizados
    if (cantidadRestanteHistorica && cantidadRestanteHistorica !== '0') {
      return cantidadRestanteHistorica;
    }
    
    // Fallback a materiales actualizados si no hay dato histórico
    const materialActualizado = materialesActualizados.find(m => m.id === materialId);
    if (materialActualizado) {
      return materialActualizado.cantidadRestante || '0';
    }
    return '0';
  };

  const renderImpresion = (calculo: any) => {
              const total = calculo.costoTotal || '0.00';
              const costoProduccion = (
                parseFloat(calculo.filamento?.costoMaterialSolo || '0') +
                parseFloat(calculo.manoObra?.costoTotalManoObra || '0') +
                parseFloat(calculo.avanzados?.totalMaterialesExtra || '0') +
                parseFloat(calculo.avanzados?.costoLuz || '0')
              ).toFixed(2);

    const impresionId = calculo.id || 'default';
    const materialesExpandido = materialesExpandidos[impresionId] || false;

              return (
                <View key={calculo.id} style={styles.calculationCard}>
        <View style={styles.cardHeader}>
                      <View style={styles.cardTitleContainer}>
                        <Ionicons name="calculator-outline" size={24} color="#00e676" />
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {calculo.nombre}
                        </Text>
                        {calculo.fallo ? (
              <Text style={styles.falloText}>
                <Ionicons name="close-circle" size={16} color="#d32f2f" />
                {' '}{t.failure}
              </Text>
                        ) : (
              <Text style={styles.exitoText}>
                <Ionicons name="checkmark-circle" size={16} color="#00e676" />
                {' '}{t.success}
              </Text>
                        )}
                      </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
            onPress={() => { setImpresionAEliminar(calculo); setDeleteModalVisible(true); }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#e53935" />
                    </TouchableOpacity>
                  </View>
        
                    <View style={styles.accordionBody}>
          {/* Botón desplegable para materiales */}
                        <TouchableOpacity
            style={styles.materialesToggleButton}
            onPress={() => setMaterialesExpandidos(prev => ({
              ...prev,
              [impresionId]: !materialesExpandido
            }))}
          >
            <Text style={styles.materialesToggleText}>
              <Ionicons name="cube-outline" size={16} color="#00e676" />
              {' '}{t.usedMaterials}
            </Text>
            <Ionicons 
              name={materialesExpandido ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#00e676" 
            />
          </TouchableOpacity>

          {/* Contenido desplegable de materiales */}
          {materialesExpandido && (
            <View style={styles.materialesExpandidoContainer}>
              {/* Material único */}
              {!calculo.esMultifilamento && calculo.materialSeleccionado && calculo.materialSeleccionado.id && (
                <View style={styles.materialInfoContainer}>
                  <View style={[styles.materialColorIndicator, { backgroundColor: calculo.materialSeleccionado.color || '#00e676' }]} />
                  <View style={styles.materialDetails}>
                    <Text style={styles.materialInfoText}>
                      {calculo.materialSeleccionado.nombre} ({calculo.materialSeleccionado.tipo} - {calculo.materialSeleccionado.subtipo})
                    </Text>
                    <Text style={styles.materialDetailText}>
                      {(() => {
                        const categoria = calculo.materialSeleccionado.categoria || t.filament;
                        const cantidad = calculo.filamento?.gramosUtilizados || '0';
                        switch (categoria) {
                          case t.paint:
                            return `${t.mlUsed}: ${cantidad}ml`;
                          case t.keychainRings:
                            return `${t.quantityUsed}: ${cantidad} unidades`;
                          case t.filament:
                          case t.resin:
                          default:
                            return `${t.gUsed}: ${cantidad}g`;
                        }
                      })()}
                    </Text>
                    {/* Información adicional del material */}
                    <View style={styles.materialInfoGrid}>
                      <Text style={styles.materialInfoLabel}>{t.unitPrice}:</Text>
                      <Text style={styles.materialInfoValue}>
                        ${calculo.filamento?.precioBobina || '0'} MXN
                      </Text>
                      <Text style={styles.materialInfoLabel}>{t.totalQuantity}:</Text>
                      <Text style={styles.materialInfoValue}>
                        {(() => {
                          const categoria = calculo.materialSeleccionado.categoria || t.filament;
                          const cantidad = calculo.filamento?.pesoBobina || '0';
                          switch (categoria) {
                            case t.paint:
                              return `${cantidad}ml`;
                            case t.keychainRings:
                              return `${cantidad} unidades`;
                            case t.filament:
                            case t.resin:
                            default:
                              return `${cantidad}g`;
                          }
                        })()}
                      </Text>
                      <Text style={styles.materialInfoLabel}>{t.remainingQuantity}:</Text>
                      <Text style={styles.materialInfoValue}>
                        {(() => {
                          const categoria = calculo.materialSeleccionado.categoria || t.filament;
                          const restante = getCantidadRestanteHistorica(
                            calculo.materialSeleccionado.id, 
                            calculo.materialSeleccionado.cantidadRestante || '0'
                          );
                          switch (categoria) {
                            case t.paint:
                              return `${restante}ml`;
                            case t.keychainRings:
                              return `${restante} unidades`;
                            case t.filament:
                            case t.resin:
                            default:
                              return `${restante}g`;
                          }
                        })()}
                      </Text>
                      <Text style={styles.materialInfoLabel}>{t.materialCost}:</Text>
                      <Text style={styles.materialInfoValue}>
                        ${calculo.filamento?.costoMaterialSolo || '0'} MXN
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Múltiples materiales */}
              {calculo.esMultifilamento && calculo.materialesMultiples && calculo.materialesMultiples.length > 0 && (
                <View style={styles.materialsContainer}>
                  {calculo.materialesMultiples.map((material: any, index: number) => (
                    material && (
                      <View key={index} style={styles.materialItem}>
                        <View style={[styles.materialColorIndicator, { backgroundColor: material.color || '#00e676' }]} />
                        <View style={styles.materialDetails}>
                          <Text style={styles.materialInfoText}>
                            {material.nombre} ({material.tipo} - {material.subtipo})
                          </Text>
                          <Text style={styles.materialDetailText}>
                            {(() => {
                              switch (material.categoria) {
                                case t.paint:
                                  return `${t.mlUsed}: ${material.cantidadPintura || '0'}ml`;
                                case t.keychainRings:
                                  return `${t.quantityUsed}: ${material.cantidadLlaveros || '0'} unidades`;
                                case t.filament:
                                case t.resin:
                                default:
                                  return `${t.gUsed}: ${material.gramosUtilizados || '0'}g`;
                              }
                            })()}
                          </Text>
                          {/* Información adicional del material múltiple */}
                          <View style={styles.materialInfoGrid}>
                            <Text style={styles.materialInfoLabel}>{t.unitPrice}:</Text>
                            <Text style={styles.materialInfoValue}>
                              ${material.precioBobina || material.precio || '0'} MXN
                            </Text>
                            <Text style={styles.materialInfoLabel}>{t.totalQuantity}:</Text>
                            <Text style={styles.materialInfoValue}>
                              {(() => {
                                const categoria = material.categoria;
                                const cantidad = material.pesoBobina || material.peso || material.cantidad || '0';
                                switch (categoria) {
                                  case t.paint:
                                    return `${cantidad}ml`;
                                  case t.keychainRings:
                                    return `${cantidad} unidades`;
                                  case t.filament:
                                  case t.resin:
                                  default:
                                    return `${cantidad}g`;
                                }
                              })()}
                            </Text>
                            <Text style={styles.materialInfoLabel}>{t.remainingQuantity}:</Text>
                            <Text style={styles.materialInfoValue}>
                              {(() => {
                                const categoria = material.categoria;
                                const restante = getCantidadRestanteHistorica(
                                  material.id, 
                                  material.cantidadRestante || '0'
                                );
                                switch (categoria) {
                                  case t.paint:
                                    return `${restante}ml`;
                                  case t.keychainRings:
                                    return `${restante} unidades`;
                                  case t.filament:
                                  case t.resin:
                                  default:
                                    return `${restante}g`;
                                }
                              })()}
                            </Text>
                            <Text style={styles.materialInfoLabel}>{t.materialCost}:</Text>
                            <Text style={styles.materialInfoValue}>
                              ${(() => {
                                const categoria = material.categoria;
                                let costo = 0;
                                
                                switch (categoria) {
                                  case t.filament:
                                  case t.resin:
                                    if (material.precioBobina && material.pesoBobina && material.gramosUtilizados) {
                                      const costoPorGramo = parseFloat(material.precioBobina) / parseFloat(material.pesoBobina);
                                      costo = costoPorGramo * parseFloat(material.gramosUtilizados);
                                    }
                                    break;
                                  case t.paint:
                                    if (material.precio && material.cantidad && material.cantidadPintura) {
                                      const cantidadTotalPintura = parseFloat(material.cantidad);
                                      const mlUtilizados = parseFloat(material.cantidadPintura);
                                      const costoPorMl = parseFloat(material.precio) / cantidadTotalPintura;
                                      costo = costoPorMl * mlUtilizados;
                                    }
                                    break;
                                  case t.keychainRings:
                                    if (material.precio && material.cantidadLlaveros) {
                                      costo = parseFloat(material.precio) * parseFloat(material.cantidadLlaveros);
                                    }
                                    break;
                                  default:
                                    if (material.precio && material.cantidadUtilizada) {
                                      costo = parseFloat(material.precio) * parseFloat(material.cantidadUtilizada);
                                    }
                                }
                                return costo.toFixed(2);
                              })()} MXN
                            </Text>
                          </View>
                        </View>
                      </View>
                    )
                  ))}
                </View>
              )}
            </View>
          )}
          
                      {calculo.detallesImpresion && (
                        <View style={styles.detailsContainer}>
                          {calculo.detallesImpresion.relleno && (
                            <Text style={styles.detailText}>{t.fill}: {calculo.detallesImpresion.relleno}%</Text>
                          )}
                          {calculo.detallesImpresion.tiempoImpresion && (
                            <Text style={styles.detailText}>{t.time}: {calculo.detallesImpresion.tiempoImpresion}h</Text>
                          )}
                          {calculo.detallesImpresion.temperatura && (
                            <Text style={styles.detailText}>{t.temp}: {calculo.detallesImpresion.temperatura}°C</Text>
                          )}
                        </View>
                      )}
          
          <Text style={[styles.infoValue, {color: '#00e676'}]}>
            {`${t.materials}: $${calculo.filamento?.costoMaterialSolo || '0'} MXN`}
          </Text>
          <Text style={[styles.infoValue, {color: '#ffd600'}]}>
            {`${t.laborCost}: $${calculo.manoObra?.costoTotalManoObra || '0'} MXN`}
          </Text>
          <Text style={[styles.infoValue, {color: '#ff9100'}]}>
            {`${t.extraMaterials}: $${calculo.avanzados?.totalMaterialesExtra || '0'} MXN`}
          </Text>
          <Text style={[styles.infoValue, {color: '#40c4ff'}]}>
            {`${t.light}: $${calculo.avanzados?.costoLuz || '0'} MXN`}
          </Text>
          <Text style={[styles.infoValue, {color: '#fff'}]}>
            {`${t.productionCost}: $${costoProduccion} MXN`}
          </Text>
          <Text style={[styles.infoValue, {color: '#69f0ae', fontWeight: 'bold'}]}>
            {`${t.totalCost}: $${total} MXN`}
          </Text>
          {calculo.mostrarFecha && calculo.fecha && (
            <Text style={{ color: '#a0a0a0', fontSize: 12, marginTop: 8, textAlign: 'right' }}>
              {t.creationDate}: {new Date(calculo.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Renderizar lista de proyectos
  const renderListaProyectos = () => {
    if (proyectos.length === 0) {
      return (
        <Text style={styles.emptyText}>{t.noFoldersOrProjects}</Text>
      );
    }

    const proyectosFiltrados = proyectos.filter(proy => 
      proy.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    return proyectosFiltrados.map((proy) => (
      <ProyectoCard
        key={proy.id}
        proyecto={proy}
        onSeleccionar={(proyecto) => { 
          setProyectoSeleccionado(proyecto); 
          cargarImpresiones(proyecto.id); 
        }}
        onDesarchivar={async (proyectoId) => {
          const user = auth.currentUser;
          if (!user) return;
          await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoId), { archivado: false });
          cargarProyectosYSueltos();
        }}
        onRecargar={cargarProyectosYSueltos}
        onEliminar={(proyecto) => {
          setProyectoAEliminar(proyecto);
          setModalEliminarProyecto(true);
        }}
      />
    ));
  };

  // Renderizar proyectos archivados
  const renderProyectosArchivados = () => {
    if (proyectosArchivados.length === 0) return null;

    return (
      <View style={styles.archivadosSection}>
        <Text style={styles.archivadosTitle}>{t.archived}</Text>
        {proyectosArchivados.map((proy) => (
          <ProyectoCard
            key={proy.id}
            proyecto={proy}
            onSeleccionar={(proyecto) => { 
              setProyectoSeleccionado(proyecto); 
              cargarImpresiones(proyecto.id); 
            }}
            onDesarchivar={async (proyectoId) => {
              const user = auth.currentUser;
              if (!user) return;
              await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoId), { archivado: false });
              cargarProyectosYSueltos();
            }}
            onRecargar={cargarProyectosYSueltos}
            onEliminar={(proyecto) => {
              setProyectoAEliminar(proyecto);
              setModalEliminarProyecto(true);
            }}
          />
        ))}
      </View>
    );
  };

  // Renderizar proyectos sueltos
  const renderProyectosSueltos = () => {
    if (proyectosSueltos.length === 0) {
      return (
        <Text style={styles.emptyText}>{t.noSoloProjects}</Text>
      );
    }

    const sueltosFiltrados = proyectosSueltos.filter(calc => 
      (calc.nombre || '').toLowerCase().includes(filtro.toLowerCase())
    );

    // Ordenar por fecha descendente
    const sueltosOrdenados = sueltosFiltrados.slice().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return sueltosOrdenados.map((calculo, index) => (
      <View key={calculo.id || index}>
        {renderImpresion({ ...calculo, mostrarFecha: true })}
      </View>
    ));
  };

  // UI
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Ionicons name="calculator" size={40} color="#00e676" />
        <Text style={styles.title}>{t.printProjects}</Text>
        <TouchableOpacity style={{marginTop: 10}} onPress={() => setCrearProyectoModal(true)}>
          <Text style={{color: '#00e676', fontWeight: 'bold', fontSize: 16}}>{t.newProject}</Text>
        </TouchableOpacity>
      </View>
      {/* Tabs/selector arriba de la lista */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
        <TouchableOpacity onPress={() => {
          setTab('carpetas');
          setProyectoSeleccionado(null);
          setImpresiones([]);
        }} style={{ backgroundColor: tab === 'carpetas' ? '#00e676' : '#222', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 24, marginRight: 8 }}>
          <Text style={{ color: tab === 'carpetas' ? '#222' : '#fff', fontWeight: 'bold' }}>{t.foldersOrProjects}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setTab('sueltos');
          setProyectoSeleccionado(null);
          setImpresiones([]);
        }} style={{ backgroundColor: tab === 'sueltos' ? '#00e676' : '#222', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 24 }}>
          <Text style={{ color: tab === 'sueltos' ? '#222' : '#fff', fontWeight: 'bold' }}>{t.soloProjects}</Text>
        </TouchableOpacity>
      </View>
      {/* Lista de proyectos o impresiones */}
      {loading ? (
        <ActivityIndicator size="large" color="#00e676" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ color: '#ff9800', textAlign: 'center', marginTop: 40 }}>{error}</Text>
      ) : proyectoSeleccionado ? (
        <View style={styles.calculationsContainer}>
          <TouchableOpacity onPress={() => { setProyectoSeleccionado(null); setImpresiones([]); }} style={{marginBottom: 16}}>
            <Text style={{color: '#00e676'}}>{'< ' + t.backToProjects}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{proyectoSeleccionado.nombre}</Text>
          {impresiones.length === 0 ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginTop: 20 }}>{t.noimpressions}</Text>
          ) : (
            impresiones
              .filter(calc => (calc.nombre || '').toLowerCase().includes(filtro.toLowerCase()))
            .slice()
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            .map((calculo, index) => renderImpresion(calculo))
          )}
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, marginTop: 10, marginBottom: 10 }}>
          <TextInput
            style={{ backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 10, fontSize: 16, borderWidth: 1, borderColor: '#333' }}
            value={filtro}
            onChangeText={setFiltro}
            placeholder={proyectoSeleccionado ? t.searchImpression : t.searchProject}
            placeholderTextColor="#888"
          />
                    </View>
                  )}
      {/* Mostrar lista según tab */}
      {tab === 'carpetas' && !proyectoSeleccionado && (
        <View style={styles.calculationsContainer}>
          {/* Proyectos activos */}
          {renderListaProyectos()}
          {/* Proyectos archivados */}
          {renderProyectosArchivados()}
                </View>
      )}
      {tab === 'sueltos' && (
        <View style={styles.calculationsContainer}>
          {renderProyectosSueltos()}
        </View>
      )}
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
              placeholderTextColor="#888"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setCrearProyectoModal(false)} style={{ backgroundColor: '#a0a0a0', borderRadius: 8, padding: 10, marginRight: 8 }}>
                <Text style={{ color: '#222' }}>{t.cancel}</Text>
              </TouchableOpacity>
            <TouchableOpacity
                onPress={crearProyecto}
                style={{ backgroundColor: '#00e676', borderRadius: 8, padding: 10 }}
                disabled={!nuevoProyectoNombre.trim()}
            >
                <Text style={{ color: '#222', fontWeight: 'bold' }}>{t.create}</Text>
            </TouchableOpacity>
            </View>
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
            <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>{t.confirmDeletion}</Text>
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
              {t.areYouSureYouWantToDelete} {impresionAEliminar?.nombre ? t.impression : t.project} "{impresionAEliminar?.nombre}"?
            </Text>
            <Text style={{ color: '#a0a0a0', fontSize: 14, marginBottom: 20 }}>
              {t.thisActionCannotBeUndone}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#333', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#666' }}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#e53935', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={eliminarImpresion}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t.delete}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal de confirmación para eliminar proyecto */}
      <Modal
        visible={modalEliminarProyecto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalEliminarProyecto(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: '#e53935', borderWidth: 2 }}>
            <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>{t.confirmProjectDeletion}</Text>
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
              {t.areYouSureYouWantToDelete} {t.project} "{proyectoAEliminar?.nombre}"?
            </Text>
            <Text style={{ color: '#a0a0a0', fontSize: 14, marginBottom: 20 }}>
              {t.thisActionWillDeleteTheProjectAndAllItsAssociatedImpressions}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setModalEliminarProyecto(false)} style={{ backgroundColor: '#a0a0a0', borderRadius: 8, padding: 10, marginRight: 8 }}>
                <Text style={{ color: '#222' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={eliminarProyecto}
                style={{ backgroundColor: '#e53935', borderRadius: 8, padding: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.delete}</Text>
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
  materialDetailText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 2,
  },
  materialCostText: {
    fontSize: 12,
    color: '#00e676',
    fontWeight: 'bold',
    marginTop: 2,
  },
  materialsContainer: {
    marginBottom: 8,
  },
  materialsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00e676',
    marginBottom: 8,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  materialDetails: {
    flex: 1,
    marginLeft: 8,
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
  proyectoCard: {
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
  proyectoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  proyectoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00e676',
  },
  proyectoArchivado: {
    borderColor: '#333',
    borderWidth: 1,
  },
  proyectoArchivadoText: {
    color: '#ffd600',
  },
  desarchivarButton: {
    color: '#ffd600',
    fontWeight: 'bold',
    fontSize: 14,
  },
  proyectoStats: {
    marginTop: 4,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  archivadoText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  verDetallesButton: {
    backgroundColor: '#00e676',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  verDetallesText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingIndicator: {
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  falloText: {
    color: '#e53935',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 8,
  },
  exitoText: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 8,
  },
  materialColorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00e676',
    marginRight: 8,
  },
  archivadosSection: {
    marginTop: 24,
  },
  archivadosTitle: {
    color: '#ffd600',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#a0a0a0',
    textAlign: 'center',
    marginTop: 20,
  },
  proyectoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eliminarProyectoButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#e53935',
  },
  // Nuevos estilos para el desplegable de materiales
  materialesToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  materialesToggleText: {
    color: '#00e676',
    fontSize: 14,
    fontWeight: 'bold',
  },
  materialesExpandidoContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  materialInfoGrid: {
    marginTop: 8,
    backgroundColor: '#333',
    borderRadius: 6,
    padding: 8,
  },
  materialInfoLabel: {
    color: '#a0a0a0',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  materialInfoValue: {
    color: '#00e676',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
});

export default PrintScreen; 