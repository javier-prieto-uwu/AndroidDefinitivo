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
import { getCurrency } from '../utils';
import translations from '../utils/locales';
import SalesModal from '../components/SalesModal';
import SalesSettingsModal from '../components/SalesSettingsModal';

const db = getFirestore(app);

// Componente hijo para manejar la lógica de cada proyecto
const ProyectoCard: React.FC<{
  proyecto: any;
  onSeleccionar: (proyecto: any) => void;
  onDesarchivar: (proyectoId: string) => void;
  onRecargar: () => void;
  onEliminar?: (proyecto: any) => void;
  categorias: string[];
  clientes: string[];
  onMarcarComoVendido: (proyecto: any, categoria: string, cliente: string, precioVenta?: string) => void;
  onMarcarComoPendiente: (proyectoId: string) => void;
}> = ({ proyecto, onSeleccionar, onDesarchivar, onRecargar, onEliminar, categorias, clientes, onMarcarComoVendido, onMarcarComoPendiente }) => {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [impresionesCarpeta, setImpresionesCarpeta] = useState<any[]>([]);
  const [loadingImpresiones, setLoadingImpresiones] = useState(true);
  const [precioVentaInput, setPrecioVentaInput] = useState<string>('');
  const [mostrarPrecioInput, setMostrarPrecioInput] = useState<boolean>(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');

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
          <Text style={styles.statText}>{t.totalCost}: ${estadisticas.costoTotal.toFixed(2)} ${getCurrency(lang)}</Text>
          <Text style={styles.statText}>
            {t.materialsUsed}: {estadisticas.materiales.join(', ') || '-'}
          </Text>
        </View>
      )}
      
      {proyecto.archivado && (
        <Text style={styles.archivadoText}>{t.archived}</Text>
      )}
      
      {/* Sistema de Ventas para Proyecto */}
      <View style={styles.saleCheckboxContainer}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => {
            if (proyecto.estadoVenta === 'vendido') {
              onMarcarComoPendiente(proyecto.id);
            } else {
              setMostrarPrecioInput(true);
            }
          }}
        >
          <View style={[
            styles.checkbox,
            proyecto.estadoVenta === 'vendido' && styles.checkboxChecked
          ]}>
            {proyecto.estadoVenta === 'vendido' && (
              <Ionicons name="checkmark" size={16} color="#222" />
            )}
          </View>
          <Text style={styles.checkboxText}>{t.sold}</Text>
        </TouchableOpacity>
        
        {/* Campo de precio de venta */}
        {mostrarPrecioInput && (
          <View style={styles.precioVentaContainer}>
            {/* Selector de Categoría */}
            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>{t.category}:</Text>
              <View style={styles.chipsRow}>
                {categorias.map((categoria, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.chip,
                      categoriaSeleccionada === categoria && styles.chipActive
                    ]}
                    onPress={() => {
                      setCategoriaSeleccionada(categoria);
                    }}
                  >
                    <Ionicons 
                      name="folder-outline" 
                      size={12} 
                      color={categoriaSeleccionada === categoria ? '#222' : '#00e676'} 
                    />
                    <Text style={[
                      styles.chipText,
                      categoriaSeleccionada === categoria && styles.chipTextActive
                    ]}>
                      {categoria}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Selector de Cliente */}
            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>{t.client}:</Text>
              <View style={styles.chipsRow}>
                {clientes.map((cliente, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.chip,
                      clienteSeleccionado === cliente && styles.chipActive
                    ]}
                    onPress={() => {
                      setClienteSeleccionado(cliente);
                    }}
                  >
                    <Ionicons 
                      name="person-outline" 
                      size={12} 
                      color={clienteSeleccionado === cliente ? '#222' : '#00e676'} 
                    />
                    <Text style={[
                      styles.chipText,
                      clienteSeleccionado === cliente && styles.chipTextActive
                    ]}>
                      {cliente}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.precioVentaLabel}>{t.finalSalePrice}</Text>
            <View style={styles.precioVentaInputRow}>
              <TextInput
                style={styles.precioVentaInput}
                value={precioVentaInput}
                onChangeText={setPrecioVentaInput}
                placeholder="Ej: 150.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.precioVentaButton}
                onPress={() => {
                  if (precioVentaInput && !isNaN(parseFloat(precioVentaInput)) && categoriaSeleccionada && clienteSeleccionado) {
                    onMarcarComoVendido(proyecto, categoriaSeleccionada, clienteSeleccionado, precioVentaInput);
                    setPrecioVentaInput('');
                    setCategoriaSeleccionada('');
                    setClienteSeleccionado('');
                    setMostrarPrecioInput(false);
                  }
                }}
                disabled={!precioVentaInput || !categoriaSeleccionada || !clienteSeleccionado}
              >
                <Text style={[styles.precioVentaButtonText, (!precioVentaInput || !categoriaSeleccionada || !clienteSeleccionado) && styles.precioVentaButtonTextDisabled]}>
                  {t.confirm}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.precioVentaCancelButton}
                onPress={() => {
                  setMostrarPrecioInput(false);
                  setPrecioVentaInput('');
                  setCategoriaSeleccionada('');
                  setClienteSeleccionado('');
                }}
              >
                <Text style={styles.precioVentaCancelText}>{t.cancel}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Campo de ganancia calculada */}
            <View style={styles.gananciaContainer}>
              <Text style={styles.gananciaLabel}>{t.profit}:</Text>
              <Text style={styles.gananciaValue}>
                ${(() => {
                  const precio = parseFloat(precioVentaInput || '0');
                  const costoProduccion = estadisticas.costoTotal;
                  const ganancia = precio - costoProduccion;
                  return ganancia.toFixed(2);
                })()} ${getCurrency(lang)}
              </Text>
            </View>
            
            {/* Información de costos */}
            <View style={styles.costosInfoContainer}>
              <Text style={styles.costosInfoText}>
                <Text style={styles.costosInfoLabel}>{t.productionCost}</Text> ${estadisticas.costoTotal.toFixed(2)} ${getCurrency(lang)}
              </Text>
              {(() => {
                const precio = parseFloat(precioVentaInput || '0');
                const costoProduccion = estadisticas.costoTotal;
                const ganancia = precio - costoProduccion;
                const porcentajeGanancia = costoProduccion > 0 ? (ganancia / costoProduccion) * 100 : 0;
                
                return (
                  <Text style={styles.costosInfoText}>
                    <Text style={styles.costosInfoLabel}>{t.profitMargin}</Text> {porcentajeGanancia.toFixed(1)}%
                  </Text>
                );
              })()}
            </View>
          </View>
        )}
        
        {/* Información de venta si está vendido */}
        {proyecto.estadoVenta === 'vendido' && (
          <View style={styles.saleInfoContainer}>
            <View style={styles.saleStatusContainer}>
              <View style={styles.soldStatus}>
                <Ionicons name="checkmark-circle" size={16} color="#00e676" />
                <Text style={styles.soldStatusText}>{t.sold}</Text>
              </View>
            </View>
            
            <View style={styles.saleDetailsContainer}>
              <Text style={styles.saleDetailText}>
                <Ionicons name="person-outline" size={14} color="#00e676" />
                {' '}{proyecto.cliente || 'Cliente'}
              </Text>
              <Text style={styles.saleDetailText}>
                <Ionicons name="cash-outline" size={14} color="#ffd600" />
                {' '}${proyecto.precioVenta || '0.00'} ${getCurrency(lang)}
              </Text>
              <Text style={styles.saleDetailText}>
                <Ionicons name="trending-up-outline" size={14} color="#00e676" />
                {' '}{t.profit}: ${proyecto.ganancia || '0.00'} ${getCurrency(lang)}
              </Text>
              {proyecto.categoriaVenta && (
                <Text style={styles.saleDetailText}>
                  <Ionicons name="cube-outline" size={14} color="#ff9800" />
                  {' '}{proyecto.categoriaVenta}
                </Text>
              )}
              {proyecto.fechaVenta && (
                <Text style={styles.saleDetailText}>
                  <Ionicons name="calendar-outline" size={14} color="#40c4ff" />
                  {' '}{new Date(proyecto.fechaVenta).toLocaleDateString('es-MX')}
                </Text>
              )}
            </View>
            
            {/* Edición de Categoría y Cliente para proyectos vendidos */}
            <View style={styles.additionalCheckboxesContainer}>
              {/* Categorías y Clientes con chips horizontales */}
              <View style={styles.chipsContainer}>
                {/* Sección de Categorías */}
                <View style={styles.chipSection}>
                  <Text style={styles.chipSectionLabel}>{t.category}:</Text>
                  <View style={styles.chipsRow}>
                    {categorias.map((categoria, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.chip,
                          proyecto.categoriaVenta === categoria && styles.chipActive
                        ]}
                        onPress={() => {
                          onMarcarComoVendido(proyecto, categoria, proyecto.cliente || 'Cliente', proyecto.precioVenta);
                        }}
                      >
                        <Ionicons 
                          name="folder-outline" 
                          size={12} 
                          color={proyecto.categoriaVenta === categoria ? '#222' : '#00e676'} 
                        />
                        <Text style={[
                          styles.chipText,
                          proyecto.categoriaVenta === categoria && styles.chipTextActive
                        ]}>
                          {categoria}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* Sección de Clientes */}
                <View style={styles.chipSection}>
                  <Text style={styles.chipSectionLabel}>{t.client}:</Text>
                  <View style={styles.chipsRow}>
                    {clientes.map((cliente, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.chip,
                          proyecto.cliente === cliente && styles.chipActive
                        ]}
                        onPress={() => {
                          onMarcarComoVendido(proyecto, proyecto.categoriaVenta || 'Categoría', cliente, proyecto.precioVenta);
                        }}
                      >
                        <Ionicons 
                          name="person-outline" 
                          size={12} 
                          color={proyecto.cliente === cliente ? '#222' : '#00e676'} 
                        />
                        <Text style={[
                          styles.chipText,
                          proyecto.cliente === cliente && styles.chipTextActive
                        ]}>
                          {cliente}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
      
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

  // Sistema de Ventas
  const [salesModalVisible, setSalesModalVisible] = useState(false);
  const [impresionParaVenta, setImpresionParaVenta] = useState<any | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'vendidos' | 'pendientes'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsType, setSettingsType] = useState<'categories' | 'clients'>('categories');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState(false);
  const [clientesExpandidos, setClientesExpandidos] = useState(false);
  const [categoriaExpandidaPorProducto, setCategoriaExpandidaPorProducto] = useState<{[key: string]: boolean}>({});
  const [clienteExpandidoPorProducto, setClienteExpandidoPorProducto] = useState<{[key: string]: boolean}>({});
  
  // Estados para agregar nuevos items
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  
  // Estados para modales de agregar
  const [modalAgregarCategoria, setModalAgregarCategoria] = useState(false);
  const [modalAgregarCliente, setModalAgregarCliente] = useState(false);
  const [precioVentaInput, setPrecioVentaInput] = useState<{[key: string]: string}>({});
  const [mostrarPrecioInput, setMostrarPrecioInput] = useState<{[key: string]: boolean}>({});

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

  // Funciones para agregar nuevos items
  const agregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await addDoc(collection(db, 'usuarios', user.uid, 'categoriasVenta'), {
        nombre: nuevaCategoria.trim(),
        fechaCreacion: new Date().toISOString()
      });
      
      setNuevaCategoria('');
      cargarCategoriasYClientes();
      Alert.alert(t.success, t.categoryAddedSuccessfully);
    } catch (error) {
      console.error('Error agregando categoría:', error);
      Alert.alert(t.error, t.categoryAddError);
    }
  };

  const agregarCliente = async () => {
    if (!nuevoCliente.trim()) return;
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await addDoc(collection(db, 'usuarios', user.uid, 'clientes'), {
        nombre: nuevoCliente.trim(),
        fechaCreacion: new Date().toISOString()
      });
      
      setNuevoCliente('');
      cargarCategoriasYClientes();
      Alert.alert(t.success, t.clientAddedSuccessfully);
    } catch (error) {
      console.error('Error agregando cliente:', error);
      Alert.alert(t.error, t.clientAddError);
    }
  };

  const eliminarCategoria = async (nombreCategoria: string) => {
    Alert.alert(
      t.confirmDeletion,
      t.deleteCategoryConfirm.replace('{category}', nombreCategoria),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;

              // Buscar el documento de la categoría
              const categoriasSnap = await getDocs(collection(db, 'usuarios', user.uid, 'categoriasVenta'));
              const categoriaDoc = categoriasSnap.docs.find(doc => doc.data().nombre === nombreCategoria);
              
              if (categoriaDoc) {
                await deleteDoc(doc(db, 'usuarios', user.uid, 'categoriasVenta', categoriaDoc.id));
                cargarCategoriasYClientes();
                Alert.alert(t.success, t.categoryDeletedSuccessfully);
              } else {
                Alert.alert(t.error, t.categoryNotFound);
              }
            } catch (error) {
              console.error('Error eliminando categoría:', error);
              Alert.alert(t.error, t.categoryDeleteError);
            }
          }
        }
      ]
    );
  };

  const eliminarCliente = async (nombreCliente: string) => {
    Alert.alert(
      t.confirmDeletion,
      t.deleteClientConfirm.replace('{client}', nombreCliente),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;

              // Buscar el documento del cliente
              const clientesSnap = await getDocs(collection(db, 'usuarios', user.uid, 'clientes'));
              const clienteDoc = clientesSnap.docs.find(doc => doc.data().nombre === nombreCliente);
              
              if (clienteDoc) {
                await deleteDoc(doc(db, 'usuarios', user.uid, 'clientes', clienteDoc.id));
                cargarCategoriasYClientes();
                Alert.alert(t.success, t.clientDeletedSuccessfully);
              } else {
                Alert.alert(t.error, t.clientNotFound);
              }
            } catch (error) {
              console.error('Error eliminando cliente:', error);
              Alert.alert(t.error, t.clientDeleteError);
            }
          }
        }
      ]
    );
  };

  // Cargar categorías y clientes
  const cargarCategoriasYClientes = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setCategorias([]);
        setClientes([]);
        return;
      }
      
      const [categoriasSnap, clientesSnap] = await Promise.all([
        getDocs(collection(db, 'usuarios', user.uid, 'categoriasVenta')),
        getDocs(collection(db, 'usuarios', user.uid, 'clientes'))
      ]);
      
      const categoriasData = categoriasSnap.docs.map(doc => doc.data().nombre);
      const clientesData = clientesSnap.docs.map(doc => doc.data().nombre);
      
      setCategorias(categoriasData);
      setClientes(clientesData);
    } catch (error) {
      console.error('Error cargando categorías y clientes:', error);
      setCategorias([]);
      setClientes([]);
    }
  };
