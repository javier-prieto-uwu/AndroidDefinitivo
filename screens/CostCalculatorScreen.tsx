import { Picker } from '@react-native-picker/picker';
import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, app } from '../api/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const db = getFirestore(app);

// Define el tipo de proyecto para incluir 'archivado'
type Proyecto = {
  id: string;
  nombre: string;
  fechaCreacion?: string;
  archivado?: boolean;
};

// Componente para seleccionar materiales múltiples
const MaterialMultipleSelector: React.FC<{
  index: number;
  materialesGuardados: any[];
  onMaterialChange: (index: number, material: any) => void;
  materialSeleccionado: any;
}> = ({ index, materialesGuardados, onMaterialChange, materialSeleccionado }) => {
  const renderMaterialCard = (mat: any) => (
    <TouchableOpacity
      key={mat.id}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: materialSeleccionado?.id === mat.id ? '#00e676' : '#333',
        borderColor: materialSeleccionado?.id === mat.id ? '#00e676' : '#666',
        borderWidth: 2,
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginHorizontal: 4,
        minHeight: 36,
        maxWidth: '48%',
      }}
      onPress={() => onMaterialChange(index, mat)}
    >
      <View style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: mat.color || '#00e676',
        borderWidth: 1,
        borderColor: '#333',
        marginRight: 6,
      }} />
      <View style={{ flexShrink: 1 }}>
        <Text style={{
          color: materialSeleccionado?.id === mat.id ? '#222' : '#fff',
          fontWeight: materialSeleccionado?.id === mat.id ? 'bold' : 'normal',
          fontSize: 11,
          flexWrap: 'wrap',
        }} numberOfLines={1} ellipsizeMode="tail">{mat.nombre}</Text>
        <Text style={{ color: '#a0a0a0', fontSize: 9 }} numberOfLines={1} ellipsizeMode="tail">{mat.subtipo}</Text>
        <View style={{ flexDirection: 'row', marginTop: 2 }}>
          <Text style={{ color: '#00e676', fontSize: 8, marginRight: 6 }}>
            Restante: {(typeof mat.cantidadRestante !== 'undefined' ? mat.cantidadRestante : mat.cantidad || '0')}{getUnidadMaterial(mat.categoria)}
          </Text>
          <Text style={{ color: '#ffd600', fontSize: 8 }}>
            ${(() => {
              const categoria = mat.categoria || 'Filamento';
              switch (categoria) {
                case 'Pintura':
                case 'Aros de llavero':
                  return mat.precio || '0';
                case 'Filamento':
                case 'Resina':
                default:
                  return mat.precioBobina || mat.precio || '0';
              }
            })()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Función para obtener la unidad según el tipo de material
  const getUnidadMaterial = (categoria: string) => {
    switch (categoria) {
      case 'Filamento':
      case 'Resina':
        return 'g';
      case 'Pintura':
        return 'ml';
      case 'Aros de llavero':
        return ' unidades';
      default:
        // Para categorías personalizadas, usar unidades por defecto
        return ' unidades';
    }
  };

  // Función para obtener el campo de cantidad según el tipo de material
  const getCampoCantidad = (categoria: string) => {
    switch (categoria) {
      case 'Filamento':
      case 'Resina':
        return 'gramosUtilizados';
      case 'Pintura':
        return 'cantidadPintura';
      case 'Aros de llavero':
        return 'cantidadLlaveros';
      default:
        return 'cantidadUtilizada';
    }
  };

  // Función para obtener el label según el tipo de material
  const getLabelCantidad = (categoria: string) => {
    switch (categoria) {
      case 'Filamento':
      case 'Resina':
        return 'Gramos utilizados';
      case 'Pintura':
        return 'Mililitros utilizados';
      case 'Aros de llavero':
        return 'Cantidad de llaveros';
      default:
        return 'Cantidad utilizada';
    }
  };

  // Función para obtener el placeholder según el tipo de material
  const getPlaceholderCantidad = (categoria: string) => {
    switch (categoria) {
      case 'Filamento':
      case 'Resina':
        return 'Ej: 20';
      case 'Pintura':
        return 'Ej: 50';
      case 'Aros de llavero':
        return 'Ej: 5';
      default:
        return 'Ej: 1';
    }
  };

  // Función para obtener la información del material según su tipo
  const getInfoMaterial = (material: any) => {
    const categoria = material.categoria;
    const campoCantidad = getCampoCantidad(categoria);
    const cantidad = material[campoCantidad] || '0';
    
    switch (categoria) {
      case 'Filamento':
      case 'Resina':
        return {
          precio: material.precioBobina || material.precio || '0.00',
          peso: material.pesoBobina || material.peso || '0',
          unidad: 'gramos',
          labelPeso: 'Peso de la bobina',
          labelCosto: 'Costo del filamento'
        };
      case 'Pintura':
        return {
          precio: material.precio || '0.00',
          peso: material.cantidad || '0', // Usar cantidad total inicial, no cantidadPintura
          unidad: 'ml',
          labelPeso: 'Cantidad total de pintura',
          labelCosto: 'Costo de la pintura'
        };
      case 'Aros de llavero':
        return {
          precio: material.precio || '0.00',
          peso: material.cantidad || '0',
          unidad: 'unidades',
          labelPeso: 'Cantidad disponible',
          labelCosto: 'Costo de los llaveros'
        };
      default:
        return {
          precio: material.precio || '0.00',
          peso: material.cantidad || '0',
          unidad: 'unidades',
          labelPeso: 'Cantidad restante',
          labelCosto: 'Costo del material'
        };
    }
  };

  const renderMaterialGroup = (tipo: string, materiales: any[]) => {
    const filas = [];
    for (let i = 0; i < materiales.length; i += 2) {
      filas.push(materiales.slice(i, i + 2));
    }
    
    return (
      <View key={tipo} style={{ marginBottom: 8 }}>
        <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{tipo}</Text>
        {filas.map((fila, idx) => (
          <View key={idx} style={{ flexDirection: 'row', marginBottom: 4, justifyContent: 'center', alignSelf: 'center', maxWidth: 340, width: '100%' }}>
            {fila.map(renderMaterialCard)}
            {fila.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>
    );
  };

  const agruparMaterialesPorTipo = () => {
    const matsPorTipo: { [tipo: string]: any[] } = {};
    materialesGuardados.forEach(mat => {
      const tipo = mat.tipo || 'Sin tipo';
      if (!matsPorTipo[tipo]) matsPorTipo[tipo] = [];
      matsPorTipo[tipo].push(mat);
    });
    return matsPorTipo;
  };

  const calcularCostoMaterial = () => {
    if (!materialSeleccionado) return '0.00';
    
    const categoria = materialSeleccionado.categoria;
    const campoCantidad = getCampoCantidad(categoria);
    const cantidadUtilizada = parseFloat(materialSeleccionado[campoCantidad] || '0');
    
    switch (categoria) {
      case 'Filamento':
      case 'Resina':
        const precioBobina = parseFloat(materialSeleccionado.precioBobina || materialSeleccionado.precio || '0');
        const pesoBobina = parseFloat(materialSeleccionado.pesoBobina || materialSeleccionado.peso || '0');
        if (precioBobina && pesoBobina && cantidadUtilizada) {
          const costoPorGramo = precioBobina / pesoBobina;
          const costo = costoPorGramo * cantidadUtilizada;
          return costo.toFixed(2);
        }
        break;
      case 'Pintura':
        const precioPintura = parseFloat(materialSeleccionado.precio || '0');
        const cantidadTotalPintura = parseFloat(materialSeleccionado.cantidad || '0'); // Cantidad total inicial
        const mlUtilizados = parseFloat(materialSeleccionado.cantidadPintura || '0'); // ML utilizados
        if (precioPintura && cantidadTotalPintura && mlUtilizados) {
          const costoPorMl = precioPintura / cantidadTotalPintura;
          const costo = costoPorMl * mlUtilizados;
          return costo.toFixed(2);
        }
        break;
      case 'Aros de llavero':
        const precioLlavero = parseFloat(materialSeleccionado.precio || '0');
        if (precioLlavero && cantidadUtilizada) {
          // Para llaveros: cantidad * precio unitario
          const costo = precioLlavero * cantidadUtilizada;
          return costo.toFixed(2);
        }
        break;
      default:
        const precio = parseFloat(materialSeleccionado.precio || '0');
        if (precio && cantidadUtilizada) {
          // Para otros materiales: cantidad * precio unitario
          const costo = precio * cantidadUtilizada;
          return costo.toFixed(2);
        }
    }
    return '0.00';
  };

  const handleCantidadChange = (text: string) => {
    const categoria = materialSeleccionado.categoria;
    const campoCantidad = getCampoCantidad(categoria);
    
    const materialActualizado = { 
      ...materialSeleccionado, 
      [campoCantidad]: text,
    };
    onMaterialChange(index, materialActualizado);
  };

  const handleBlur = () => {
    const categoria = materialSeleccionado.categoria;
    const campoCantidad = getCampoCantidad(categoria);
    if (!materialSeleccionado[campoCantidad] || materialSeleccionado[campoCantidad] === '') {
      handleCantidadChange('0');
    }
  };

  return (
    <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#222', borderRadius: 8 }}>
      <Text style={{ color: '#00e676', fontWeight: 'bold', marginBottom: 8 }}>Material {index + 1}</Text>
      
      <View style={{ flexDirection: 'column', flexWrap: 'wrap', marginBottom: 8 }}>
        {materialesGuardados.length === 0 ? (
          <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 10 }}>No hay materiales guardados.</Text>
        ) : (
          Object.entries(agruparMaterialesPorTipo()).map(([tipo, materiales]) => 
            renderMaterialGroup(tipo, materiales)
          )
        )}
      </View>

      {materialSeleccionado && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#fff', fontSize: 12, marginBottom: 4 }}>
            {getLabelCantidad(materialSeleccionado.categoria)} para {materialSeleccionado.nombre}:
          </Text>
          <TextInput
            style={styles.input}
            value={materialSeleccionado[getCampoCantidad(materialSeleccionado.categoria)] ?? ''}
            onChangeText={handleCantidadChange}
            onBlur={handleBlur}
            placeholder={getPlaceholderCantidad(materialSeleccionado.categoria)}
            keyboardType="numeric"
            maxLength={10}
          />
          
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#fff', fontSize: 11, marginBottom: 4 }}>Información del material:</Text>
            
            {(() => {
              const info = getInfoMaterial(materialSeleccionado);
              return (
                <>
                  <View style={styles.infoDisplayContainer}>
                    <View style={styles.infoDisplayRow}>
                      <Ionicons name="cash-outline" size={14} color="#ffd600" />
                      <Text style={[styles.infoDisplayText, { fontSize: 12 }]}>
                        ${info.precio} MXN
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoDisplayContainer}>
                    <View style={styles.infoDisplayRow}>
                      <Ionicons name="scale-outline" size={14} color="#00e676" />
                      <Text style={[styles.infoDisplayText, { fontSize: 12 }]}>
                        {info.peso} {info.unidad}
                      </Text>
                    </View>
                  </View>
                </>
              );
            })()}
          </View>

          <View style={{ backgroundColor: '#222', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: '#a0a0a0', fontSize: 12, marginBottom: 4 }}>
              {getInfoMaterial(materialSeleccionado).labelCosto}:
            </Text>
            <Text style={{ color: '#00e676', fontSize: 18, fontWeight: 'bold' }}>
              ${calcularCostoMaterial()} MXN
            </Text>
            <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>
              Para {materialSeleccionado[getCampoCantidad(materialSeleccionado.categoria)] || '0'}{getUnidadMaterial(materialSeleccionado.categoria)} utilizados
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const CostCalculatorScreen: React.FC = () => {
  // Estado único para todo el cálculo, listo para guardar en base de datos
  const [calculo, setCalculo] = useState({
    nombre: '',
    usuario: '',
    materialSeleccionado: {
      id: '',
      nombre: '',
      tipo: '',
      subtipo: '',
      color: '',
    },
    materialesMultiples: [],
    detallesImpresion: {
      relleno: '',
      tiempoImpresion: '',
      temperatura: '',
      velocidad: '',
      alturaCapa: '',
      notas: '',
    },
    filamento: {
      tipo: '',
      subtipo: '',
      precioBobina: '',
      pesoBobina: '',
      gramosUtilizados: '0',
      costoFilamento: '0',
      costoMaterialSolo: '0',
    },
    manoObra: {
      preparacionTiempo: '',
      preparacionCosto: '',
      costoTotalManoObra: '0',
    },
    avanzados: {
      arosLlavero: '',
      imanes: '',
      otrosMateriales: '',
      consumoKwh: '',
      costoKwh: '',
      costoLuz: '0',
      horasimpresion: '0',
      totalMaterialesExtra: '0',
    },
    fecha: new Date().toISOString(),  
  });

  // Estado para controlar si es multifilamento
  const [esMultifilamento, setEsMultifilamento] = useState(false);
  const [cantidadMateriales, setCantidadMateriales] = useState(1);

  // Estado para almacenar los cálculos guardados
  const [calculosGuardados, setCalculosGuardados] = useState<any[]>([]);

  // definimos por defecto que el menu de mostrar avanzado se va a mentener apagado hasta que se llame la funcion
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);

  // Estado para mostrar/ocultar detalles de impresión
  const [mostrarDetallesImpresion, setMostrarDetallesImpresion] = useState(false);

  // Estado para materiales guardados reales
  const [materialesGuardados, setMaterialesGuardados] = useState<any[]>([]);
  const [cargandoMateriales, setCargandoMateriales] = useState(false);
  const [errorMateriales, setErrorMateriales] = useState<string | null>(null);
  const [verMasMateriales, setVerMasMateriales] = useState(false);
  const [loadingMateriales, setLoadingMateriales] = useState(true);

  // Estado para el material seleccionado
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');

  // Estados para alertas personalizadas
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

  const [porcentajeGanancia, setPorcentajeGanancia] = useState(100);

  const tiposFilamento = [
    'PLA', 'ABS', 'PETG', 'TPU', 'Nylon', 'Resina', 'HIPS', 
    'PC (Policarbonato)', 'Filamento Flexible', 'Filamento con Madera'
  ];

  // Subtipos de filamento (igual que en agregarM)
  const subtiposFilamento = [
    { tipo: 'PLA', subtipos: ['Normal', 'Silk', 'Plus', 'Madera', 'Brillante', 'Mate', 'Flexible', 'Glow', 'Metal', 'Transparente', 'Multicolor', 'Reciclado', 'Carbono', 'Magnético', 'Conductivo', 'Alta temperatura', 'Baja temperatura'] },
    { tipo: 'ABS', subtipos: ['Normal', 'Plus', 'Reciclado', 'Transparente', 'Ignífugo', 'Carbono'] },
    { tipo: 'PETG', subtipos: ['Normal', 'Transparente', 'Reciclado', 'Carbono'] },
    { tipo: 'TPU', subtipos: ['85A', '95A', 'Flexible', 'Transparente'] },
    { tipo: 'Nylon', subtipos: ['Normal', 'Carbono', 'Vidrio'] },
    { tipo: 'PC', subtipos: ['Normal', 'Carbono'] },
    { tipo: 'HIPS', subtipos: ['Normal'] },
    { tipo: 'ASA', subtipos: ['Normal'] },
    { tipo: 'PVA', subtipos: ['Normal'] },
    { tipo: 'PP', subtipos: ['Normal'] },
    { tipo: 'Wood', subtipos: ['Normal'] },
    { tipo: 'Metal', subtipos: ['Normal'] },
    { tipo: 'Flexible', subtipos: ['Normal'] },
    { tipo: 'Conductivo', subtipos: ['Normal'] },
  ];

  // Leer materiales desde Firestore al montar y cada vez que la pantalla se enfoque
  useFocusEffect(
    React.useCallback(() => {
      const cargarMateriales = async () => {
        setLoadingMateriales(true);
        const user = auth.currentUser;
        if (!user) {
          setMaterialesGuardados([]);
          setLoadingMateriales(false);
          return;
        }
        try {
          const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'materiales'));
          const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMaterialesGuardados(mats);
        } catch (error) {
          setMaterialesGuardados([]);
        } finally {
          setLoadingMateriales(false);
        }
      };
      cargarMateriales();
    }, [])
  );

  // Cargar proyectos al montar
  useEffect(() => {
    const cargarProyectos = async () => {
      const user = auth.currentUser;
      if (!user) {
        setProyectos([]);
        return;
      }
      try {
        const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos'));
        const datos: Proyecto[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nombre: data.nombre || '',
            fechaCreacion: data.fechaCreacion,
            archivado: data.archivado || false,
          };
        });
        setProyectos(datos.filter(p => !p.archivado));
      } catch (e) {
        setProyectos([]);
      }
    };
    cargarProyectos();
    setProyectoSeleccionado(null); // Reiniciar selección de carpeta al entrar
  }, []);

  // Handlers para actualizar el objeto de cálculo
  const handleFilamentoChange = (name: string, value: string) => {
    setCalculo(prev => ({
      ...prev,
      filamento: {
        ...prev.filamento,
        [name]: value
      }
    }));
  };

  const handleManoObraChange = (name: string, value: string) => {
    setCalculo(prev => ({
      ...prev,
      manoObra: {
        ...prev.manoObra,
        [name]: value
      }
    }));
  };

  const handleAvanzadoChange = (name: string, value: string) => {
    setCalculo(prev => ({
      ...prev,
      avanzados: {
        ...prev.avanzados,
        [name]: value
      }
    }));
  };

  const handleDetallesImpresionChange = (name: string, value: string) => {
    setCalculo(prev => ({
      ...prev,
      detallesImpresion: {
        ...prev.detallesImpresion,
        [name]: value
      }
    }));
  };

  // Handler para seleccionar material y rellenar campos
  const handleSeleccionMaterial = (id: string) => {
    setMaterialSeleccionado(id);
    const mat = materialesGuardados.find((m: any) => m.id === id);
    if (mat) {
      setCalculo(prev => {
        // Solo actualizar gramosUtilizados si está vacío o es el valor por defecto
        const gramosActuales = prev.filamento.gramosUtilizados;
        const debeActualizarGramos = !gramosActuales || gramosActuales === '0';
        
        // Determinar qué campos usar según la categoría del material
        const categoria = mat.categoria || 'Filamento';
        let precioCampo, cantidadCampo;
        
        switch (categoria) {
          case 'Pintura':
            precioCampo = mat.precio || '';
            cantidadCampo = mat.cantidad || '';
            break;
          case 'Aros de llavero':
            precioCampo = mat.precio || '';
            cantidadCampo = mat.cantidad || '';
            break;
          case 'Filamento':
          case 'Resina':
          default:
            precioCampo = mat.precioBobina || mat.precio || '';
            cantidadCampo = mat.pesoBobina || mat.peso || '';
            break;
        }
        
        return {
        ...prev,
        materialSeleccionado: {
          id: mat.id,
          nombre: mat.nombre || '',
          tipo: mat.tipo || '',
          subtipo: mat.subtipo || '',
          color: mat.color || '',
        },
        filamento: {
          ...prev.filamento,
          tipo: mat.tipo || '',
          subtipo: mat.subtipo || '',
          precioBobina: precioCampo,
          pesoBobina: cantidadCampo,
          color: mat.color || '',
            // Solo actualizar gramos si es necesario
            gramosUtilizados: debeActualizarGramos ? '0' : gramosActuales,
        }
        };
      });
    }
  };

  // Cálculo de filamento optimizado
  const calcularCostoFilamento = () => {
    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      // Calcular costo total de múltiples materiales
      const costoTotal = calculo.materialesMultiples.reduce((total, material) => {
        if (!material) return total;
        
        const categoria = material.categoria;
        let costo = 0;
        
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            if (material.precioBobina && material.pesoBobina && material.gramosUtilizados) {
              const costoPorGramo = parseFloat(material.precioBobina) / parseFloat(material.pesoBobina);
              costo = costoPorGramo * parseFloat(material.gramosUtilizados);
            }
            break;
          case 'Pintura':
            if (material.precio && material.cantidad && material.cantidadPintura) {
              const cantidadTotalPintura = parseFloat(material.cantidad); // Cantidad total inicial
              const mlUtilizados = parseFloat(material.cantidadPintura); // ML utilizados
              const costoPorMl = parseFloat(material.precio) / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          case 'Aros de llavero':
            if (material.precio && material.cantidadLlaveros) {
              // Para llaveros: cantidad * precio unitario
              costo = parseFloat(material.precio) * parseFloat(material.cantidadLlaveros);
            }
            break;
          default:
            if (material.precio && material.cantidadUtilizada) {
              // Para categorías personalizadas: cantidad * precio unitario
              costo = parseFloat(material.precio) * parseFloat(material.cantidadUtilizada);
            }
        }
        return total + costo;
      }, 0);
      
      setCalculo(prev => ({
        ...prev,
        filamento: {
          ...prev.filamento,
          costoFilamento: costoTotal.toFixed(2),
          costoMaterialSolo: costoTotal.toFixed(2),
        }
      }));
    } else {
      // Cálculo para material único según el tipo
      const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
      if (mat) {
        const categoria = mat.categoria;
        let costo = 0;
        
        switch (categoria) {
          case 'Filamento':
          case 'Resina': {
            const { precioBobina, pesoBobina, gramosUtilizados } = calculo.filamento;
            if (precioBobina && pesoBobina && gramosUtilizados) {
              const costoPorGramo = parseFloat(precioBobina) / parseFloat(pesoBobina);
              costo = costoPorGramo * parseFloat(gramosUtilizados);
            }
            break;
          }
          case 'Pintura': {
            const precioPintura = parseFloat(mat.precio || '0');
            const cantidadTotalPintura = parseFloat(mat.cantidad || '0');
            const mlUtilizados = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioPintura && cantidadTotalPintura && mlUtilizados) {
              const costoPorMl = precioPintura / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          }
          case 'Aros de llavero': {
            const precioLlavero = parseFloat(mat.precio || '0');
            const cantidadLlaveros = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioLlavero && cantidadLlaveros) {
              costo = precioLlavero * cantidadLlaveros;
            }
            break;
          }
          default: {
            // Para categorías personalizadas
            const precio = parseFloat(mat.precio || '0');
            const cantidad = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precio && cantidad) {
              costo = precio * cantidad;
            }
          }
        }
        
      setCalculo(prev => ({
        ...prev,
        filamento: {
          ...prev.filamento,
          costoFilamento: costo.toFixed(2),
          costoMaterialSolo: costo.toFixed(2),
        }
      }));
      }
    }
  };

  // Cálculo de mano de obra optimizado
  const calcularManoObra = () => {
    const horas = parseFloat(calculo.manoObra.preparacionTiempo) || 0;
    const costoPorHora = parseFloat(calculo.manoObra.preparacionCosto) || 0;
    const total = horas * costoPorHora;
    setCalculo(prev => ({
      ...prev,
      manoObra: {
        ...prev.manoObra,
        costoTotalManoObra: total.toFixed(2)
      }
    }));
  };

  // Cálculo de materiales extra y luz optimizado
  const calcularAvanzado = () => {
    const aros = parseFloat(calculo.avanzados.arosLlavero) || 0;
    const otros = parseFloat(calculo.avanzados.otrosMateriales) || 0;
    const kwh = parseFloat(calculo.avanzados.consumoKwh) || 0;
    const costoKwh = parseFloat(calculo.avanzados.costoKwh) || 0;
    const horasimpresion = parseFloat(calculo.avanzados.horasimpresion) || 0;
    const costoLuz = ((kwh / 1000) * costoKwh) * horasimpresion;
    const totalMaterialesExtra = aros + otros;
    setCalculo(prev => ({
      ...prev,
      avanzados: {
        ...prev.avanzados,
        costoLuz: costoLuz.toFixed(2),
        totalMaterialesExtra: totalMaterialesExtra.toFixed(2),
      }
    }));
  };

  // Cálculo total optimizado
  const getTotal = () => {
    let filamento = 0;
    
    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      filamento = calculo.materialesMultiples.reduce((total, material) => {
        if (!material) return total;
        
        const categoria = material.categoria;
        let costo = 0;
        
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            if (material.precioBobina && material.pesoBobina && material.gramosUtilizados) {
              const costoPorGramo = parseFloat(material.precioBobina) / parseFloat(material.pesoBobina);
              costo = costoPorGramo * parseFloat(material.gramosUtilizados);
            }
            break;
          case 'Pintura':
            if (material.precio && material.cantidad && material.cantidadPintura) {
              const cantidadTotalPintura = parseFloat(material.cantidad); // Cantidad total inicial
              const mlUtilizados = parseFloat(material.cantidadPintura); // ML utilizados
              const costoPorMl = parseFloat(material.precio) / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          case 'Aros de llavero':
            if (material.precio && material.cantidadLlaveros) {
              // Para llaveros: cantidad * precio unitario
              costo = parseFloat(material.precio) * parseFloat(material.cantidadLlaveros);
            }
            break;
          default:
            if (material.precio && material.cantidadUtilizada) {
              // Para categorías personalizadas: cantidad * precio unitario
              costo = parseFloat(material.precio) * parseFloat(material.cantidadUtilizada);
            }
        }
        return total + costo;
      }, 0);
    } else {
      // Para material único, calcular según el tipo
      const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
      if (mat) {
        const categoria = mat.categoria;
        let costo = 0;
        
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            const { precioBobina, pesoBobina, gramosUtilizados } = calculo.filamento;
            if (precioBobina && pesoBobina && gramosUtilizados) {
              const costoPorGramo = parseFloat(precioBobina) / parseFloat(pesoBobina);
              costo = costoPorGramo * parseFloat(gramosUtilizados);
            }
            break;
          case 'Pintura':
            const precioPintura = parseFloat(calculo.filamento.precioBobina || '0');
            const cantidadTotalPintura = parseFloat(mat.cantidad || '0');
            const mlUtilizados = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioPintura && cantidadTotalPintura && mlUtilizados) {
              const costoPorMl = precioPintura / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          case 'Aros de llavero':
            const precioLlavero = parseFloat(calculo.filamento.precioBobina || '0');
            const cantidadLlaveros = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioLlavero && cantidadLlaveros) {
              costo = precioLlavero * cantidadLlaveros;
            }
            break;
          default:
            // Para categorías personalizadas
            const precio = parseFloat(calculo.filamento.precioBobina || '0');
            const cantidad = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precio && cantidad) {
              costo = precio * cantidad;
            }
        }
        filamento = costo;
      } else {
        filamento = parseFloat(calculo.filamento.costoFilamento) || 0;
      }
    }
    
    const manoObra = parseFloat(calculo.manoObra.costoTotalManoObra) || 0;
    let total = filamento + manoObra;
    
    if (mostrarAvanzado) {
      const extra = parseFloat(calculo.avanzados.totalMaterialesExtra) || 0;
      const luz = parseFloat(calculo.avanzados.costoLuz) || 0;
      total += extra + luz;
    }
    return total.toFixed(2);
  };

  const getProduccion = () => {
    let filamento = 0;
    
    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      filamento = calculo.materialesMultiples.reduce((total, material) => {
        if (!material) return total;
        
        const categoria = material.categoria;
        let costo = 0;
        
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            if (material.precioBobina && material.pesoBobina && material.gramosUtilizados) {
              const costoPorGramo = parseFloat(material.precioBobina) / parseFloat(material.pesoBobina);
              costo = costoPorGramo * parseFloat(material.gramosUtilizados);
            }
            break;
          case 'Pintura':
            if (material.precio && material.cantidad && material.cantidadPintura) {
              const cantidadTotalPintura = parseFloat(material.cantidad); // Cantidad total inicial
              const mlUtilizados = parseFloat(material.cantidadPintura); // ML utilizados
              const costoPorMl = parseFloat(material.precio) / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          case 'Aros de llavero':
            if (material.precio && material.cantidadLlaveros) {
              // Para llaveros: cantidad * precio unitario
              costo = parseFloat(material.precio) * parseFloat(material.cantidadLlaveros);
            }
            break;
          default:
            if (material.precio && material.cantidadUtilizada) {
              // Para categorías personalizadas: cantidad * precio unitario
              costo = parseFloat(material.precio) * parseFloat(material.cantidadUtilizada);
            }
        }
        return total + costo;
      }, 0);
    } else {
      // Para material único, calcular según el tipo
      const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
      if (mat) {
        const categoria = mat.categoria;
        let costo = 0;
        
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            const { precioBobina, pesoBobina, gramosUtilizados } = calculo.filamento;
            if (precioBobina && pesoBobina && gramosUtilizados) {
              const costoPorGramo = parseFloat(precioBobina) / parseFloat(pesoBobina);
              costo = costoPorGramo * parseFloat(gramosUtilizados);
            }
            break;
          case 'Pintura':
            const precioPintura = parseFloat(calculo.filamento.precioBobina || '0');
            const cantidadTotalPintura = parseFloat(mat.cantidad || '0');
            const mlUtilizados = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioPintura && cantidadTotalPintura && mlUtilizados) {
              const costoPorMl = precioPintura / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          case 'Aros de llavero':
            const precioLlavero = parseFloat(calculo.filamento.precioBobina || '0');
            const cantidadLlaveros = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioLlavero && cantidadLlaveros) {
              costo = precioLlavero * cantidadLlaveros;
            }
            break;
          default:
            // Para categorías personalizadas
            const precio = parseFloat(calculo.filamento.precioBobina || '0');
            const cantidad = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precio && cantidad) {
              costo = precio * cantidad;
            }
        }
        filamento = costo;
      } else {
        filamento = parseFloat(calculo.filamento.costoMaterialSolo) || 0;
      }
    }
    
    const manoObra = parseFloat(calculo.manoObra.costoTotalManoObra) || 0;
    const extra = parseFloat(calculo.avanzados.totalMaterialesExtra) || 0;
    const luz = parseFloat(calculo.avanzados.costoLuz) || 0;
    return (filamento + manoObra + extra + luz).toFixed(2);
  };

  // Guardar cálculo en Firestore optimizado
  const guardarEnBaseDeDatos = async () => {
    if (!calculo.nombre.trim()) {
      showCustomAlert('Error', 'Por favor ingresa un nombre para el cálculo', 'error');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      showCustomAlert('Error', 'Debes iniciar sesión para guardar cálculos', 'error');
      return;
    }
    
    showCustomAlert('Guardando', 'Guardando cálculo...', 'info');
    
    try {
      const fecha = new Date();
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const nuevoCalculo = {
        ...calculo,
        fecha: fecha.toISOString(),
        fechaFormateada: fechaFormateada,
        costoTotal: getTotal(),
        esMultifilamento: esMultifilamento,
      };
      
      // Guardar en la colección correspondiente
      if (proyectoSeleccionado) {
        await addDoc(collection(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones'), nuevoCalculo);
      } else {
      await addDoc(collection(db, 'usuarios', user.uid, 'calculos'), nuevoCalculo);
      }
      
      // Restar gramos utilizados de los materiales
      await actualizarCantidadesMateriales();
      
      showCustomAlert('✅ ¡Cálculo guardado!', `El cálculo "${calculo.nombre}" se guardó exitosamente.\n\n💵 Total: $${getTotal()} MXN\n\nPuedes consultar este cálculo en el historial de impresiones.`, 'success');
      
      // Limpiar formulario
      limpiarFormulario();
      
    } catch (error) {
      showCustomAlert('Error', 'No se pudo guardar el cálculo. Intenta de nuevo.', 'error');
    }
  };

  // Función para actualizar cantidades de materiales
  const actualizarCantidadesMateriales = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!descontarCantidad) return; // Si no se debe descontar, salir

    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      // Restar cantidades de múltiples materiales
      for (const material of calculo.materialesMultiples) {
        if (!material?.id) continue;
        
        const categoria = material.categoria;
        let cantidadUsada = 0;
        
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            cantidadUsada = parseFloat(material.gramosUtilizados || '0');
            break;
          case 'Pintura':
            cantidadUsada = parseFloat(material.cantidadPintura || '0');
            break;
          case 'Aros de llavero':
            cantidadUsada = parseFloat(material.cantidadLlaveros || '0');
            break;
          default:
            cantidadUsada = parseFloat(material.cantidadUtilizada || '0');
        }
        
        if (!isNaN(cantidadUsada) && cantidadUsada > 0) {
          const mat = materialesGuardados.find((m: any) => m.id === material.id);
          if (mat) {
            // Obtener la cantidad actual según el tipo de material
            let cantidadActual = 0;
            if (categoria === 'Filamento' || categoria === 'Resina') {
              cantidadActual = parseFloat(mat.cantidadRestante ?? mat.pesoBobina ?? mat.peso ?? '0');
            } else if (categoria === 'Pintura') {
              cantidadActual = parseFloat(mat.cantidadRestante ?? mat.cantidad ?? '0');
            } else {
              // Para llaveros y categorías personalizadas
              cantidadActual = parseFloat(mat.cantidadRestante ?? mat.cantidad ?? '0');
            }
            
            if (!isNaN(cantidadActual)) {
              let nuevaCantidadRestante = cantidadActual - cantidadUsada;
              if (nuevaCantidadRestante < 0) nuevaCantidadRestante = 0;
              
              // Actualizar el inventario
              await updateDoc(
                doc(db, 'usuarios', user.uid, 'materiales', material.id),
                { cantidadRestante: nuevaCantidadRestante.toString() }
              );
              
              // Guardar la cantidad restante histórica en el material del cálculo
              material.cantidadRestante = nuevaCantidadRestante.toString();
            }
          }
        }
      }
    } else if (!esMultifilamento && calculo.materialSeleccionado.id && calculo.filamento.gramosUtilizados) {
      // Restar cantidades de material único
        const materialId = calculo.materialSeleccionado.id;
        const gramosUsados = parseFloat(calculo.filamento.gramosUtilizados);
        if (!isNaN(gramosUsados) && gramosUsados > 0) {
          const mat = materialesGuardados.find((m: any) => m.id === materialId);
        if (mat) {
          // Obtener la cantidad actual según el tipo de material
          const categoria = mat.categoria;
          let cantidadActual = 0;
          if (categoria === 'Filamento' || categoria === 'Resina') {
            cantidadActual = parseFloat(mat.cantidadRestante ?? mat.pesoBobina ?? mat.peso ?? '0');
          } else if (categoria === 'Pintura') {
            cantidadActual = parseFloat(mat.cantidadRestante ?? mat.cantidad ?? '0');
          } else {
            cantidadActual = parseFloat(mat.cantidadRestante ?? mat.cantidad ?? '0');
          }
          
          if (!isNaN(cantidadActual)) {
            let nuevaCantidadRestante = cantidadActual - gramosUsados;
              if (nuevaCantidadRestante < 0) nuevaCantidadRestante = 0;
            
            // Actualizar el inventario
              await updateDoc(
                doc(db, 'usuarios', user.uid, 'materiales', materialId),
                { cantidadRestante: nuevaCantidadRestante.toString() }
              );
            
            // Guardar la cantidad restante histórica en el material seleccionado
            setCalculo(prev => ({
              ...prev,
              materialSeleccionado: {
                ...prev.materialSeleccionado,
                cantidadRestante: nuevaCantidadRestante.toString()
              }
            }));
          }
        }
      }
    }
  };

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
      setCalculo({
        nombre: '',
        usuario: '',
        materialSeleccionado: {
          id: '',
          nombre: '',
          tipo: '',
          subtipo: '',
          color: '',
        },
      materialesMultiples: [],
        detallesImpresion: {
          relleno: '',
          tiempoImpresion: '',
          temperatura: '',
          velocidad: '',
          alturaCapa: '',
          notas: '',
        },
        filamento: {
          tipo: '',
          subtipo: '',
          precioBobina: '',
          pesoBobina: '',
        gramosUtilizados: '0',
        costoFilamento: '0',
        costoMaterialSolo: '0',
        },
        manoObra: {
          preparacionTiempo: '',
          preparacionCosto: '',
        costoTotalManoObra: '0',
        },
        avanzados: {
          arosLlavero: '',
          imanes: '',
          otrosMateriales: '',
          consumoKwh: '',
          costoKwh: '',
          costoLuz: '0',
        horasimpresion: '0',
          totalMaterialesExtra: '0',
        },
        fecha: new Date().toISOString(),
      });
      setMaterialSeleccionado('');
    setEsMultifilamento(false);
    setCantidadMateriales(1);
      setMostrarDetallesImpresion(false);
  };

  // Cálculo del precio de venta con ganancia
  const getPrecioVenta = () => {
    const produccion = parseFloat(getProduccion()) || 0;
    return (produccion * (1 + porcentajeGanancia / 100)).toFixed(2);
  };

  // Función para mostrar alertas personalizadas
  const showCustomAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null);
  const [crearProyectoModal, setCrearProyectoModal] = useState(false);
  const [nuevoProyectoNombre, setNuevoProyectoNombre] = useState('');
  const [proyectoAEliminar, setProyectoAEliminar] = useState<Proyecto | null>(null);
  const [modalEliminarProyecto, setModalEliminarProyecto] = useState(false);

  // Función para obtener la unidad según el tipo de material (para el componente principal)
  const getUnidadMaterialPrincipal = (categoria: string) => {
    switch (categoria) {
      case 'Filamento':
      case 'Resina':
        return 'g';
      case 'Pintura':
        return 'ml';
      case 'Aros de llavero':
        return ' unidades';
      default:
        // Para categorías personalizadas, usar unidades por defecto
        return ' unidades';
    }
  };

  // Componente para renderizar material individual
  const renderMaterialCard = (mat: any, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={mat.id}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isSelected ? '#00e676' : '#222',
        borderColor: isSelected ? '#00e676' : '#333',
        borderWidth: 2,
        borderRadius: 16,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginHorizontal: 4,
        minHeight: 40,
        maxWidth: '48%',
      }}
      onPress={onPress}
    >
      <View style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: mat.color || '#00e676',
        borderWidth: 1,
        borderColor: '#333',
        marginRight: 6,
      }} />
      <View style={{ flexShrink: 1 }}>
        <Text style={{
          color: isSelected ? '#222' : '#fff',
          fontWeight: isSelected ? 'bold' : 'normal',
          fontSize: 12,
          flexWrap: 'wrap',
        }} numberOfLines={1} ellipsizeMode="tail">{mat.nombre}</Text>
        <Text style={{ color: '#a0a0a0', fontSize: 10 }} numberOfLines={1} ellipsizeMode="tail">{mat.subtipo}</Text>
        <View style={{ flexDirection: 'row', marginTop: 2 }}>
          <Text style={{ color: '#00e676', fontSize: 9, marginRight: 8 }}>
            Restante: {(typeof mat.cantidadRestante !== 'undefined' ? mat.cantidadRestante : mat.cantidad || '0')}
          </Text>
          <Text style={{ color: '#ffd600', fontSize: 9 }}>
            ${(() => {
              const categoria = mat.categoria || 'Filamento';
              switch (categoria) {
                case 'Pintura':
                case 'Aros de llavero':
                  return mat.precio || '0';
                case 'Filamento':
                case 'Resina':
                default:
                  return mat.precioBobina || mat.precio || '0';
              }
            })()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Componente para renderizar grupo de materiales
  const renderMaterialGroup = (tipo: string, materiales: any[]) => {
    const filas = [];
    for (let i = 0; i < materiales.length; i += 2) {
      filas.push(materiales.slice(i, i + 2));
    }

  return (
      <View key={tipo} style={{ marginBottom: 8 }}>
        <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>{tipo}</Text>
        {filas.map((fila, idx) => (
          <View key={idx} style={{ flexDirection: 'row', marginBottom: 4, justifyContent: 'center', alignSelf: 'center', maxWidth: 340, width: '100%' }}>
            {fila.map((mat) => renderMaterialCard(mat, materialSeleccionado === mat.id, () => handleSeleccionMaterial(mat.id)))}
            {fila.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>
    );
  };

  // Agrupar materiales por tipo
  const agruparMaterialesPorTipo = () => {
    const matsPorTipo: { [tipo: string]: any[] } = {};
    materialesGuardados.forEach(mat => {
      const tipo = mat.tipo || 'Sin tipo';
      if (!matsPorTipo[tipo]) matsPorTipo[tipo] = [];
      matsPorTipo[tipo].push(mat);
    });
    return matsPorTipo;
  };

  // Renderizar selector de materiales
  const renderSelectorMateriales = () => {
    if (loadingMateriales) {
      return <ActivityIndicator size="small" color="#00e676" style={{ marginVertical: 10 }} />;
    }
    
    if (errorMateriales) {
      return <Text style={{ color: 'red', textAlign: 'center', marginVertical: 10 }}>{errorMateriales}</Text>;
    }
    
    if (materialesGuardados.length === 0) {
      return <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 10 }}>No hay materiales guardados.</Text>;
    }
    
    return Object.entries(agruparMaterialesPorTipo()).map(([tipo, materiales]) => 
      renderMaterialGroup(tipo, materiales)
    );
  };

  // Renderizar botones de ver más/menos
  const renderBotonesVerMas = () => {
    if (cargandoMateriales || errorMateriales || materialesGuardados.length <= 5) return null;
    
    return (
      <TouchableOpacity
        style={{
          backgroundColor: '#181818',
          borderColor: verMasMateriales ? '#e53935' : '#00e676',
          borderWidth: 2,
          borderRadius: 20,
          paddingVertical: 8,
          paddingHorizontal: 14,
          marginRight: 8,
          marginBottom: 8,
          marginTop: 16,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
        }}
        onPress={() => setVerMasMateriales(!verMasMateriales)}
      >
        <Text style={{ 
          color: verMasMateriales ? '#e53935' : '#00e676', 
          fontWeight: 'bold', 
          fontSize: 14 
        }}>
          {verMasMateriales ? 'Ver menos...' : 'Ver más...'}
        </Text>
      </TouchableOpacity>
    );
  };

  // 1. Estado para controlar si se descuenta la cantidad
  const [descontarCantidad, setDescontarCantidad] = useState(true);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0d0d0d' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
    <ScrollView style={styles.container}>

        {/* Encabezado */}
        <View style={styles.header}>
          {/* Encabezado sin nombre de usuario */}
        </View>

        {/* Campo de nombre del cálculo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOMBRE DEL CÁLCULO</Text>
          <Text style={styles.label}>Nombre del proyecto o cálculo <Text style={styles.requiredText}>*</Text></Text>
          <TextInput
            style={[styles.input, !calculo.nombre.trim() && styles.inputRequired]}
            value={calculo.nombre}
            onChangeText={(text) => setCalculo(prev => ({ ...prev, nombre: text }))}
            placeholder="Ej: Llavero personalizado, Pieza de repuesto, etc."
            placeholderTextColor="#666"
          />
          {!calculo.nombre.trim() && (
            <Text style={styles.requiredMessage}>El nombre del proyecto es obligatorio</Text>
          )}
        </View>

          {/* Nueva sección: Multifilamento/Multimaterial */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MULTIFILAMENTO / MULTIMATERIAL</Text>
            <Text style={styles.label}>¿Usar múltiples materiales/colores?</Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !esMultifilamento && styles.toggleButtonActive
                ]}
                onPress={() => setEsMultifilamento(false)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  !esMultifilamento && styles.toggleButtonTextActive
                ]}>Material único</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  esMultifilamento && styles.toggleButtonActive
                ]}
                onPress={() => setEsMultifilamento(true)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  esMultifilamento && styles.toggleButtonTextActive
                ]}>Múltiples materiales</Text>
              </TouchableOpacity>
            </View>

            {esMultifilamento && (
              <>
                <Text style={styles.label}>Cantidad de materiales/colores diferentes:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setCantidadMateriales(Math.max(1, cantidadMateriales - 1))}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{cantidadMateriales}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setCantidadMateriales(Math.min(10, cantidadMateriales + 1))}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Lista de materiales múltiples */}
                <Text style={styles.label}>Materiales seleccionados:</Text>
                {Array.from({ length: cantidadMateriales }, (_, index) => (
                  <MaterialMultipleSelector
                    key={index}
                    index={index}
                    materialesGuardados={materialesGuardados}
                    onMaterialChange={(materialIndex, material) => {
                      const nuevosMateriales = [...(calculo.materialesMultiples || [])];
                      
                      nuevosMateriales[materialIndex] = {
                        ...material,
                        gramosUtilizados: material.gramosUtilizados !== undefined ? material.gramosUtilizados : '0',
                        // Asegurar que se preserven los datos del material
                        precioBobina: material.precioBobina || material.precio,
                        pesoBobina: material.pesoBobina || material.peso,
                        cantidadRestante: material.cantidadRestante || material.cantidad,
                      };
                      
                      setCalculo(prev => ({
                        ...prev,
                        materialesMultiples: nuevosMateriales
                      }));
                      
                      // Calcular el costo del filamento después de actualizar los materiales
                      setTimeout(() => {
                        calcularCostoFilamento();
                      }, 100);
                    }}
                    materialSeleccionado={calculo.materialesMultiples?.[index] || null}
                  />
                ))}
              </>
            )}
          </View>
          {/* Selección de proyecto/carpeta (mover aquí, justo después del nombre) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROYECTO / CARPETA</Text>
            {proyectos.length === 0 ? (
              <Text style={{ color: '#a0a0a0', marginBottom: 8 }}>No hay proyectos. Crea uno nuevo.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {proyectos.map((proy) => (
                  <View key={proy.id} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 8 }}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: proyectoSeleccionado?.id === proy.id ? '#00e676' : '#222',
                        borderColor: proyectoSeleccionado?.id === proy.id ? '#00e676' : '#333',
                        borderWidth: 2,
                        borderRadius: 16,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        marginRight: 4,
                      }}
                      onPress={() => setProyectoSeleccionado(proy)}
                    >
                      <Text style={{ color: proyectoSeleccionado?.id === proy.id ? '#222' : '#fff', fontWeight: 'bold' }}>{proy.nombre}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => {
                      setProyectoAEliminar(proy);
                      setModalEliminarProyecto(true);
                    }} style={{ marginLeft: 0, padding: 2 }}>
                      <Text style={{ color: '#ffd600', fontWeight: 'bold', fontSize: 18 }}>⧉</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={{ backgroundColor: '#181818', borderColor: '#00e676', borderWidth: 2, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}
              onPress={() => setCrearProyectoModal(true)}
            >
              <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 14 }}>+ Nuevo proyecto</Text>
            </TouchableOpacity>
          </View>


          {/* Información de Múltiples Materiales */}
          {esMultifilamento && calculo.materialesMultiples && calculo.materialesMultiples.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MATERIALES SELECCIONADOS</Text>
              {calculo.materialesMultiples.map((material, index) => (
                material && (
                  <View key={index} style={[styles.materialInfoContainer, { marginBottom: 12, padding: 12, backgroundColor: '#222', borderRadius: 8 }]}>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: material.color || '#00e676',
                      borderWidth: 2,
                      borderColor: '#333',
                      marginRight: 12,
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.materialName}>{material.nombre}</Text>
                      <Text style={styles.materialInfoDetails}>
                        {material.tipo} - {material.subtipo}
                      </Text>
                      <Text style={styles.materialInfoDetails}>
                        {(() => {
                          switch (material.categoria) {
                            case 'Pintura':
                              return `Mililitros: ${material.cantidadPintura || '0'}ml`;
                            case 'Aros de llavero':
                              return `Cantidad: ${material.cantidadLlaveros || '0'} unidades`;
                            case 'Filamento':
                            case 'Resina':
                            default:
                              return `Gramos: ${material.gramosUtilizados || '0'}g`;
                          }
                        })()}
                      </Text>
                      {/* Información contextual del material múltiple */}
                      <Text style={[styles.materialInfoDetails, { color: '#00e676' }]}>
                        Cantidad restante: {(typeof material.cantidadRestante !== 'undefined' ? material.cantidadRestante : material.cantidad || '0')}
                      </Text>
                      <Text style={[styles.materialInfoDetails, { color: '#ffd600' }]}>
                        Precio: ${(() => {
                          const categoria = material.categoria || 'Filamento';
                          switch (categoria) {
                            case 'Pintura':
                            case 'Aros de llavero':
                              return material.precio || '0';
                            case 'Filamento':
                            case 'Resina':
                            default:
                              return material.precioBobina || material.precio || '0';
                          }
                        })()} MXN
                      </Text>
                    </View>
                  </View>
                )
              ))}
            </View>
          )}


        {/* Sección de Detalles de Impresión */}
        <View style={styles.section}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
            <Text style={styles.sectionTitle}>DETALLES DE IMPRESIÓN</Text>
            <TouchableOpacity
              style={styles.secondaryToggleBtn}
              onPress={() => setMostrarDetallesImpresion(!mostrarDetallesImpresion)}
            >
              <Text style={styles.secondaryToggleText}>{mostrarDetallesImpresion ? 'Ocultar' : 'Mostrar'}</Text>
            </TouchableOpacity>
          </View>
          
          {mostrarDetallesImpresion && (
            <>
              <Text style={styles.label}>Porcentaje de relleno (%)</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.relleno}
                onChangeText={(text) => handleDetallesImpresionChange('relleno', text)}
                placeholder="Ej: 20"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Tiempo de impresión (horas)</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.tiempoImpresion}
                onChangeText={(text) => handleDetallesImpresionChange('tiempoImpresion', text)}
                placeholder="Ej: 3.5"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Temperatura (°C)</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.temperatura}
                onChangeText={(text) => handleDetallesImpresionChange('temperatura', text)}
                placeholder="Ej: 200"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Velocidad de impresión (mm/s)</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.velocidad}
                onChangeText={(text) => handleDetallesImpresionChange('velocidad', text)}
                placeholder="Ej: 60"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Altura de capa (mm)</Text>
              <TextInput
                style={styles.input}
                value={calculo.detallesImpresion.alturaCapa}
                onChangeText={(text) => handleDetallesImpresionChange('alturaCapa', text)}
                placeholder="Ej: 0.2"
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Notas adicionales</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={calculo.detallesImpresion.notas}
                onChangeText={(text) => handleDetallesImpresionChange('notas', text)}
                placeholder="Ej: Soporte necesario, configuración especial, etc."
                placeholderTextColor="#666"
                multiline
              />
            </>
          )}
        </View>

        {/* Sección de Filamento */}
          {!esMultifilamento && (
        <View style={styles.section}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>

            {/* cuadro general de calculo de filamento */}
            <Text style={styles.sectionTitle}>CÁLCULO DE FILAMENTO</Text>

          </View>
          <Text style={styles.label}>Seleccionar material guardado</Text>

              {/* Selector de material guardado optimizado */}
          <View style={{ flexDirection: 'column', flexWrap: 'wrap', marginBottom: 8 }}>
                {renderSelectorMateriales()}
                {renderBotonesVerMas()}
          </View>

          {/* Selector de subtipo de filamento */}
          {(() => {
            const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
            if (mat?.categoria === 'Filamento') {
              return (
                <>
                  {calculo.filamento.tipo && (
                    <>
                      <Text style={styles.label}>Subtipo de filamento</Text>
                      <View style={styles.pastillasContainer}>
                        {(subtiposFilamento.find(t => t.tipo === calculo.filamento.tipo)?.subtipos || []).map((sub, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.pastilla,
                              calculo.filamento.subtipo === sub && styles.pastillaSeleccionada
                            ]}
                            onPress={() => handleFilamentoChange('subtipo', sub)}
                          >
                            <Text style={[
                              styles.pastillaTexto,
                              calculo.filamento.subtipo === sub && styles.pastillaTextoSeleccionada
                            ]}>{sub}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  <Text style={styles.label}>Tipo de filamento</Text>
                  <View style={styles.pastillasContainer}>
                    {tiposFilamento.map((tipo, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.pastilla,
                          calculo.filamento.tipo === tipo && styles.pastillaSeleccionada
                        ]}
                        onPress={() => handleFilamentoChange('tipo', tipo)}
                      >
                        <Text style={[
                          styles.pastillaTexto,
                          calculo.filamento.tipo === tipo && styles.pastillaTextoSeleccionada
                        ]}>{tipo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              );
            }
            return null;
          })()}

          
              <Text style={styles.label}>Precio del material (MXN)</Text>
              <View style={styles.infoDisplayContainer}>
                <View style={styles.infoDisplayRow}>
                  <Ionicons name="cash-outline" size={16} color="#ffd600" />
                  <Text style={styles.infoDisplayText}>
                    ${calculo.filamento.precioBobina || '0.00'} MXN
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>
                {(() => {
                  const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                  const categoria = mat?.categoria || 'Filamento';
                  switch (categoria) {
                    case 'Filamento':
                      return 'Peso de la bobina (gramos)';
                    case 'Resina':
                      return 'Peso de la resina (gramos)';
                    case 'Pintura':
                      return 'Cantidad total (ml)';
                    case 'Aros de llavero':
                      return 'Cantidad disponible (unidades)';
                    default:
                      return 'Cantidad restante (unidades)';
                  }
                })()}
              </Text>
              <View style={styles.infoDisplayContainer}>
                <View style={styles.infoDisplayRow}>
                  <Ionicons name="scale-outline" size={16} color="#00e676" />
                  <Text style={styles.infoDisplayText}>
                    {(() => {
                      const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                      const categoria = mat?.categoria || 'Filamento';
                      const cantidadDisponible = (typeof mat?.cantidadRestante !== 'undefined' ? mat.cantidadRestante : mat?.cantidad || '0');
                      switch (categoria) {
                        case 'Filamento':
                        case 'Resina':
                          return `${cantidadDisponible} gramos`;
                        case 'Pintura':
                          return `${cantidadDisponible} ml`;
                        case 'Aros de llavero':
                          return `${cantidadDisponible} unidades`;
                        default:
                          return `${cantidadDisponible} unidades`;
                      }
                    })()}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>
                {(() => {
                  const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                  const categoria = mat?.categoria || 'Filamento';
                  switch (categoria) {
                    case 'Pintura':
                      return 'Mililitros utilizados';
                    case 'Aros de llavero':
                      return 'Cantidad utilizada';
                    case 'Filamento':
                    case 'Resina':
                    default:
                      return 'Gramos utilizados';
                  }
                })()}
              </Text>
          <TextInput
            style={styles.input}
            value={calculo.filamento.gramosUtilizados}
            onChangeText={(text) => handleFilamentoChange('gramosUtilizados', text)}
            onBlur={calcularCostoFilamento}
            placeholder={descontarCantidad ? ((() => {
              const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
              const categoria = mat?.categoria || 'Filamento';
              switch (categoria) {
                case 'Pintura':
                  return 'Ej: 50';
                case 'Aros de llavero':
                  return 'Ej: 5';
                case 'Filamento':
                case 'Resina':
                default:
                  return 'Ej: 40';
              }
            })()) : 'No aplica para este material'}
            keyboardType="numeric"
            editable={descontarCantidad}
          />
          
          <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Costo total del material:</Text>
            <Text style={styles.resultValue}>${calculo.filamento.costoFilamento} MXN</Text>
                <Text style={styles.detailText}>
                  Para {(() => {
                    const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                    const categoria = mat?.categoria || 'Filamento';
                    const cantidad = calculo.filamento.gramosUtilizados;
                    switch (categoria) {
                      case 'Pintura':
                        return `${cantidad}ml`;
                      case 'Aros de llavero':
                        return `${cantidad} unidades`;
                      case 'Filamento':
                      case 'Resina':
                      default:
                        return `${cantidad}g`;
                    }
                  })()} utilizados
                </Text>
              </View>
            </View>
          )}

                    {/* Información del Material Seleccionado */}
                    {!esMultifilamento && calculo.materialSeleccionado.id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MATERIAL SELECCIONADO</Text>
            <View style={styles.materialInfoContainer}>
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: calculo.materialSeleccionado.color || '#00e676',
                borderWidth: 2,
                borderColor: '#333',
                marginRight: 12,
              }} />
              <View style={{ flex: 1 }}>
                  <Text style={styles.materialInfoName}>{calculo.materialSeleccionado.nombre}</Text>
                  <Text style={styles.materialInfoDetails}>
                  {calculo.materialSeleccionado.tipo} - {calculo.materialSeleccionado.subtipo}
                </Text>
                  <Text style={styles.materialInfoDetails}>
                  Color: {calculo.materialSeleccionado.color || 'No especificado'}
                  </Text>
                  {/* Información contextual del material seleccionado */}
                  {(() => {
                    const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                    if (mat) {
                      return (
                        <View style={{ marginTop: 4 }}>
                          <Text style={[styles.materialInfoDetails, { color: '#00e676' }]}>
                            Cantidad restante: {(typeof mat.cantidadRestante !== 'undefined' ? mat.cantidadRestante : mat.cantidad || '0')}
                          </Text>
                          <Text style={[styles.materialInfoDetails, { color: '#ffd600' }]}>
                            Precio: ${(() => {
                              const categoria = mat.categoria || 'Filamento';
                              switch (categoria) {
                                case 'Pintura':
                                case 'Aros de llavero':
                                  return mat.precio || '0';
                                case 'Filamento':
                                case 'Resina':
                                default:
                                  return mat.precioBobina || mat.precio || '0';
                              }
                            })()} MXN
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
              </View>
            </View>
          </View>
        )}

          {/* Botón de opciones avanzadas */}
          <View style={styles.section}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
              <Text style={styles.sectionTitle}>OPCIONES AVANZADAS</Text>
              <TouchableOpacity
                style={styles.advancedToggleBtn} 
                onPress={() => setMostrarAvanzado(!mostrarAvanzado)}
              >
                <Text style={styles.advancedToggleText}>{mostrarAvanzado ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
          </View>
        </View>

        {/* Opciones avanzadas */}
        {mostrarAvanzado && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COSTOS AVANZADOS</Text>
            <Text style={styles.label}>Otros materiales (MXN)</Text>
            <TextInput
              style={styles.input}
              value={calculo.avanzados.otrosMateriales}
              onChangeText={(text) => handleAvanzadoChange('otrosMateriales', text)}
              placeholder="Ej: 2.00"
              keyboardType="numeric"
            />
            <Text style={styles.label}>Consumo de luz (kWh)</Text>
            <TextInput
              style={styles.input}
              value={calculo.avanzados.consumoKwh}
              onChangeText={(text) => handleAvanzadoChange('consumoKwh', text)}
              placeholder="Ej: 0.5"
              keyboardType="numeric"
            />
            <Text style={styles.label}>Costo por kWh (MXN)</Text>
            <TextInput
              style={styles.input}
              value={calculo.avanzados.costoKwh}
              onChangeText={(text) => handleAvanzadoChange('costoKwh', text)}
              placeholder="Ej: 2.5"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Horas de impresion (horas)</Text>
            <TextInput
              style={styles.input}
              value={calculo.avanzados.horasimpresion}
              onChangeText={(text) => handleAvanzadoChange('horasimpresion', text)}
              placeholder="Ej: 60"
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.calculateButton} onPress={calcularAvanzado}>
              <Text style={styles.calculateButtonText}>Calcular avanzados</Text>
            </TouchableOpacity>
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Total materiales extra: <Text style={styles.costoBasico}>${calculo.avanzados.totalMaterialesExtra} MXN</Text></Text>
              <Text style={styles.resultLabel}>Costo de luz: <Text style={styles.costoBasico}>${calculo.avanzados.costoLuz} MXN</Text></Text>
            </View>
          </View>
        )}

        {/* Sección de Mano de Obra */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CÁLCULO DE MANO DE OBRA</Text>
          <Text style={styles.subsectionTitle}>Preparación de la impresión</Text>
          <Text style={styles.label}>Tiempo (horas)</Text>
          <TextInput
            style={styles.input}
            value={calculo.manoObra.preparacionTiempo}
            onChangeText={(text) => handleManoObraChange('preparacionTiempo', text)}
            placeholder="Ej: 2"
            keyboardType="numeric"
          />
          <Text style={styles.label}>Coste por hora (MXN)</Text>
          <TextInput
            style={styles.input}
            value={calculo.manoObra.preparacionCosto}
            onChangeText={(text) => handleManoObraChange('preparacionCosto', text)}
            placeholder="Ej: 150.00"
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.calculateButton} onPress={calcularManoObra}>
            <Text style={styles.calculateButtonText}>Calcular mano de obra</Text>
          </TouchableOpacity>
        </View>

        {/* Resumen total de costos */}
        <View style={[styles.section, styles.totalSection]}>
          <Text style={styles.sectionTitle}>RESUMEN DE COSTOS</Text>
          {/* Barra de porcentaje de ganancia */}
          <View style={{marginBottom: 20, flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{color: '#fff', fontSize: 15, marginRight: 8}}>Porcentaje de ganancia:</Text>
            <TextInput
              style={{
                color: '#00e676',
                fontWeight: 'bold',
                backgroundColor: '#181818',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#00e676',
                paddingHorizontal: 10,
                paddingVertical: 4,
                width: 60,
                textAlign: 'center',
                fontSize: 15,
              }}
              value={porcentajeGanancia.toString()}
              onChangeText={text => {
                // Solo permitir números
                const num = text.replace(/[^0-9]/g, '');
                setPorcentajeGanancia(num === '' ? 0 : parseInt(num));
              }}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={{color: '#00e676', fontWeight: 'bold', marginLeft: 4}}>%</Text>
          </View>
          {/* Información del material */}
            {!esMultifilamento && calculo.materialSeleccionado.id && (
            <View style={styles.summaryMaterialContainer}>
              <Text style={styles.summarySectionTitle}>📦 MATERIAL UTILIZADO</Text>
              <View style={styles.summaryMaterialInfo}>
                <View style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: calculo.materialSeleccionado.color || '#00e676',
                  borderWidth: 1,
                  borderColor: '#333',
                  marginRight: 8,
                }} />
                <Text style={styles.summaryMaterialText}>
                  {calculo.materialSeleccionado.nombre} ({calculo.materialSeleccionado.tipo} - {calculo.materialSeleccionado.subtipo})
                </Text>
              </View>
              <Text style={styles.summaryDetailText}>
                  {(() => {
                    const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
                    const categoria = mat?.categoria || 'Filamento';
                    const cantidad = calculo.filamento.gramosUtilizados;
                    
                    switch (categoria) {
                      case 'Pintura':
                        return `Mililitros utilizados: ${cantidad}ml`;
                      case 'Aros de llavero':
                        return `Cantidad utilizada: ${cantidad} unidades`;
                      case 'Filamento':
                      case 'Resina':
                      default:
                        return `Gramos utilizados: ${cantidad}g`;
                    }
                  })()}
              </Text>
            </View>
          )}

            {/* Información de múltiples materiales */}
            {esMultifilamento && calculo.materialesMultiples && calculo.materialesMultiples.length > 0 && (
              <View style={styles.summaryMaterialContainer}>
                <Text style={styles.summarySectionTitle}>📦 MATERIALES UTILIZADOS</Text>
                {calculo.materialesMultiples.map((material, index) => (
                  material && (
                    <View key={index} style={[styles.summaryMaterialInfo, { marginBottom: 8 }]}>
                      <View style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: material.color || '#00e676',
                        borderWidth: 1,
                        borderColor: '#333',
                        marginRight: 8,
                      }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryMaterialText}>
                          {material.nombre} ({material.tipo} - {material.subtipo})
                        </Text>
                        <Text style={styles.summaryDetailText}>
                          {(() => {
                            switch (material.categoria) {
                              case 'Pintura':
                                return `Mililitros utilizados: ${material.cantidadPintura || '0'}ml`;
                              case 'Aros de llavero':
                                return `Cantidad utilizada: ${material.cantidadLlaveros || '0'} unidades`;
                              case 'Filamento':
                              case 'Resina':
                              default:
                                return `Gramos utilizados: ${material.gramosUtilizados || '0'}g`;
                            }
                          })()}
                        </Text>
                        {/* Información contextual del material múltiple */}
                        <Text style={[styles.materialInfoDetails, { color: '#00e676' }]}>
                          Cantidad restante: {(typeof material.cantidadRestante !== 'undefined' ? material.cantidadRestante : material.cantidad || '0')}
                        </Text>
                        <Text style={[styles.materialInfoDetails, { color: '#ffd600' }]}>
                          Precio: ${material.precioBobina || material.precio || '0'} MXN
                        </Text>
                      </View>
                    </View>
                  )
                ))}
              </View>
            )}

          {/* Detalles de impresión si están disponibles */}
          {mostrarDetallesImpresion && (calculo.detallesImpresion.relleno || calculo.detallesImpresion.tiempoImpresion) && (
            <View style={styles.summaryDetailsContainer}>
              <Text style={styles.summarySectionTitle}>⚙️ CONFIGURACIÓN DE IMPRESIÓN</Text>
              {calculo.detallesImpresion.relleno && (
                <Text style={styles.summaryDetailText}>Relleno: {calculo.detallesImpresion.relleno}%</Text>
              )}
              {calculo.detallesImpresion.tiempoImpresion && (
                <Text style={styles.summaryDetailText}>Tiempo: {calculo.detallesImpresion.tiempoImpresion}h</Text>
              )}
              {calculo.detallesImpresion.temperatura && (
                <Text style={styles.summaryDetailText}>Temperatura: {calculo.detallesImpresion.temperatura}°C</Text>
              )}
              {calculo.detallesImpresion.velocidad && (
                <Text style={styles.summaryDetailText}>Velocidad: {calculo.detallesImpresion.velocidad} mm/s</Text>
              )}
              {calculo.detallesImpresion.alturaCapa && (
                <Text style={styles.summaryDetailText}>Altura de capa: {calculo.detallesImpresion.alturaCapa}mm</Text>
              )}
              {calculo.detallesImpresion.notas && (
                <Text style={styles.summaryDetailText}>Notas: {calculo.detallesImpresion.notas}</Text>
              )}
            </View>
          )}

          {/* Costos */}
          <View style={styles.summaryCostsContainer}>
            <Text style={styles.summarySectionTitle}>💰 DESGLOSE DE COSTOS</Text>
            <Text style={styles.resumenLabel}>Materiales: <Text style={styles.costoBasico}>${calculo.filamento.costoMaterialSolo} MXN</Text></Text>
            <Text style={styles.resumenLabel}>Mano de obra: <Text style={styles.costoBasico}>${calculo.manoObra.costoTotalManoObra} MXN</Text></Text>
            <Text style={styles.resumenLabel}>Materiales extra: <Text style={styles.costoBasico}>${calculo.avanzados.totalMaterialesExtra} MXN</Text></Text>
            <Text style={styles.resumenLabel}>Luz: <Text style={styles.costoBasico}>${calculo.avanzados.costoLuz} MXN</Text></Text>
          </View>

          {/* Totales */}
          <View style={styles.finalTotalsContainer}>
            <Text style={[styles.resumenLabel, {color: '#e53935'}]}>Costo de producción: <Text style={styles.costoProduccion}>${getProduccion()} MXN</Text></Text>
            <Text style={[styles.resumenLabel, {color: '#00e676'}]}>Precio de venta: <Text style={styles.costoVenta}>${getPrecioVenta()} MXN</Text></Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={guardarEnBaseDeDatos}>
          <Text style={styles.saveButtonText}>GUARDAR CÁLCULO</Text>
        </TouchableOpacity>

        {/* Botón para registrar fallo de impresión */}
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#e53935', marginTop: 10 }]} onPress={async () => {
          if (!calculo.nombre.trim()) {
            showCustomAlert('Error', 'Por favor ingresa un nombre para el cálculo', 'error');
            return;
          }
          const user = auth.currentUser;
          if (!user) {
            showCustomAlert('Error', 'Debes iniciar sesión para guardar cálculos', 'error');
            return;
          }
          showCustomAlert('Guardando', 'Registrando fallo...', 'info');
          try {
            const fecha = new Date();
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const nuevoCalculo = {
              ...calculo,
              fecha: fecha.toISOString(),
              fechaFormateada: fechaFormateada,
              costoTotal: getTotal(),
              fallo: true,
            };
              if (proyectoSeleccionado) {
                await addDoc(collection(db, 'usuarios', user.uid, 'proyectos', proyectoSeleccionado.id, 'impresiones'), nuevoCalculo);
              } else {
            await addDoc(collection(db, 'usuarios', user.uid, 'calculos'), nuevoCalculo);
              }
            showCustomAlert('❌ Impresión fallida', `El fallo de impresión fue registrado.`, 'error');
            // Limpiar el formulario después de guardar
            setCalculo({
              nombre: '',
              usuario: '',
              materialSeleccionado: {
                id: '',
                nombre: '',
                tipo: '',
                subtipo: '',
                color: '',
              },
                materialesMultiples: [],
              detallesImpresion: {
                relleno: '',
                tiempoImpresion: '',
                temperatura: '',
                velocidad: '',
                alturaCapa: '',
                notas: '',
              },
              filamento: {
                tipo: '',
                subtipo: '',
                precioBobina: '',
                pesoBobina: '',
                gramosUtilizados: '40',
                costoFilamento: '12',
                costoMaterialSolo: '10',
              },
              manoObra: {
                preparacionTiempo: '',
                preparacionCosto: '',
                costoTotalManoObra: '12',
              },
              avanzados: {
                arosLlavero: '',
                imanes: '',
                otrosMateriales: '',
                consumoKwh: '',
                costoKwh: '',
                costoLuz: '0',
                horasimpresion:'0',
                totalMaterialesExtra: '0',
              },
              fecha: new Date().toISOString(),
            });
            setMaterialSeleccionado('');
            setMostrarDetallesImpresion(false);
          } catch (error) {
            showCustomAlert('Error', 'No se pudo registrar el fallo. Intenta de nuevo.', 'error');
          }
        }}>
          <Text style={[styles.saveButtonText, { color: '#fff' }]}>REGISTRAR FALLO</Text>
        </TouchableOpacity>

        {/* Modal de alerta personalizada para web */}
        <Modal
          visible={showAlert}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlert(false)}
        >
          <View style={styles.alertOverlay}>
            <View style={[
              styles.alertContainer,
              alertType === 'success' && styles.alertSuccess,
              alertType === 'error' && styles.alertError,
              alertType === 'info' && styles.alertInfo,
            ]}>
              <Text style={styles.alertTitle}>{alertTitle}</Text>
              <Text style={styles.alertMessage}>{alertMessage}</Text>
              <TouchableOpacity
                style={[
                  styles.alertButton,
                  alertType === 'success' && styles.alertButtonSuccess,
                  alertType === 'error' && styles.alertButtonError,
                  alertType === 'info' && styles.alertButtonInfo,
                ]}
                onPress={() => setShowAlert(false)}
              >
                <Text style={[
                  styles.alertButtonText,
                  alertType === 'success' && { color: '#222' },
                  alertType === 'error' && { color: '#fff' },
                  alertType === 'info' && { color: '#fff' },
                ]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
          {/* Modal para crear proyecto */}
          <Modal
            visible={crearProyectoModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setCrearProyectoModal(false)}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
              <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350 }}>
                <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Nuevo proyecto</Text>
                <TextInput
                  style={{ backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 12 }}
                  value={nuevoProyectoNombre}
                  onChangeText={setNuevoProyectoNombre}
                  placeholder="Nombre del proyecto"
                  placeholderTextColor="#888"
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <TouchableOpacity onPress={() => setCrearProyectoModal(false)} style={{ backgroundColor: '#a0a0a0', borderRadius: 8, padding: 10, marginRight: 8 }}>
                    <Text style={{ color: '#222' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const user = auth.currentUser;
                      if (!user || !nuevoProyectoNombre.trim()) return;
                      try {
                        await addDoc(collection(db, 'usuarios', user.uid, 'proyectos'), {
                          nombre: nuevoProyectoNombre.trim(),
                          fechaCreacion: new Date().toISOString(),
                        });
                        setCrearProyectoModal(false);
                        setNuevoProyectoNombre('');
                        // Recargar proyectos
                        const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos'));
                        const datos: Proyecto[] = snapshot.docs.map(docSnap => {
                          const data = docSnap.data();
                          return {
                            id: docSnap.id,
                            nombre: data.nombre || '',
                            fechaCreacion: data.fechaCreacion,
                            archivado: data.archivado || false,
                          };
                        });
                        setProyectos(datos.filter(p => !p.archivado));
                      } catch (e) {}
                    }}
                    style={{ backgroundColor: '#00e676', borderRadius: 8, padding: 10 }}
                    disabled={!nuevoProyectoNombre.trim()}
                  >
                    <Text style={{ color: '#222', fontWeight: 'bold' }}>Crear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* Modal de confirmación para archivar proyecto */}
          <Modal
            visible={modalEliminarProyecto}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalEliminarProyecto(false)}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
              <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: '#ffd600', borderWidth: 2 }}>
                <Text style={{ color: '#ffd600', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>⧉ Archivar proyecto</Text>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
                  ¿Estás seguro de que quieres archivar el proyecto "{proyectoAEliminar?.nombre}"?
                </Text>
                <Text style={{ color: '#a0a0a0', fontSize: 14, marginBottom: 20 }}>
                  El proyecto no aparecerá más en la calculadora, pero podrás consultarlo o desarchivarlo desde el historial de impresiones.
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <TouchableOpacity onPress={() => setModalEliminarProyecto(false)} style={{ backgroundColor: '#a0a0a0', borderRadius: 8, padding: 10, marginRight: 8 }}>
                    <Text style={{ color: '#222' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!proyectoAEliminar) return;
                      const user = auth.currentUser;
                      if (!user) return;
                      await updateDoc(doc(db, 'usuarios', user.uid, 'proyectos', proyectoAEliminar.id), { archivado: true });
                      setModalEliminarProyecto(false);
                      setProyectoAEliminar(null);
                      // Recargar proyectos
                      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'proyectos'));
                      const datos: Proyecto[] = snapshot.docs.map(docSnap => {
                        const data = docSnap.data();
                        return {
                          id: docSnap.id,
                          nombre: data.nombre || '',
                          fechaCreacion: data.fechaCreacion,
                          archivado: data.archivado || false,
                        };
                      });
                      setProyectos(datos.filter(p => !p.archivado));
                      if (proyectoSeleccionado?.id === proyectoAEliminar.id) setProyectoSeleccionado(null);
                    }}
                    style={{ backgroundColor: '#ffd600', borderRadius: 8, padding: 10 }}
                  >
                    <Text style={{ color: '#222', fontWeight: 'bold' }}>Archivar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        {/* Espacio visual para la barra de tabs */}
        <View style={{ height: 70, backgroundColor: '#0d0d0d' }} />
      </ScrollView>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    padding: 16,
    marginTop: 30,
    paddingBottom: 70,
  },
  header: {
    marginBottom: 20,
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
  section: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionTitle: {
    color: '#00e676',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subsectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  label: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#181818',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: '#181818',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 5,
    overflow: 'hidden',
  },
  picker: {
    color: 'white',
    height: 50,
    backgroundColor: '#181818',
  },
  resultContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  resultLabel: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 4,
  },
  resultValue: {
    color: '#00e676',
    fontSize: 24,
    fontWeight: 'bold',
  },
  detailText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  totalSection: {
    borderColor: '#00e676',
    borderWidth: 1,
  },
  totalLabel: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  totalValue: {
    color: '#00e676',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#00e676',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 0,
    elevation: 5,
    shadowColor: '#00e676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resumenLabel: {
    color: '#a0a0a0',
    fontSize: 15,
    marginBottom: 2,
  },
  resumenValue: {
    color: 'white',
    fontWeight: 'bold',
  },
  costoProduccion: {
    color: '#2196f3',
    fontWeight: 'bold',
    fontSize: 18,
  },
  costoVenta: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 18,
  },
  advancedToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#222',
    marginLeft: 8,
  },
  advancedToggleText: {
    color: '#00e676',
    fontSize: 13,
    fontWeight: 'bold',
  },
  costoBasico: {
    color: '#e53935',
    fontWeight: 'bold',
  },
  materialInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialInfoName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  materialInfoDetails: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  secondaryToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#333',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  secondaryToggleText: {
    color: '#00e676',
    fontSize: 12,
    fontWeight: 'bold',
  },
  calculateButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00e676',
  },
  calculateButtonText: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryMaterialContainer: {
    marginBottom: 16,
  },
  summarySectionTitle: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryMaterialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMaterialText: {
    color: 'white',
    fontSize: 14,
  },
  summaryDetailText: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  summaryDetailsContainer: {
    marginBottom: 16,
  },
  summaryCostsContainer: {
    marginBottom: 16,
  },
  finalTotalsContainer: {
    marginBottom: 16,
  },
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertContainer: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  alertTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  alertMessage: {
    color: 'white',
    fontSize: 14,
  },
  alertButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#00e676',
  },
  alertButtonText: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertSuccess: {
    borderColor: '#00e676',
    borderWidth: 2,
  },
  alertError: {
    borderColor: '#e53935',
    borderWidth: 2,
  },
  alertInfo: {
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  alertButtonSuccess: {
    backgroundColor: '#00e676',
  },
  alertButtonError: {
    backgroundColor: '#e53935',
  },
  alertButtonInfo: {
    backgroundColor: '#2196f3',
  },
  requiredText: {
    color: 'red',
    fontWeight: 'bold',
  },
  inputRequired: {
    borderColor: 'red',
    borderWidth: 1,
  },
  requiredMessage: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  pastillasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  pastilla: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222',
    marginRight: 8,
    marginBottom: 4,
  },
  pastillaSeleccionada: {
    backgroundColor: '#00e676',
  },
  pastillaTexto: {
    color: 'white',
    fontSize: 14,
  },
  pastillaTextoSeleccionada: {
    fontWeight: 'bold',
  },
  toggleButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#666',
  },
  toggleButtonActive: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  toggleButtonText: {
    color: '#a0a0a0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleButtonTextActive: {
    color: '#222',
  },
  quantityButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#666',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  infoDisplayContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoDisplayText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  // Nuevos estilos optimizados
  materialCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderColor: '#333',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    minHeight: 40,
    maxWidth: '48%',
  },
  materialCardSelected: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  materialColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 6,
  },
  materialInfo: {
    flexShrink: 1,
  },
  materialName: {
    color: '#fff',
    fontSize: 12,
    flexWrap: 'wrap',
  },
  materialNameSelected: {
    color: '#222',
    fontWeight: 'bold',
  },
  materialSubtype: {
    color: '#a0a0a0',
    fontSize: 10,
  },
  materialStats: {
    flexDirection: 'row',
    marginTop: 2,
  },
  materialStat: {
    fontSize: 9,
    marginRight: 8,
  },
  materialStatRestante: {
    color: '#00e676',
  },
  materialStatPrecio: {
    color: '#ffd600',
  },
  materialGroup: {
    marginBottom: 8,
  },
  materialGroupTitle: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  materialRow: {
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: 340,
    width: '100%',
  },
  verMasButton: {
    backgroundColor: '#181818',
    borderColor: '#00e676',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  verMasButtonArchivado: {
    borderColor: '#e53935',
  },
  verMasText: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 14,
  },
  verMasTextArchivado: {
    color: '#e53935',
  },
});

export default CostCalculatorScreen; 