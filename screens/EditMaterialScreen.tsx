import { Picker } from '@react-native-picker/picker';
import React, { useState, useEffect, useCallback } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { getFirestore, collection, updateDoc, doc, addDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { auth, app } from '../api/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { ColorSelector, CategorySelector } from '../components/Material';
import { useMateriales, useCategoriasPersonalizadas } from '../hooks';
import { generarNombreMaterial, validarMaterialCompleto } from '../utils';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales';

// Importo los PNGs disponibles
const PNG_OPTIONS = [
  { label: 'Filamento', value: 'filamento', source: require('../assets/filamento.png') },
  { label: 'Gancho', value: 'gancho', source: require('../assets/gancho.png') },
  { label: 'Resina', value: 'resina', source: require('../assets/resina.png') },
  { label: 'Pinturas', value: 'pinturas', source: require('../assets/pinturas.png') },
  { label: 'Pegamentos', value: 'pegamentos', source: require('../assets/pegamentos.png') },
  { label: 'Ni idea', value: 'niidea', source: require('../assets/niidea.png') },
  { label: 'Brochas', value: 'brochas', source: require('../assets/brochas.png') },
  { label: 'Aros llaveros', value: 'arosllaveros', source: require('../assets/arosllaveros.png') },
];

const EditMaterialScreen: React.FC<{ route: any, navigation: any }> = ({ route, navigation }) => {
  const { material } = route.params;
  const { lang } = useLanguage();
  const t = translations[lang];
  const db = getFirestore(app);

  // Estados para el formulario
  const [materialEdit, setMaterialEdit] = useState({
    categoria: material.categoria || '',
    tipo: material.tipo || '',
    subtipo: material.subtipo || '',
    color: material.color || '',
    tipoPintura: material.tipoPintura || '',
    colorPintura: material.colorPintura || '',
    cantidadPintura: material.cantidadPintura || '',
    precio: material.precio || '',
    cantidad: material.cantidad || '',
    peso: material.peso || material.pesoBobina || '',
    imagen: material.imagen || null,
    svgSeleccionado: material.imagen || '',
    marca: material.marca || '',
  });

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  // Categorías base
  const categoriasBase = [t.filament, t.resin, t.paint, t.keychainRings];

  // Tipos de filamento traducidos
  const tiposFilamento = [
    { tipo: t.pla, subtipos: [t.normal, t.silk, t.plus, t.woodType, t.shiny, t.matte, t.flexible, t.glow, t.transparent, t.multicolor, t.recycled, t.carbon, t.highTemperature] },
    { tipo: t.abs, subtipos: [t.normal, t.plus, t.recycled, t.transparent, t.fireproof, t.carbon] },
    { tipo: t.petg, subtipos: [t.normal, t.transparent, t.recycled, t.carbon] },
    { tipo: t.tpu, subtipos: ['85A', '95A', t.flexible, t.transparent] },
    { tipo: t.nylon, subtipos: [t.normal, t.carbon, t.glass] },
    { tipo: t.pc, subtipos: [t.normal, t.carbon] },
    { tipo: t.hips, subtipos: [t.normal] },
    { tipo: t.asa, subtipos: [t.normal] },
    { tipo: t.pva, subtipos: [t.normal] },
    { tipo: t.pp, subtipos: [t.normal] },
    { tipo: t.wood, subtipos: [t.normal] },
    { tipo: t.metal, subtipos: [t.normal] },
  ];

  // Tipos de resina traducidos
  const tiposResina = [
    t.standard,
    t.tough,
    t.flexibleResin,
    t.highTempResin,
    t.dental,
    t.transparentResin,
    t.fast,
    t.special,
  ];

  // Tipos de pintura traducidos
  const tiposPintura = [t.acrylic, t.enamel, t.spray, t.oil, t.vinyl, t.watercolor];

  // Colores disponibles
  const PALETA_COLORES = [
    '#222', '#fff', '#e53935', '#1e88e5', '#43a047', '#fbc02d', '#fb8c00', '#8e24aa', '#757575', '#e0e0e0', '#ffd700', '#b0b0b0', '#b87333'
  ];

  // Colores traducidos
  const colores = [
    { nombre: t.black, valor: '#222' },
    { nombre: t.white, valor: '#fff' },
    { nombre: t.red, valor: '#e53935' },
    { nombre: t.blue, valor: '#1e88e5' },
    { nombre: t.green, valor: '#43a047' },
    { nombre: t.yellow, valor: '#fbc02d' },
    { nombre: t.orange, valor: '#fb8c00' },
    { nombre: t.purple, valor: '#8e24aa' },
    { nombre: t.gray, valor: '#757575' },
    { nombre: t.transparentColor, valor: '#e0e0e0' },
    { nombre: t.gold, valor: '#ffd700' },
    { nombre: t.silver, valor: '#b0b0b0' },
    { nombre: t.copper, valor: '#b87333' },
  ];

  // Usar hook para categorías personalizadas
  const { 
    categorias: categoriasPersonalizadasData, 
    agregarCategoria: agregarCategoriaHook,
    eliminarCategoria: eliminarCategoriaHook 
  } = useCategoriasPersonalizadas();
  
  const categoriasPersonalizadas = categoriasPersonalizadasData.map(cat => cat.nombre);

  // 2. Cuando el usuario selecciona una categoría personalizada para agregar un material:
  const categoriaPersonalizada = React.useMemo(() => categoriasPersonalizadasData.find(cat => cat.nombre === materialEdit.categoria), [materialEdit.categoria, categoriasPersonalizadasData]);
  // Asegura que mostrarTipo, mostrarColor y mostrarMarca sean booleanos:
  const mostrarTipo = !!categoriaPersonalizada?.tieneTipo;
  const mostrarColor = !!categoriaPersonalizada?.tieneColor;
  const mostrarMarca = !!categoriaPersonalizada?.tieneMarca;
  
  console.log('categoriaPersonalizada:', categoriaPersonalizada);
  console.log('materialEdit.categoria:', materialEdit.categoria);
  console.log('categoriasPersonalizadasData:', categoriasPersonalizadasData);
  console.log('mostrarTipo:', mostrarTipo);

  // 1. Estado para tipos de la categoría personalizada seleccionada
  const [tiposPersonalizados, setTiposPersonalizados] = useState<string[]>([]);
  const [modoEliminarTipo, setModoEliminarTipo] = useState(false);
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
  const [mostrarNuevoTipo, setMostrarNuevoTipo] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [mostrarConfirmarEliminarTipo, setMostrarConfirmarEliminarTipo] = useState(false);

  // Estado para marcas
  const [marcasFirestore, setMarcasFirestore] = useState<string[]>([]);

  // 1. Función para guardar un tipo personalizado en Firestore
  const agregarTipoPersonalizadoFirestore = async (nombreTipo: string) => {
    const user = auth.currentUser;
    if (!user || !materialEdit.categoria || !nombreTipo) return;
    const ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', materialEdit.categoria, 'tipos');
    await addDoc(ref, { nombre: nombreTipo });
  };

  // 2. Función para cargar tipos personalizados desde Firestore
  const cargarTiposPersonalizadosFirestore = async (categoria: string) => {
    const user = auth.currentUser;
    if (!user || !categoria) return;
    console.log('Cargando tipos personalizados para categoría:', categoria);
    const ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', categoria, 'tipos');
    const snapshot = await getDocs(ref);
    const tipos = snapshot.docs.map(docu => (docu.data() as {nombre: string}).nombre).filter(Boolean);
    console.log('Tipos personalizados cargados:', tipos);
    setTiposPersonalizados(tipos);
  };

  // 3. Función para eliminar tipos personalizados de Firestore
  const eliminarTipoPersonalizadoFirestore = async (nombreTipo: string) => {
    const user = auth.currentUser;
    if (!user || !materialEdit.categoria || !nombreTipo) return;
    const ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', materialEdit.categoria, 'tipos');
    const q = query(ref, where('nombre', '==', nombreTipo));
    const snapshot = await getDocs(q);
    for (const docu of snapshot.docs) {
      await deleteDoc(docu.ref);
    }
  };

  // Funciones para gestionar marcas
  const cargarMarcasFirestore = async (categoria: string) => {
    const user = auth.currentUser;
    if (!user || !categoria) return;
    let ref;
    if (categoriasBase.includes(categoria)) {
      ref = collection(db, 'usuarios', user.uid, 'categoriasBase', categoria, 'marcas');
    } else {
      ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', categoria, 'marcas');
    }
    const snapshot = await getDocs(ref);
    const marcas = snapshot.docs.map(docu => (docu.data() as {nombre: string}).nombre).filter(Boolean);
    setMarcasFirestore(marcas);
  };



  // Marcas específicas por categoría
  const MARCAS_POR_CATEGORIA = {
    [t.filament]: [
      'PrintaLot', '3DFil', 'eSun', 'Creality', 'Anycubic', 'Elegoo', 'Sunlu', 'Overture', 'Sakata', 'Polymaker', 'Amazon Basics', 'Otra...'
    ],
    [t.resin]: [
      'Elegoo', 'Anycubic', 'Creality', 'Sunlu', 'Siraya Tech', 'Phrozen', 'Peopoly', 'Monocure', 'Otra...'
    ],
    [t.paint]: [
      'Vallejo', 'Citadel', 'Tamiya', 'Testors', 'Humbrol', 'Revell', 'Model Master', 'Otra...'
    ],
    [t.keychainRings]: [
      'Generic', 'Metal', 'Plastic', 'Custom', 'Otra...'
    ]
  };

  const getMarcasDisponibles = () => {
    if (!materialEdit.categoria) return [];
    let marcas;
    if (categoriasBase.includes(materialEdit.categoria)) {
      marcas = [...(MARCAS_POR_CATEGORIA[materialEdit.categoria as keyof typeof MARCAS_POR_CATEGORIA] || []), ...marcasFirestore];
    } else {
      marcas = [...marcasFirestore];
    }
    // Cambia 'Otra...' por 'Agregar +' y asegúrate que solo esté una vez
    marcas = marcas.filter(m => m !== 'Otra...' && m !== 'Agregar +');
    marcas.push('Agregar +');
    return marcas;
  };

  // Cargar tipos personalizados cuando se inicializa el componente
  React.useEffect(() => {
    console.log('useEffect inicial - material.categoria:', material.categoria);
    console.log('categoriasBase:', categoriasBase);
    if (material.categoria && !categoriasBase.includes(material.categoria)) {
      console.log('Cargando tipos personalizados iniciales...');
      cargarTiposPersonalizadosFirestore(material.categoria);
    }
    // Cargar marcas iniciales
    if (material.categoria) {
      cargarMarcasFirestore(material.categoria);
    }
  }, []);

  // Cargar tipos personalizados cuando la pantalla gane el foco
  useFocusEffect(
    useCallback(() => {
      console.log('useFocusEffect - material.categoria:', material.categoria);
      if (material.categoria && !categoriasBase.includes(material.categoria)) {
        console.log('Cargando tipos personalizados en focus...');
        cargarTiposPersonalizadosFirestore(material.categoria);
      }
    }, [material.categoria])
  );

  // Modifica el useEffect para cargar tipos personalizados desde Firestore al cambiar de categoría personalizada
  React.useEffect(() => {
    if (materialEdit.categoria && !categoriasBase.includes(materialEdit.categoria)) {
      cargarTiposPersonalizadosFirestore(materialEdit.categoria);
    } else {
      setTiposPersonalizados([]);
    }
    // Cargar marcas cuando cambia la categoría
    if (materialEdit.categoria) {
      cargarMarcasFirestore(materialEdit.categoria);
    }
    // Solo limpiar tipo y color si realmente cambió la categoría
    if (materialEdit.categoria !== material.categoria) {
      setMaterialEdit(prev => ({ ...prev, tipo: '', color: '', marca: '' }));
    }
  }, [materialEdit.categoria]);

  // Obtener subtipos según el tipo seleccionado (para filamento y resina)
  const subtipos = materialEdit.categoria === t.filament 
    ? tiposFilamento.find(tipo => tipo.tipo === materialEdit.tipo)?.subtipos || []
    : [];

  // Validar si se puede guardar usando utilidad
  const puedeGuardar = validarMaterialCompleto({
    ...materialEdit,
    id: material.id,
    nombre: material.nombre
  });

  const handleGuardar = async (): Promise<void> => {
    // Generar nombre usando utilidad
    const nombreGenerado = generarNombreMaterial({
      ...materialEdit,
      id: material.id,
      nombre: material.nombre
    });
    
    // Preparar material para actualizar
    let materialAActualizar: any = { 
      ...materialEdit, 
      nombre: nombreGenerado,
      fechaActualizacion: new Date().toISOString(),
    };
    
    // Configurar cantidades según la categoría
    if (materialEdit.categoria === t.filament || materialEdit.categoria === t.resin) {
      const unidades = parseFloat(materialEdit.cantidad || '1');
      const gramosPorUnidad = parseFloat(materialEdit.peso || '1');
      materialAActualizar.cantidadRestante = (unidades * gramosPorUnidad).toString();
      materialAActualizar.cantidadInicial = materialEdit.cantidad; // Actualizar cantidad inicial
      materialAActualizar.pesoBobina = materialEdit.peso;
    } else if (materialEdit.categoria === t.paint) {
      const unidades = parseFloat(materialEdit.cantidad || '1');
      const mlPorUnidad = parseFloat(materialEdit.cantidadPintura || '1');
      materialAActualizar.cantidadRestante = (unidades * mlPorUnidad).toString();
      materialAActualizar.cantidadInicial = materialEdit.cantidad; // Actualizar cantidad inicial
      materialAActualizar.cantidad = materialEdit.cantidadPintura; // ml por frasco
    } else if (materialEdit.categoria === t.keychainRings) {
      // Para aros de llavero: actualizar cantidad inicial y restante
      materialAActualizar.cantidadRestante = materialEdit.cantidad;
      materialAActualizar.cantidadInicial = materialEdit.cantidad; // Actualizar cantidad inicial
      materialAActualizar.cantidad = materialEdit.cantidad; // Stock actual en unidades
    } else {
      // Para categorías personalizadas: actualizar cantidad inicial y restante
      materialAActualizar.cantidadRestante = materialEdit.cantidad || '0';
      materialAActualizar.cantidadInicial = materialEdit.cantidad || '0'; // Actualizar cantidad inicial
      materialAActualizar.cantidad = materialEdit.cantidad || '0'; // Stock actual en unidades
    }
    
    // Asegurar que el color se guarde en el campo principal según la categoría
    if (materialEdit.categoria === t.paint) {
      materialAActualizar.color = materialEdit.colorPintura;
    } else if (materialEdit.categoria === t.keychainRings) {
      materialAActualizar.color = materialEdit.color || '#00e676';
    }
    
    // Guardar la ruta del PNG seleccionado
    if (materialEdit.svgSeleccionado) {
      materialAActualizar.imagen = materialEdit.svgSeleccionado;
    }
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Debes iniciar sesión para actualizar materiales');
      }

      await updateDoc(doc(db, 'usuarios', user.uid, 'materiales', material.id), materialAActualizar);
      
      setAlertType('success');
      setAlertMessage(t.successUpdate || 'Material actualizado correctamente');
      setShowAlert(true);
      
      // Navegar de vuelta después de un breve delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage((t.errorUpdate || 'Error al actualizar') + (error.message || error));
      setShowAlert(true);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#0d0d0d' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{t.editMaterial || 'Editar Material'}</Text>
        </View>

        {/* Selector visual de PNGs pequeño */}
        <Text style={styles.label}>{t.selectImage}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {PNG_OPTIONS.map(({ label, value, source }) => (
            <TouchableOpacity
              key={value}
              style={{
                borderRadius: 16,
                borderWidth: materialEdit.svgSeleccionado === value ? 3 : 1,
                borderColor: materialEdit.svgSeleccionado === value ? '#00e676' : '#333',
                padding: 6,
                marginRight: 6,
                marginBottom: 8,
                backgroundColor: '#181818',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
              }}
              onPress={() => {
                let categoriaAuto = '';
                if (value === 'filamento') categoriaAuto = t.filament;
                else if (value === 'resina') categoriaAuto = t.resin;
                else if (value === 'pinturas') categoriaAuto = t.paint;
                else if (value === 'arosllaveros') categoriaAuto = t.keychainRings;
                else categoriaAuto = 'Más';
                setMaterialEdit({
                  ...materialEdit,
                  svgSeleccionado: value,
                  categoria: categoriaAuto,
                  marca: '', // Limpiar marca al cambiar categoría
                });
              }}
            >
              <Image source={source} style={{ width: 40, height: 40 }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Selector de categoría */}
        <Text style={styles.label}>{t.category}</Text>
        <View style={[styles.pastillasContainer, { alignItems: 'center' }]}> 
          {categoriasBase.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.pastilla,
                materialEdit.categoria === cat ? styles.pastillaSeleccionada : null
              ]}
              onPress={() => setMaterialEdit({
                ...materialEdit,
                categoria: cat,
                tipo: '',
                subtipo: '',
                color: '',
                tipoPintura: '',
                colorPintura: '',
                cantidadPintura: '',
                peso: '',
                marca: '',
              })}
            >
              <Text style={[
                styles.pastillaTexto,
                materialEdit.categoria === cat ? styles.pastillaTextoSeleccionada : null
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
          {categoriasPersonalizadas.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.pastilla,
                materialEdit.categoria === cat ? styles.pastillaSeleccionada : null
              ]}
              onPress={() => setMaterialEdit({
                ...materialEdit,
                categoria: cat,
                tipo: '',
                subtipo: '',
                color: '',
                tipoPintura: '',
                colorPintura: '',
                cantidadPintura: '',
                peso: '',
                marca: '',
              })}
            >
              <Text style={[
                styles.pastillaTexto,
                materialEdit.categoria === cat ? styles.pastillaTextoSeleccionada : null
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Resumen del material */}
        <View style={styles.resumenContainer}>
          <Text style={styles.resumenTitulo}>{t.materialSummary || 'Resumen del Material'}</Text>
          <Text style={styles.resumenTexto}>{t.category}: <Text style={styles.resumenDato}>{materialEdit.categoria || t.dash}</Text></Text>
          {materialEdit.tipo && (
            <Text style={styles.resumenTexto}>{t.type}: <Text style={styles.resumenDato}>{materialEdit.tipo}</Text></Text>
          )}
          {materialEdit.subtipo && (
            <Text style={styles.resumenTexto}>{t.subtype}: <Text style={styles.resumenDato}>{materialEdit.subtipo}</Text></Text>
          )}
          {materialEdit.color && (
            <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{materialEdit.color}</Text></Text>
          )}
          {materialEdit.marca && (
            <Text style={styles.resumenTexto}>{t.brand}: <Text style={styles.resumenDato}>{materialEdit.marca}</Text></Text>
          )}
          <Text style={styles.resumenTexto}>{t.generatedName}: <Text style={styles.resumenDato}>{generarNombreMaterial({...materialEdit, id: material.id, nombre: material.nombre}) || t.dash}</Text></Text>
        </View>

        {/* Selector de marcas para categorías base y personalizadas */}
        {(categoriasBase.includes(materialEdit.categoria) || mostrarMarca) && (
          <>
            <Text style={styles.label}>{t.brand}</Text>
            <View style={[styles.pastillasContainer, { alignItems: 'center' }]}> 
              {getMarcasDisponibles().filter(m => m !== 'Agregar +').map((marca) => (
                <TouchableOpacity
                  key={marca}
                  style={[
                    styles.pastilla,
                    materialEdit.marca === marca && styles.pastillaSeleccionada
                  ]}
                  onPress={() => setMaterialEdit({ ...materialEdit, marca })}
                >
                  <Text style={[
                    styles.pastillaTexto,
                    materialEdit.marca === marca && styles.pastillaTextoSeleccionada
                  ]}>{marca}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Formulario dinámico según categoría */}
        <View style={styles.formContainer}>
          {/* FILAMENTO */}
          {materialEdit.categoria === t.filament && (
            <>
              <Text style={styles.label}>{t.filamentType}</Text>
              <View style={styles.pastillasContainer}>
                {tiposFilamento.map((t) => (
                  <TouchableOpacity
                    key={t.tipo}
                    style={[
                      styles.pastilla,
                      materialEdit.tipo === t.tipo ? styles.pastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterialEdit({ ...materialEdit, tipo: t.tipo, subtipo: '' })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      materialEdit.tipo === t.tipo ? styles.pastillaTextoSeleccionada : null
                    ]}>{t.tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {materialEdit.tipo !== '' && (
                <>
                  <Text style={styles.label}>{t.subtype}</Text>
                  <View style={styles.pastillasContainer}>
                    {subtipos.map((sub) => (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.pastilla,
                          materialEdit.subtipo === sub ? styles.pastillaSeleccionada : null
                        ]}
                        onPress={() => setMaterialEdit({ ...materialEdit, subtipo: sub })}
                      >
                        <Text style={[
                          styles.pastillaTexto,
                          materialEdit.subtipo === sub ? styles.pastillaTextoSeleccionada : null
                        ]}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <Text style={styles.label}>{t.color}</Text>
              <ColorSelector
                selectedColor={materialEdit.color}
                onColorSelect={(color) => setMaterialEdit({ ...materialEdit, color })}
              />
              <Text style={styles.label}>{t.bobbinWeight}</Text>
              <TextInput
                style={styles.input}
                value={materialEdit.peso}
                onChangeText={(text) => setMaterialEdit({ ...materialEdit, peso: text })}
                placeholder={t.exampleWeight}
                keyboardType="numeric"
              />
            </>
          )}

          {/* RESINA */}
          {materialEdit.categoria === t.resin && (
            <>
              <Text style={styles.label}>{t.resinType}</Text>
              <View style={styles.pastillasContainer}>
                {tiposResina.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.pastilla,
                      materialEdit.tipo === t ? styles.pastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterialEdit({ ...materialEdit, tipo: t, subtipo: '' })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      materialEdit.tipo === t ? styles.pastillaTextoSeleccionada : null
                    ]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>{t.color}</Text>
              <ColorSelector
                selectedColor={materialEdit.color}
                onColorSelect={(color) => setMaterialEdit({ ...materialEdit, color })}
              />
              <Text style={styles.label}>{t.resinWeight}</Text>
              <TextInput
                style={styles.input}
                value={materialEdit.peso}
                onChangeText={(text) => setMaterialEdit({ ...materialEdit, peso: text })}
                placeholder={t.exampleWeight}
                keyboardType="numeric"
              />
            </>
          )}

          {/* PINTURA */}
          {materialEdit.categoria === t.paint && (
            <>
              <Text style={styles.label}>{t.paintType}</Text>
              <View style={styles.pastillasContainer}>
                {tiposPintura.map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.pastilla,
                      materialEdit.tipoPintura === tipo ? styles.pastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterialEdit({ ...materialEdit, tipoPintura: tipo })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      materialEdit.tipoPintura === tipo ? styles.pastillaTextoSeleccionada : null
                    ]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>{t.color}</Text>
              <ColorSelector
                selectedColor={materialEdit.colorPintura}
                onColorSelect={(color) => setMaterialEdit({ ...materialEdit, colorPintura: color })}
              />
              <Text style={styles.label}>{t.quantity}</Text>
              <TextInput
                style={styles.input}
                value={materialEdit.cantidadPintura}
                onChangeText={(text) => setMaterialEdit({ ...materialEdit, cantidadPintura: text })}
                placeholder={t.exampleQuantity}
                keyboardType="numeric"
              />
            </>
          )}

          {/* AROS DE LLAVERO */}
          {materialEdit.categoria === t.keychainRings && (
            <>
              <Text style={styles.label}>{t.color}</Text>
              <ColorSelector
                selectedColor={materialEdit.color}
                onColorSelect={(color) => setMaterialEdit({ ...materialEdit, color })}
              />
            </>
          )}

          {/* CAMPOS PARA CATEGORÍAS PERSONALIZADAS */}
          {materialEdit.categoria && !categoriasBase.includes(materialEdit.categoria) && (
            <>
              {console.log('Renderizando categoría personalizada:', materialEdit.categoria, 'mostrarTipo:', mostrarTipo, 'tiposPersonalizados:', tiposPersonalizados)}
              {mostrarTipo && (
                <>
                  <Text style={styles.label}>{`${t.typeOf}${materialEdit.categoria.toLowerCase()}`}</Text>
                  <Text style={{ color: '#a0a0a0', fontSize: 12, marginBottom: 8 }}>
                    Tipos cargados: {tiposPersonalizados.length}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                    {tiposPersonalizados.map((tipo, idx) => (
                      <TouchableOpacity
                        key={tipo}
                        style={[
                          styles.pastilla,
                          materialEdit.tipo === tipo && !modoEliminarTipo && styles.pastillaSeleccionada,
                          modoEliminarTipo && tiposSeleccionados.includes(tipo) && { backgroundColor: '#e53935', borderColor: '#e53935' }
                        ]}
                        onPress={() => {
                          if (modoEliminarTipo) {
                            setTiposSeleccionados(tiposSeleccionados.includes(tipo)
                              ? tiposSeleccionados.filter(t => t !== tipo)
                              : [...tiposSeleccionados, tipo]);
                          } else {
                            setMaterialEdit({ ...materialEdit, tipo });
                          }
                        }}
                      >
                        <Text style={[
                          { color: '#fff', fontSize: 14 },
                          materialEdit.tipo === tipo && !modoEliminarTipo && styles.pastillaTextoSeleccionada,
                          modoEliminarTipo && tiposSeleccionados.includes(tipo) && { color: '#fff', fontWeight: 'bold' }
                        ]}>{tipo}</Text>
                      </TouchableOpacity>
                    ))}
                    {/* Botón Eliminar - */}
                    <TouchableOpacity
                      style={[styles.pastilla, { backgroundColor: '#222', borderColor: '#e53935', borderWidth: 2 }]}
                      onPress={() => {
                        if (modoEliminarTipo) {
                          setMostrarConfirmarEliminarTipo(true);
                        } else {
                          setModoEliminarTipo(true);
                        }
                      }}
                    >
                      <Text style={{ color: '#e53935', fontWeight: 'bold' }}>-</Text>
                    </TouchableOpacity>
                    {/* Botón Agregar + */}
                    <TouchableOpacity
                      style={[styles.pastilla, { backgroundColor: '#222', borderColor: '#00e676', borderWidth: 2 }]}
                      onPress={() => setMostrarNuevoTipo(true)}
                    >
                      <Text style={{ color: '#00e676', fontWeight: 'bold' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Formulario embebido para nuevo tipo */}
                  {mostrarNuevoTipo && (
                    <View style={styles.nuevaCategoriaContainer}>
                      <Text style={styles.label}>{t.newType}</Text>
                      <TextInput
                        style={styles.input}
                        value={nuevoTipo}
                        onChangeText={setNuevoTipo}
                        placeholder={`${t.nameOf}${materialEdit.categoria.toLowerCase()}`}
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <TouchableOpacity onPress={() => { setMostrarNuevoTipo(false); setNuevoTipo(''); }} style={[styles.pastilla, { backgroundColor: '#a0a0a0' }]}> 
                          <Text style={{ color: '#222' }}>{t.cancel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            if (nuevoTipo.trim() && !tiposPersonalizados.includes(nuevoTipo.trim())) {
                              setTiposPersonalizados([...tiposPersonalizados, nuevoTipo.trim()]);
                              setMaterialEdit({ ...materialEdit, tipo: nuevoTipo.trim() });
                              setMostrarNuevoTipo(false);
                              agregarTipoPersonalizadoFirestore(nuevoTipo.trim());
                              setNuevoTipo('');
                            }
                          }}
                          style={[styles.pastilla, { backgroundColor: '#00e676' }, !nuevoTipo.trim() && { opacity: 0.5 }]}
                          disabled={!nuevoTipo.trim()}
                        > 
                          <Text style={{ color: '#222', fontWeight: 'bold' }}>{t.add}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {/* Modal de confirmación para eliminar tipos */}
                  {mostrarConfirmarEliminarTipo && (
                    <Modal
                      visible={mostrarConfirmarEliminarTipo}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setMostrarConfirmarEliminarTipo(false)}
                    >
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                        <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: '#e53935', borderWidth: 2 }}>
                          <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>⚠️ {t.delete}</Text>
                          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
                            {t.confirmDeleteTypeMessage || '¿Estás seguro de que quieres eliminar los tipos seleccionados?'}
                          </Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                            <TouchableOpacity onPress={() => setMostrarConfirmarEliminarTipo(false)} style={[styles.pastilla, { backgroundColor: '#a0a0a0' }]}> 
                              <Text style={{ color: '#222' }}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={async () => {
                                // Eliminar tipos seleccionados de Firestore
                                for (const tipo of tiposSeleccionados) {
                                  await eliminarTipoPersonalizadoFirestore(tipo);
                                }
                                setMostrarConfirmarEliminarTipo(false);
                                setModoEliminarTipo(false);
                                setTiposSeleccionados([]);
                                cargarTiposPersonalizadosFirestore(materialEdit.categoria);
                                if (tiposSeleccionados.includes(materialEdit.tipo)) setMaterialEdit({ ...materialEdit, tipo: '' });
                              }}
                              style={[styles.pastilla, { backgroundColor: '#e53935' }]}
                            >
                              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.delete}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  )}
                </>
              )}
              {mostrarColor && (
                <>
                  <Text style={styles.label}>{t.color}</Text>
                  <Text style={{ color: '#a0a0a0', marginBottom: 4 }}>{t.selectColor}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {PALETA_COLORES.map((col) => (
                      <TouchableOpacity
                        key={col}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: col,
                          marginRight: 8,
                          marginBottom: 8,
                          borderWidth: materialEdit.color === col ? 3 : 2,
                          borderColor: materialEdit.color === col ? '#00e676' : '#333',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setMaterialEdit({ ...materialEdit, color: col })}
                      >
                        {materialEdit.color === col && <Text style={{ color: col === '#fff' ? '#222' : '#fff', fontWeight: 'bold' }}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {/* CAMPOS GENERALES (para todas las categorías) */}
          <Text style={styles.label}>{t.unitPrice}</Text>
          <TextInput
            style={styles.input}
            value={materialEdit.precio}
            onChangeText={(text) => {
              // Remover el símbolo $ si ya existe para evitar duplicados
              let cleanText = text.replace(/^\$/, '');
              // Agregar $ al inicio si no está vacío
              const formattedText = cleanText ? `$${cleanText}` : '';
              setMaterialEdit({ ...materialEdit, precio: formattedText });
            }}
            placeholder={t.examplePrice}
            keyboardType="numeric"
          />
          <Text style={styles.label}>{t.availableQuantity}</Text>
          <TextInput
            style={styles.input}
            value={materialEdit.cantidad}
            onChangeText={(text) => setMaterialEdit({ ...materialEdit, cantidad: text })}
            placeholder={t.exampleQuantity}
            keyboardType="numeric"
          />
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity style={[styles.guardarBtn, !puedeGuardar && { opacity: 0.5 }]} onPress={handleGuardar} disabled={!puedeGuardar}>
          <Text style={styles.guardarText}>{t.update || 'Actualizar'}</Text>
        </TouchableOpacity>

        {/* Modal de alerta personalizado */}
        <Modal
          visible={showAlert}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlert(false)}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: alertType === 'success' ? '#00e676' : '#e53935', borderWidth: 2 }}>
              <Text style={{ color: alertType === 'success' ? '#00e676' : '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
                {alertType === 'success' ? t.success : t.error}
              </Text>
              <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>{alertMessage}</Text>
              <TouchableOpacity
                style={{ marginTop: 10, backgroundColor: alertType === 'success' ? '#00e676' : '#e53935', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                onPress={() => setShowAlert(false)}
              >
                <Text style={{ color: alertType === 'success' ? '#222' : '#fff', fontWeight: 'bold', fontSize: 16 }}>{t.close}</Text>
              </TouchableOpacity>
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
    paddingBottom: 700,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    color: 'white',
    fontSize: 16,
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
  pastillasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  pastilla: {
    backgroundColor: '#181818',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  pastillaSeleccionada: {
    borderColor: '#00e676',
    backgroundColor: '#00e676',
  },
  pastillaTexto: {
    color: '#a0a0a0',
    fontSize: 14,
    fontWeight: '600',
  },
  pastillaTextoSeleccionada: {
    color: '#000',
    fontWeight: 'bold',
  },
  resumenContainer: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  resumenTitulo: {
    color: '#00e676',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resumenTexto: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 4,
  },
  resumenDato: {
    color: '#fff',
    fontWeight: 'bold',
  },
  guardarBtn: {
    backgroundColor: '#00e676',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  guardarText: {
    color: '#222',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nuevaCategoriaContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
});

export default EditMaterialScreen; 