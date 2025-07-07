import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useFocusEffect } from '@react-navigation/native'
import { auth } from '../api/firebase'
import { signOut } from 'firebase/auth'
import { getDocs, collection, getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales';

// Simulación de datos locales para estadísticas y categorías
const estadisticasEjemplo = {
  materialesDisponibles: 3,
  filamentoConsumido: 1240,
  resinaConsumida: 0,
  proyectosCompletados: 8,
  tiempoImpresion: 42.5,
  costoTotalMateriales: 1500,
  ganancias: 3200,
  eficiencia: 80,
  tiempoPromedioProyecto: '5.3',
  pedidosPendientes: 1
};
const categoriasEjemplo = [
      { nombre: t.filaments, cantidad: 2, color: '#00e676' },
    { nombre: t.resins, cantidad: 1, color: '#2196f3' },
    { nombre: t.paints, cantidad: 0, color: '#ff9800' },
    { nombre: t.keychainRings, cantidad: 0, color: '#9c27b0' }
];

const MenuScreen: React.FC = ({ setIsLoggedIn }: { setIsLoggedIn: (value: boolean) => void }) => {
  const navigation = useNavigation();
  const { lang, setLang } = useLanguage();
  const t = translations[lang];
  
  // Estado para estadísticas y categorías
  const [estadisticas, setEstadisticas] = useState(estadisticasEjemplo);
  const [categoriasMateriales, setCategoriasMateriales] = useState(categoriasEjemplo);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Datos del usuario autenticado
  const user = auth.currentUser;
  const nombreUsuario = user?.displayName || 'Usuario';
  const emailUsuario = user?.email || '';
  const fotoUsuario = user?.photoURL || 'https://via.placeholder.com/100x100/00e676/ffffff?text=U';
  // Nivel calculado según horas de impresión
  // Nivel numérico y texto
  const nivelNumerico = Math.floor(estadisticas.tiempoImpresion / 10);
  let nivelUsuario = 'Principiante';
  if (estadisticas.tiempoImpresion >= 150) {
    nivelUsuario = 'Profesional';
  } else if (estadisticas.tiempoImpresion >= 50) {
    nivelUsuario = 'Intermedio';
  }
  // Guardar nivel en Firestore si cambia
  React.useEffect(() => {
    const guardarNivel = async () => {
      if (!user) return;
      const userRef = doc(db, 'usuarios', user.uid);
      try {
        const userSnap = await getDoc(userRef);
        const data = userSnap.exists() ? userSnap.data() : {};
        if (data.nivelNumerico !== nivelNumerico) {
          await setDoc(userRef, { ...data, nivelNumerico }, { merge: true });
        }
      } catch (e) {
        // No hacer nada si falla
      }
    };
    guardarNivel();
  }, [nivelNumerico, user]);
  const fechaRegistro = user?.metadata?.creationTime || '';

  const db = getFirestore();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar sesión', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // Cambiar el estado de login para regresar a la pantalla de bienvenida
              setIsLoggedIn(false);
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    // TODO: Implementar edición de perfil
    Alert.alert('Editar perfil', 'Función en desarrollo');
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add':
        navigation.navigate('Agregar' as never);
        break;
      case 'inventory':
        navigation.navigate('Inventario' as never);
        break;
      case 'calculator':
        navigation.navigate('Costos' as never);
        break;
      case 'history':
        navigation.navigate('Historial' as never);
        break;
    }
  };

  // Leer datos reales de Firestore con listeners en tiempo real
  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;

      setLoading(true);
      
      // Función para calcular estadísticas
      const calcularEstadisticas = (materiales: any[], calculos: any[]) => {
        // Calcular categorías
        const categorias = {};
        materiales.forEach(mat => {
          const cat = mat.categoria || 'Sin categoría';
          if (!categorias[cat]) categorias[cat] = { nombre: cat, cantidad: 0, color: '#00e676' };
          categorias[cat].cantidad += 1;
        });
        // Asignar color por categoría
        Object.values(categorias).forEach((cat: any) => {
              if (cat.nombre.toLowerCase().includes(t.filament.toLowerCase())) cat.color = '#00e676';
    else if (cat.nombre.toLowerCase().includes(t.resin.toLowerCase())) cat.color = '#2196f3';
    else if (cat.nombre.toLowerCase().includes(t.paint.toLowerCase())) cat.color = '#ff9800';
          else if (cat.nombre.toLowerCase().includes('aro')) cat.color = '#9c27b0';
          else cat.color = '#b0b0b0';
        });

        // Filamento y resina consumidos
        let filamentoConsumido = 0;
        let resinaConsumida = 0;
        materiales.forEach(mat => {
              if (mat.categoria === t.filament) filamentoConsumido += parseFloat(mat.cantidad || 0) * parseFloat(mat.peso || 0);
    if (mat.categoria === t.resin) resinaConsumida += parseFloat(mat.cantidad || 0) * parseFloat(mat.peso || 0);
        });

        // Proyectos completados
        const proyectosCompletados = calculos.length;

        // Contar fallos y éxitos
        const fallos = calculos.filter(calc => calc.fallo === true).length;
        const exitosas = proyectosCompletados - fallos;
        const eficiencia = proyectosCompletados > 0 ? Math.round((exitosas / proyectosCompletados) * 100) : 0;

        // Tiempo total y promedio de impresión
        let tiempoImpresion = 0;
        calculos.forEach(calc => {
          if (calc.detallesImpresion && calc.detallesImpresion.tiempoImpresion) {
            tiempoImpresion += parseFloat(calc.detallesImpresion.tiempoImpresion) || 0;
          }
        });
        const tiempoPromedioProyecto = proyectosCompletados > 0 ? (tiempoImpresion / proyectosCompletados).toFixed(1) : '0';

        // Costo total materiales y ganancias
        let costoTotalMateriales = 0;
        let ganancias = 0;
        materiales.forEach(mat => {
          costoTotalMateriales += parseFloat(mat.precio || 0) * parseFloat(mat.cantidad || 0);
        });
        calculos.forEach(calc => {
          ganancias += parseFloat(calc.costoTotal || 0);
        });

        setEstadisticas({
          materialesDisponibles: materiales.length,
          filamentoConsumido,
          resinaConsumida,
          proyectosCompletados,
          tiempoImpresion,
          costoTotalMateriales,
          ganancias,
          eficiencia,
          tiempoPromedioProyecto,
          pedidosPendientes: 0
        });
        setCategoriasMateriales(Object.values(categorias));
        setLoading(false);
      };

      // Listeners en tiempo real para materiales y cálculos
      const unsubscribeMateriales = onSnapshot(
        collection(db, 'usuarios', user.uid, 'materiales'),
        (snapshot) => {
          const materialesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMateriales(materialesData);
          // Obtener cálculos actuales para recalcular estadísticas
          getDocs(collection(db, 'usuarios', user.uid, 'calculos')).then(snapshotCalc => {
            const calculos = snapshotCalc.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            calcularEstadisticas(materialesData, calculos);
          });
        },
        (error) => {
          console.error('Error en listener de materiales:', error);
          setEstadisticas(estadisticasEjemplo);
          setCategoriasMateriales(categoriasEjemplo);
          setLoading(false);
        }
      );

      const unsubscribeCalculos = onSnapshot(
        collection(db, 'usuarios', user.uid, 'calculos'),
        (snapshot) => {
          const calculos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Obtener materiales actuales para recalcular estadísticas
          getDocs(collection(db, 'usuarios', user.uid, 'materiales')).then(snapshotMat => {
            const materiales = snapshotMat.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            calcularEstadisticas(materiales, calculos);
          });
        },
        (error) => {
          console.error('Error en listener de cálculos:', error);
          setEstadisticas(estadisticasEjemplo);
          setCategoriasMateriales(categoriasEjemplo);
          setLoading(false);
        }
      );

      // Cleanup function
      return () => {
        unsubscribeMateriales();
        unsubscribeCalculos();
      };
    }, [user])
  );

  // Calcular datos reales para la gráfica circular de tipos de filamento
  const tiposFilamentoContador: Record<string, number> = {};
  materiales.filter(m => m.categoria === t.filament).forEach(m => {
    const tipo = m.tipo || 'Otro';
    tiposFilamentoContador[tipo] = (tiposFilamentoContador[tipo] || 0) + 1;
  });
  const colores = ['#00e676', '#ff9800', '#2196f3', '#9c27b0', '#b0b0b0', '#e53935', '#43a047', '#1e88e5'];
  const pieData = Object.entries(tiposFilamentoContador).map(([tipo, cantidad], i) => ({
    name: tipo,
    population: cantidad,
    color: colores[i % colores.length],
    legendFontColor: '#fff',
    legendFontSize: 13,
  }));

  return (
    <ScrollView style={styles.container}>
      {/* Selector de idioma global */}
      <View style={{ alignItems: 'flex-end', marginTop: 20, marginRight: 20 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#181818', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1, borderColor: '#00e676' }}
          onPress={() => setLang(lang === 'es' ? 'en' : 'es')}
        >
          <Text style={{ color: '#00e676', fontWeight: 'bold' }}>{lang === 'es' ? 'ENGLISH' : 'ESPAÑOL'}</Text>
        </TouchableOpacity>
      </View>
      {/* Header con foto de usuario */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
            <Image 
              source={{ uri: fotoUsuario }} 
              style={styles.userPhoto}
            />
            {/* Nivel numérico en verde, centrado sobre la foto */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 60,
              height: 60,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 14, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }}>
                NVL {nivelNumerico}
              </Text>
            </View>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{nombreUsuario}</Text>
            <Text style={styles.userEmail}>{emailUsuario}</Text>
            <View style={styles.userLevel}>
              <Text style={styles.levelText}>{t.level}: {nivelNumerico} ({nivelUsuario})</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Estadísticas principales */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>{t.generalStats}</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{estadisticas.proyectosCompletados.toLocaleString('es-MX')}</Text>
            <Text style={styles.statLabel}>{t.completedProjects}</Text>
            <Text style={styles.statIcon}>✅</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{Number(estadisticas.tiempoImpresion).toLocaleString('es-MX', { maximumFractionDigits: 1 })}h</Text>
            <Text style={styles.statLabel}>{t.totalPrintingTime}</Text>
            <Text style={styles.statIcon}>⏱️</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{Number(estadisticas.tiempoPromedioProyecto).toLocaleString('es-MX', { maximumFractionDigits: 1 })}h</Text>
            <Text style={styles.statLabel}>{t.averageProjectTime}</Text>
            <Text style={styles.statIcon}>📊</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{estadisticas.materialesDisponibles.toLocaleString('es-MX')}</Text>
            <Text style={styles.statLabel}>{t.availableMaterials}</Text>
            <Text style={styles.statIcon}>📦</Text>
          </View>
        </View>
        {/* Gráfica circular de tipos de filamento */}
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 8 }]}>{t.filamentTypes}</Text>
          <PieChart
            data={pieData}
            width={Dimensions.get('window').width - 64}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 230, 118, ${opacity})`,
              labelColor: () => '#fff',
              backgroundColor: '#181818',
              backgroundGradientFrom: '#181818',
              backgroundGradientTo: '#181818',
              decimalPlaces: 0,
            }}
            accessor={'population'}
            backgroundColor={'transparent'}
            paddingLeft={"0"}
            absolute
          />
        </View>
        {/* Barra segmentada de tipos de filamento */}
        {pieData.length > 0 && (
          <View style={{ width: '100%' }}>
            <View style={{ flexDirection: 'row', height: 24, width: '100%', backgroundColor: '#222', borderRadius: 12, overflow: 'hidden', marginTop: 12, marginBottom: 8 }}>
              {pieData.map((segment, i) => (
                <View
                  key={segment.name}
                  style={{
                    flex: segment.population,
                    backgroundColor: segment.color,
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  {/* Si el segmento es suficientemente grande, muestra el porcentaje */}
                  {segment.population / pieData.reduce((a, b) => a + b.population, 0) > 0.12 && (
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                      {Math.round((segment.population / pieData.reduce((a, b) => a + b.population, 0)) * 100)}%
                    </Text>
                  )}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, justifyContent: 'center' }}>
              {pieData.map((segment, i) => (
                <View key={segment.name} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 4 }}>
                  <View style={{ width: 14, height: 14, backgroundColor: segment.color, borderRadius: 3, marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 12 }}>{segment.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Consumo de materiales */}
      <View style={styles.materialsContainer}>
        <Text style={styles.sectionTitle}>{t.materialConsumption}</Text>
        
        <View style={styles.materialStats}>
          <View style={styles.materialCard}>
            <View style={styles.materialHeader}>
              <Text style={styles.materialTitle}>{t.filament}</Text>
              <Text style={styles.materialAmount}>{estadisticas.filamentoConsumido}g</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(100, (estadisticas.filamentoConsumido / 1000) * 100)}%`, 
                  backgroundColor: '#00e676' 
                }
              ]} />
            </View>
            <Text style={styles.materialSubtext}>{t.consumedIn} {estadisticas.proyectosCompletados} {t.projects}</Text>
          </View>
          
          <View style={styles.materialCard}>
            <View style={styles.materialHeader}>
              <Text style={styles.materialTitle}>{t.printingTime}</Text>
              <Text style={styles.materialAmount}>{estadisticas.tiempoImpresion.toFixed(1)}h</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(100, (estadisticas.tiempoImpresion / 100) * 100)}%`, 
                  backgroundColor: '#2196f3' 
                }
              ]} />
            </View>
            <Text style={styles.materialSubtext}>{t.totalPrintingTime}</Text>
          </View>
        </View>
      </View>

      {/* Categorías de materiales */}
      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>{t.materialCategories}</Text>
        
        {categoriasMateriales.map((categoria, index) => (
          <View key={index} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <View style={[styles.categoryDot, { backgroundColor: categoria.color }]} />
              <Text style={styles.categoryName}>{categoria.nombre}</Text>
            </View>
            <Text style={styles.categoryAmount}>{categoria.cantidad} {t.materials}</Text>
          </View>
        ))}
      </View>

      {/* Métricas financieras */}
      <View style={styles.financialContainer}>
        <Text style={styles.sectionTitle}>{t.financialMetrics}</Text>
        
        <View style={styles.financialGrid}>
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>{t.totalMaterialCost}</Text>
            <Text style={styles.financialAmount}>
              {Number(estadisticas.costoTotalMateriales).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
            </Text>
            <Text style={styles.financialPeriod}>{t.currentInventory}</Text>
          </View>
          
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>{t.totalProjectValue}</Text>
            <Text style={[styles.financialAmount, { color: '#00e676' }]}> 
              {Number(estadisticas.ganancias).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
            </Text>
            <Text style={styles.financialPeriod}>{t.allProjects}</Text>
          </View>
          
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>{t.filamentConsumed}</Text>
            <Text style={styles.financialAmount}>{Number(estadisticas.filamentoConsumido).toLocaleString('es-MX')}g</Text>
            <Text style={styles.financialPeriod}>{t.totalUsed}</Text>
          </View>
          
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>{t.efficiency}</Text>
            <Text style={[styles.financialAmount, { color: '#ff9800' }]}>{Number(estadisticas.eficiencia).toLocaleString('es-MX')}%</Text>
            <Text style={styles.financialPeriod}>{t.projectsPerHour}</Text>
          </View>
        </View>
      </View>

      {/* Acciones rápidas */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>{t.quickActions}</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('add')}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>{t.addMaterial}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('inventory')}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>{t.inventory}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('calculator')}
          >
            <Text style={styles.actionIcon}>🧮</Text>
            <Text style={styles.actionText}>{t.calculator}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('history')}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>{t.history}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Botón de cerrar sesión */}
      <TouchableOpacity style={[styles.logoutButton, { marginBottom: 32 }]} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>{t.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    padding: 16,
    marginTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#00e676',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 8,
  },
  userLevel: {
    backgroundColor: '#00e676',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editProfileBtn: {
    backgroundColor: '#181818',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  editProfileText: {
    color: '#00e676',
    fontSize: 14,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
    position: 'relative',
  },
  statNumber: {
    color: '#00e676',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  statIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 20,
  },
  materialsContainer: {
    marginBottom: 24,
  },
  materialStats: {
    gap: 12,
  },
  materialCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  materialAmount: {
    color: '#00e676',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  materialSubtext: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    color: 'white',
    fontSize: 16,
  },
  categoryAmount: {
    color: '#a0a0a0',
    fontSize: 14,
  },
  financialContainer: {
    marginBottom: 24,
  },
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  financialCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  financialLabel: {
    color: '#a0a0a0',
    fontSize: 12,
    marginBottom: 4,
  },
  financialAmount: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  financialPeriod: {
    color: '#666',
    fontSize: 10,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#181818',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#00e676',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default MenuScreen; 