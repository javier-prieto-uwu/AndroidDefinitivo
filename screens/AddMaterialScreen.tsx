import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, query, where, doc } from 'firebase/firestore';
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

// Ordenar PNG_OPTIONS: primero los que tienen categoría base
const PNG_OPTIONS_ORDENADAS = [
  ...PNG_OPTIONS.filter(opt => ['filamento', 'resina', 'pinturas', 'arosllaveros'].includes(opt.value)),
  ...PNG_OPTIONS.filter(opt => !['filamento', 'resina', 'pinturas', 'arosllaveros'].includes(opt.value)),
];

// Tipos y subtipos de filamento
const tiposFilamento = [
  { tipo: 'PLA', subtipos: ['Normal', 'Silk', 'Plus', 'Madera', 'Brillante', 'Mate', 'Flexible', 'Glow', 'Transparente', 'Multicolor', 'Reciclado', 'Carbono', 'Alta temperatura'] },
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
];

// Tipos y subtipos de resina
const tiposResina = [
  'Estándar',
  'Tough (tipo ABS)',
  'Flexible',
  'Alta temperatura',
  'Dental / Biocompatible',
  'Transparente',
  'Fast / Rápida',
  'Especiales',
];

const colores = [
  { nombre: 'Negro', valor: '#222' },
  { nombre: 'Blanco', valor: '#fff' },
  { nombre: 'Rojo', valor: '#e53935' },
  { nombre: 'Azul', valor: '#1e88e5' },
  { nombre: 'Verde', valor: '#43a047' },
  { nombre: 'Amarillo', valor: '#fbc02d' },
  { nombre: 'Naranja', valor: '#fb8c00' },
  { nombre: 'Morado', valor: '#8e24aa' },
  { nombre: 'Gris', valor: '#757575' },
  { nombre: 'Transparente', valor: '#e0e0e0' },
  { nombre: 'Oro', valor: '#ffd700' },
  { nombre: 'Plata', valor: '#b0b0b0' },
  { nombre: 'Cobre', valor: '#b87333' },
];

// Paleta de colores predefinidos para el selector visual
const PALETA_COLORES = [
  '#222', '#fff', '#e53935', '#1e88e5', '#43a047', '#fbc02d', '#fb8c00', '#8e24aa', '#757575', '#e0e0e0', '#ffd700', '#b0b0b0', '#b87333',
  '#ff69b4', '#00bcd4', '#a1887f', '#cddc39', '#ff5722', '#607d8b', '#9c27b0', '#4caf50', '#ff9800', '#795548', '#3f51b5', '#c62828'
];

