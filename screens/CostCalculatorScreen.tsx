import { Picker } from '@react-native-picker/picker';
import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Platform, ActivityIndicator } from 'react-native';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, app } from '../api/firebase';
import { useFocusEffect } from '@react-navigation/native';

const db = getFirestore(app);

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
    'PLA',
    'ABS',
    'PETG',
    'TPU',
    'Nylon',
    'Resina',
    'HIPS',
    'PC (Policarbonato)',
    'Filamento Flexible',
    'Filamento con Madera'
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
      setCalculo(prev => ({
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
          precioBobina: mat.precioBobina || mat.precio || '',
          pesoBobina: mat.pesoBobina || mat.peso || '',
          color: mat.color || '',
        }
      }));
    }
  };

  // Cálculo de filamento
  const calcularCostoFilamento = () => {
    const { precioBobina, pesoBobina, gramosUtilizados } = calculo.filamento;
    if (precioBobina && pesoBobina && gramosUtilizados) {
      const costoPorGramo = parseFloat(precioBobina) / parseFloat(pesoBobina);
      const costo = costoPorGramo * parseFloat(gramosUtilizados);
      setCalculo(prev => ({
        ...prev,
        filamento: {
          ...prev.filamento,
          costoFilamento: costo.toFixed(2),
          costoMaterialSolo: costo.toFixed(2),
        }
      }));
    }
  };

  // Cálculo de mano de obra
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

  // Cálculo de materiales extra y luz
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

  // Cálculo total
  const getTotal = () => {
    const filamento = parseFloat(calculo.filamento.costoFilamento) || 0;
    const manoObra = parseFloat(calculo.manoObra.costoTotalManoObra) || 0;
    let total = filamento + manoObra;
    if (mostrarAvanzado) {
      const extra = parseFloat(calculo.avanzados.totalMaterialesExtra) || 0;
      const luz = parseFloat(calculo.avanzados.costoLuz) || 0;
      total += extra + luz;
    }
    return total.toFixed(2);
  };

  // Guardar cálculo en Firestore
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
      };
      await addDoc(collection(db, 'usuarios', user.uid, 'calculos'), nuevoCalculo);
      showCustomAlert('✅ ¡Cálculo guardado!', `El cálculo "${calculo.nombre}" se guardó exitosamente.\n\n💵 Total: $${getTotal()} MXN\n\nPuedes consultar este cálculo en el historial de impresiones.`, 'success');
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
      showCustomAlert('Error', 'No se pudo guardar el cálculo. Intenta de nuevo.', 'error');
    }
  };

  const getProduccion = () => {
    const filamento = parseFloat(calculo.filamento.costoMaterialSolo) || 0;
    const manoObra = parseFloat(calculo.manoObra.costoTotalManoObra) || 0;
    const extra = parseFloat(calculo.avanzados.totalMaterialesExtra) || 0;
    const luz = parseFloat(calculo.avanzados.costoLuz) || 0;
    return (filamento + manoObra + extra + luz).toFixed(2);
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

  return (
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

      {/* Información del Material Seleccionado */}
      {calculo.materialSeleccionado.id && (
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
              <Text style={styles.materialName}>{calculo.materialSeleccionado.nombre}</Text>
              <Text style={styles.materialDetails}>
                {calculo.materialSeleccionado.tipo} - {calculo.materialSeleccionado.subtipo}
              </Text>
              <Text style={styles.materialDetails}>
                Color: {calculo.materialSeleccionado.color || 'No especificado'}
              </Text>
            </View>
          </View>
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
      <View style={styles.section}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>

          {/* cuadro general de calculo de filamento */}
          <Text style={styles.sectionTitle}>CÁLCULO DE FILAMENTO</Text>

          {/* Boton de opciones avanzadas al ser pulsado se activa la funcion de mostrar avanzado*/}
          <TouchableOpacity
          // al precionarse pone el valor contrario del de precionar avanzado.
            style={styles.advancedToggleBtn} onPress={() => setMostrarAvanzado(!mostrarAvanzado)}>
            <Text style={styles.advancedToggleText}>{mostrarAvanzado ? 'Ocultar' : 'Avanzado'}</Text>
          </TouchableOpacity>


        </View>
        <Text style={styles.label}>Seleccionar material guardado</Text>

        {/* Selector de material guardado como pastillas en 2 columnas, agrupado por tipo */}
        <View style={{ flexDirection: 'column', flexWrap: 'wrap', marginBottom: 8 }}>
          {loadingMateriales ? (
            <ActivityIndicator size="small" color="#00e676" style={{ marginVertical: 10 }} />
          ) : errorMateriales ? (
            <Text style={{ color: 'red', textAlign: 'center', marginVertical: 10 }}>{errorMateriales}</Text>
          ) : materialesGuardados.length === 0 ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 10 }}>No hay materiales guardados.</Text>
          ) : (
            (() => {
              // Agrupar materiales por tipo
              const matsPorTipo: { [tipo: string]: any[] } = {};
              materialesGuardados.forEach(mat => {
                const tipo = mat.tipo || 'Sin tipo';
                if (!matsPorTipo[tipo]) matsPorTipo[tipo] = [];
                matsPorTipo[tipo].push(mat);
              });
              return Object.entries(matsPorTipo).map(([tipo, mats], tipoIdx) => (
                <View key={tipo} style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>{tipo}</Text>
                  {(() => {
                    const filas = [];
                    for (let i = 0; i < mats.length; i += 2) {
                      filas.push(mats.slice(i, i + 2));
                    }
                    return filas.map((fila, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', marginBottom: 4, justifyContent: 'center', alignSelf: 'center', maxWidth: 340, width: '100%' }}>
                        {fila.map((mat) => (
                          <TouchableOpacity
                            key={mat.id}
                            style={{
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: materialSeleccionado === mat.id ? '#00e676' : '#222',
                              borderColor: materialSeleccionado === mat.id ? '#00e676' : '#333',
                              borderWidth: 2,
                              borderRadius: 16,
                              paddingVertical: 4,
                              paddingHorizontal: 8,
                              marginHorizontal: 4,
                              minHeight: 40,
                              maxWidth: '48%',
                            }}
                            onPress={() => handleSeleccionMaterial(mat.id)}
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
                                color: materialSeleccionado === mat.id ? '#222' : '#fff',
                                fontWeight: materialSeleccionado === mat.id ? 'bold' : 'normal',
                                fontSize: 12,
                                flexWrap: 'wrap',
                              }} numberOfLines={1} ellipsizeMode="tail">{mat.nombre}</Text>
                              <Text style={{ color: '#a0a0a0', fontSize: 10 }} numberOfLines={1} ellipsizeMode="tail">{mat.subtipo}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                        {fila.length === 1 && <View style={{ flex: 1 }} />}
                      </View>
                    ));
                  })()}
                </View>
              ));
            })()
          )}
          {!cargandoMateriales && !errorMateriales && materialesGuardados.length > 5 && !verMasMateriales && (
            <TouchableOpacity
              style={{
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
              }}
              onPress={() => setVerMasMateriales(true)}
            >
              <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 14 }}>Ver más...</Text>
            </TouchableOpacity>
          )}
          {!cargandoMateriales && !errorMateriales && materialesGuardados.length > 5 && verMasMateriales && (
            <TouchableOpacity
              style={{
                backgroundColor: '#181818',
                borderColor: '#e53935',
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
              onPress={() => setVerMasMateriales(false)}
            >
              <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 14 }}>Ver menos...</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selector de subtipo de filamento */}
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

        
        <Text style={styles.label}>Precio de la bobina (MXN)</Text>
        <TextInput
          style={styles.input}
          value={calculo.filamento.precioBobina}
          onChangeText={(text) => handleFilamentoChange('precioBobina', text)}
          onBlur={calcularCostoFilamento}
          placeholder="Ej: 450.00"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Peso de la bobina (gramos)</Text>
        <TextInput
          style={styles.input}
          value={calculo.filamento.pesoBobina}
          onChangeText={(text) => handleFilamentoChange('pesoBobina', text)}
          onBlur={calcularCostoFilamento}
          placeholder="Ej: 1000"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Gramos utilizados</Text>
        <TextInput
          style={styles.input}
          value={calculo.filamento.gramosUtilizados}
          onChangeText={(text) => handleFilamentoChange('gramosUtilizados', text)}
          onBlur={calcularCostoFilamento}
          placeholder="Ej: 40"
          keyboardType="numeric"
        />
        
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Costo total del filamento:</Text>
          <Text style={styles.resultValue}>${calculo.filamento.costoFilamento} MXN</Text>
          <Text style={styles.detailText}>Para {calculo.filamento.gramosUtilizados}g utilizados</Text>
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
        {calculo.materialSeleccionado.id && (
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
              Gramos utilizados: {calculo.filamento.gramosUtilizados}g
            </Text>
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
          await addDoc(collection(db, 'usuarios', user.uid, 'calculos'), nuevoCalculo);
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    padding: 20,
    marginTop: 30,
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
    marginBottom: 40,
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
    color: '#2196f3', // azul
    fontWeight: 'bold',
    fontSize: 18,
  },
  costoVenta: {
    color: '#00e676', // verde
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
    color: '#e53935', // rojo
    fontWeight: 'bold',
  },
  materialInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  materialDetails: {
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
});

export default CostCalculatorScreen; 