import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales';
import { auth, app } from '../api/firebase';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const db = getFirestore(app);

interface SalesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (ventaData: any) => void;
  impresion: any;
}

// Categorías por defecto (fallback)
const CATEGORIAS_DEFAULT = [
  { id: 'llaveros', nombre: 'Llaveros', icon: 'key-outline' },
  { id: 'figuras', nombre: 'Figuras', icon: 'cube-outline' },
  { id: 'prototipos', nombre: 'Prototipos', icon: 'construct-outline' },
  { id: 'otros', nombre: 'Otros', icon: 'ellipsis-horizontal-outline' }
];

const SalesModal: React.FC<SalesModalProps> = ({ 
  visible, 
  onClose, 
  onSave, 
  impresion 
}) => {
  const { lang } = useLanguage();
  const t = translations[lang];
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [cliente, setCliente] = useState<string>('');
  const [precioVenta, setPrecioVenta] = useState<string>('');
  const [notasVenta, setNotasVenta] = useState<string>('');
  const [categorias, setCategorias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSave = () => {
    if (!categoriaSeleccionada || !cliente.trim() || !precioVenta.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    const ganancia = parseFloat(precioVenta) - parseFloat(impresion.costoTotal || '0');
    
    const ventaData = {
      estadoVenta: 'vendido',
      categoriaVenta: categoriaSeleccionada,
      cliente: cliente.trim(),
      precioVenta: precioVenta,
      ganancia: ganancia.toString(),
      fechaVenta: new Date().toISOString(),
      notasVenta: notasVenta.trim()
    };

    onSave(ventaData);
    resetForm();
  };

  const handleQuickSave = (categoria: string, cliente: string) => {
    const precioEstimado = (parseFloat(impresion.costoTotal || '0') * 1.5).toFixed(2);
    const ganancia = parseFloat(precioEstimado) - parseFloat(impresion.costoTotal || '0');
    
    const ventaData = {
      estadoVenta: 'vendido',
      categoriaVenta: categoria,
      cliente: cliente,
      precioVenta: precioEstimado,
      ganancia: ganancia.toString(),
      fechaVenta: new Date().toISOString(),
      notasVenta: ''
    };

    onSave(ventaData);
    resetForm();
  };

  const resetForm = () => {
    setCategoriaSeleccionada('');
    setCliente('');
    setPrecioVenta('');
    setNotasVenta('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Cargar categorías y clientes
  useEffect(() => {
    if (visible) {
      cargarDatos();
    }
  }, [visible]);

  const cargarDatos = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Cargar categorías y clientes en paralelo
      const [categoriasSnap, clientesSnap] = await Promise.all([
        getDocs(collection(db, 'usuarios', user.uid, 'categoriasVenta')),
        getDocs(collection(db, 'usuarios', user.uid, 'clientesVenta'))
      ]);

      const categoriasData = categoriasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const clientesData = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Usar categorías personalizadas si existen, sino usar las por defecto
      const categoriasFinales = categoriasData.length > 0 ? categoriasData : CATEGORIAS_DEFAULT;
      
      setCategorias(categoriasFinales);
      setClientes(clientesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setCategorias(CATEGORIAS_DEFAULT);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.markAsSold}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Información de la impresión */}
            <View style={styles.impresionInfo}>
              <Text style={styles.impresionTitle}>{impresion?.nombre}</Text>
              <Text style={styles.impresionCosto}>
                {t.productionCost}: ${impresion?.costoTotal || '0'} MXN
              </Text>
            </View>

            {/* Categorías */}
            <Text style={styles.sectionTitle}>{t.saleCategory}</Text>
            {loading ? (
              <Text style={styles.loadingText}>Cargando categorías...</Text>
            ) : (
              <View style={styles.categoriasContainer}>
                {categorias.map((categoria) => (
                  <TouchableOpacity
                    key={categoria.id}
                    style={[
                      styles.categoriaButton,
                      categoriaSeleccionada === categoria.id && styles.categoriaSeleccionada
                    ]}
                    onPress={() => setCategoriaSeleccionada(categoria.id)}
                  >
                    <Ionicons 
                      name={categoria.icon || 'cube-outline'} 
                      size={20} 
                      color={categoriaSeleccionada === categoria.id ? '#222' : '#00e676'} 
                    />
                    <Text style={[
                      styles.categoriaText,
                      categoriaSeleccionada === categoria.id && styles.categoriaTextSeleccionada
                    ]}>
                      {categoria.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Cliente */}
            <Text style={styles.sectionTitle}>{t.client}</Text>
            {clientes.length > 0 ? (
              <View style={styles.clientesContainer}>
                {clientes.map((clienteItem) => (
                  <TouchableOpacity
                    key={clienteItem.id}
                    style={[
                      styles.clienteButton,
                      cliente === clienteItem.nombre && styles.clienteSeleccionado
                    ]}
                    onPress={() => setCliente(clienteItem.nombre)}
                  >
                    <Text style={[
                      styles.clienteText,
                      cliente === clienteItem.nombre && styles.clienteTextSeleccionado
                    ]}>
                      {clienteItem.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={cliente}
                onChangeText={setCliente}
                placeholder={t.clientName}
                placeholderTextColor="#666"
              />
            )}

            {/* Precio de venta */}
            <Text style={styles.sectionTitle}>{t.salePrice}</Text>
            <TextInput
              style={styles.input}
              value={precioVenta}
              onChangeText={setPrecioVenta}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            {/* Notas */}
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notasVenta}
              onChangeText={setNotasVenta}
              placeholder={t.additionalNotes}
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />

            {/* Resumen de ganancia */}
            {precioVenta && (
              <View style={styles.gananciaContainer}>
                <Text style={styles.gananciaLabel}>{t.profit}:</Text>
                <Text style={styles.gananciaValue}>
                  ${(parseFloat(precioVenta) - parseFloat(impresion?.costoTotal || '0')).toFixed(2)} MXN
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#00e676',
    fontWeight: 'bold',
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  impresionInfo: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  impresionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  impresionCosto: {
    color: '#00e676',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  categoriasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoriaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoriaSeleccionada: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  categoriaText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
  },
  categoriaTextSeleccionada: {
    color: '#222',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  gananciaContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gananciaLabel: {
    color: '#fff',
    fontSize: 14,
  },
  gananciaValue: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#00e676',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#222',
    fontWeight: 'bold',
  },
  clientesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clienteButton: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  clienteSeleccionado: {
    backgroundColor: '#00e676',
    borderColor: '#00e676',
  },
  clienteText: {
    color: '#fff',
    fontSize: 12,
  },
  clienteTextSeleccionado: {
    color: '#222',
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#a0a0a0',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SalesModal; 