// En PrintScreen.tsx

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
        
        // --- INICIO DE LA MODIFICACIÓN ---

        // Creamos un array de promesas para procesar cada proyecto
        const carpetasPromises = proyectosSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();

            // Por cada proyecto, obtenemos sus impresiones
            const impresionesSnap = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos', docSnap.id, 'impresiones'));
            const impresiones = impresionesSnap.docs.map(doc => doc.data());

            // Calculamos las estadísticas aquí mismo, en el padre
            const estadisticas = {
                costoTotal: impresiones.reduce((sum, imp) => sum + (parseFloat(imp.costoTotal) || 0), 0),
                materiales: Array.from(new Set(impresiones.map(imp => imp.materialSeleccionado?.nombre).filter(Boolean))),
                cantidadImpresiones: impresiones.length
            };

            // Devolvemos el objeto del proyecto original, pero con las estadísticas ya incluidas
            return {
                id: docSnap.id,
                ...data,
                archivado: data.archivado || false,
                estadisticas: estadisticas, // <-- Dato clave que pasaremos como prop
            };
        });

        // Esperamos a que todas las promesas se resuelvan
        const carpetas = await Promise.all(carpetasPromises);

        // --- FIN DE LA MODIFICACIÓN ---

        const sueltos = sueltosSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            estadoVenta: doc.data().estadoVenta || 'pendiente'
        }));

        setProyectos(carpetas.filter(p => !p.archivado));
        setProyectosArchivados(carpetas.filter(p => p.archivado));
        setProyectosSueltos(sueltos);

        await cargarMaterialesActualizados();
        setLoading(false);
    } catch (e) {
        setError(t.projectsLoadError);
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
      const datos = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Asegurar que las impresiones tengan estado de venta por defecto
        estadoVenta: doc.data().estadoVenta || 'pendiente'
      }));
      setImpresiones(datos);
    } catch (e) {
      setError(t.printsLoadError);
      setImpresiones([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarProyectosYSueltos();
      cargarCategoriasYClientes();
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
      Alert.alert(t.error, t.projectCreateError);
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

  // Funciones del Sistema de Ventas
  const handleMarcarComoVendido = async (ventaData: any) => {
    if (!impresionParaVenta) return;
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      if (proyectoSeleccionado) {
        // Actualizar impresión en proyecto específico
        await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones', impresionParaVenta.id), ventaData);
        cargarImpresiones(proyectoSeleccionado.id);
      } else {
        // Actualizar proyecto suelto
        await updateDoc(doc(db, 'usuarios', user.uid, 'calculos', impresionParaVenta.id), ventaData);
        cargarProyectosYSueltos();
      }
      
      setSalesModalVisible(false);
      setImpresionParaVenta(null);
    } catch (error) {
      console.error('Error marcando como vendido:', error);
      Alert.alert(t.error, t.markAsSoldError);
    }
  };

  const handleMarcarComoPendiente = async (impresionId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      console.log('Marcando como pendiente:', impresionId);
      
      const ventaData = {
        estadoVenta: 'pendiente',
        categoriaVenta: null,
        cliente: 'Pendiente',
        precioVenta: null,
        ganancia: null,
        fechaVenta: null,
        notasVenta: null
      };
      
      if (proyectoSeleccionado) {
        // Actualizar impresión en proyecto específico
        await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones', impresionId), ventaData);
        // Actualizar solo el producto específico en el estado
        setImpresiones(prev => prev.map(imp => 
          imp.id === impresionId ? { ...imp, ...ventaData } : imp
        ));
      } else {
        // Actualizar proyecto suelto
        await updateDoc(doc(db, 'usuarios', user.uid, 'calculos', impresionId), ventaData);
        // Actualizar solo el producto específico en el estado
        setProyectosSueltos(prev => prev.map(proy => 
          proy.id === impresionId ? { ...proy, ...ventaData } : proy
        ));
      }
    } catch (error) {
      console.error('Error marcando como pendiente:', error);
      Alert.alert(t.error, t.markAsPendingError);
    }
  };

  const abrirModalVenta = (impresion: any) => {
    setImpresionParaVenta(impresion);
    setSalesModalVisible(true);
  };

  const marcarComoVendidoRapido = async (impresion: any, categoria: string, cliente: string, precioVenta?: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      console.log('Marcando como vendido:', impresion.id, impresion.nombre);
      
      // Usar el precio de venta ingresado o calcular uno estimado
      const precioFinal = precioVenta ? parseFloat(precioVenta) : (parseFloat(impresion.costoTotal || '0') * 1.5);
      const ganancia = precioFinal - parseFloat(impresion.costoTotal || '0');
      
      const ventaData = {
        estadoVenta: 'vendido',
        categoriaVenta: categoria,
        cliente: cliente,
        precioVenta: precioFinal.toFixed(2),
        ganancia: ganancia.toFixed(2),
        fechaVenta: new Date().toISOString(),
        notasVenta: ''
      };
      
      if (proyectoSeleccionado) {
        console.log('Actualizando impresión en proyecto:', proyectoSeleccionado.id, impresion.id);
        await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones', impresion.id), ventaData);
        // Actualizar solo el producto específico en el estado
        setImpresiones(prev => prev.map(imp => 
          imp.id === impresion.id ? { ...imp, ...ventaData } : imp
        ));
      } else {
        console.log('Actualizando proyecto suelto:', impresion.id);
        await updateDoc(doc(db, 'usuarios', user.uid, 'calculos', impresion.id), ventaData);
        // Actualizar solo el producto específico en el estado
        setProyectosSueltos(prev => prev.map(proy => 
          proy.id === impresion.id ? { ...proy, ...ventaData } : proy
        ));
      }
      
      // Limpiar el input de precio
      setPrecioVentaInput(prev => ({ ...prev, [impresion.id]: '' }));
      setMostrarPrecioInput(prev => ({ ...prev, [impresion.id]: false }));
    } catch (error) {
      console.error('Error marcando como vendido:', error);
    }
  };

  // Funciones para ventas a nivel de proyecto
  const marcarProyectoComoVendido = async (proyecto: any, categoria: string, cliente: string, precioVenta?: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      console.log('Marcando proyecto como vendido:', proyecto.id, proyecto.nombre);
      
      // Calcular costo total del proyecto
      const impresionesSnap = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos', proyecto.id, 'impresiones'));
      const impresiones = impresionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const costoTotalProyecto = impresiones.reduce((sum, imp: any) => sum + (parseFloat(imp.costoTotal) || 0), 0);
      
      // Usar el precio de venta ingresado o calcular uno estimado
      const precioFinal = precioVenta ? parseFloat(precioVenta) : (costoTotalProyecto * 1.5);
      const ganancia = precioFinal - costoTotalProyecto;
      
      const ventaData = {
        estadoVenta: 'vendido',
        categoriaVenta: categoria,
        cliente: cliente,
        precioVenta: precioFinal.toFixed(2),
        ganancia: ganancia.toFixed(2),
        fechaVenta: new Date().toISOString(),
        notasVenta: ''
      };
      
      // Actualizar el proyecto
      await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyecto.id), ventaData);
      
      // Actualizar todas las impresiones del proyecto
      for (const impresion of impresiones) {
        await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyecto.id, 'impresiones', impresion.id), ventaData);
      }
      
      // Recargar proyectos
      cargarProyectosYSueltos();
    } catch (error) {
      console.error('Error marcando proyecto como vendido:', error);
    }
  };

  const marcarProyectoComoPendiente = async (proyectoId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      console.log('Marcando proyecto como pendiente:', proyectoId);
      
      const ventaData = {
        estadoVenta: 'pendiente',
        categoriaVenta: null,
        cliente: 'Pendiente',
        precioVenta: null,
        ganancia: null,
        fechaVenta: null,
        notasVenta: null
      };
      
      // Actualizar el proyecto
      await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoId), ventaData);
      
      // Actualizar todas las impresiones del proyecto
      const impresionesSnap = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos', proyectoId, 'impresiones'));
      for (const docu of impresionesSnap.docs) {
        await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoId, 'impresiones', docu.id), ventaData);
      }
      
      // Recargar proyectos
      cargarProyectosYSueltos();
    } catch (error) {
      console.error('Error marcando proyecto como pendiente:', error);
    }
  };

  // Función para filtrar impresiones
  const impresionesFiltradas = () => {
    let filtradas = proyectoSeleccionado ? impresiones : proyectosSueltos;

    // Filtro por estado
    if (filtroEstado === 'vendidos') {
      filtradas = filtradas.filter(imp => imp.estadoVenta === 'vendido');
    } else if (filtroEstado === 'pendientes') {
      filtradas = filtradas.filter(imp => imp.estadoVenta === 'pendiente' || !imp.estadoVenta);
    }
    // Si es 'todos', no filtrar por estado - mostrar todos los productos una sola vez

    // Filtro por categoría
    if (filtroCategoria) {
      filtradas = filtradas.filter(imp => imp.categoriaVenta === filtroCategoria);
    }

    // Filtro por cliente
    if (filtroCliente) {
      filtradas = filtradas.filter(imp => imp.cliente && imp.cliente.toLowerCase().includes(filtroCliente.toLowerCase()));
    }

    // Filtro por nombre
    if (filtro) {
      filtradas = filtradas.filter(imp => 
        (imp.nombre || '').toLowerCase().includes(filtro.toLowerCase())
      );
    }

    // Eliminar duplicados por ID para evitar renderizado doble
    const productosUnicos = filtradas.filter((producto, index, self) => 
      index === self.findIndex(p => p.id === producto.id)
    );

    console.log('Filtro estado:', filtroEstado, 'Productos filtrados:', productosUnicos.length);
    productosUnicos.forEach(p => console.log('Producto:', p.id, p.nombre, 'Estado:', p.estadoVenta));
    
    // Log específico para proyectos sueltos
    if (!proyectoSeleccionado) {
      console.log('=== PROYECTOS SUELTOS ===');
      console.log('Total proyectos sueltos:', proyectosSueltos.length);
      proyectosSueltos.forEach(p => console.log('Suelto:', p.id, p.nombre, 'Estado:', p.estadoVenta));
      console.log('Productos filtrados para sueltos:', productosUnicos.length);
    }

    return productosUnicos;
  };

    const renderImpresion = (calculo: any) => {
    const total = calculo.costoTotal || '0.00';

    // --- LÓGICA DE CÁLCULO UNIFICADA PARA COSTO DE MATERIALES ---
    const costoTotalMateriales = (calculo.materialesMultiples && calculo.materialesMultiples.length > 0)
      ? (calculo.materialesMultiples || []).reduce((sum: number, material: any) => {
          if (!material) return sum;
          const precio = parseFloat(material.precioBobina || material.precio || '0');
          const gramosUtilizados = parseFloat(material.gramosUtilizados || '0');
          const materialOriginal = materialesActualizados?.find((m: any) => m.id === material.id);
          let cantidadTotal = 0;
          if (materialOriginal) {
            cantidadTotal = parseFloat(materialOriginal.peso || materialOriginal.pesoBobina || '0');
          } else {
            cantidadTotal = parseFloat(material.pesoBobina || material.peso || '0');
          }
          if (cantidadTotal > 0) {
            const costoIndividual = (precio / cantidadTotal) * gramosUtilizados;
            return sum + costoIndividual;
          }
          return sum;
        }, 0)
      : parseFloat(calculo.filamento?.costoMaterialSolo || '0');
    // --- FIN DE LÓGICA ---

    const impresionId = calculo.id || 'default';
    const materialesExpandido = materialesExpandidos[impresionId] || false;

    // --- COMPONENTE INTERNO PARA EVITAR REPETIR CÓDIGO ---
    const MaterialesUsados = () => (
      <View style={styles.materialesExpandidoContainer}>
        {/* Material único */}
        {!calculo.esMultifilamento && calculo.materialSeleccionado && (
          <View style={styles.materialInfoContainer}>
            <View style={[styles.materialColorIndicator, { backgroundColor: calculo.materialSeleccionado.color || '#00e676' }]} />
            <View style={styles.materialDetails}>
              <Text style={styles.materialInfoText}>{calculo.materialSeleccionado.nombre} ({calculo.materialSeleccionado.tipo} - {calculo.materialSeleccionado.subtipo})</Text>
              <Text style={styles.materialDetailText}>
                {`${t.gUsed}: ${calculo.filamento?.gramosUtilizados || '0'}g`}
              </Text>
              <View style={styles.materialInfoGrid}>
                <Text style={styles.materialInfoLabel}>{t.unitPrice}:</Text>
                <Text style={styles.materialInfoValue}>${calculo.filamento?.precioBobina || '0'} ${getCurrency(lang)}</Text>
                <Text style={styles.materialInfoLabel}>{t.totalQuantity}:</Text>
                <Text style={styles.materialInfoValue}>
                  {(() => {
                      const materialOriginal = materialesActualizados?.find((m: any) => m.id === calculo.materialSeleccionado.id);
                      let cantidadTotal = 0;
                      if (materialOriginal) {
                          const pesoPorBobina = parseFloat(materialOriginal.peso || materialOriginal.pesoBobina || '0');
                          const cantidadBobinas = parseFloat(materialOriginal.cantidadInicial || materialOriginal.cantidad || '1');
                          cantidadTotal = pesoPorBobina * cantidadBobinas;
                      } else {
                          cantidadTotal = parseFloat(calculo.filamento?.pesoBobina || '0');
                      }
                      return `${cantidadTotal.toFixed(0)}g`;
                  })()}
                </Text>
                <Text style={styles.materialInfoLabel}>{t.remainingQuantity}:</Text>
                <Text style={styles.materialInfoValue}>
                  {(() => {
                      const materialOriginal = materialesActualizados?.find((m: any) => m.id === calculo.materialSeleccionado.id);
                      let cantidadTotal = 0;
                      if (materialOriginal) {
                          const pesoPorBobina = parseFloat(materialOriginal.peso || materialOriginal.pesoBobina || '0');
                          const cantidadBobinas = parseFloat(materialOriginal.cantidadInicial || materialOriginal.cantidad || '1');
                          cantidadTotal = pesoPorBobina * cantidadBobinas;
                      } else {
                          cantidadTotal = parseFloat(calculo.filamento?.pesoBobina || '0');
                      }
                      const cantidadUtilizada = parseFloat(calculo.filamento?.gramosUtilizados || '0');
                      const restante = cantidadTotal - cantidadUtilizada;
                      return `${restante.toFixed(0)}g`;
                  })()}
                </Text>
                <Text style={styles.materialInfoLabel}>{t.materialCost}:</Text>
                <Text style={styles.materialInfoValue}>${calculo.filamento?.costoMaterialSolo || '0'} ${getCurrency(lang)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Múltiples materiales */}
        {calculo.esMultifilamento && calculo.materialesMultiples && calculo.materialesMultiples.length > 0 && (
          <View style={styles.materialsContainer}>
            {calculo.materialesMultiples.map((material: any, index: number) => {
              if (!material) return null;
              
              // --- INICIO DE CORRECCIÓN PARA IMPRESIONES FALLIDAS ---
              const materialOriginal = materialesActualizados?.find((m: any) => m.id === material.id);
              
              // Unifica los datos del material guardado con los del inventario para asegurar que siempre haya información
              const displayMaterial = {
                ...materialOriginal, // Base (nombre, tipo, etc.)
                ...material,         // Sobrescribe con datos específicos del cálculo (gramos usados)
              };
              // --- FIN DE CORRECCIÓN ---

              const precio = parseFloat(displayMaterial.precioBobina || displayMaterial.precio || '0');
              const gramosUtilizados = parseFloat(displayMaterial.gramosUtilizados || '0');
              let cantidadTotal = materialOriginal ? parseFloat(materialOriginal.peso || materialOriginal.pesoBobina || '0') : parseFloat(displayMaterial.pesoBobina || '0');
              let costoIndividual = (cantidadTotal > 0) ? (precio / cantidadTotal) * gramosUtilizados : 0;
              const cantidadRestante = cantidadTotal - gramosUtilizados;

              return (
                <View key={index} style={styles.materialItem}>
                  <View style={[styles.materialColorIndicator, { backgroundColor: displayMaterial.color || '#00e676' }]} />
                  <View style={styles.materialDetails}>
                    <Text style={styles.materialInfoText}>{displayMaterial.nombre} ({displayMaterial.tipo} - {displayMaterial.subtipo})</Text>
                    <Text style={styles.materialDetailText}>{`${t.gUsed}: ${gramosUtilizados}g`}</Text>
                    <View style={styles.materialInfoGrid}>
                      <Text style={styles.materialInfoLabel}>{t.unitPrice}:</Text>
                      <Text style={styles.materialInfoValue}>${precio.toFixed(2)} ${getCurrency(lang)}</Text>
                      <Text style={styles.materialInfoLabel}>{t.totalQuantity}:</Text>
                      <Text style={styles.materialInfoValue}>{`${cantidadTotal.toFixed(0)}g`}</Text>
                      <Text style={styles.materialInfoLabel}>{t.remainingQuantity}:</Text>
                      <Text style={styles.materialInfoValue}>{`${cantidadRestante.toFixed(0)}g`}</Text>
                      <Text style={styles.materialInfoLabel}>{t.materialCost}:</Text>
                      <Text style={styles.materialInfoValue}>${costoIndividual.toFixed(2)} ${getCurrency(lang)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );

    return (
      <View key={calculo.id} style={styles.calculationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Ionicons name="calculator-outline" size={24} color="#00e676" />
            <Text style={styles.cardTitle} numberOfLines={1}>{calculo.nombre}</Text>
            {calculo.fallo ? (
              <Text style={styles.falloText}><Ionicons name="close-circle" size={16} color="#d32f2f" />{' '}{t.failure}</Text>
            ) : (
              <Text style={styles.exitoText}><Ionicons name="checkmark-circle" size={16} color="#00e676" />{' '}{t.success}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => { setImpresionAEliminar(calculo); setDeleteModalVisible(true); }}>
            <Ionicons name="trash-outline" size={20} color="#e53935" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.materialesToggleButton} onPress={() => setMaterialesExpandidos(prev => ({ ...prev, [impresionId]: !materialesExpandido }))}>
          <Text style={styles.materialesToggleText}><Ionicons name="cube-outline" size={16} color="#00e676" />{' '}{t.usedMaterials}</Text>
          <Ionicons name={materialesExpandido ? "chevron-up" : "chevron-down"} size={20} color="#00e676" />
        </TouchableOpacity>

        {materialesExpandido && <MaterialesUsados />}
        
        <Text style={[styles.infoValue, { color: '#00e676' }]}>{`${t.materials}: $${costoTotalMateriales.toFixed(2)} ${getCurrency(lang)}`}</Text>
        <Text style={[styles.infoValue, { color: '#ffd600' }]}>{`${t.laborCost}: $${calculo.manoObra?.costoTotalManoObra || '0'} ${getCurrency(lang)}`}</Text>
        <Text style={[styles.infoValue, { color: '#ff9100' }]}>{`${t.extraMaterials}: $${calculo.avanzados?.totalMaterialesExtra || '0'} ${getCurrency(lang)}`}</Text>
        <Text style={[styles.infoValue, { color: '#40c4ff' }]}>{`${t.light}: $${calculo.avanzados?.costoLuz || '0'} ${getCurrency(lang)}`}</Text>
        <Text style={[styles.infoValue, { color: '#69f0ae', fontWeight: 'bold' }]}>{`${t.totalCost}: $${total} ${getCurrency(lang)}`}</Text>
        
        {calculo.mostrarFecha && calculo.fecha && (
          <Text style={{ color: '#a0a0a0', fontSize: 12, marginTop: 8, textAlign: 'right' }}>
            {t.creationDate}: {new Date(calculo.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        )}
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

    let proyectosFiltrados = proyectos.filter(proy => 
      proy.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    // Filtrar por estado de venta
    if (filtroEstado === 'vendidos') {
      proyectosFiltrados = proyectosFiltrados.filter(proy => proy.estadoVenta === 'vendido');
    } else if (filtroEstado === 'pendientes') {
      proyectosFiltrados = proyectosFiltrados.filter(proy => proy.estadoVenta !== 'vendido');
    }
    // Si es 'todos', no filtrar por estado

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
        categorias={categorias}
        clientes={clientes}
        onMarcarComoVendido={marcarProyectoComoVendido}
        onMarcarComoPendiente={marcarProyectoComoPendiente}
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
            categorias={categorias}
            clientes={clientes}
            onMarcarComoVendido={marcarProyectoComoVendido}
            onMarcarComoPendiente={marcarProyectoComoPendiente}
          />
        ))}
      </View>
    );
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
          setFiltroEstado('pendientes');
          setFiltroCategoria('');
          setFiltroCliente('');
        }} style={{ backgroundColor: tab === 'carpetas' ? '#00e676' : '#222', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 24, marginRight: 8 }}>
          <Text style={{ color: tab === 'carpetas' ? '#222' : '#fff', fontWeight: 'bold' }}>{t.foldersOrProjects}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setTab('sueltos');
          setProyectoSeleccionado(null);
          setImpresiones([]);
          setFiltroEstado('pendientes');
          setFiltroCategoria('');
          setFiltroCliente('');
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
              .slice()
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
              .map((calculo, index) => renderImpresion(calculo))
          )}
        </View>
      ) : tab === 'sueltos' ? (
        <View style={styles.calculationsContainer}>
          {/* Filtros de Ventas para Proyectos Sueltos */}
          <View style={styles.salesFiltersContainer}>
            {/* Filtro por Estado */}
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={[styles.filterButton, filtroEstado === 'todos' && styles.filterButtonActive]}
                onPress={() => setFiltroEstado('todos')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="cube-outline" 
                    size={16} 
                    color={filtroEstado === 'todos' ? '#222' : '#fff'} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterButtonText, filtroEstado === 'todos' && styles.filterButtonTextActive]}>
                    {t.all}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filtroEstado === 'vendidos' && styles.filterButtonActive]}
                onPress={() => setFiltroEstado('vendidos')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="checkmark-circle-outline" 
                    size={16} 
                    color={filtroEstado === 'vendidos' ? '#222' : '#fff'} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterButtonText, filtroEstado === 'vendidos' && styles.filterButtonTextActive]}>
                    {t.soldItems}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filtroEstado === 'pendientes' && styles.filterButtonActive]}
                onPress={() => setFiltroEstado('pendientes')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="time-outline" 
                    size={16} 
                    color={filtroEstado === 'pendientes' ? '#222' : '#fff'} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterButtonText, filtroEstado === 'pendientes' && styles.filterButtonTextActive]}>
                    {t.pendingItems}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Botones de Agregar Categorías y Clientes */}
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  setNuevaCategoria('');
                  setModalAgregarCategoria(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#00e676" />
                <Text style={styles.addButtonText}>{t.addCategory}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  setNuevoCliente('');
                  setModalAgregarCliente(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#00e676" />
                <Text style={styles.addButtonText}>{t.addClient}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {proyectosSueltos.length === 0 ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginTop: 20 }}>{t.noSoloProjects}</Text>
          ) : (
            impresionesFiltradas()
              .slice()
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
              .map((calculo, index) => renderImpresion({ ...calculo, mostrarFecha: true }))
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
          {/* Filtros de Ventas para Proyectos */}
          <View style={styles.salesFiltersContainer}>
            {/* Filtro por Estado */}
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={[styles.filterButton, filtroEstado === 'todos' && styles.filterButtonActive]}
                onPress={() => setFiltroEstado('todos')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="cube-outline" 
                    size={16} 
                    color={filtroEstado === 'todos' ? '#222' : '#fff'} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterButtonText, filtroEstado === 'todos' && styles.filterButtonTextActive]}>
                    {t.all}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filtroEstado === 'vendidos' && styles.filterButtonActive]}
                onPress={() => setFiltroEstado('vendidos')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="checkmark-circle-outline" 
                    size={16} 
                    color={filtroEstado === 'vendidos' ? '#222' : '#fff'} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterButtonText, filtroEstado === 'vendidos' && styles.filterButtonTextActive]}>
                    {t.soldItems}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filtroEstado === 'pendientes' && styles.filterButtonActive]}
                onPress={() => setFiltroEstado('pendientes')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="time-outline" 
                    size={16} 
                    color={filtroEstado === 'pendientes' ? '#222' : '#fff'} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterButtonText, filtroEstado === 'pendientes' && styles.filterButtonTextActive]}>
                    {t.pendingItems}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Botones de Agregar Categorías y Clientes */}
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  setNuevaCategoria('');
                  setModalAgregarCategoria(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#00e676" />
                <Text style={styles.addButtonText}>{t.addCategory}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  setNuevoCliente('');
                  setModalAgregarCliente(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#00e676" />
                <Text style={styles.addButtonText}>{t.addClient}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Proyectos activos */}
          {renderListaProyectos()}
          {/* Proyectos archivados */}
          {renderProyectosArchivados()}
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

      {/* Modal de Ventas */}
      <SalesModal
        visible={salesModalVisible}
        onClose={() => setSalesModalVisible(false)}
        onSave={handleMarcarComoVendido}
        impresion={impresionParaVenta}
      />

      {/* Modal de Configuración de Ventas */}
      <SalesSettingsModal
        visible={settingsModalVisible}
        onClose={() => {
          setSettingsModalVisible(false);
          // Recargar categorías y clientes después de cerrar el modal
          cargarCategoriasYClientes();
        }}
        type={settingsType}
      />

      {/* Modal para agregar categoría */}
      <Modal
        visible={modalAgregarCategoria}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalAgregarCategoria(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 18 }}>{t.manageCategories}</Text>
              <TouchableOpacity onPress={() => setModalAgregarCategoria(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* Agregar nueva categoría */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="add-circle-outline" size={18} color="#00e676" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.addNewCategory}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' }}
                  value={nuevaCategoria}
                  onChangeText={setNuevaCategoria}
                  placeholder="Nombre de la categoría"
                  placeholderTextColor="#888"
                />
                <TouchableOpacity
                  onPress={() => {
                    agregarCategoria();
                    setNuevaCategoria('');
                  }}
                  style={{ 
                    backgroundColor: nuevaCategoria.trim() ? '#00e676' : '#444', 
                    borderRadius: 8, 
                    padding: 12, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minWidth: 44
                  }}
                  disabled={!nuevaCategoria.trim()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista de categorías existentes */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="list-outline" size={18} color="#00e676" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.existingCategories}</Text>
                <View style={{ backgroundColor: '#00e676', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 }}>
                  <Text style={{ color: '#222', fontSize: 12, fontWeight: 'bold' }}>{categorias.length}</Text>
                </View>
              </View>
              {categorias.length === 0 ? (
                <View style={{ backgroundColor: '#222', borderRadius: 8, padding: 20, alignItems: 'center' }}>
                  <Ionicons name="folder-open-outline" size={32} color="#666" style={{ marginBottom: 8 }} />
                  <Text style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>{t.noCategoriesRegistered}</Text>
                </View>
              ) : (
                <View style={{ maxHeight: 200 }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {categorias.map((categoria, index) => (
                      <View key={index} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        backgroundColor: '#222', 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 8, 
                        borderWidth: 1, 
                        borderColor: '#333' 
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Ionicons name="folder-outline" size={16} color="#00e676" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#fff', fontSize: 16 }}>{categoria}</Text>
                        </View>
                        <TouchableOpacity 
                          style={{ 
                            backgroundColor: '#333', 
                            borderRadius: 6, 
                            padding: 6,
                            marginLeft: 8
                          }}
                          onPress={() => eliminarCategoria(categoria)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#e53935" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para agregar cliente */}
      <Modal
        visible={modalAgregarCliente}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalAgregarCliente(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 18 }}>{t.manageClients}</Text>
              <TouchableOpacity onPress={() => setModalAgregarCliente(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* Agregar nuevo cliente */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="add-circle-outline" size={18} color="#00e676" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.addNewClient}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' }}
                  value={nuevoCliente}
                  onChangeText={setNuevoCliente}
                  placeholder="Nombre del cliente"
                  placeholderTextColor="#888"
                />
                <TouchableOpacity
                  onPress={() => {
                    agregarCliente();
                    setNuevoCliente('');
                  }}
                  style={{ 
                    backgroundColor: nuevoCliente.trim() ? '#00e676' : '#444', 
                    borderRadius: 8, 
                    padding: 12, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minWidth: 44
                  }}
                  disabled={!nuevoCliente.trim()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista de clientes existentes */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="list-outline" size={18} color="#00e676" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.existingClients}</Text>
                <View style={{ backgroundColor: '#00e676', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 }}>
                  <Text style={{ color: '#222', fontSize: 12, fontWeight: 'bold' }}>{clientes.length}</Text>
                </View>
              </View>
              {clientes.length === 0 ? (
                <View style={{ backgroundColor: '#222', borderRadius: 8, padding: 20, alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={32} color="#666" style={{ marginBottom: 8 }} />
                  <Text style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>{t.noClientsRegistered}</Text>
                </View>
              ) : (
                <View style={{ maxHeight: 200 }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {clientes.map((cliente, index) => (
                      <View key={index} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        backgroundColor: '#222', 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 8, 
                        borderWidth: 1, 
                        borderColor: '#333' 
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Ionicons name="person-outline" size={16} color="#00e676" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#fff', fontSize: 16 }}>{cliente}</Text>
                        </View>
                        <TouchableOpacity 
                          style={{ 
                            backgroundColor: '#333', 
                            borderRadius: 6, 
                            padding: 6,
                            marginLeft: 8
                          }}
                          onPress={() => eliminarCliente(cliente)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#e53935" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
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
  // Estilos del Sistema de Ventas
  saleInfoContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  saleStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  soldStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00e676',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  soldStatusText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingStatusText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 3,
  },
  saleDetailsContainer: {
    marginTop: 8,
  },
  saleDetailText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  soldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00e676',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#00e676',
  },
  soldButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  pendingButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  // Estilos para filtros de ventas
  salesFiltersContainer: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#222',
    fontWeight: 'bold',
  },
  // Estilos para checkbox de venta
  saleCheckboxContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsButton: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#00e676',
  },
  // Estilos para checkboxes adicionales
  additionalCheckboxesContainer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 16,
  },
  additionalCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  additionalCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#666',
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  additionalCheckboxChecked: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  additionalCheckboxText: {
    color: '#a0a0a0',
    fontSize: 12,
    fontWeight: '500',
  },
  // Estilos para dropdowns
  dropdownContainer: {
    backgroundColor: '#333',
    borderRadius: 6,
    marginTop: 4,
    marginLeft: 20,
    borderWidth: 1,
    borderColor: '#444',
    maxHeight: 120,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // Estilos para botones de agregar
  addButton: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#00e676',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  addButtonText: {
    color: '#00e676',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  // Estilos para campos de agregar items
  addSection: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  addSectionTitle: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addItemContainer: {
    marginBottom: 12,
  },
  addItemLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  addItemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  addItemButton: {
    backgroundColor: '#00e676',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  addItemButtonDisabled: {
    backgroundColor: '#666',
  },
  // Estilos para chips horizontales
  chipsContainer: {
    marginTop: 8,
  },
  chipSection: {
    marginBottom: 12,
  },
  chipSectionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#333',
    gap: 4,
  },
  chipActive: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  chipText: {
    color: '#a0a0a0',
    fontSize: 11,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#222',
    fontWeight: 'bold',
  },
  compactDropdown: {
    backgroundColor: '#222',
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compactDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 6,
  },
  compactDropdownText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  // Estilos para campo de precio de venta
  precioVentaContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  precioVentaLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  precioVentaInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  precioVentaInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  precioVentaButton: {
    backgroundColor: '#00e676',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  precioVentaButtonText: {
    color: '#222',
    fontSize: 12,
    fontWeight: 'bold',
  },
  precioVentaCancelButton: {
    backgroundColor: '#666',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  precioVentaCancelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // Estilos para campo de ganancia
  gananciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  gananciaLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  gananciaValue: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
  },
  costosInfoContainer: {
    backgroundColor: '#222',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  costosInfoText: {
    color: '#a0a0a0',
    fontSize: 12,
    marginBottom: 4,
  },
  costosInfoLabel: {
    color: '#fff',
    fontWeight: '500',
  },
  // Estilos para selectores de categoría y cliente
  selectorContainer: {
    marginBottom: 12,
  },
  selectorLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  selectorButton: {
    backgroundColor: '#333',
    borderRadius: 6,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#444',
  },
  selectorButtonText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  selectorDropdown: {
    backgroundColor: '#222',
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectorOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  precioVentaButtonTextDisabled: {
    color: '#666',
  },
});

export default PrintScreen;