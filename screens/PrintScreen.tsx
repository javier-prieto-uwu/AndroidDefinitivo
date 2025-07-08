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
  FlatList,
  KeyboardAvoidingView,
  Platform
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
    const user = auth.currentUser;
    if (!user) return;
    try {
      if (proyectoSeleccionado) {
        await deleteDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones', impresionAEliminar.id));
      } else {
        await deleteDoc(doc(db, 'usuarios', user.uid, 'calculos', impresionAEliminar.id));
      }
      setDeleteModalVisible(false);
      setImpresionAEliminar(null);
      if (proyectoSeleccionado) {
        cargarImpresiones(proyectoSeleccionado.id);
      } else {
        cargarProyectosYSueltos();
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar la impresión.');
    }
  };

  // Eliminar proyecto optimizado
  const eliminarProyecto = async () => {
    if (!proyectoAEliminar) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoAEliminar.id));
      setModalEliminarProyecto(false);
      setProyectoAEliminar(null);
      cargarProyectosYSueltos();
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar el proyecto.');
    }
  };

  // Función para obtener la cantidad restante histórica de un material
  const getCantidadRestanteHistorica = (materialId: string, cantidadRestanteHistorica: string) => {
    if (!cantidadRestanteHistorica) return 'N/A';
    try {
      const historico = JSON.parse(cantidadRestanteHistorica);
      const entrada = historico.find((h: any) => h.materialId === materialId);
      return entrada ? entrada.cantidadRestante : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  // Renderizar una impresión individual
  const renderImpresion = (calculo: any) => {
    const materialesUsados = calculo.materiales || [];
    const materialSeleccionado = materialesActualizados.find(m => m.id === calculo.materialSeleccionado?.id);
    
    return (
      <View key={calculo.id} style={styles.calculationCard}>
        <View style={styles.accordionHeader}>
          <View style={styles.cardTitleContainer}>
            <Ionicons name="calculator" size={20} color="#00e676" />
            <Text style={styles.cardTitle}>{calculo.nombre || 'Sin nombre'}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              setImpresionAEliminar(calculo);
              setDeleteModalVisible(true);
            }}
          >
            <Ionicons name="trash" size={16} color="#e53935" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.accordionBody}>
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>{t.calculationDetails}</Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoValue}>{t.date}: </Text>
              {new Date(calculo.fecha).toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoValue}>{t.quantity}: </Text>
              {calculo.cantidad} {calculo.unidad || 'unidades'}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoValue}>{t.totalCost}: </Text>
              ${parseFloat(calculo.costoTotal).toFixed(2)} MXN
            </Text>
            {calculo.notas && (
              <Text style={styles.infoText}>
                <Text style={styles.infoValue}>{t.notes}: </Text>
                {calculo.notas}
              </Text>
            )}
          </View>

          {materialSeleccionado && (
            <View style={styles.materialsContainer}>
              <Text style={styles.materialsTitle}>{t.materialUsed}</Text>
              <View style={styles.materialItem}>
                <View style={styles.materialDetails}>
                  <Text style={styles.materialInfoText}>{materialSeleccionado.nombre}</Text>
                  <Text style={styles.materialDetailText}>
                    {t.category}: {materialSeleccionado.categoria}
                  </Text>
                  <Text style={styles.materialDetailText}>
                    {t.type}: {materialSeleccionado.tipo || materialSeleccionado.subtipo || 'N/A'}
                  </Text>
                  <Text style={styles.materialCostText}>
                    {t.cost}: ${parseFloat(materialSeleccionado.precio).toFixed(2)} MXN
                  </Text>
                  <Text style={styles.materialDetailText}>
                    {t.remainingAfterPrint}: {getCantidadRestanteHistorica(materialSeleccionado.id, calculo.cantidadRestanteHistorica)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {materialesUsados.length > 1 && (
            <View style={styles.materialsContainer}>
              <Text style={styles.materialsTitle}>{t.materialsUsed}</Text>
              {materialesUsados.map((material: any, index: number) => {
                const materialActual = materialesActualizados.find(m => m.id === material.id);
                return materialActual ? (
                  <View key={index} style={styles.materialItem}>
                    <View style={styles.materialDetails}>
                      <Text style={styles.materialInfoText}>{materialActual.nombre}</Text>
                      <Text style={styles.materialDetailText}>
                        {t.category}: {materialActual.categoria}
                      </Text>
                      <Text style={styles.materialDetailText}>
                        {t.type}: {materialActual.tipo || materialActual.subtipo || 'N/A'}
                      </Text>
                      <Text style={styles.materialCostText}>
                        {t.cost}: ${parseFloat(materialActual.precio).toFixed(2)} MXN
                      </Text>
                      <Text style={styles.materialDetailText}>
                        {t.remainingAfterPrint}: {getCantidadRestanteHistorica(materialActual.id, calculo.cantidadRestanteHistorica)}
                      </Text>
                    </View>
                  </View>
                ) : null;
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Renderizar lista de proyectos
  const renderListaProyectos = () => {
    const proyectosFiltrados = proyectos.filter(p => 
      p.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    if (proyectosFiltrados.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open" size={60} color="#666" />
          <Text style={styles.emptyTitle}>{t.noProjects}</Text>
          <Text style={styles.emptySubtitle}>{t.createYourFirstProject}</Text>
        </View>
      );
    }

    return proyectosFiltrados.map((proyecto) => (
      <ProyectoCard
        key={proyecto.id}
        proyecto={proyecto}
        onSeleccionar={setProyectoSeleccionado}
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
    const archivadosFiltrados = proyectosArchivados.filter(p => 
      p.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    if (archivadosFiltrados.length === 0) return null;

    return (
      <View style={{ marginTop: 20 }}>
        <Text style={{ color: '#a0a0a0', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          {t.archivedProjects}
        </Text>
        {archivadosFiltrados.map((proyecto) => (
          <ProyectoCard
            key={proyecto.id}
            proyecto={proyecto}
            onSeleccionar={setProyectoSeleccionado}
            onDesarchivar={async (proyectoId) => {
              const user = auth.currentUser;
              if (!user) return;
              await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoId), { archivado: false });
              cargarProyectosYSueltos();
            }}
            onRecargar={cargarProyectosYSueltos}
          />
        ))}
      </View>
    );
  };

  // Renderizar proyectos sueltos
  const renderProyectosSueltos = () => {
    const sueltosFiltrados = proyectosSueltos.filter(calc => 
      (calc.nombre || '').toLowerCase().includes(filtro.toLowerCase())
    );

    if (sueltosFiltrados.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calculator" size={60} color="#666" />
          <Text style={styles.emptyTitle}>{t.noSoloCalculations}</Text>
          <Text style={styles.emptySubtitle}>{t.createCalculationsInCalculator}</Text>
        </View>
      );
    }

    return sueltosFiltrados
      .slice()
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .map((calculo) => renderImpresion(calculo));
  };

  // UI
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={{ flex: 1 }}
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
          <TouchableOpacity onPress={() => setTab('carpetas')} style={{ backgroundColor: tab === 'carpetas' ? '#00e676' : '#222', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 24, marginRight: 8 }}>
            <Text style={{ color: tab === 'carpetas' ? '#222' : '#fff', fontWeight: 'bold' }}>{t.foldersOrProjects}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('sueltos')} style={{ backgroundColor: tab === 'sueltos' ? '#00e676' : '#222', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 24 }}>
            <Text style={{ color: tab === 'sueltos' ? '#222' : '#fff', fontWeight: 'bold' }}>{t.soloProjects}</Text>
          </TouchableOpacity>
        </View>
        {/* Lista de proyectos o impresiones */}
        {loading ? (
          <ActivityIndicator size="large" color="#00e676" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>
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
    </KeyboardAvoidingView>
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
    color: '#fff',
    flex: 1,
  },
  proyectoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proyectoStats: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  archivadoText: {
    fontSize: 12,
    color: '#e53935',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  verDetallesButton: {
    backgroundColor: '#00e676',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  verDetallesText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  desarchivarButton: {
    color: '#00e676',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  eliminarProyectoButton: {
    padding: 4,
    borderRadius: 4,
  },
  loadingIndicator: {
    marginVertical: 8,
  },
  proyectoArchivado: {
    opacity: 0.6,
  },
  proyectoArchivadoText: {
    color: '#a0a0a0',
  },
});

export default PrintScreen; 