const AddMaterialScreen: React.FC = () => {
  const { lang } = useLanguage();
  const t = translations[lang];
  
  // Categorías base traducidas
  const categoriasBase = [
    t.filament,
    t.resin,
    t.paint,
    t.keychainRings,
  ];

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

  const coloresPintura = colores.map(c => c.nombre); // Reutiliza los colores de filamento

  // Usar hook para categorías personalizadas
  const { 
    categorias: categoriasPersonalizadasData, 
    agregarCategoria: agregarCategoriaHook,
    eliminarCategoria: eliminarCategoriaHook 
  } = useCategoriasPersonalizadas();
  
  const categoriasPersonalizadas = categoriasPersonalizadasData.map(cat => cat.nombre);
  
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
  const [mostrarSelectorColor, setMostrarSelectorColor] = useState<false | 'filamento' | 'pintura' | 'nuevaCategoria'>(false);
  const [usarTipo, setUsarTipo] = useState(false);
  const [usarColor, setUsarColor] = useState(false);
  const [usarMarca, setUsarMarca] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre: '',
    tipo: '',
    color: '',
    costo: '',
  });

  const [material, setMaterial] = useState({
    categoria: '',
    tipo: '',
    subtipo: '',
    color: '',
    tipoPintura: '',
    colorPintura: '',
    cantidadPintura: '',
    precio: '',
    cantidad: '',
    peso: '',
    imagen: null,
    svgSeleccionado: '',
    marca: '',
  });

  // El nombre se genera usando la utilidad generarNombreMaterial

  // Obtener subtipos según el tipo seleccionado (para filamento y resina)
  const subtipos = material.categoria === t.filament 
    ? tiposFilamento.find(tipo => tipo.tipo === material.tipo)?.subtipos || []
    : [];

  // Validar si se puede guardar usando utilidad
  const puedeGuardar = validarMaterialCompleto({
    ...material,
    id: '',
    nombre: ''
  });

  const db = getFirestore(app);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  // Usar hook de materiales para guardar
  const { agregarMaterial } = useMateriales();

  const handleGuardar = async (): Promise<void> => {
    // Generar nombre usando utilidad
    const nombreGenerado = generarNombreMaterial({
      ...material,
      id: '',
      nombre: ''
    });
    
    // Preparar material para guardar
    let materialAGuardar: any = { 
      ...material, 
      nombre: nombreGenerado,
      fechaRegistro: new Date().toISOString(),
      cantidadInicial: material.cantidad // Guardar el stock inicial (unidades)
    };
    
    // Configurar cantidades según la categoría
    if (material.categoria === t.filament || material.categoria === t.resin) {
      const unidades = parseFloat(material.cantidad || '1');
      const gramosPorUnidad = parseFloat(material.peso || '1');
      materialAGuardar.cantidadRestante = (unidades * gramosPorUnidad).toString();
      materialAGuardar.pesoBobina = material.peso;
    } else if (material.categoria === t.paint) {
      const unidades = parseFloat(material.cantidad || '1');
      const mlPorUnidad = parseFloat(material.cantidadPintura || '1');
      materialAGuardar.cantidadRestante = (unidades * mlPorUnidad).toString();
      materialAGuardar.cantidad = material.cantidadPintura; // ml por frasco
    } else if (material.categoria === t.keychainRings) {
      // Para aros de llavero: cantidadInicial se mantiene fijo, cantidadRestante y cantidad son iguales al inicio
      materialAGuardar.cantidadRestante = material.cantidad;
      materialAGuardar.cantidad = material.cantidad; // Stock actual en unidades
    } else {
      // Para categorías personalizadas: cantidadInicial se mantiene fijo, cantidadRestante y cantidad son iguales al inicio
      materialAGuardar.cantidadRestante = material.cantidad || '0';
      materialAGuardar.cantidad = material.cantidad || '0'; // Stock actual en unidades
    }
    
    // Asegurar que el color se guarde en el campo principal según la categoría
    if (material.categoria === t.paint) {
      materialAGuardar.color = material.colorPintura;
    } else if (material.categoria === t.keychainRings) {
      materialAGuardar.color = material.color || '#00e676';
    }
    
    // Guardar la ruta del PNG seleccionado
    if (material.svgSeleccionado) {
      materialAGuardar.imagen = material.svgSeleccionado;
    }
    
    try {
      await agregarMaterial(materialAGuardar);
      setAlertType('success');
      setAlertMessage(t.successSave);
      setShowAlert(true);
      setMaterial({
        categoria: '',
        tipo: '',
        subtipo: '',
        color: '',
        tipoPintura: '',
        colorPintura: '',
        cantidadPintura: '',
        precio: '',
        cantidad: '',
        peso: '',
        imagen: null,
        svgSeleccionado: '',
        marca: '',
      });
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(t.errorSave + (error.message || error));
      setShowAlert(true);
    }
  };

  // Lógica para agregar nueva categoría personalizada usando el hook
  const handleAgregarCategoria = async () => {
    if (!nuevaCategoria.nombre) return;
    try {
      const nuevaCat = { 
        ...nuevaCategoria, 
        tieneTipo: usarTipo, 
        tieneColor: usarColor, 
        tieneMarca: usarMarca 
      };
      await agregarCategoriaHook(nuevaCat);
      setMaterial({
        ...material,
        categoria: nuevaCategoria.nombre,
        tipo: nuevaCategoria.tipo,
        color: nuevaCategoria.color,
      });
      setNuevaCategoria({ nombre: '', tipo: '', color: '', costo: '' });
      setMostrarNuevaCategoria(false);
      setUsarTipo(false);
      setUsarColor(false);
      setUsarMarca(false);
      setMostrarSelectorColor(false);
    } catch (error) {
      console.error('Error al agregar categoría:', error);
    }
  };

  // Eliminar categoría personalizada usando el hook
  const handleEliminarCategoria = async (nombre: string) => {
    try {
      await eliminarCategoriaHook(nombre);
      if (material.categoria === nombre) {
        setMaterial({ ...material, categoria: '', tipo: '', color: '', precio: '' });
      }
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
    }
  };

  // Lista de marcas comunes
  const MARCAS_COMUNES = [
    'PrintaLot', '3DFil', 'eSun', 'Creality', 'Anycubic', 'Elegoo', 'Sunlu', 'Overture', 'Sakata', 'Polymaker', 'Amazon Basics', 'Otra...'
  ];

  const [marcasPersonalizadas, setMarcasPersonalizadas] = useState<string[]>([]);
  const [mostrarNuevaMarca, setMostrarNuevaMarca] = useState(false);
  const [nuevaMarca, setNuevaMarca] = useState('');

  // Marcas específicas por categoría
  const MARCAS_POR_CATEGORIA = {
    'Filamento': [
      'PrintaLot', '3DFil', 'eSun', 'Creality', 'Anycubic', 'Elegoo', 'Sunlu', 'Overture', 'Sakata', 'Polymaker', 'Amazon Basics', 'Otra...'
    ],
    'Resina': [
      'Elegoo', 'Anycubic', 'Creality', 'Sunlu', 'Siraya Tech', 'Phrozen', 'Peopoly', 'Monocure', 'Otra...'
    ],
    'Pintura': [
      'Vallejo', 'Citadel', 'Tamiya', 'Testors', 'Humbrol', 'Revell', 'Model Master', 'Otra...'
    ],
    'Aros de llavero': [
      'Generic', 'Metal', 'Plastic', 'Custom', 'Otra...'
    ]
  };

  // Estado para marcas por categoría
  const [marcasFirestore, setMarcasFirestore] = useState<string[]>([]);

  // Función para cargar marcas de Firestore según la categoría seleccionada
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

  // Cargar marcas cada vez que cambia la categoría
  React.useEffect(() => {
    setMarcasFirestore([]);
    if (material.categoria) cargarMarcasFirestore(material.categoria);
  }, [material.categoria]);

  // Función para agregar una nueva marca a Firestore
  const agregarMarcaFirestore = async (nombreMarca: string) => {
    const user = auth.currentUser;
    if (!user || !material.categoria || !nombreMarca) return;
    let ref;
    if (categoriasBase.includes(material.categoria)) {
      ref = collection(db, 'usuarios', user.uid, 'categoriasBase', material.categoria, 'marcas');
    } else {
      ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', material.categoria, 'marcas');
    }
    await addDoc(ref, { nombre: nombreMarca });
    cargarMarcasFirestore(material.categoria);
  };

  // Modifica getMarcasDisponibles para combinar las marcas por defecto y las de Firestore
  const getMarcasDisponibles = () => {
    if (!material.categoria) return [];
    let marcas;
    if (categoriasBase.includes(material.categoria)) {
      marcas = [...(MARCAS_POR_CATEGORIA[material.categoria as keyof typeof MARCAS_POR_CATEGORIA] || []), ...marcasFirestore];
    } else {
      marcas = [...marcasFirestore];
    }
    // Cambia 'Otra...' por 'Agregar +' y asegúrate que solo esté una vez
    marcas = marcas.filter(m => m !== 'Otra...' && m !== 'Agregar +');
    marcas.push('Agregar +');
    return marcas;
  };

  // 2. Cuando el usuario selecciona una categoría personalizada para agregar un material:
  const categoriaPersonalizada = React.useMemo(() => categoriasPersonalizadasData.find(cat => cat.nombre === material.categoria), [material.categoria, categoriasPersonalizadasData]);
  // Asegura que mostrarTipo, mostrarColor y mostrarMarca sean booleanos:
  const mostrarTipo = !!categoriaPersonalizada?.tieneTipo;
  const mostrarColor = !!categoriaPersonalizada?.tieneColor;
  const mostrarMarca = !!categoriaPersonalizada?.tieneMarca;

  // 1. Estado para tipos de la categoría personalizada seleccionada
  const [tiposPersonalizados, setTiposPersonalizados] = useState<string[]>([]);

  // El hook useCategoriasPersonalizadas ya maneja la carga automática de categorías

  // 3. Render dinámico de tipos y colores:
  // (Ya implementado, pero asegúrate de que tiposPersonalizados y material.tipo se reinicien al cambiar de categoría personalizada)
  React.useEffect(() => {
    setTiposPersonalizados([]);
    setMaterial(prev => ({ ...prev, tipo: '', color: '' }));
  }, [material.categoria]);

  // Estado para mostrar el input de nuevo tipo
  const [mostrarNuevoTipo, setMostrarNuevoTipo] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');

  // 1. Estado para modo eliminación múltiple y selección en marcas y tipos
  const [modoEliminarMarca, setModoEliminarMarca] = useState(false);
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<string[]>([]);
  const [mostrarConfirmarEliminarMarca, setMostrarConfirmarEliminarMarca] = useState(false);

  const [modoEliminarTipo, setModoEliminarTipo] = useState(false);
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
  const [mostrarConfirmarEliminarTipo, setMostrarConfirmarEliminarTipo] = useState(false);

  // Agrega la función para eliminar marcas de Firestore
  async function eliminarMarcaFirestore(nombreMarca: string) {
    const user = auth.currentUser;
    if (!user || !material.categoria || !nombreMarca) return;
    let ref;
    if (categoriasBase.includes(material.categoria)) {
      ref = collection(db, 'usuarios', user.uid, 'categoriasBase', material.categoria, 'marcas');
    } else {
      ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', material.categoria, 'marcas');
    }
    const q = query(ref, where('nombre', '==', nombreMarca));
    const snapshot = await getDocs(q);
    for (const docu of snapshot.docs) {
      await deleteDoc(docu.ref);
    }
  }

  // 1. Función para guardar un tipo personalizado en Firestore
  const agregarTipoPersonalizadoFirestore = async (nombreTipo: string) => {
    const user = auth.currentUser;
    if (!user || !material.categoria || !nombreTipo) return;
    const ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', material.categoria, 'tipos');
    await addDoc(ref, { nombre: nombreTipo });
  };

  // 2. Función para cargar tipos personalizados desde Firestore
  const cargarTiposPersonalizadosFirestore = async (categoria: string) => {
    const user = auth.currentUser;
    if (!user || !categoria) return;
    const ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', categoria, 'tipos');
    const snapshot = await getDocs(ref);
    const tipos = snapshot.docs.map(docu => (docu.data() as {nombre: string}).nombre).filter(Boolean);
    setTiposPersonalizados(tipos);
  };

  // 3. Función para eliminar tipos personalizados de Firestore
  const eliminarTipoPersonalizadoFirestore = async (nombreTipo: string) => {
    const user = auth.currentUser;
    if (!user || !material.categoria || !nombreTipo) return;
    const ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', material.categoria, 'tipos');
    const q = query(ref, where('nombre', '==', nombreTipo));
    const snapshot = await getDocs(q);
    for (const docu of snapshot.docs) {
      await deleteDoc(docu.ref);
    }
  };

  // Modifica el useEffect para cargar tipos personalizados desde Firestore al cambiar de categoría personalizada
  React.useEffect(() => {
    if (material.categoria && !categoriasBase.includes(material.categoria)) {
      cargarTiposPersonalizadosFirestore(material.categoria);
    } else {
      setTiposPersonalizados([]);
    }
    setMaterial(prev => ({ ...prev, tipo: '', color: '' }));
  }, [material.categoria]);

 
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#0d0d0d' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{t.newMaterial}</Text>
        </View>

        {/* Selector visual de PNGs pequeño */}
        <Text style={styles.label}>{t.selectImage}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {PNG_OPTIONS_ORDENADAS.map(({ label, value, source }) => (
            <TouchableOpacity
              key={value}
              style={{
                borderRadius: 16,
                borderWidth: material.svgSeleccionado === value ? 3 : 1,
                borderColor: material.svgSeleccionado === value ? '#00e676' : '#333',
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
                setMaterial({
                  ...material,
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

        {/* Selector de categoría con pastilla + y X para eliminar */}
        <Text style={styles.label}>{t.category}</Text>
        <View style={[styles.pastillasContainer, { alignItems: 'center' }]}> 
          {categoriasBase.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.pastilla,
                material.categoria === cat ? styles.pastillaSeleccionada : null
              ]}
              onPress={() => setMaterial({
                ...material,
                categoria: cat,
                tipo: '',
                subtipo: '',
                color: '',
                tipoPintura: '',
                colorPintura: '',
                cantidadPintura: '',
                peso: '',
                marca: '', // Limpiar marca al cambiar categoría
                // Preservar la imagen seleccionada
              })}
            >
              <Text style={[
                styles.pastillaTexto,
                material.categoria === cat ? styles.pastillaTextoSeleccionada : null
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
          {categoriasPersonalizadas.map((cat, idx) => (
            <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
              <TouchableOpacity
                style={[
                  styles.pastilla,
                  material.categoria === cat ? styles.pastillaSeleccionada : null,
                  { flexDirection: 'row', alignItems: 'center', paddingRight: 4 }
                ]}
                onPress={() => setMaterial({
                  ...material,
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
                  material.categoria === cat ? styles.pastillaTextoSeleccionada : null
                ]}>{cat}</Text>
                <TouchableOpacity onPress={() => handleEliminarCategoria(cat)} style={{ marginLeft: 6, backgroundColor: 'transparent', borderRadius: 10, padding: 2 }}>
                  <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          ))}
          {/* Pastilla + */}
          <TouchableOpacity
            style={[styles.pastilla, { backgroundColor: '#222', borderColor: '#00e676', borderWidth: 2 }]}
            onPress={() => setMostrarNuevaCategoria(true)}
          >
            <Text style={{ color: '#00e676', fontSize: 22, fontWeight: 'bold' }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Formulario para nueva categoría personalizada */}
        {mostrarNuevaCategoria && (
          <View style={styles.nuevaCategoriaContainer}>
            <Text style={styles.label}>{t.newCategory}</Text>
            <TextInput
              style={styles.input}
              value={nuevaCategoria.nombre}
              onChangeText={text => setNuevaCategoria({ ...nuevaCategoria, nombre: text })}
              placeholder={t.categoryName}
            />
            {/* Switch para activar/desactivar campo tipo */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={styles.label}>{t.addType}</Text>
              <TouchableOpacity
                style={[styles.pastilla, usarTipo ? { backgroundColor: '#00e676', borderColor: '#00e676' } : { backgroundColor: '#222', borderColor: '#333' }]}
                onPress={() => setUsarTipo(!usarTipo)}
              >
                <Text style={[styles.pastillaTexto, usarTipo && { color: '#222', fontWeight: 'bold' }]}>{usarTipo ? t.yes : t.no}</Text>
              </TouchableOpacity>
            </View>
            {/* Switch para activar/desactivar campo color */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={styles.label}>{t.addColor}</Text>
              <TouchableOpacity
                style={[styles.pastilla, usarColor ? { backgroundColor: '#00e676', borderColor: '#00e676' } : { backgroundColor: '#222', borderColor: '#333' }]}
                onPress={() => setUsarColor(!usarColor)}
              >
                <Text style={[styles.pastillaTexto, usarColor && { color: '#222', fontWeight: 'bold' }]}>{usarColor ? t.yes : t.no}</Text>
              </TouchableOpacity>
            </View>
            {/* Switch para activar/desactivar campo marca */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={styles.label}>{t.addBrand}</Text>
              <TouchableOpacity
                style={[styles.pastilla, usarMarca ? { backgroundColor: '#00e676', borderColor: '#00e676' } : { backgroundColor: '#222', borderColor: '#333' }]}
                onPress={() => setUsarMarca(!usarMarca)}
              >
                <Text style={[styles.pastillaTexto, usarMarca && { color: '#222', fontWeight: 'bold' }]}>{usarMarca ? t.yes : t.no}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => { setMostrarNuevaCategoria(false); setNuevaCategoria({ nombre: '', tipo: '', color: '', costo: '' }); setUsarTipo(false); setUsarColor(false); setUsarMarca(false); }} style={[styles.pastilla, { backgroundColor: '#a0a0a0' }]}> 
                <Text style={{ color: '#222' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAgregarCategoria}
                style={[styles.pastilla, { backgroundColor: '#00e676' }, !nuevaCategoria.nombre && { opacity: 0.5 }]}
                disabled={!nuevaCategoria.nombre}
              > 
                <Text style={{ color: '#222', fontWeight: 'bold' }}>{t.add}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Resumen de selección */}
        <View style={styles.resumenContainer}>
          <Text style={styles.resumenTitulo}>{t.selectionSummary}</Text>
          <Text style={styles.resumenTexto}>{t.category}: <Text style={styles.resumenDato}>{material.categoria || t.dash}</Text></Text>
          <Text style={styles.resumenTexto}>{t.brand}: <Text style={styles.resumenDato}>{material.marca || t.dash}</Text></Text>
          {material.categoria === t.filament && (
            <>
              <Text style={styles.resumenTexto}>{t.type}: <Text style={styles.resumenDato}>{material.tipo || t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.subtype}: <Text style={styles.resumenDato}>{material.subtipo || t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.color || t.dash}</Text></Text>
            </>
          )}
          {material.categoria === t.resin && (
            <>
              <Text style={styles.resumenTexto}>{t.type}: <Text style={styles.resumenDato}>{material.tipo || t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.color || t.dash}</Text></Text>
            </>
          )}
          {material.categoria === t.paint && (
            <>
              <Text style={styles.resumenTexto}>{t.type}: <Text style={styles.resumenDato}>{material.tipoPintura || t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.colorPintura || t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.quantity}: <Text style={styles.resumenDato}>{material.cantidadPintura || t.dash}</Text></Text>
            </>
          )}
          {material.categoria === t.keychainRings && (
            <>
              <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.color || t.dash}</Text></Text>
            </>
          )}
          {/* Resumen dinámico para categorías personalizadas */}
          {material.categoria && !categoriasBase.includes(material.categoria) && (
            <>
              {mostrarTipo && (
                <Text style={styles.resumenTexto}>{t.type}: <Text style={styles.resumenDato}>{material.tipo || t.dash}</Text></Text>
              )}
              {mostrarColor && (
                <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.color || t.dash}</Text></Text>
              )}
              {mostrarMarca && (
                <Text style={styles.resumenTexto}>{t.brand}: <Text style={styles.resumenDato}>{material.marca || t.dash}</Text></Text>
              )}
            </>
          )}
          <Text style={styles.resumenTexto}>{t.generatedName}: <Text style={styles.resumenDato}>{generarNombreMaterial({...material, id: '', nombre: ''}) || t.dash}</Text></Text>
        </View>

        {/* Selector de marcas para categorías base y personalizadas */}
        {(categoriasBase.includes(material.categoria) || mostrarMarca) && (
          <>
            <Text style={styles.label}>{t.brand}</Text>
            <View style={[styles.pastillasContainer, { alignItems: 'center' }]}> 
              {getMarcasDisponibles().filter(m => m !== 'Agregar +').map((marca) => (
                <TouchableOpacity
                  key={marca}
                  style={[
                    styles.pastilla,
                    material.marca === marca && !modoEliminarMarca && styles.pastillaSeleccionada,
                    modoEliminarMarca && marcasSeleccionadas.includes(marca) && { backgroundColor: '#e53935', borderColor: '#e53935' }
                  ]}
                  onPress={() => {
                    if (modoEliminarMarca) {
                      if (marca !== 'Agregar +') {
                        setMarcasSeleccionadas(marcasSeleccionadas.includes(marca)
                          ? marcasSeleccionadas.filter(m => m !== marca)
                          : [...marcasSeleccionadas, marca]);
                      }
                    } else {
                      setMaterial({ ...material, marca });
                    }
                  }}
                  disabled={modoEliminarMarca}
                >
                  <Text style={[
                    styles.pastillaTexto,
                    material.marca === marca && !modoEliminarMarca && styles.pastillaTextoSeleccionada,
                    modoEliminarMarca && marcasSeleccionadas.includes(marca) && { color: '#fff', fontWeight: 'bold' }
                  ]}>{marca}</Text>
                </TouchableOpacity>
              ))}
              {/* Botón Agregar + (idéntico a tipo de pinceles, solo visible si no está abierto el formulario) */}
              {!mostrarNuevaMarca && (
                <TouchableOpacity
                  style={[
                    styles.pastilla,
                    { backgroundColor: '#222', borderColor: '#00e676', borderWidth: 2, marginBottom: 8 }
                  ]}
                  onPress={() => setMostrarNuevaMarca(true)}
                  disabled={modoEliminarMarca}
                >
                  <Text style={{ color: '#00e676', fontWeight: 'bold' }}>{t.add}</Text>
                </TouchableOpacity>
              )}
              {/* Formulario embebido para nueva marca */}
              {mostrarNuevaMarca && (
                <View style={[styles.nuevaCategoriaContainer, { marginTop: 8, marginBottom: 8 }]}> 
                  <Text style={styles.label}>{t.newBrand}</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaMarca}
                    onChangeText={setNuevaMarca}
                    placeholder={t.brandName}
                    placeholderTextColor="#888"
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                    <TouchableOpacity onPress={() => { setMostrarNuevaMarca(false); setNuevaMarca(''); }} style={[styles.pastilla, { backgroundColor: '#a0a0a0' }]}> 
                      <Text style={{ color: '#222' }}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        await agregarMarcaFirestore(nuevaMarca.trim());
                        setMostrarNuevaMarca(false);
                        setNuevaMarca('');
                        setMaterial(prev => ({ ...prev, marca: '' }));
                      }}
                      style={[styles.pastilla, { backgroundColor: '#00e676' }, !nuevaMarca.trim() && { opacity: 0.5 }]}
                      disabled={!nuevaMarca.trim()}
                    > 
                      <Text style={{ color: '#222', fontWeight: 'bold' }}>{t.add}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {/* Botón Eliminar - */}
              <TouchableOpacity
                style={[
                  styles.pastilla,
                  { backgroundColor: '#222', borderColor: '#e53935', borderWidth: 2, marginBottom: 8 }
                ]}
                onPress={() => {
                  setModoEliminarMarca(!modoEliminarMarca);
                  setMarcasSeleccionadas([]);
                }}
              >
                <Text style={{ color: '#e53935', fontWeight: 'bold' }}>{t.delete}</Text>
              </TouchableOpacity>
            </View>
            {/* Botón Borrar y confirmación */}
            {modoEliminarMarca && marcasSeleccionadas.length > 0 && (
              <TouchableOpacity
                style={{ backgroundColor: '#e53935', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 8 }}
                onPress={() => setMostrarConfirmarEliminarMarca(true)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.deleteSelected} ({marcasSeleccionadas.length})</Text>
              </TouchableOpacity>
            )}
            {/* Modal de confirmación para eliminar marcas */}
            <Modal visible={mostrarConfirmarEliminarMarca} transparent animationType="fade">
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: '#e53935', borderWidth: 2 }}>
                  <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>{t.confirmDeleteBrands}</Text>
                  <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>{t.thisActionCannotBeUndone}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                    <TouchableOpacity onPress={() => setMostrarConfirmarEliminarMarca(false)} style={[styles.pastilla, { backgroundColor: '#a0a0a0' }]}> 
                      <Text style={{ color: '#222' }}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        // Eliminar marcas seleccionadas de Firestore
                        for (const marca of marcasSeleccionadas) {
                          await eliminarMarcaFirestore(marca);
                        }
                        setMostrarConfirmarEliminarMarca(false);
                        setModoEliminarMarca(false);
                        setMarcasSeleccionadas([]);
                        cargarMarcasFirestore(material.categoria);
                        if (marcasSeleccionadas.includes(material.marca)) setMaterial({ ...material, marca: '' });
                      }}
                      style={[styles.pastilla, { backgroundColor: '#e53935' }]}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.delete}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </>
        )}

        {/* Formulario dinámico según categoría */}
        <View style={styles.formContainer}>
          {/* FILAMENTO */}
          {material.categoria === t.filament && (
            <>
              <Text style={styles.label}>{t.filamentType}</Text>
              <View style={styles.pastillasContainer}>
                {tiposFilamento.map((t) => (
                  <TouchableOpacity
                    key={t.tipo}
                    style={[
                      styles.pastilla,
                      material.tipo === t.tipo ? styles.pastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterial({ ...material, tipo: t.tipo, subtipo: '' })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      material.tipo === t.tipo ? styles.pastillaTextoSeleccionada : null
                    ]}>{t.tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {material.tipo !== '' && (
                <>
                  <Text style={styles.label}>{t.subtype}</Text>
                  <View style={styles.pastillasContainer}>
                    {subtipos.map((sub) => (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.pastilla,
                          material.subtipo === sub ? styles.pastillaSeleccionada : null
                        ]}
                        onPress={() => setMaterial({ ...material, subtipo: sub })}
                      >
                        <Text style={[
                          styles.pastillaTexto,
                          material.subtipo === sub ? styles.pastillaTextoSeleccionada : null
                        ]}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <Text style={styles.label}>{t.color}</Text>
              <ColorSelector
                selectedColor={material.color}
                onColorSelect={(color) => setMaterial({ ...material, color })}
              />
              <Text style={styles.label}>{t.bobbinWeight}</Text>
              <TextInput
                style={styles.input}
                value={material.peso}
                onChangeText={(text) => setMaterial({ ...material, peso: text })}
                placeholder={t.exampleWeight}
                keyboardType="numeric"
              />
            </>
          )}

          {/* RESINA */}
          {material.categoria === t.resin && (
            <>
              <Text style={styles.label}>{t.resinType}</Text>
              <View style={styles.pastillasContainer}>
                {tiposResina.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.pastilla,
                      material.tipo === t ? styles.pastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterial({ ...material, tipo: t, subtipo: '' })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      material.tipo === t ? styles.pastillaTextoSeleccionada : null
                    ]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>{t.color}</Text>
              <ColorSelector
                selectedColor={material.color}
                onColorSelect={(color) => setMaterial({ ...material, color })}
              />
              <Text style={styles.label}>{t.resinWeight}</Text>
              <TextInput
                style={styles.input}
                value={material.peso}
                onChangeText={(text) => setMaterial({ ...material, peso: text })}
                placeholder={t.exampleWeight}
                keyboardType="numeric"
              />
            </>
          )}

          {/* PINTURA */}
          {material.categoria === t.paint && (
            <>
              <Text style={styles.label}>{t.paintType}</Text>
              <View style={styles.pastillasContainer}>
                {tiposPintura.map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.pastilla,
                      material.tipoPintura === tipo ? styles.pastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterial({ ...material, tipoPintura: tipo })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      material.tipoPintura === tipo ? styles.pastillaTextoSeleccionada : null
                    ]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>{t.color}</Text>
              <ColorSelector
                selectedColor={material.colorPintura}
                onColorSelect={(color) => setMaterial({ ...material, colorPintura: color })}
              />
              <Text style={styles.label}>{t.quantity}</Text>
              <TextInput
                style={styles.input}
                value={material.cantidadPintura}
                onChangeText={(text) => setMaterial({ ...material, cantidadPintura: text })}
                placeholder={t.exampleQuantity}
                keyboardType="numeric"
              />
            </>
          )}

          {/* AROS DE LLAVERO */}
          {material.categoria === t.keychainRings && (
            <>
              <Text style={styles.label}>{t.color}</Text>
              <ColorSelector
                selectedColor={material.color}
                onColorSelect={(color) => setMaterial({ ...material, color })}
              />
            </>
          )}

          {/* CAMPOS GENERALES (para todas las categorías) */}
          {material.categoria && !categoriasBase.includes(material.categoria) && (
            <>
              {mostrarTipo && (
                <>
                  <Text style={styles.label}>{`${t.typeOf}${material.categoria.toLowerCase()}`}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                    {tiposPersonalizados.map((tipo, idx) => (
                      <TouchableOpacity
                        key={tipo}
                        style={[
                          styles.pastilla,
                          material.tipo === tipo && !modoEliminarTipo && styles.pastillaSeleccionada,
                          modoEliminarTipo && tiposSeleccionados.includes(tipo) && { backgroundColor: '#e53935', borderColor: '#e53935' }
                        ]}
                        onPress={() => {
                          if (modoEliminarTipo) {
                            setTiposSeleccionados(tiposSeleccionados.includes(tipo)
                              ? tiposSeleccionados.filter(t => t !== tipo)
                              : [...tiposSeleccionados, tipo]);
                          } else {
                            setMaterial({ ...material, tipo });
                          }
                        }}
                      >
                        <Text style={[
                          { color: '#fff', fontSize: 14 },
                          material.tipo === tipo && !modoEliminarTipo && styles.pastillaTextoSeleccionada,
                          modoEliminarTipo && tiposSeleccionados.includes(tipo) && { color: '#fff', fontWeight: 'bold' }
                        ]}>{tipo}</Text>
                      </TouchableOpacity>
                    ))}
                    {/* Botón Eliminar - */}
                    <TouchableOpacity
                      style={[
                        styles.pastilla,
                        { backgroundColor: '#222', borderColor: '#e53935', borderWidth: 2, marginBottom: 8 }
                      ]}
                      onPress={() => {
                        setModoEliminarTipo(!modoEliminarTipo);
                        setTiposSeleccionados([]);
                      }}
                    >
                      <Text style={{ color: '#e53935', fontWeight: 'bold' }}>{t.delete}</Text>
                    </TouchableOpacity>
                    {/* Botón Agregar + */}
                    <TouchableOpacity
                      style={[
                        styles.pastilla,
                        { backgroundColor: '#222', borderColor: '#00e676', borderWidth: 2, marginBottom: 8 }
                      ]}
                      onPress={() => setMostrarNuevoTipo(true)}
                      disabled={modoEliminarTipo}
                    >
                      <Text style={{ color: '#00e676', fontWeight: 'bold' }}>{t.add}</Text>
                    </TouchableOpacity>
                  </View>
                  {mostrarNuevoTipo && (
                    <View style={styles.nuevaCategoriaContainer}>
                      <Text style={styles.label}>{t.newType}</Text>
                      <TextInput
                        style={styles.input}
                        value={nuevoTipo}
                        onChangeText={setNuevoTipo}
                        placeholder={`${t.nameOf}${material.categoria.toLowerCase()}`}
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <TouchableOpacity onPress={() => { setMostrarNuevoTipo(false); setNuevoTipo(''); }} style={[styles.pastilla, { backgroundColor: '#a0a0a0' }]}> 
                          <Text style={{ color: '#222' }}>{t.cancel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            if (nuevoTipo.trim() && !tiposPersonalizados.includes(nuevoTipo.trim())) {
                              setTiposPersonalizados([...tiposPersonalizados, nuevoTipo.trim()]);
                              setMaterial({ ...material, tipo: nuevoTipo.trim() });
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
                  {/* Botón Borrar y confirmación */}
                  {modoEliminarTipo && tiposSeleccionados.length > 0 && (
                    <TouchableOpacity
                      style={{ backgroundColor: '#e53935', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 8 }}
                      onPress={() => setMostrarConfirmarEliminarTipo(true)}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.deleteSelected} ({tiposSeleccionados.length})</Text>
                    </TouchableOpacity>
                  )}
                  {/* Modal de confirmación para eliminar tipos */}
                  <Modal visible={mostrarConfirmarEliminarTipo} transparent animationType="fade">
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                      <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 24, width: '85%', maxWidth: 350, borderColor: '#e53935', borderWidth: 2 }}>
                        <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>{t.confirmDeleteTypes}</Text>
                        <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>{t.thisActionCannotBeUndone}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                          <TouchableOpacity onPress={() => setMostrarConfirmarEliminarTipo(false)} style={[styles.pastilla, { backgroundColor: '#a0a0a0' }]}> 
                            <Text style={{ color: '#222' }}>{t.cancel}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setTiposPersonalizados(tiposPersonalizados.filter(t => !tiposSeleccionados.includes(t)));
                              setMostrarConfirmarEliminarTipo(false);
                              setModoEliminarTipo(false);
                              setTiposSeleccionados([]);
                              tiposSeleccionados.forEach(nombreTipo => eliminarTipoPersonalizadoFirestore(nombreTipo));
                              if (tiposSeleccionados.includes(material.tipo)) setMaterial({ ...material, tipo: '' });
                            }}
                            style={[styles.pastilla, { backgroundColor: '#e53935' }]}
                          >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.delete}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
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
                          borderWidth: material.color === col ? 3 : 2,
                          borderColor: material.color === col ? '#00e676' : '#333',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setMaterial({ ...material, color: col })}
                      >
                        {material.color === col && <Text style={{ color: col === '#fff' ? '#222' : '#fff', fontWeight: 'bold' }}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
          <Text style={styles.label}>{t.unitPrice}</Text>
          <TextInput
            style={styles.input}
            value={material.precio}
            onChangeText={(text) => setMaterial({ ...material, precio: text })}
            placeholder={t.examplePrice}
            keyboardType="numeric"
          />
          <Text style={styles.label}>{t.availableQuantity}</Text>
          <TextInput
            style={styles.input}
            value={material.cantidad}
            onChangeText={(text) => setMaterial({ ...material, cantidad: text })}
            placeholder={t.exampleQuantity}
            keyboardType="numeric"
          />
      </View>

        {/* Botón Guardar */}
        <TouchableOpacity style={[styles.guardarBtn, !puedeGuardar && { opacity: 0.5 }]} onPress={handleGuardar} disabled={!puedeGuardar}>
          <Text style={styles.guardarText}>{t.save}</Text>
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
        {/* Modal para agregar nueva marca */}
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
  cambiarImagenBtn: {
    backgroundColor: '#181818',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  cambiarImagenText: {
    color: '#00e676',
    fontSize: 14,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  materialImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  imagePlaceholderText: {
    color: '#a0a0a0',
    fontSize: 14,
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
  pickerContainer: {
    backgroundColor: '#181818',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 5,
  },
  picker: {
    color: 'white',
    height: 50,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    width: '30%',
    textAlign: 'center',
  },
  guardarBtn: {
    backgroundColor: '#00e676',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  guardarText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pastillasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
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
  coloresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  colorPastilla: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPastillaSeleccionada: {
    borderColor: '#00e676',
    borderWidth: 3,
  },
  checkColor: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 18,
  },
  colorNombre: {
    color: '#00e676',
    fontSize: 14,
    marginBottom: 4,
    marginLeft: 4,
  },
  resumenContainer: {
    backgroundColor: '#181818',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  resumenTitulo: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  resumenTexto: {
    color: 'white',
    fontSize: 14,
    marginBottom: 2,
  },
  resumenDato: {
    color: '#00e676',
    fontWeight: 'bold',
  },
  nuevaCategoriaContainer: {
    backgroundColor: '#181818',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00e676',
  },
});

export default AddMaterialScreen; 