import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView,
  Alert,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales';
import { auth, app } from '../api/firebase';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

const db = getFirestore(app);

interface SalesSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'categories' | 'clients';
}

const SalesSettingsModal: React.FC<SalesSettingsModalProps> = ({ 
  visible, 
  onClose, 
  type 
}) => {
  const { lang } = useLanguage();
  const t = translations[lang];
  
  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      cargarItems();
    }
  }, [visible, type]);

  const cargarItems = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const collectionName = type === 'categories' ? 'categoriasVenta' : 'clientes';
      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, collectionName));
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(itemsData);
    } catch (error) {
      console.error('Error cargando items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const agregarItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', `Por favor ingresa un nombre para el ${type === 'categories' ? 'categoría' : 'cliente'}`);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const collectionName = type === 'categories' ? 'categoriasVenta' : 'clientes';
      await addDoc(collection(db, 'usuarios', user.uid, collectionName), {
        nombre: newItemName.trim(),
        fechaCreacion: new Date().toISOString()
      });

      setNewItemName('');
      cargarItems();
      Alert.alert('Éxito', `${type === 'categories' ? 'Categoría' : 'Cliente'} agregado correctamente`);
    } catch (error) {
      console.error('Error agregando item:', error);
      Alert.alert('Error', `No se pudo agregar el ${type === 'categories' ? 'categoría' : 'cliente'}`);
    }
  };

  const eliminarItem = async (itemId: string, itemName: string) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar "${itemName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;

              const collectionName = type === 'categories' ? 'categoriasVenta' : 'clientes';
              await deleteDoc(doc(db, 'usuarios', user.uid, collectionName, itemId));
              cargarItems();
              Alert.alert('Éxito', `${type === 'categories' ? 'Categoría' : 'Cliente'} eliminado correctamente`);
            } catch (error) {
              console.error('Error eliminando item:', error);
              Alert.alert('Error', `No se pudo eliminar el ${type === 'categories' ? 'categoría' : 'cliente'}`);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemName}>{item.nombre}</Text>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => eliminarItem(item.id, item.nombre)}
      >
        <Ionicons name="trash-outline" size={20} color="#e53935" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {type === 'categories' ? t.manageCategories : t.manageClients}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Agregar nuevo item */}
            <View style={styles.addSection}>
              <Text style={styles.sectionTitle}>
                {type === 'categories' ? t.addCategory : t.addClient}
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder={type === 'categories' ? t.categoryName : t.clientName}
                  placeholderTextColor="#666"
                />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={agregarItem}
                  disabled={!newItemName.trim()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista de items */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>
                {type === 'categories' ? t.categories : t.clients} ({items.length})
              </Text>
              {loading ? (
                <Text style={styles.loadingText}>Cargando...</Text>
              ) : items.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay {type === 'categories' ? 'categorías' : 'clientes'} registrados
                </Text>
              ) : (
                <FlatList
                  data={items}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  scrollEnabled={false}
                />
              )}
            </View>
          </ScrollView>
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
  addSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  addButton: {
    backgroundColor: '#00e676',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSection: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  loadingText: {
    color: '#a0a0a0',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: '#a0a0a0',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SalesSettingsModal; 