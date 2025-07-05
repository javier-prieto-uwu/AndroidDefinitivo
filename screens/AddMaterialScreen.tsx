import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { auth, app } from '../api/firebase';

// Importo los SVGs disponibles
import Filamento1SVG from '../assets/filamento1.svg';
import Gancho2SVG from '../assets/gancho2.svg';
import ResinaSVG from '../assets/resina.svg';
import PinturasSVG from '../assets/pinturas.svg';
import PegamentosSVG from '../assets/pegamentos.svg';
import NiideaSVG from '../assets/niidea.svg';
import BrochasSVG from '../assets/brochas.svg';
import ArosllaverosSVG from '../assets/arosllaveros.svg';

const SVG_OPTIONS = [
  { label: 'Filamento 1', value: 'filamento1', Component: Filamento1SVG },
  { label: 'Gancho 2', value: 'gancho2', Component: Gancho2SVG },
  { label: 'Resina', value: 'resina', Component: ResinaSVG },
  { label: 'Pinturas', value: 'pinturas', Component: PinturasSVG },
  { label: 'Pegamentos', value: 'pegamentos', Component: PegamentosSVG },
  { label: 'Ni idea', value: 'niidea', Component: NiideaSVG },
  { label: 'Brochas', value: 'brochas', Component: BrochasSVG },
  { label: 'Aros llaveros', value: 'arosllaveros', Component: ArosllaverosSVG },
];

