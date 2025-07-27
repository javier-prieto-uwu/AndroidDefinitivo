import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, Modal, Alert, Dimensions } from 'react-native'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { auth, app } from '../api/firebase'
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMateriales } from '../hooks';
import { filtrarMateriales } from '../utils';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales';

// Obtener dimensiones de la pantalla
const { width: screenWidth } = Dimensions.get('window');
const isLargeDevice = screenWidth > 768; // Tablets y pantallas grandes

// Simulación de materiales locales

const InventoryScreen: React.FC = () => {
  const { lang } = useLanguage();
  const t = translations[lang];
  
  // Estado para el tamaño de la pantalla
  const [screenDimensions, setScreenDimensions] = useState({
    width: screenWidth,
    isLarge: isLargeDevice
  });

  // Listener para cambios de orientación
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newIsLarge = window.width > 768;
      setScreenDimensions({
        width: window.width,
        isLarge: newIsLarge
      });
    });

    return () => subscription?.remove();
  }, []);

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
  const [ordenamiento, setOrdenamiento] = useState('nombre'); // 'nombre', 'fecha', 'cantidad', 'costo', 'categoria'
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const isFocused = useIsFocused();
  const [materialAEliminar, setMaterialAEliminar] = useState<any>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  
  // Estados para edición de materiales
  const [materialAEditar, setMaterialAEditar] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '',
    precio: '',
    cantidad: '',
    cantidadRestante: '',
    color: '',
    tipo: '',
    subtipo: '',
    categoria: '',
    marca: '',
    peso: '',
    imagen: ''
  });

  // Función para traducir nombres de materiales
  const getNombreTraducido = (nombre: string) => {
    if (!nombre || lang !== 'en') return nombre;
    
    const nombreMap: { [key: string]: string } = {
      // Productos específicos
      'Aro de llavero': 'Keychain Ring',
      'Aros de llavero': 'Keychain Rings',
      // Tipos de pintura
      'Acrílica': 'Acrylic',
      'Esmalte': 'Enamel',
      'Spray': 'Spray',
      'Óleo': 'Oil',
      'Vinílica': 'Vinyl',
      'Acuarela': 'Watercolor',
      // Tipos de resina
      'Estándar': 'Standard',
      'Tough (tipo ABS)': 'Tough (ABS type)',
      'Flexible': 'Flexible',
      'Alta temperatura': 'High Temperature',
      'Dental / Biocompatible': 'Dental / Biocompatible',
      'Transparente': 'Transparent',
      'Fast / Rápida': 'Fast / Rapid',
      'Especiales': 'Special',
      // Tipos de filamento
      'PLA': 'PLA',
      'ABS': 'ABS',
      'PETG': 'PETG',
      'TPU': 'TPU',
      'Nylon': 'Nylon',
      'PC': 'PC',
      'HIPS': 'HIPS',
      'ASA': 'ASA',
      'PVA': 'PVA',
      'PP': 'PP',
      'Metal': 'Metal',
      'Elioq': 'Elioq'
    };
    
    // Buscar traducción exacta primero
    if (nombreMap[nombre]) {
      return nombreMap[nombre];
    }
    
    // Si no encuentra traducción exacta, buscar por el nombre base
    for (const [original, traduccion] of Object.entries(nombreMap)) {
      if (nombre.startsWith(original)) {
        return nombre.replace(original, traduccion);
      }
    }
    
    return nombre;
  };

  // Función para traducir categorías
  const traducirCategoria = (categoria: string) => {
    if (!categoria || lang !== 'en') return categoria;
    
    const categoriaMap: { [key: string]: string } = {
      'Filamento': 'Filament',
      'Resina': 'Resin',
      'Pintura': 'Paint',
      'Aros de llavero': 'Keychain Rings',
      'Sin categoría': 'No Category'
    };
    
    return categoriaMap[categoria] || categoria;
  };

  // TIPOS Y SUBTIPOS INTERNOS EN ESPAÑOL (igual que AddMaterialScreen)
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
  const TIPOS_RESINA = [
    'Estándar',
    'Tough (tipo ABS)',
    'Flexible',
    'Alta temperatura',
    'Dental / Biocompatible',
    'Transparente',
    'Rápida',
    'Especiales',
  ];
  const TIPOS_PINTURA = ['Acrílica', 'Esmalte', 'Spray', 'Óleo', 'Vinílica', 'Acuarela'];
  
  // MAPEO DE TRADUCCIÓN PARA UI
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
  const TIPOS_RESINA_UI = {
    'Estándar': t.standard,
    'Tough (tipo ABS)': t.tough,
    'Flexible': t.flexibleResin,
    'Alta temperatura': t.highTempResin,
    'Dental / Biocompatible': t.dental,
    'Transparente': t.transparentResin,
    'Rápida': t.fast,
    'Especiales': t.special,
  };
  const TIPOS_PINTURA_UI = {
    'Acrílica': t.acrylic,
    'Esmalte': t.enamel,
    'Spray': t.spray,
    'Óleo': t.oil,
    'Vinílica': t.vinyl,
    'Acuarela': t.watercolor,
  };
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
  
  // MAPEO DE TRADUCCIÓN PARA COLORES
  const COLORES_UI = {
    'Negro': t.black,
    'Blanco': t.white,
    'Rojo': t.red,
    'Rojo Oscuro': t.darkRed,
    'Rosa': t.pink,
    'Rosa Claro': t.lightPink,
    'Naranja': t.orange,
    'Naranja Claro': t.lightOrange,
    'Amarillo': t.yellow,
    'Amarillo Claro': t.lightYellow,
    'Verde': t.green,
    'Verde Claro': t.lightGreen,
    'Verde Azulado': t.teal,
    'Azul': t.blue,
    'Azul Claro': t.lightBlue,
    'Azul Oscuro': t.darkBlue,
    'Índigo': t.indigo,
    'Morado': t.purple,
    'Morado Claro': t.lightPurple,
    'Violeta': t.violet,
    'Gris': t.gray,
    'Gris Claro': t.lightGray,
    'Gris Oscuro': t.darkGray,
    'Marrón': t.brown,
    'Marrón Claro': t.lightBrown,
    'Beige': t.beige,
    'Transparente': t.transparentColor,
    'Oro': t.gold,
    'Plata': t.silver,
    'Cobre': t.copper,
    'Bronce': t.bronze,
    'Turquesa': t.turquoise,
    'Coral': t.coral,
    'Lavanda': t.lavender,
    'Menta': t.mint,
    'Melocotón': t.peach,
    'Lima': t.lime,
    'Cian': t.cyan,
    'Magenta': t.magenta,
  };

  // Categorías base - NO MODIFICAR (vinculado a la base de datos)
  const CATEGORIAS_BASE = [
    'Filamento',
    'Resina',
    'Pintura',
    'Aros de llavero',
  ];
  
  // Mapeo para UI de categorías base
  const CATEGORIAS_BASE_UI = {
    'Filamento': t.filament,
    'Resina': t.resin,
    'Pintura': t.paint,
    'Aros de llavero': t.keyrings,
  };
  
  // Mapeo inverso para obtener la clave de base de datos a partir de la traducción
  const CATEGORIAS_BASE_INVERSE = {
    [t.filament]: 'Filamento',
    [t.resin]: 'Resina',
    [t.paint]: 'Pintura',
    [t.keyrings]: 'Aros de llavero',
  };

  // Obtener subtipos según el tipo seleccionado (para filamento)
  const subtiposDisponibles = editForm.categoria === 'Filamento'
    ? TIPOS_FILAMENTO.find(tipo => tipo.tipo === editForm.tipo)?.subtipos || []
    : [];

  const db = getFirestore(app);

  // Función para ordenar materiales
  const ordenarMateriales = (materiales) => {
    const materialesOrdenados = [...materiales].sort((a, b) => {
      let valorA, valorB;
      
      switch (ordenamiento) {
        case 'nombre':
          valorA = a.nombre?.toLowerCase() || '';
          valorB = b.nombre?.toLowerCase() || '';
          break;
        case 'fecha':
          valorA = new Date(a.fechaRegistro || a.fechaCreacion || 0).getTime();
          valorB = new Date(b.fechaRegistro || b.fechaCreacion || 0).getTime();
          break;
        case 'cantidad':
          valorA = parseFloat(a.cantidadRestante || a.cantidad || '0');
          valorB = parseFloat(b.cantidadRestante || b.cantidad || '0');
          break;
        case 'costo':
          valorA = parseFloat(a.precio || '0');
          valorB = parseFloat(b.precio || '0');
          break;
        case 'categoria':
          valorA = a.categoria?.toLowerCase() || '';
          valorB = b.categoria?.toLowerCase() || '';
          break;
        default:
          valorA = a.nombre?.toLowerCase() || '';
          valorB = b.nombre?.toLowerCase() || '';
      }
      
      if (typeof valorA === 'string') {
        return ordenAscendente ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
      } else {
        return ordenAscendente ? valorA - valorB : valorB - valorA;
      }
    });
    
    return materialesOrdenados;
  };

  // Filtro de materiales por búsqueda y omitir productos sin tipo
  const materialesFiltrados = materiales.filter(mat => {
    // Omitir productos que no tienen tipo definido
    if (!mat.tipo || mat.tipo.trim() === '') {
      return false;
    }
    const texto = `${mat.nombre || ''} ${mat.tipo || ''} ${mat.subtipo || ''}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  // Filtrar materiales agotados y disponibles
  const materialesAgotados = ordenarMateriales(materialesFiltrados.filter(m => parseFloat(m.cantidadRestante || m.cantidad || '0') <= 0));
  const materialesDisponibles = ordenarMateriales(materialesFiltrados.filter(m => parseFloat(m.cantidadRestante || m.cantidad || '0') > 0));

  // Agrupar materiales disponibles por categoría
  const categoriasMateriales = Array.from(new Set(materialesDisponibles.map(m => m.categoria)))

  // Función para navegar a una categoría específica
  const navegarACategoria = (categoria: string) => {
    setCategoriaSeleccionada(categoria)
    const categoriaIndex = categoriasMateriales.indexOf(categoria)
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
      console.error('Error eliminando material:', e);
      Alert.alert(t.error, t.materialDeleteError);
      setShowDeleteAlert(false);
    }
  };

  // Función para abrir modal de edición
  const abrirModalEdicion = (material: any) => {
    setMaterialAEditar(material);
    setEditForm({
      nombre: material.nombre || '',
      precio: material.precio || '',
      cantidad: material.cantidad || '',
      cantidadRestante: material.cantidadRestante || '',
      color: material.color || '',
      tipo: material.tipo || '',
      subtipo: material.subtipo || '',
      categoria: material.categoria || '',
      marca: material.marca || '',
      peso: material.peso || '',
      imagen: material.imagen || ''
    });
    setShowEditModal(true);
  };

  // Función para guardar cambios del material
  const guardarCambiosMaterial = async () => {
    if (!materialAEditar) return;
    
    // Validaciones
    if (!editForm.nombre.trim()) {
      Alert.alert(t.error, t.materialNameRequired);
      return;
    }
    
    if (!editForm.precio || parseFloat(editForm.precio) <= 0) {
      Alert.alert(t.error, t.priceGreaterThanZero);
      return;
    }
    
    if (!editForm.cantidad || parseFloat(editForm.cantidad) < 0) {
      Alert.alert(t.error, t.quantityCannotBeNegative);
      return;
    }
    
    if (!editForm.cantidadRestante || parseFloat(editForm.cantidadRestante) < 0) {
      Alert.alert(t.error, t.remainingQuantityCannotBeNegative);
      return;
    }
    
    // Traducir tipos y subtipos al inglés si el idioma está en inglés
    let tipoParaGuardar = editForm.tipo.trim();
    let subtipoParaGuardar = editForm.subtipo.trim();
    
    if (lang === 'en') {
      // Mapeo de español a inglés para tipos y subtipos
      const tipoMap: { [key: string]: string } = {
        'Madera': 'Wood',
        'Seda': 'Silk',
        'Transparente': 'Transparent',
        'Brillante': 'Glossy',
        'Mate': 'Matte',
        'Flexible': 'Flexible',
        'Multicolor': 'Multicolor',
        'Reciclado': 'Recycled',
        'Carbono': 'Carbon',
        'Alta temperatura': 'High Temperature',
        'Ignífugo': 'Fire Resistant'
      };
      
      if (tipoMap[subtipoParaGuardar]) {
        subtipoParaGuardar = tipoMap[subtipoParaGuardar];
      }
      if (tipoMap[tipoParaGuardar]) {
        tipoParaGuardar = tipoMap[tipoParaGuardar];
      }
    }
    
    try {
      const user = auth.currentUser;
      if (!user) return;

      const materialRef = doc(db, 'usuarios', user.uid, 'materiales', materialAEditar.id);
      
      await updateDoc(materialRef, {
        nombre: editForm.nombre.trim(),
        precio: editForm.precio,
        cantidad: editForm.cantidad,
        cantidadRestante: editForm.cantidadRestante,
        color: editForm.color.trim(),
        tipo: tipoParaGuardar,
        subtipo: subtipoParaGuardar,
        categoria: editForm.categoria,
        marca: editForm.marca.trim(),
        peso: editForm.peso,
        imagen: editForm.imagen,
        fechaActualizacion: new Date().toISOString()
      });

      setShowEditModal(false);
      setMaterialAEditar(null);
      setEditForm({
        nombre: '',
        precio: '',
        cantidad: '',
        cantidadRestante: '',
        color: '',
        tipo: '',
        subtipo: '',
        categoria: '',
        marca: '',
        peso: '',
        imagen: ''
      });
      
      Alert.alert(t.success, t.materialUpdatedSuccessfully);
    } catch (error) {
      console.error('Error al actualizar material:', error);
      Alert.alert(t.error, t.materialUpdateError);
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

  // Función para cambiar el ordenamiento
  const cambiarOrdenamiento = (nuevoOrdenamiento) => {
    if (ordenamiento === nuevoOrdenamiento) {
      setOrdenAscendente(!ordenAscendente);
    } else {
      setOrdenamiento(nuevoOrdenamiento);
      setOrdenAscendente(true);
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

        {/* Botones de ordenamiento */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>{t.sortBy}:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {[
              { key: 'nombre', label: t.sortByName },
              { key: 'fecha', label: t.sortByDate },
              { key: 'cantidad', label: t.sortByQuantity },
              { key: 'costo', label: t.sortByCost },
              { key: 'categoria', label: t.sortByCategory }
            ].map((opcion) => (
              <TouchableOpacity
                key={opcion.key}
                style={{
                  backgroundColor: ordenamiento === opcion.key ? '#00e676' : '#222',
                  borderRadius: 20,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: ordenamiento === opcion.key ? '#00e676' : '#333',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => cambiarOrdenamiento(opcion.key)}
              >
                <Text style={{
                  color: ordenamiento === opcion.key ? '#000' : '#fff',
                  fontSize: 14,
                  fontWeight: ordenamiento === opcion.key ? 'bold' : 'normal'
                }}>
                  {opcion.label}
                </Text>
                {ordenamiento === opcion.key && (
                  <Ionicons 
                    name={ordenAscendente ? 'arrow-up' : 'arrow-down'} 
                    size={14} 
                    color="#000" 
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
            {categoriasMateriales.length === 0 ? (
              <Text style={{ color: '#a0a0a0', marginLeft: 10 }}>{t.noCategories}</Text>
            ) : (
              categoriasMateriales.map((cat) => (
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
                    {traducirCategoria(cat)}
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
            <Text style={styles.summaryAmount}>{cargando ? '...' : materialesFiltrados.length}</Text>
            <Text style={styles.summaryUnit}>{t.materials}</Text>
          </View>
        </View>

        {/* Lista de materiales por categoría */}
        <View style={styles.materialsContainer}>
          <Text style={styles.sectionTitle}>{t.materialsByCategory}</Text>
          {cargando ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 20 }}>{t.loadingMaterials}</Text>
          ) : error ? (
            <Text style={{ color: '#ff9800', textAlign: 'center', marginVertical: 20 }}>{error}</Text>
          ) : materialesFiltrados.length === 0 ? (
            <Text style={{ color: '#a0a0a0', textAlign: 'center', marginVertical: 20 }}>{t.noMaterialsRegistered}</Text>
          ) : (
            categoriasMateriales.map((cat) => (
              <View 
                key={cat} 
                style={styles.categoriaContainer}
              >
                <Text style={styles.categoriaTitulo}>{traducirCategoria(cat)}</Text>
                <View style={{
                  flexDirection: isLargeDevice ? 'row' : 'column',
                  flexWrap: isLargeDevice ? 'wrap' : 'nowrap',
                  justifyContent: isLargeDevice ? 'space-between' : 'flex-start',
                  width: '100%',
                  paddingHorizontal: isLargeDevice ? 0 : 16,
                }}>
                  {materialesDisponibles.filter(m => m.categoria === cat).map((mat) => (
                    <View key={mat.id} style={{
                      backgroundColor: '#181818',
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: '#333',
                      padding: 16,
                      marginBottom: 8,
                      width: isLargeDevice ? '48%' : '100%',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                      {/* Botones de acción */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => { setMaterialAEliminar(mat); setShowDeleteAlert(true); }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#e53935" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => abrirModalEdicion(mat)}
                        >
                          <Ionicons name="create-outline" size={18} color="#00e676" />
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
                          {getNombreTraducido(mat.nombre)}
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
                                  const categoria = mat.categoria || CATEGORIAS_BASE[0]; // Filamento por defecto
                                  switch (categoria) {
                                    case CATEGORIAS_BASE[0]: // Filamento
                                    case CATEGORIAS_BASE[1]: // Resina
                                      return 'g';
                                    case CATEGORIAS_BASE[2]: // Pintura
                                      return 'ml';
                                    case CATEGORIAS_BASE[3]: // Aros de llavero
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

        {/* Sección de Materiales Agotados */}
        {materialesAgotados.length > 0 && (
          <View style={[styles.materialsContainer, { marginTop: 32, marginBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="warning" size={24} color="#e53935" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.sectionTitle, { color: '#e53935', marginTop: 0 }]}>{t.outOfStock}</Text>
            </View>
            <View style={{
              flexDirection: isLargeDevice ? 'row' : 'column',
              flexWrap: isLargeDevice ? 'wrap' : 'nowrap',
              justifyContent: isLargeDevice ? 'space-between' : 'flex-start',
              width: '100%',
              paddingHorizontal: isLargeDevice ? 0 : 16,
            }}>
              {materialesAgotados.map((mat) => (
                <View key={mat.id} style={{
                  backgroundColor: '#181818',
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: '#e53935',
                  padding: 16,
                  marginBottom: 8,
                  width: isLargeDevice ? '48%' : '100%',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                  opacity: 0.7,
                }}>
                  {/* Botones de acción */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => { setMaterialAEliminar(mat); setShowDeleteAlert(true); }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#e53935" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => abrirModalEdicion(mat)}
                    >
                      <Ionicons name="create-outline" size={18} color="#00e676" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Imagen del material */}
                  <Image
                    source={
                      mat.imagen && ICONOS_PNG[mat.imagen]
                        ? ICONOS_PNG[mat.imagen]
                        : require('../assets/filamento.png')
                    }
                    style={styles.materialImage}
                    resizeMode="contain"
                  />
                  
                  {/* Información del material */}
                  <View style={styles.materialInfo}>
                    <Text style={[styles.materialNombre, { color: '#e53935' }]} numberOfLines={2} ellipsizeMode="tail">
                      {getNombreTraducido(mat.nombre)}
                    </Text>
                    <Text style={[styles.materialSubtipo, { color: '#e53935' }]} numberOfLines={1} ellipsizeMode="tail">
                      {mat.subtipo || mat.tipo || 'Sin tipo'}
                    </Text>
                  </View>
                  
                  {/* Bolita de color */}
                  <View style={[styles.colorCirculo, { backgroundColor: mat.color || '#e53935' }]} />
                  
                  {/* Detalles del material agotado */}
                  <View style={styles.materialDetalles}>
                    <View style={styles.detalleFila}>
                      <Text style={styles.detalleLabel}>{t.price}</Text>
                      <Text style={styles.detalleValor}>${mat.precio}</Text>
                    </View>
                    <View style={styles.detalleFila}>
                      <Text style={styles.detalleLabel}>{t.remaining}</Text>
                      <Text style={[styles.detalleValor, { color: '#e53935' }]}>0</Text>
                    </View>
                    <View style={styles.detalleFila}>
                      <Text style={styles.detalleLabel}>{t.status}</Text>
                      <Text style={[styles.detalleValor, { color: '#e53935' }]}>{t.outOfStock}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

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
                  {t.confirmDeleteMaterialMessage}
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

        {/* Modal de edición de material */}
        {showEditModal && (
          <Modal
            visible={showEditModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowEditModal(false)}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalOverlay}
            >
              <View style={styles.editModalContainer}>
                <View style={styles.editModalHeader}>
                  <Text style={styles.editModalTitle}>✏️ {t.editMaterial}</Text>
                  <TouchableOpacity 
                    onPress={() => setShowEditModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.editModalContent}>
                  {/* Nombre del material */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.materialName} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.nombre}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, nombre: text }))}
                      placeholder={t.materialName}
                      placeholderTextColor="#666"
                    />
                  </View>

                  {/* Categoría */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.category}</Text>
                    <View style={styles.pickerContainer}>
                      {CATEGORIAS_BASE.map((categoria, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.pickerOption,
                            editForm.categoria === categoria && styles.pickerOptionActive
                          ]}
                          onPress={() => setEditForm(prev => ({ ...prev, categoria }))}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            editForm.categoria === categoria && styles.pickerOptionTextActive
                          ]}>
                            {traducirCategoria(categoria)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Tipo */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.type}</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.pickerScrollContainer}
                    >
                      <View style={styles.pickerContainer}>
                        {editForm.categoria === 'Filamento' && TIPOS_FILAMENTO.map((tipo, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.pickerOption,
                              editForm.tipo === tipo.tipo && styles.pickerOptionActive
                            ]}
                            onPress={() => setEditForm(prev => ({ ...prev, tipo: tipo.tipo, subtipo: '' }))}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              editForm.tipo === tipo.tipo && styles.pickerOptionTextActive
                            ]}>
                              {tipo.tipo}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {editForm.categoria === 'Resina' && TIPOS_RESINA.map((tipo, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.pickerOption,
                              editForm.tipo === tipo && styles.pickerOptionActive
                            ]}
                            onPress={() => setEditForm(prev => ({ ...prev, tipo }))}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              editForm.tipo === tipo && styles.pickerOptionTextActive
                            ]}>
                              {lang === 'en' ? TIPOS_RESINA_UI[tipo] : tipo}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {editForm.categoria === 'Pintura' && TIPOS_PINTURA.map((tipo, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.pickerOption,
                              editForm.tipo === tipo && styles.pickerOptionActive
                            ]}
                            onPress={() => setEditForm(prev => ({ ...prev, tipo }))}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              editForm.tipo === tipo && styles.pickerOptionTextActive
                            ]}>
                              {lang === 'en' ? TIPOS_PINTURA_UI[tipo] : tipo}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Subtipo */}
                  {editForm.categoria === 'Filamento' && editForm.tipo && subtiposDisponibles.length > 0 && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t.subtype}</Text>
                      <View style={styles.pickerContainer}>
                        {subtiposDisponibles.map((subtipo, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.pickerOption,
                              editForm.subtipo === subtipo && styles.pickerOptionActive
                            ]}
                            onPress={() => setEditForm(prev => ({ ...prev, subtipo }))}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              editForm.subtipo === subtipo && styles.pickerOptionTextActive
                            ]}>
                              {lang === 'en' && subtipo === 'Normal' ? 'Standard' : subtipo}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Color */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.color}</Text>
                    <View style={styles.coloresContainer}>
                      {COLORES.map((col) => (
                        <TouchableOpacity
                          key={col.nombre}
                          style={[
                            styles.colorPastilla,
                            { backgroundColor: col.valor },
                            editForm.color === col.valor ? styles.colorPastillaSeleccionada : null
                          ]}
                          onPress={() => setEditForm(prev => ({ ...prev, color: col.valor }))}
                        >
                          {editForm.color === col.valor && (
                            <Text style={styles.checkColor}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Marca */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.brand}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.marca}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, marca: text }))}
                      placeholder={t.brand}
                      placeholderTextColor="#666"
                    />
                  </View>

                  {/* Peso */}
                  {(editForm.categoria === 'Filamento' || editForm.categoria === 'Resina') && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {editForm.categoria === 'Filamento' ? t.bobbinWeight : t.resinWeight}
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={editForm.peso}
                        onChangeText={(text) => setEditForm(prev => ({ ...prev, peso: text }))}
                        placeholder={t.exampleWeight}
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                      />
                    </View>
                  )}

                  {/* Precio */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.price} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.precio}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, precio: text }))}
                      placeholder="0.00"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Cantidad */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.quantity} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.cantidad}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, cantidad: text }))}
                      placeholder="0"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Cantidad Restante */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.remainingStock} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.cantidadRestante}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, cantidadRestante: text }))}
                      placeholder="0"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>
                </ScrollView>

                <View style={styles.editModalButtons}>
                  <TouchableOpacity 
                    onPress={() => setShowEditModal(false)} 
                    style={styles.editModalButtonCancel}
                  >
                    <Text style={styles.editModalButtonTextCancel}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={guardarCambiosMaterial} 
                    style={styles.editModalButtonSave}
                  >
                    <Text style={styles.editModalButtonTextSave}>{t.save}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
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
  actionButtons: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
    gap: 8,
    zIndex: 2,
  },
  editButton: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#00e676',
  },
  deleteButton: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e53935',
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
  // Estilos para el modal de edición
  editModalContainer: {
    backgroundColor: '#181818',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  editModalTitle: {
    color: '#00e676',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  editModalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerOptionActive: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  pickerOptionText: {
    color: '#a0a0a0',
    fontSize: 12,
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: '#222',
    fontWeight: 'bold',
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  editModalButtonCancel: {
    backgroundColor: '#666',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  editModalButtonTextCancel: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editModalButtonSave: {
    backgroundColor: '#00e676',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  editModalButtonTextSave: {
    color: '#222',
    fontWeight: 'bold',
  },
  helperText: {
    color: '#a0a0a0',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  pickerScrollContainer: {
    maxHeight: 100,
  },
  coloresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  colorPastilla: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPastillaSeleccionada: {
    borderColor: '#00e676',
    borderWidth: 2,
  },
  checkColor: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InventoryScreen;