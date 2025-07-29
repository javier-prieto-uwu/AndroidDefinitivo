import { Picker } from '@react-native-picker/picker';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, query, where, doc } from 'firebase/firestore';
import { auth, app } from '../api/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { ColorSelector, CategorySelector } from '../components/Material';
import { useMateriales, useCategoriasPersonalizadas } from '../hooks';
import { generarNombreMaterial, validarMaterialCompleto } from '../utils';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales';
import { Ionicons } from '@expo/vector-icons';

// Componente separado para el formulario de agregar
const AddForm = React.memo(({
  visible,
  onAdd,
  onCancel,
  placeholder,
  label,
  addLabel,
  cancelLabel
}: {
  visible: boolean;
  onAdd: (value: string) => void;
  onCancel: () => void;
  placeholder: string;
  label: string;
  addLabel: string;
  cancelLabel: string;
}) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (visible) {
      setValue('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [visible]);

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  if (!visible) return null;

  return (
    <View style={[styles.nuevaMarcaContainer, { marginTop: 8, marginBottom: 8 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#888"
        autoFocus={false}
        blurOnSubmit={false}
        returnKeyType="done"
        onSubmitEditing={handleAdd}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <TouchableOpacity
          onPress={handleCancel}
          style={[styles.pastilla, { backgroundColor: '#a0a0a0', flex: 1, marginRight: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
        >
          <Ionicons name="close" size={18} color="#222" />
          <Text style={{ color: '#222', marginLeft: 4 }}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAdd}
          style={[styles.pastilla, { backgroundColor: '#00e676', flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, !value.trim() && { opacity: 0.5 }]}
          disabled={!value.trim()}
        >
          <Ionicons name="checkmark" size={18} color="#222" />
          <Text style={{ color: '#222', fontWeight: 'bold', marginLeft: 4 }}>{addLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

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

// TIPOS Y SUBTIPOS INTERNOS EN ESPAÑOL
const TIPOS_FILAMENTO = [
  { tipo: 'PLA', subtipos: ['Normal', 'Seda', 'Plus', 'Madera', 'Brillante', 'Mate', 'Flexible', 'Glow', 'Transparente', 'Multicolor', 'Reciclado', 'Carbono', 'Alta temperatura'] },
  { tipo: 'ABS', subtipos: ['Normal', 'Plus', 'Reciclado', 'Transparente', 'Ignífugo', 'Carbono'] },
  { tipo: 'PETG', subtipos: ['Normal', 'Transparente', 'Reciclado', 'Carbono'] },
  { tipo: 'TPU', subtipos: ['85A', '95A', 'Flexible', 'Transparente'] },
  { tipo: 'Nylon', subtipos: ['Normal', 'Carbono', 'Vidrio'] },
  { tipo: 'PC', subtipos: ['Normal', 'Carbono'] },
  { tipo: 'HIPS', subtipos: ['Normal'] },
  { tipo: 'ASA', subtipos: ['Normal'] },
  { tipo: 'PVA', subtipos: ['Normal'] },
  { tipo: 'PP', subtipos: ['Normal'] },
  { tipo: 'Metal', subtipos: ['Normal'] },
];

// --- INICIO DE LA CORRECCIÓN 1 ---
const TIPOS_RESINA = [
  'Estándar',
  'Tough', // Corregido: se quita "(tipo ABS)"
  'Flexible',
  'Alta temperatura',
  'Dental / Biocompatible',
  'Transparente',
  'Rápida',
  'Especiales',
];
// --- FIN DE LA CORRECCIÓN 1 ---

const TIPOS_PINTURA = ['Acrílica', 'Esmalte', 'Spray', 'Óleo', 'Vinílica', 'Acuarela'];
const COLORES = [
  { nombre: 'Negro', valor: '#222' },
  { nombre: 'Blanco', valor: '#fff' },
  { nombre: 'Rojo', valor: '#e53935' },
  { nombre: 'Rojo Oscuro', valor: '#c62828' },
  { nombre: 'Rosa', valor: '#e91e63' },
  { nombre: 'Rosa Claro', valor: '#f8bbd9' },
  { nombre: 'Naranja', valor: '#fb8c00' },
  { nombre: 'Naranja Claro', valor: '#ffcc80' },
  { nombre: 'Amarillo', valor: '#fbc02d' },
  { nombre: 'Amarillo Claro', valor: '#fff59d' },
  { nombre: 'Verde', valor: '#43a047' },
  { nombre: 'Verde Claro', valor: '#81c784' },
  { nombre: 'Verde Azulado', valor: '#26a69a' },
  { nombre: 'Azul', valor: '#1e88e5' },
  { nombre: 'Azul Claro', valor: '#64b5f6' },
  { nombre: 'Azul Oscuro', valor: '#1565c0' },
  { nombre: 'Índigo', valor: '#3f51b5' },
  { nombre: 'Morado', valor: '#8e24aa' },
  { nombre: 'Morado Claro', valor: '#ba68c8' },
  { nombre: 'Violeta', valor: '#9c27b0' },
  { nombre: 'Gris', valor: '#757575' },
  { nombre: 'Gris Claro', valor: '#bdbdbd' },
  { nombre: 'Gris Oscuro', valor: '#424242' },
  { nombre: 'Marrón', valor: '#8d6e63' },
  { nombre: 'Marrón Claro', valor: '#a1887f' },
  { nombre: 'Beige', valor: '#d7ccc8' },
  { nombre: 'Transparente', valor: '#e0e0e0' },
  { nombre: 'Oro', valor: '#ffd700' },
  { nombre: 'Plata', valor: '#b0b0b0' },
  { nombre: 'Cobre', valor: '#b87333' },
  { nombre: 'Bronce', valor: '#cd7f32' },
  { nombre: 'Turquesa', valor: '#00bcd4' },
  { nombre: 'Coral', valor: '#ff7043' },
  { nombre: 'Lavanda', valor: '#e1bee7' },
  { nombre: 'Menta', valor: '#b2dfdb' },
  { nombre: 'Melocotón', valor: '#ffccbc' },
  { nombre: 'Lima', valor: '#cddc39' },
  { nombre: 'Cian', valor: '#00bcd4' },
  { nombre: 'Magenta', valor: '#e91e63' },
];

const AddMaterialScreen: React.FC = () => {
  const { lang } = useLanguage();
  const t = translations[lang];
  
  // MAPEO DE TRADUCCIÓN PARA UI (debe estar aquí para acceder a 't')
  const TIPOS_FILAMENTO_UI = {
    'PLA': t.pla,
    'ABS': t.abs,
    'PETG': t.petg,
    'TPU': t.tpu,
    'Nylon': t.nylon,
    'PC': t.pc,
    'HIPS': t.hips,
    'ASA': t.asa,
    'PVA': t.pva,
    'PP': t.pp,
    'Metal': t.metal,
  };
  const SUBTIPOS_FILAMENTO_UI = {
    'Normal': t.normal,
    'Seda': t.silk,
    'Plus': t.plus,
    'Madera': t.woodType,
    'Brillante': t.shiny,
    'Mate': t.matte,
    'Flexible': t.flexible,
    'Glow': t.glow,
    'Transparente': t.transparent,
    'Multicolor': t.multicolor,
    'Reciclado': t.recycled,
    'Carbono': t.carbon,
    'Alta temperatura': t.highTemperature,
    'Ignífugo': t.fireproof,
    'Vidrio': t.glass,
  };
  
  // --- INICIO DE LA CORRECCIÓN 2 ---
  const TIPOS_RESINA_UI = {
    'Estándar': t.standard,
    'Tough': t.tough, // Corregido para coincidir con la nueva clave
    'Flexible': t.flexibleResin,
    'Alta temperatura': t.highTempResin,
    'Dental / Biocompatible': t.dental,
    'Transparente': t.transparentResin,
    'Rápida': t.fast,
    'Especiales': t.special,
  };
  // --- FIN DE LA CORRECCIÓN 2 ---

  const TIPOS_PINTURA_UI = {
    'Acrílica': t.acrylic,
    'Esmalte': t.enamel,
    'Spray': t.spray,
    'Óleo': t.oil,
    'Vinílica': t.vinyl,
    'Acuarela': t.watercolor,
  };
  const COLORES_UI = {
    'Negro': t.black,
    'Blanco': t.white,
    'Rojo': t.red,
    'Azul': t.blue,
    'Verde': t.green,
    'Amarillo': t.yellow,
    'Naranja': t.orange,
    'Morado': t.purple,
    'Gris': t.gray,
    'Transparente': t.transparentColor,
    'Oro': t.gold,
    'Plata': t.silver,
    'Cobre': t.copper,
  };

  // Categorías base - NO MODIFICAR estos valores ya que están vinculados a la base de datos
  const CATEGORIAS_BASE = [
    'Filamento',
    'Resina',
    'Pintura',
    'Aros de llavero',
  ];

  // Mapeo de traducción para mostrar en la UI
  const CATEGORIAS_BASE_UI = {
    'Filamento': t.filament,
    'Resina': t.resin,
    'Pintura': t.paint,
    'Aros de llavero': t.keychainRings,
  };
  
  // Mapeo inverso para obtener la clave de base de datos a partir de la traducción
  const CATEGORIAS_BASE_INVERSE = {
    [t.filament]: 'Filamento',
    [t.resin]: 'Resina',
    [t.paint]: 'Pintura',
    [t.keychainRings]: 'Aros de llavero',
  };

  // Tipos de filamento traducidos
  const tiposFilamento = TIPOS_FILAMENTO;

  // Tipos de resina traducidos
  const tiposResina = TIPOS_RESINA;

  // Tipos de pintura traducidos
  const tiposPintura = TIPOS_PINTURA;
  
  // Colores traducidos
  const colores = COLORES;

  const coloresPintura = colores.map(c => c.nombre); // Reutiliza los colores de filamento

  // Usar hook para categorías personalizadas
  const {
    categorias: categoriasPersonalizadasData,
    agregarCategoria: agregarCategoriaHook,
    eliminarCategoria: eliminarCategoriaHook
  } = useCategoriasPersonalizadas();
  // Las categorías personalizadas se mantienen igual
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
  const subtipos = material.categoria === 'Filamento'
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

  // Antes de la validación y del guardado, agregar logs para depuración
  console.log('Material actual:', material);

const handleGuardar = async (): Promise<void> => {
    console.log('Material a guardar:', material);
    
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
    if (material.categoria === 'Filamento' || material.categoria === 'Resina') {
      const unidades = parseFloat(material.cantidad || '1');
      const gramosPorUnidad = parseFloat(material.peso || '1');
      materialAGuardar.cantidadRestante = (unidades * gramosPorUnidad).toString();
      materialAGuardar.pesoBobina = material.peso; // Guardamos el peso por bobina
      materialAGuardar.cantidad = material.cantidad; // Guardamos el número de bobinas
      
    } else if (material.categoria === 'Pintura') {
      // ======================= INICIO DE LA CORRECCIÓN =======================
      // 'material.cantidad' = Nº de botellas que estás registrando (ej: 1)
      const numeroDeBotellas = parseFloat(material.cantidad || '1');
      // 'material.cantidadPintura' = Total de ml que contiene CADA botella (ej: 1000)
      const mlPorBotella = parseFloat(material.cantidadPintura || '0');

      // El campo 'cantidad' en Firebase DEBE guardar los ml POR BOTELLA.
      // Este es el valor que usará la calculadora para la división (precio / cantidad).
      materialAGuardar.cantidad = mlPorBotella.toString();
      
      // 'cantidadRestante' es el stock total de ml que tienes (botellas * mlPorBotella).
      materialAGuardar.cantidadRestante = (numeroDeBotellas * mlPorBotella).toString();

      // Limpiamos el campo que ya no es necesario para evitar redundancia.
      delete materialAGuardar.cantidadPintura;
      // ======================== FIN DE LA CORRECCIÓN =========================

    } else if (material.categoria === 'Aros de llavero') {
      // Para aros de llavero: cantidadRestante y cantidad son iguales al inicio.
      materialAGuardar.cantidadRestante = material.cantidad;
      materialAGuardar.cantidad = material.cantidad; // Stock actual en unidades
      
    } else {
      // Para categorías personalizadas: cantidadRestante y cantidad son iguales al inicio.
      materialAGuardar.cantidadRestante = material.cantidad || '0';
      materialAGuardar.cantidad = material.cantidad || '0'; // Stock actual en unidades
    }
    
    // Asegurar que el color se guarde en el campo principal según la categoría
    if (material.categoria === 'Pintura') {
      materialAGuardar.color = material.colorPintura;
    } else if (material.categoria === 'Aros de llavero') {
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
    
    // Verificar si la categoría ya existe
    const categoriasExistentes = [...CATEGORIAS_BASE, ...categoriasPersonalizadas];
    if (categoriasExistentes.some(cat => cat.toLowerCase() === nuevaCategoria.nombre.toLowerCase())) {
      setAlertType('error');
      setAlertMessage(t.categoryAlreadyExists || 'Esta categoría ya existe');
      setShowAlert(true);
      return;
    }
    
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
    if (CATEGORIAS_BASE.includes(categoria)) {
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
    
    // Verificar si la marca ya existe
    const marcasExistentes = getMarcasDisponibles().filter(m => m !== 'Agregar +');
    if (marcasExistentes.some(marca => marca.toLowerCase() === nombreMarca.toLowerCase())) {
      setAlertType('error');
      setAlertMessage(t.brandAlreadyExists || 'Esta marca ya existe');
      setShowAlert(true);
      return;
    }
    
    let ref;
    if (CATEGORIAS_BASE.includes(material.categoria)) {
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
    if (CATEGORIAS_BASE.includes(material.categoria)) {
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
    if (material.categoria === 'Filamento' || (!CATEGORIAS_BASE.includes(material.categoria) && material.categoria)) {
      cargarTiposPersonalizadosFirestore(material.categoria);
    } else {
      setTiposPersonalizados([]);
    }
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
    if (CATEGORIAS_BASE.includes(material.categoria)) {
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
    
    // Verificar si el tipo ya existe
    const tiposExistentes = material.categoria === 'Filamento'
      ? [...tiposFilamento.map(t => t.tipo), ...tiposPersonalizados]
      : tiposPersonalizados;
    
    if (tiposExistentes.some(tipo => tipo.toLowerCase() === nombreTipo.toLowerCase())) {
      setAlertType('error');
      setAlertMessage(t.typeAlreadyExists || 'Este tipo ya existe');
      setShowAlert(true);
      return;
    }
    
    const ref = collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas', material.categoria, 'tipos');
    await addDoc(ref, { nombre: nombreTipo });
    cargarTiposPersonalizadosFirestore(material.categoria);
    setMaterial(prev => ({ ...prev, tipo: nombreTipo }));
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
    if (material.categoria && !CATEGORIAS_BASE.includes(material.categoria)) {
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
      enabled={true}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
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
                // Mantener los valores originales para la base de datos
                if (value === 'filamento') categoriaAuto = 'Filamento';
                else if (value === 'resina') categoriaAuto = 'Resina';
                else if (value === 'pinturas') categoriaAuto = 'Pintura';
                else if (value === 'arosllaveros') categoriaAuto = 'Aros de llavero';
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
          {CATEGORIAS_BASE.map((cat) => (
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
              ]}>{CATEGORIAS_BASE_UI[cat]}</Text>
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
                  <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 16 }}>{t.deleteSymbol || '×'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          ))}
          {/* Pastilla + */}
          <TouchableOpacity
            style={[styles.pastilla, { backgroundColor: '#222', borderColor: '#00e676', borderWidth: 2 }]}
            onPress={() => setMostrarNuevaCategoria(true)}
          >
            <Text style={{ color: '#00e676', fontSize: 22, fontWeight: 'bold' }}>{t.addSymbol || '+'}</Text>
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
          <Text style={styles.resumenTexto}>{t.category}: <Text style={styles.resumenDato}>{material.categoria ? (CATEGORIAS_BASE_UI[material.categoria] || material.categoria) : t.dash}</Text></Text>
          <Text style={styles.resumenTexto}>{t.brand}: <Text style={styles.resumenDato}>{material.marca || t.dash}</Text></Text>
          {material.categoria === 'Filamento' && (
            <>
              <Text style={styles.resumenTexto}>{t.type}: <Text style={styles.resumenDato}>{material.tipo ? (TIPOS_FILAMENTO_UI[material.tipo] || material.tipo) : t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.subtype}: <Text style={styles.resumenDato}>{material.subtipo ? (SUBTIPOS_FILAMENTO_UI[material.subtipo] || material.subtipo) : t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.color ? (COLORES_UI[material.color] || material.color) : t.dash}</Text></Text>
            </>
          )}
          {material.categoria === 'Resina' && (
            <>
              <Text style={styles.resumenTexto}>{t.type}: <Text style={styles.resumenDato}>{material.tipo ? (TIPOS_RESINA_UI[material.tipo] || material.tipo) : t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.color ? (COLORES_UI[material.color] || material.color) : t.dash}</Text></Text>
            </>
          )}
          {material.categoria === 'Pintura' && (
            <>
              <Text style={styles.resumenTexto}>{t.type}: <Text style={styles.resumenDato}>{material.tipoPintura ? (TIPOS_PINTURA_UI[material.tipoPintura] || material.tipoPintura) : t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.colorPintura ? (COLORES_UI[material.colorPintura] || material.colorPintura) : t.dash}</Text></Text>
              <Text style={styles.resumenTexto}>{t.quantity}: <Text style={styles.resumenDato}>{material.cantidadPintura || t.dash}</Text></Text>
            </>
          )}
          {material.categoria === 'Aros de llavero' && (
            <>
              <Text style={styles.resumenTexto}>{t.color}: <Text style={styles.resumenDato}>{material.color ? (COLORES_UI[material.color] || material.color) : t.dash}</Text></Text>
            </>
          )}
          {/* Resumen dinámico para categorías personalizadas */}
          {material.categoria && !CATEGORIAS_BASE.includes(material.categoria) && (
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
        </View>

        {/* Selector de marcas para categorías base y personalizadas */}
        {(CATEGORIAS_BASE.includes(material.categoria) || mostrarMarca) && (
          <>
            <Text style={styles.label}>{t.brand}</Text>
            <View style={[styles.pastillasContainer, { alignItems: 'center' }]}>
              {/* Mensaje aclaratorio en modo eliminar */}
              {modoEliminarMarca && (
                <Text style={{ color: '#e53935', marginBottom: 6, width: '100%' }}>
                  {t.onlyDeleteCustomBrands}
                </Text>
              )}
              {getMarcasDisponibles().filter(m => m !== 'Agregar +').map((marca) => {
                // Determinar si es marca base o personalizada
                const esMarcaBase = (MARCAS_POR_CATEGORIA[material.categoria] || []).includes(marca);
                // En modo eliminar, solo las personalizadas son seleccionables
                const deshabilitada = modoEliminarMarca && esMarcaBase;
                return (
                  <TouchableOpacity
                    key={marca}
                    style={[
                      styles.pastilla,
                      material.marca === marca && !modoEliminarMarca && styles.pastillaSeleccionada,
                      modoEliminarMarca && marcasSeleccionadas.includes(marca) && !deshabilitada && { backgroundColor: '#e53935', borderColor: '#e53935' },
                      deshabilitada && { opacity: 0.4 }
                    ]}
                    onPress={() => {
                      if (modoEliminarMarca) {
                        if (!esMarcaBase) {
                          setMarcasSeleccionadas(marcasSeleccionadas.includes(marca)
                            ? marcasSeleccionadas.filter(m => m !== marca)
                            : [...marcasSeleccionadas, marca]);
                        }
                      } else {
                        setMaterial({ ...material, marca });
                      }
                    }}
                    disabled={deshabilitada}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      material.marca === marca && !modoEliminarMarca && styles.pastillaTextoSeleccionada,
                      modoEliminarMarca && marcasSeleccionadas.includes(marca) && !deshabilitada && { color: '#fff', fontWeight: 'bold' },
                      deshabilitada && { color: '#888' }
                    ]}>{marca}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* Botón Agregar + (ícono) */}
              {!mostrarNuevaMarca && (
                <TouchableOpacity
                  style={[
                    styles.pastilla,
                    { backgroundColor: '#222', borderColor: '#00e676', borderWidth: 2, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }
                  ]}
                  onPress={() => setMostrarNuevaMarca(true)}
                  disabled={modoEliminarMarca}
                >
                  <Ionicons name="add" size={22} color="#00e676" />
                </TouchableOpacity>
              )}
              {/* Formulario embebido para nueva marca (mejorado) */}
              <AddForm
                label={t.newBrand}
                onAdd={async (value) => {
                  await agregarMarcaFirestore(value);
                  setMostrarNuevaMarca(false);
                  // Solo limpiar la marca si hubo error, sino mantener la selección
                  const marcasExistentes = getMarcasDisponibles().filter(m => m !== 'Agregar +');
                  if (!marcasExistentes.some(marca => marca.toLowerCase() === value.toLowerCase())) {
                    setMaterial(prev => ({ ...prev, marca: value }));
                  }
                }}
                onCancel={() => setMostrarNuevaMarca(false)}
                placeholder={t.brandName}
                visible={mostrarNuevaMarca}
                addLabel={t.add}
                cancelLabel={t.cancel}
              />
              {/* Botón Eliminar - (ícono) */}
              <TouchableOpacity
                style={[
                  styles.pastilla,
                  { backgroundColor: '#222', borderColor: '#e53935', borderWidth: 2, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }
                ]}
                onPress={() => {
                  setModoEliminarMarca(!modoEliminarMarca);
                  setMarcasSeleccionadas([]);
                }}
              >
                <Ionicons name="remove" size={22} color="#e53935" />
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
                        // Eliminar solo marcas personalizadas seleccionadas
                        for (const marca of marcasSeleccionadas) {
                          const esBase = (MARCAS_POR_CATEGORIA[material.categoria] || []).includes(marca);
                          if (!esBase) {
                            await eliminarMarcaFirestore(marca);
                          }
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
          {material.categoria === 'Filamento' && (
            <>
              <Text style={styles.label}>{t.filamentType}</Text>
              <View style={styles.pastillasContainer}>
                {tiposFilamento.map((t) => (
                  <TouchableOpacity
                    key={t.tipo}
                    style={[
                      styles.pastilla,
                      material.tipo === t.tipo && !modoEliminarTipo ? styles.pastillaSeleccionada : null,
                      modoEliminarTipo && { opacity: 0.4 }
                    ]}
                    onPress={() => {
                      if (!modoEliminarTipo) {
                        setMaterial({ ...material, tipo: t.tipo, subtipo: '' });
                      }
                    }}
                    disabled={modoEliminarTipo}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      material.tipo === t.tipo && !modoEliminarTipo ? styles.pastillaTextoSeleccionada : null,
                      modoEliminarTipo && { color: '#888' }
                    ]}>{TIPOS_FILAMENTO_UI[t.tipo] || t.tipo}</Text>
                  </TouchableOpacity>
                ))}
                {/* Tipos personalizados justo después de los base */}
                {tiposPersonalizados.map((tipo, idx) => {
                  const deshabilitada = false;
                  return (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.pastilla,
                        material.tipo === tipo && !modoEliminarTipo && styles.pastillaSeleccionada,
                        modoEliminarTipo && tiposSeleccionados.includes(tipo) && !deshabilitada && { backgroundColor: '#e53935', borderColor: '#e53935' },
                        deshabilitada && { opacity: 0.4 }
                      ]}
                      onPress={() => {
                        if (modoEliminarTipo) {
                          setTiposSeleccionados(tiposSeleccionados.includes(tipo)
                            ? tiposSeleccionados.filter(t => t !== tipo)
                            : [...tiposSeleccionados, tipo]);
                        } else {
                          setMaterial({ ...material, tipo: tipo });
                        }
                      }}
                      disabled={deshabilitada}
                    >
                      <Text style={[
                        { color: '#fff', fontSize: 14 },
                        material.tipo === tipo && !modoEliminarTipo && styles.pastillaTextoSeleccionada,
                        modoEliminarTipo && tiposSeleccionados.includes(tipo) && !deshabilitada && { color: '#fff', fontWeight: 'bold' },
                        deshabilitada && { color: '#888' }
                      ]}>{tipo}</Text>
                    </TouchableOpacity>
                  );
                })}
                {/* Botón Agregar + para tipos personalizados */}
                <TouchableOpacity
                  style={[
                    styles.pastilla,
                    { backgroundColor: '#222', borderColor: '#00e676', borderWidth: 2, marginBottom: 8 }
                  ]}
                  onPress={() => setMostrarNuevoTipo(true)}
                  disabled={modoEliminarTipo}
                >
                  <Ionicons name="add" size={22} color="#00e676" />
                </TouchableOpacity>
                {/* Botón Eliminar - (ícono) para tipos personalizados */}
                <TouchableOpacity
                  style={[
                    styles.pastilla,
                    { backgroundColor: '#222', borderColor: '#e53935', borderWidth: 2, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }
                  ]}
                  onPress={() => {
                    setModoEliminarTipo(!modoEliminarTipo);
                    setTiposSeleccionados([]);
                  }}
                >
                  <Ionicons name="remove" size={22} color="#e53935" />
                </TouchableOpacity>
              </View>
              {/* Mensaje aclaratorio y lógica de eliminación debajo si hay tipos personalizados y modo eliminar */}
              {modoEliminarTipo && (
                <View style={{ marginBottom: 6, width: '100%' }}>
                  <Text style={{ color: '#e53935', marginBottom: 2 }}>
                    {t.onlyDeleteCustomTypes}
                  </Text>
                  <Text style={{ color: '#a0a0a0', fontSize: 12 }}>
                    Los tipos base (PLA, ABS, PETG, etc.) no se pueden eliminar
                  </Text>
                </View>
              )}
              {mostrarNuevoTipo && (
                <AddForm
                  label={t.newType}
                  onAdd={async (value) => {
                    if (value.trim()) {
                      await agregarTipoPersonalizadoFirestore(value.trim());
                      setMostrarNuevoTipo(false);
                    }
                  }}
                  onCancel={() => setMostrarNuevoTipo(false)}
                  placeholder={`${t.nameOf}${material.categoria.toLowerCase()}`}
                  visible={mostrarNuevoTipo}
                  addLabel={t.add}
                  cancelLabel={t.cancel}
                />
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
              {/* Selector de subtipos para filamento */}
              {material.tipo && subtipos.length > 0 && (
                <>
                  <Text style={styles.label}>{t.subtype}</Text>
                  <View style={styles.pastillasContainer}>
                    {subtipos.map((subtipo) => (
                      <TouchableOpacity
                        key={subtipo}
                        style={[
                          styles.pastilla,
                          material.subtipo === subtipo ? styles.pastillaSeleccionada : null
                        ]}
                        onPress={() => setMaterial({ ...material, subtipo })}
                      >
                        <Text style={[
                          styles.pastillaTexto,
                          material.subtipo === subtipo ? styles.pastillaTextoSeleccionada : null
                        ]}>{SUBTIPOS_FILAMENTO_UI[subtipo] || subtipo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <Text style={styles.label}>{t.color}</Text>
              <View style={styles.coloresContainer}>
                {colores.map((col) => (
                  <TouchableOpacity
                    key={col.nombre}
                    style={[
                      styles.colorPastilla,
                      { backgroundColor: col.valor },
                      material.color === col.valor ? styles.colorPastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterial({ ...material, color: col.valor })}
                  >
                    {material.color === col.valor && (
                      <Text style={styles.checkColor}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
          {material.categoria === 'Resina' && (
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
                    ]}>{TIPOS_RESINA_UI[t] || t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>{t.color}</Text>
              <View style={styles.coloresContainer}>
                {colores.map((col) => (
                  <TouchableOpacity
                    key={col.nombre}
                    style={[
                      styles.colorPastilla,
                      { backgroundColor: col.valor },
                      material.color === col.valor ? styles.colorPastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterial({ ...material, color: col.valor })}
                  >
                    {material.color === col.valor && (
                      <Text style={styles.checkColor}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
          {material.categoria === 'Pintura' && (
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
                    ]}>{TIPOS_PINTURA_UI[tipo] || tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>{t.color}</Text>
              <View style={styles.coloresContainer}>
                {colores.map((col) => (
                  <TouchableOpacity
                    key={col.nombre}
                    style={[
                      styles.colorPastilla,
                      { backgroundColor: col.valor },
                      material.colorPintura === col.valor ? styles.colorPastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterial({ ...material, colorPintura: col.valor })}
                  >
                    {material.colorPintura === col.valor && (
                      <Text style={styles.checkColor}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
          {material.categoria === 'Aros de llavero' && (
            <>
              <Text style={styles.label}>{t.color}</Text>
              <View style={styles.coloresContainer}>
                {colores.map((col) => (
                  <TouchableOpacity
                    key={col.nombre}
                    style={[
                      styles.colorPastilla,
                      { backgroundColor: col.valor },
                      material.color === col.valor ? styles.colorPastillaSeleccionada : null
                    ]}
                    onPress={() => setMaterial({ ...material, color: col.valor })}
                  >
                    {material.color === col.valor && (
                      <Text style={styles.checkColor}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* CAMPOS GENERALES (para todas las categorías) */}
          {material.categoria && !CATEGORIAS_BASE.includes(material.categoria) && (
            <>
              {mostrarTipo && (
                <>
                  <Text style={styles.label}>{`${t.typeOf}${material.categoria.toLowerCase()}`}</Text>
                  {/* Mensaje aclaratorio en modo eliminar */}
                  {modoEliminarTipo && (
                    <Text style={{ color: '#e53935', marginBottom: 6, width: '100%' }}>
                      {t.onlyDeleteCustomTypes}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                    {tiposPersonalizados.map((tipo, idx) => {
                      // Determinar si es tipo base o personalizado
                      const esTipoBase = false; // tiposPersonalizados solo contiene personalizados
                      const deshabilitada = modoEliminarTipo && esTipoBase;
                      return (
                        <TouchableOpacity
                          key={tipo}
                          style={[
                            styles.pastilla,
                            material.tipo === tipo && !modoEliminarTipo && styles.pastillaSeleccionada,
                            modoEliminarTipo && tiposSeleccionados.includes(tipo) && !deshabilitada && { backgroundColor: '#e53935', borderColor: '#e53935' },
                            deshabilitada && { opacity: 0.4 }
                          ]}
                          onPress={() => {
                            if (modoEliminarTipo) {
                              if (!esTipoBase) {
                                setTiposSeleccionados(tiposSeleccionados.includes(tipo)
                                  ? tiposSeleccionados.filter(t => t !== tipo)
                                  : [...tiposSeleccionados, tipo]);
                              }
                            } else {
                              setMaterial({ ...material, tipo });
                            }
                          }}
                          disabled={deshabilitada}
                        >
                          <Text style={[
                            { color: '#fff', fontSize: 14 },
                            material.tipo === tipo && !modoEliminarTipo && styles.pastillaTextoSeleccionada,
                            modoEliminarTipo && tiposSeleccionados.includes(tipo) && !deshabilitada && { color: '#fff', fontWeight: 'bold' },
                            deshabilitada && { color: '#888' }
                          ]}>{tipo}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {/* Botón Agregar + */}
                    <TouchableOpacity
                      style={[
                        styles.pastilla,
                        { backgroundColor: '#222', borderColor: '#00e676', borderWidth: 2, marginBottom: 8 }
                      ]}
                      onPress={() => setMostrarNuevoTipo(true)}
                      disabled={modoEliminarTipo}
                    >
                      <Ionicons name="add" size={22} color="#00e676" />
                    </TouchableOpacity>
                    {/* Botón Eliminar - (ícono) */}
                    <TouchableOpacity
                      style={[
                        styles.pastilla,
                        { backgroundColor: '#222', borderColor: '#e53935', borderWidth: 2, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }
                      ]}
                      onPress={() => {
                        setModoEliminarTipo(!modoEliminarTipo);
                        setTiposSeleccionados([]);
                      }}
                    >
                      <Ionicons name="remove" size={22} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                  <AddForm
                    label={t.newType}
                    onAdd={async (value) => {
                      if (value.trim()) {
                        await agregarTipoPersonalizadoFirestore(value.trim());
                        setMostrarNuevoTipo(false);
                      }
                    }}
                    onCancel={() => setMostrarNuevoTipo(false)}
                    placeholder={`${t.nameOf}${material.categoria.toLowerCase()}`}
                    visible={mostrarNuevoTipo}
                    addLabel={t.add}
                    cancelLabel={t.cancel}
                  />
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
                    {COLORES.map((col) => (
                      <TouchableOpacity
                        key={col.nombre}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: col.valor,
                          marginRight: 8,
                          marginBottom: 8,
                          borderWidth: material.color === col.valor ? 3 : 2,
                          borderColor: material.color === col.valor ? '#00e676' : '#333',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setMaterial({ ...material, color: col.valor })}
                      >
                        {material.color === col.valor && <Text style={{ color: col.valor === '#fff' ? '#222' : '#fff', fontWeight: 'bold' }}>✓</Text>}
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
            onChangeText={(text) => {
              // Remover cualquier símbolo $ y caracteres no numéricos excepto punto
              let cleanText = text.replace(/[^\d.]/g, '');
              // Limitar a un solo punto decimal
              const parts = cleanText.split('.');
              if (parts.length > 2) {
                cleanText = parts[0] + '.' + parts.slice(1).join('');
              }
              setMaterial({ ...material, precio: cleanText });
            }}
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
  nuevaMarcaContainer: {
    backgroundColor: '#181818',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00e676',
    width: '100%',
    alignSelf: 'center',
  },
});

export default AddMaterialScreen;