// Tipos y subtipos de filamento
const tiposFilamento = [
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
  const categoriasBase = [
    'Filamento',
    'Resina',
    'Pintura',
    'Aros de llavero',
    // Puedes agregar más categorías aquí
  ];

  const tiposPintura = ['Acrílica', 'Esmalte', 'Spray', 'Óleo', 'Vinílica', 'Acuarela'];
  const coloresPintura = colores.map(c => c.nombre); // Reutiliza los colores de filamento

  // Estado para categorías personalizadas
  const [categoriasPersonalizadas, setCategoriasPersonalizadas] = useState<string[]>([]);
  const [categoriasPersonalizadasData, setCategoriasPersonalizadasData] = useState<{nombre: string, tipo?: string, color?: string, costo?: string}[]>([]);
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
  const [mostrarSelectorColor, setMostrarSelectorColor] = useState<false | 'filamento' | 'pintura' | 'nuevaCategoria'>(false);
  const [usarTipo, setUsarTipo] = useState(false);
  const [usarColor, setUsarColor] = useState(false);
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
  });

  // Generar nombre automáticamente según la categoría
  let nombreGenerado = '';
  if (material.categoria === 'Filamento') {
    nombreGenerado = [material.tipo, material.subtipo, material.color].filter(Boolean).join(' ');
  } else if (material.categoria === 'Resina') {
    nombreGenerado = [material.tipo, material.subtipo, material.color].filter(Boolean).join(' ');
  } else if (material.categoria === 'Pintura') {
    nombreGenerado = [material.tipoPintura, material.colorPintura].filter(Boolean).join(' ');
  } else if (material.categoria === 'Aros de llavero') {
    nombreGenerado = 'Aro de llavero';
  }

  // Obtener subtipos según el tipo seleccionado (para filamento y resina)
  const subtipos = material.categoria === 'Filamento' 
    ? tiposFilamento.find(t => t.tipo === material.tipo)?.subtipos || []
    : [];

  // Validar si se puede guardar según la categoría
  let puedeGuardar = false;
  if (material.categoria === 'Filamento') {
    puedeGuardar = !!material.tipo && !!material.subtipo && !!material.color && !!material.precio && !!material.cantidad && !!material.peso;
  } else if (material.categoria === 'Resina') {
    puedeGuardar = !!material.tipo && !!material.color && !!material.precio && !!material.cantidad && !!material.peso;
  } else if (material.categoria === 'Pintura') {
    puedeGuardar = !!material.tipoPintura && !!material.colorPintura && !!material.cantidadPintura && !!material.precio && !!material.cantidad;
  } else if (material.categoria === 'Aros de llavero') {
    puedeGuardar = !!material.precio && !!material.cantidad;
  }

  const db = getFirestore(app);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  const handleGuardar = async (): Promise<void> => {
    // Guardar ambos campos tal como los ingresa el usuario
    let materialAGuardar: any = { ...material, nombre: nombreGenerado };
    materialAGuardar.stock = material.cantidad; // stock = número de bobinas
    if (material.peso) {
      materialAGuardar.cantidadRestante = material.peso;
    }
    // Registrar fecha automáticamente
    materialAGuardar.fechaRegistro = new Date().toISOString();
    // Guardar la ruta del SVG seleccionado
    if (material.svgSeleccionado) {
      materialAGuardar.imagen = material.svgSeleccionado;
    }
    try {
      const user = auth.currentUser;
      if (!user) {
        setAlertType('error');
        setAlertMessage('Debes iniciar sesión para guardar materiales');
        setShowAlert(true);
        return;
      }
      await addDoc(collection(db, 'usuarios', user.uid, 'materiales'), materialAGuardar);
      setAlertType('success');
      setAlertMessage('Material guardado correctamente');
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
      });
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage('Error al guardar el material: ' + (error.message || error));
      setShowAlert(true);
    }
  };

  // Lógica para agregar nueva categoría personalizada
  const handleAgregarCategoria = () => {
    if (!nuevaCategoria.nombre) return;
    setCategoriasPersonalizadas([...categoriasPersonalizadas, nuevaCategoria.nombre]);
    setCategoriasPersonalizadasData([...categoriasPersonalizadasData, { ...nuevaCategoria }]);
    setMaterial({
      ...material,
      categoria: nuevaCategoria.nombre,
      tipo: nuevaCategoria.tipo,
      color: nuevaCategoria.color,
      precio: nuevaCategoria.costo
    });
    setNuevaCategoria({ nombre: '', tipo: '', color: '', costo: '' });
    setMostrarNuevaCategoria(false);
    setUsarTipo(false);
    setUsarColor(false);
    setMostrarSelectorColor(false);
  };

  // Eliminar categoría personalizada
  const handleEliminarCategoria = (nombre: string) => {
    setCategoriasPersonalizadas(categoriasPersonalizadas.filter(cat => cat !== nombre));
    setCategoriasPersonalizadasData(categoriasPersonalizadasData.filter(cat => cat.nombre !== nombre));
    if (material.categoria === nombre) {
      setMaterial({ ...material, categoria: '', tipo: '', color: '', precio: '' });
    }
  };

  return (
    <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Nuevo material</Text>
        </View>

        {/* Selector visual de SVGs pequeño */}
        <Text style={styles.label}>Selecciona una imagen</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {SVG_OPTIONS.map(({ label, value, Component }) => (
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
              onPress={() => setMaterial({ ...material, svgSeleccionado: value })}
            >
              <Component width={40} height={40} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Selector de categoría con pastilla + y X para eliminar */}
        <Text style={styles.label}>Categoría</Text>
        <View style={[styles.pastillasContainer, { alignItems: 'center' }]}> 
          {categoriasBase.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.pastilla,
                material.categoria === cat && styles.pastillaSeleccionada
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
              })}
            >
              <Text style={[
                styles.pastillaTexto,
                material.categoria === cat && styles.pastillaTextoSeleccionada
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
          {categoriasPersonalizadas.map((cat, idx) => (
            <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
              <TouchableOpacity
                style={[
                  styles.pastilla,
                  material.categoria === cat && styles.pastillaSeleccionada
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
                })}
              >
                <Text style={[
                  styles.pastillaTexto,
                  material.categoria === cat && styles.pastillaTextoSeleccionada
                ]}>{cat}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleEliminarCategoria(cat)} style={{ marginLeft: -10, marginRight: 2, padding: 2 }}>
                <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 18 }}>×</Text>
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
            <Text style={styles.label}>Nueva categoría</Text>
            <TextInput
              style={styles.input}
              value={nuevaCategoria.nombre}
              onChangeText={text => setNuevaCategoria({ ...nuevaCategoria, nombre: text })}
              placeholder="Nombre de la categoría"
            />
            {/* Switch para activar/desactivar campo tipo */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={styles.label}>¿Agregar tipo?</Text>
              <TouchableOpacity
                style={[styles.pastilla, usarTipo ? { backgroundColor: '#00e676', borderColor: '#00e676' } : { backgroundColor: '#222', borderColor: '#333' }]}
                onPress={() => setUsarTipo(!usarTipo)}
              >
                <Text style={[styles.pastillaTexto, usarTipo && { color: '#222', fontWeight: 'bold' }]}>{usarTipo ? 'Sí' : 'No'}</Text>
              </TouchableOpacity>
            </View>
            {usarTipo && (
              <TextInput
                style={styles.input}
                value={nuevaCategoria.tipo}
                onChangeText={text => setNuevaCategoria({ ...nuevaCategoria, tipo: text })}
                placeholder="Tipo (opcional)"
              />
            )}
            {/* Switch para activar/desactivar campo color */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={styles.label}>¿Agregar color?</Text>
              <TouchableOpacity
                style={[styles.pastilla, usarColor ? { backgroundColor: '#00e676', borderColor: '#00e676' } : { backgroundColor: '#222', borderColor: '#333' }]}
                onPress={() => setUsarColor(!usarColor)}
              >
                <Text style={[styles.pastillaTexto, usarColor && { color: '#222', fontWeight: 'bold' }]}>{usarColor ? 'Sí' : 'No'}</Text>
              </TouchableOpacity>
            </View>
            {usarColor && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: '#a0a0a0', marginBottom: 4 }}>Selecciona un color:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                        borderWidth: nuevaCategoria.color === col ? 3 : 2,
                        borderColor: nuevaCategoria.color === col ? '#00e676' : '#333',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={() => setNuevaCategoria({ ...nuevaCategoria, color: col })}
                    >
                      {nuevaCategoria.color === col && <Text style={{ color: col === '#fff' ? '#222' : '#fff', fontWeight: 'bold' }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <TextInput
              style={styles.input}
              value={nuevaCategoria.costo}
              onChangeText={text => setNuevaCategoria({ ...nuevaCategoria, costo: text })}
              placeholder="Costo (obligatorio)"
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setMostrarNuevaCategoria(false)} style={[styles.pastilla, { backgroundColor: '#a0a0a0' }]}> 
                <Text style={{ color: '#222' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAgregarCategoria}
                style={[styles.pastilla, { backgroundColor: '#00e676' }, (!nuevaCategoria.nombre || !nuevaCategoria.costo) && { opacity: 0.5 }]}
                disabled={!nuevaCategoria.nombre || !nuevaCategoria.costo}
              > 
                <Text style={{ color: '#222', fontWeight: 'bold' }}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Resumen de selección */}
        <View style={styles.resumenContainer}>
          <Text style={styles.resumenTitulo}>Resumen de selección:</Text>
          <Text style={styles.resumenTexto}>Categoría: <Text style={styles.resumenDato}>{material.categoria || '-'}</Text></Text>
          {material.categoria === 'Filamento' && (
            <>
              <Text style={styles.resumenTexto}>Tipo: <Text style={styles.resumenDato}>{material.tipo || '-'}</Text></Text>
              <Text style={styles.resumenTexto}>Subtipo: <Text style={styles.resumenDato}>{material.subtipo || '-'}</Text></Text>
              <Text style={styles.resumenTexto}>Color: <Text style={styles.resumenDato}>{material.color || '-'}</Text></Text>
            </>
          )}
          {material.categoria === 'Resina' && (
            <>
              <Text style={styles.resumenTexto}>Tipo: <Text style={styles.resumenDato}>{material.tipo || '-'}</Text></Text>
              <Text style={styles.resumenTexto}>Color: <Text style={styles.resumenDato}>{material.color || '-'}</Text></Text>
            </>
          )}
          {material.categoria === 'Pintura' && (
            <>
              <Text style={styles.resumenTexto}>Tipo: <Text style={styles.resumenDato}>{material.tipoPintura || '-'}</Text></Text>
              <Text style={styles.resumenTexto}>Color: <Text style={styles.resumenDato}>{material.colorPintura || '-'}</Text></Text>
              <Text style={styles.resumenTexto}>Cantidad: <Text style={styles.resumenDato}>{material.cantidadPintura || '-'}</Text></Text>
            </>
          )}
          <Text style={styles.resumenTexto}>Nombre generado: <Text style={styles.resumenDato}>{nombreGenerado || '-'}</Text></Text>
        </View>

        {/* Formulario dinámico según categoría */}
        <View style={styles.formContainer}>
          {/* FILAMENTO */}
          {material.categoria === 'Filamento' && (
            <>
              <Text style={styles.label}>Tipo de filamento</Text>
              <View style={styles.pastillasContainer}>
                {tiposFilamento.map((t) => (
                  <TouchableOpacity
                    key={t.tipo}
                    style={[
                      styles.pastilla,
                      material.tipo === t.tipo && styles.pastillaSeleccionada
                    ]}
                    onPress={() => setMaterial({ ...material, tipo: t.tipo, subtipo: '' })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      material.tipo === t.tipo && styles.pastillaTextoSeleccionada
                    ]}>{t.tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {material.tipo !== '' && (
                <>
                  <Text style={styles.label}>Subtipo</Text>
                  <View style={styles.pastillasContainer}>
                    {subtipos.map((sub) => (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.pastilla,
                          material.subtipo === sub && styles.pastillaSeleccionada
                        ]}
                        onPress={() => setMaterial({ ...material, subtipo: sub })}
                      >
                        <Text style={[
                          styles.pastillaTexto,
                          material.subtipo === sub && styles.pastillaTextoSeleccionada
                        ]}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <Text style={styles.label}>Color</Text>
              <Text style={{ color: '#a0a0a0', marginBottom: 4 }}>Selecciona un color:</Text>
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
              <Text style={styles.label}>Peso de la bobina (gramos)</Text>
              <TextInput
                style={styles.input}
                value={material.peso}
                onChangeText={(text) => setMaterial({ ...material, peso: text })}
                placeholder="Ej: 1000"
                keyboardType="numeric"
              />
            </>
          )}

          {/* RESINA */}
          {material.categoria === 'Resina' && (
            <>
              <Text style={styles.label}>Tipo de resina</Text>
              <View style={styles.pastillasContainer}>
                {tiposResina.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.pastilla,
                      material.tipo === t && styles.pastillaSeleccionada
                    ]}
                    onPress={() => setMaterial({ ...material, tipo: t, subtipo: '' })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      material.tipo === t && styles.pastillaTextoSeleccionada
                    ]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Color</Text>
              <Text style={{ color: '#a0a0a0', marginBottom: 4 }}>Selecciona un color:</Text>
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
              <Text style={styles.label}>Peso de la resina (gramos)</Text>
              <TextInput
                style={styles.input}
                value={material.peso}
                onChangeText={(text) => setMaterial({ ...material, peso: text })}
                placeholder="Ej: 1000"
                keyboardType="numeric"
              />
            </>
          )}

          {/* PINTURA */}
          {material.categoria === 'Pintura' && (
            <>
              <Text style={styles.label}>Tipo de pintura</Text>
              <View style={styles.pastillasContainer}>
                {tiposPintura.map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.pastilla,
                      material.tipoPintura === tipo && styles.pastillaSeleccionada
                    ]}
                    onPress={() => setMaterial({ ...material, tipoPintura: tipo })}
                  >
                    <Text style={[
                      styles.pastillaTexto,
                      material.tipoPintura === tipo && styles.pastillaTextoSeleccionada
                    ]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Color</Text>
              <Text style={{ color: '#a0a0a0', marginBottom: 4 }}>Selecciona un color:</Text>
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
                      borderWidth: material.colorPintura === col ? 3 : 2,
                      borderColor: material.colorPintura === col ? '#00e676' : '#333',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => setMaterial({ ...material, colorPintura: col })}
                  >
                    {material.colorPintura === col && <Text style={{ color: col === '#fff' ? '#222' : '#fff', fontWeight: 'bold' }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Cantidad (ml)</Text>
              <TextInput
                style={styles.input}
                value={material.cantidadPintura}
                onChangeText={(text) => setMaterial({ ...material, cantidadPintura: text })}
                placeholder="Ej: 250"
                keyboardType="numeric"
              />
            </>
          )}

          {/* CAMPOS GENERALES (para todas las categorías) */}
          <Text style={styles.label}>Precio unitario</Text>
          <TextInput
            style={styles.input}
            value={material.precio}
            onChangeText={(text) => setMaterial({ ...material, precio: text })}
            placeholder="Ej: 250.00"
            keyboardType="numeric"
          />
          <Text style={styles.label}>Cantidad disponible</Text>
          <TextInput
            style={styles.input}
            value={material.cantidad}
            onChangeText={(text) => setMaterial({ ...material, cantidad: text })}
            placeholder="Ej: 10"
            keyboardType="numeric"
          />
      </View>

        {/* Botón Guardar */}
        <TouchableOpacity style={[styles.guardarBtn, !puedeGuardar && { opacity: 0.5 }]} onPress={handleGuardar} disabled={!puedeGuardar}>
          <Text style={styles.guardarText}>GUARDAR</Text>
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
               {alertType === 'success' ? '¡Éxito!' : 'Error'}
             </Text>
             <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>{alertMessage}</Text>
             <TouchableOpacity
               style={{ marginTop: 10, backgroundColor: alertType === 'success' ? '#00e676' : '#e53935', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
               onPress={() => setShowAlert(false)}
             >
               <Text style={{ color: alertType === 'success' ? '#222' : '#fff', fontWeight: 'bold', fontSize: 16 }}>Cerrar</Text>
             </TouchableOpacity>
           </View>
         </View>
       </Modal>
        {/* Espacio visual para la barra de tabs */}
        <View style={{ height: 70, backgroundColor: '#0d0d0d' }} />
      </ScrollView>
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