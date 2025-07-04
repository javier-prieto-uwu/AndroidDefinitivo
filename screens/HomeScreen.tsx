import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, app } from '../api/firebase';
import { getDocs, collection, getFirestore, query, orderBy, limit } from 'firebase/firestore';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const db = getFirestore(app);

  // Estado para materiales y estadísticas
  const [materiales, setMateriales] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    totalMateriales: 0,
    valorTotal: 0,
    stockTotal: 0,
    ultimaCotizacion: 0
  });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const cargarDatos = async () => {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) {
          setMateriales([]);
          setEstadisticas({
            totalMateriales: 0,
            valorTotal: 0,
            stockTotal: 0,
            ultimaCotizacion: 0
          });
          setLoading(false);
          return;
        }
        try {
          const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'materiales'));
          const mats = snapshot.docs.map(doc => doc.data());
          // Obtener la última cotización de calculadora
          let ultimaCotizacion = 0;
          try {
            const q = query(collection(db, 'usuarios', user.uid, 'calculos'), orderBy('fecha', 'desc'), limit(1));
            const calcSnap = await getDocs(q);
            if (!calcSnap.empty) {
              const calc = calcSnap.docs[0].data();
              ultimaCotizacion = parseFloat(calc.costoTotal) || 0;
            }
          } catch (e) { /* Si falla, deja 0 */ }
          setMateriales(mats);
          setEstadisticas({
            totalMateriales: mats.length,
            valorTotal: mats.reduce((sum, mat) => sum + (parseFloat(mat.precio) || 0), 0),
            stockTotal: mats.reduce((sum, mat) => sum + (parseFloat(mat.cantidad) || 0), 0),
            ultimaCotizacion
          });
        } catch (error) {
          setMateriales([]);
          setEstadisticas({
            totalMateriales: 0,
            valorTotal: 0,
            stockTotal: 0,
            ultimaCotizacion: 0
          });
        } finally {
          setLoading(false);
        }
      };
      cargarDatos();
    }, [])
  );

  return (
    <ScrollView style={styles.contenedorP}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bienvenido</Text>
        <Text style={styles.username}>{auth.currentUser?.email || 'Sin correo'}</Text>
      </View>

      {/* Estadísticas rápidas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{estadisticas.totalMateriales}</Text>
          <Text style={styles.statLabel}>Materiales</Text>
          <Text style={styles.statIcon}>📦</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${estadisticas.valorTotal.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Valor total</Text>
          <Text style={styles.statIcon}>💰</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{estadisticas.stockTotal}</Text>
          <Text style={styles.statLabel}>Stock total</Text>
          <Text style={styles.statIcon}>📊</Text>
        </View>
      </View>

      {/* Última cotización */}
      <View style={styles.quoteContainer}>
        <Text style={styles.quoteLabel}>Última Cotización</Text>
        <View style={styles.quoteAmountContainer}>
          <Text style={styles.quoteAmount}>${estadisticas.ultimaCotizacion}</Text>
          <Text style={styles.currency}>MXN</Text>
        </View>
      </View>

      {/* Lista de materiales agrupada por categoría */}
      <View style={styles.materialsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Materiales disponibles</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddMaterial' as never)}
          >
            <Text style={styles.addButtonText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#00e676" style={{ marginTop: 40 }} />
        ) : materiales.length === 0 ? (
          <Text style={{ color: '#a0a0a0', textAlign: 'center', marginTop: 20 }}>
            No hay materiales registrados.
          </Text>
        ) : (
          // Agrupar materiales por categoría
          Object.entries(materiales.reduce((acc, mat) => {
            const cat = mat.categoria || 'Sin categoría';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(mat);
            return acc;
          }, {} as { [cat: string]: any[] })).map(([cat, mats]) => (
            <View key={cat} style={{ marginBottom: 18 }}>
              <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 17, marginBottom: 6 }}>{cat}</Text>
              {(mats as any[]).map((material, idx) => (
                <View key={idx} style={styles.materialItem}>
                  {/* Contenedor de imagen */}
                  <View style={styles.imageContainer}>
                    <Image 
                      source={{ uri: material.imagen || 'https://www.mexicomakers.com.mx/cdn/shop/files/PLABlack.jpg?v=1740682017' }} 
                      style={styles.materialImage}
                      resizeMode="cover"
                    />
                    <View style={[styles.colorIndicator, { backgroundColor: material.color || '#00e676' }]} />
                  </View>
                  {/* Contenedor de información */}
                  <View style={styles.infoContainer}>
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialName}>{material.nombre || 'Sin nombre'}</Text>
                      <Text style={styles.materialPrice}>${material.precio || '0.00'}</Text>
                    </View>
                    <View style={styles.materialDetails}>
                      <View style={styles.stockContainer}>
                        <Text style={styles.stockLabel}>Stock:</Text>
                        <Text style={styles.materialStock}>{material.cantidad || 0} unidades</Text>
                      </View>
                      <Text style={styles.materialDescription}>{material.descripcion || ''}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedorP: {
    backgroundColor: '#0d0d0d',
    flex: 1,
    padding: 16,
    marginTop: 30,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    width: '30%',
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  statNumber: {
    color: '#00e676',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#a0a0a0',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 6,
  },
  statIcon: {
    fontSize: 18,
  },
  quoteContainer: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  quoteLabel: {
    color: '#a0a0a0',
    fontSize: 16,
    marginBottom: 8,
  },
  quoteAmountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  quoteAmount: {
    color: '#00e676',
    fontSize: 32,
    fontWeight: 'bold',
  },
  currency: {
    color: '#a0a0a0',
    fontSize: 16,
    marginLeft: 8,
    marginBottom: 4,
  },
  materialsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#00e676',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  materialItem: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  materialImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  colorIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#181818',
  },
  infoContainer: {
    flex: 1,
  },
  materialInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  materialName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  materialPrice: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  materialDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    color: '#a0a0a0',
    fontSize: 12,
    marginRight: 4,
  },
  materialStock: {
    color: '#00e676',
    fontSize: 12,
    fontWeight: '600',
  },
  materialDescription: {
    color: '#a0a0a0',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'right',
    flex: 1,
  },
});

export default HomeScreen; 