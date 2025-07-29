import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, app } from '../api/firebase';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useLanguage } from '../utils/LanguageProvider';
import { getCurrency } from '../utils';
import translations from '../utils/locales';
import { PieChart } from 'react-native-chart-kit';
import { signOut } from 'firebase/auth';


const db = getFirestore(app);

const MenuScreen: React.FC<{ setIsLoggedIn: (value: boolean) => void }> = ({ setIsLoggedIn }) => {
  const navigation = useNavigation();
  const { lang, setLang } = useLanguage();
  const t = translations[lang];

  const [estadisticas, setEstadisticas] = useState({
    materialesDisponibles: 0,
    filamentoConsumido: 0,
    resinaConsumida: 0,
    proyectosCompletados: 0,
    tiempoImpresion: 0,
    costoTotalMateriales: 0,
    ganancias: 0,
    eficiencia: 0,
    tiempoPromedioProyecto: '0',
    pedidosPendientes: 0
  });
  const [categoriasMateriales, setCategoriasMateriales] = useState<any[]>([]);
  const [categoriasVendidas, setCategoriasVendidas] = useState<any[]>([]);
  const [mejorCliente, setMejorCliente] = useState<any>(null);
  const [topClientes, setTopClientes] = useState<any[]>([]);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const nombreUsuario = user?.displayName || t.user;
  const emailUsuario = user?.email || '';
  const fotoUsuario = user?.photoURL || 'https://via.placeholder.com/100x100/00e676/ffffff?text=U';
  const nivelNumerico = Math.floor(estadisticas.tiempoImpresion / 10);
  let nivelUsuario = 'Principiante';
  if (estadisticas.tiempoImpresion >= 150) {
    nivelUsuario = 'Profesional';
  } else if (estadisticas.tiempoImpresion >= 50) {
    nivelUsuario = 'Intermedio';
  }

  useEffect(() => {
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
              setIsLoggedIn(false);
            } catch (error) {
              Alert.alert(t.error, t.logoutError);
            }
          }
        }
      ]
    );
  };

  const traducirCategoria = (categoria: string) => {
    if (categoria === 'Filamento' || categoria === 'Filament') return t.filament;
    if (categoria === 'Resina' || categoria === 'Resin') return t.resin;
    if (categoria === 'Pintura' || categoria === 'Paint') return t.paint;
    if (categoria === 'Aros de llavero' || categoria === 'Keychain Rings') return t.keychainRings;
    return categoria;
  };
  
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add':
        navigation.navigate(t.add as never);
        break;
      case 'inventory':
        navigation.navigate(t.inventory as never);
        break;
      case 'calculator':
        navigation.navigate(t.costs as never);
        break;
      case 'history':
        navigation.navigate(t.history as never);
        break;
    }
  };

  // Hook para cargar y calcular todas las estadísticas
  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;

      const userUid = user.uid;

      // La función ahora acepta dos listas: una para todos los trabajos y otra solo para las ventas.
      const calcularEstadisticas = (materialesData: any[], todosLosCalculos: any[], todasLasVentas: any[]) => {
        // --- ESTADÍSTICAS FÍSICAS (usan todosLosCalculos) ---
        let filamentoConsumido = 0;
        let resinaConsumida = 0;
        let tiempoImpresion = 0;
        todosLosCalculos.forEach(calc => {
          // Consumo de material
          if (!calc.esMultifilamento && calc.materialSeleccionado && calc.filamento?.gramosUtilizados) {
            const categoria = calc.materialSeleccionado.categoria;
            const gramos = parseFloat(calc.filamento.gramosUtilizados) || 0;
            if (categoria === 'Filamento' || categoria === 'Filament') filamentoConsumido += gramos;
            if (categoria === 'Resina' || categoria === 'Resin') resinaConsumida += gramos;
          }
          if (calc.esMultifilamento && calc.materialesMultiples) {
            calc.materialesMultiples.forEach(mat => {
              if (mat && mat.gramosUtilizados) {
                const categoria = mat.categoria;
                const gramos = parseFloat(mat.gramosUtilizados) || 0;
                if (categoria === 'Filamento' || categoria === 'Filament') filamentoConsumido += gramos;
                if (categoria === 'Resina' || categoria === 'Resin') resinaConsumida += gramos;
              }
            });
          }
          // Tiempo de impresión
          if (calc.detallesImpresion && calc.detallesImpresion.tiempoImpresion) {
            tiempoImpresion += parseFloat(calc.detallesImpresion.tiempoImpresion) || 0;
          }
        });

        const proyectosCompletados = todosLosCalculos.length;
        const fallos = todosLosCalculos.filter(calc => calc.fallo === true).length;
        const exitosas = proyectosCompletados - fallos;
        const eficiencia = proyectosCompletados > 0 ? Math.round((exitosas / proyectosCompletados) * 100) : 0;
        const tiempoPromedioProyecto = proyectosCompletados > 0 ? (tiempoImpresion / proyectosCompletados).toFixed(1) : '0';

        // --- ESTADÍSTICAS DE VENTA (usan todasLasVentas) ---
        const categoriasVendidasContador = {};
        todasLasVentas.forEach(venta => {
          if (venta.categoriaVenta) {
            if (!categoriasVendidasContador[venta.categoriaVenta]) {
              categoriasVendidasContador[venta.categoriaVenta] = 0;
            }
            categoriasVendidasContador[venta.categoriaVenta] += 1;
          }
        });
        
        const colores = ['#00e676', '#2196f3', '#ff9800', '#9c27b0', '#e53935', '#43a047', '#1e88e5', '#f57c00'];
        const categoriasVendidasArray = Object.entries(categoriasVendidasContador).map(([nombre, cantidad], index) => ({
          nombre,
          cantidad,
          color: colores[index % colores.length]
        }));
        
        const clientesContador = {};
        const clientesGanancias = {};
        let gananciasTotales = 0;
        todasLasVentas.forEach(venta => {
          const ganancia = parseFloat(venta.ganancia || 0);
          if (!isNaN(ganancia)) gananciasTotales += ganancia;

          if (venta.cliente && venta.cliente !== 'Pendiente') {
            if (!clientesContador[venta.cliente]) {
              clientesContador[venta.cliente] = 0;
              clientesGanancias[venta.cliente] = 0;
            }
            clientesContador[venta.cliente] += 1;
            clientesGanancias[venta.cliente] += ganancia;
          }
        });

        let mejorClienteData = null;
        let maxGanancia = 0;
        Object.entries(clientesGanancias).forEach(([cliente, ganancia]) => {
          const gananciaNum = parseFloat(ganancia as string) || 0;
          if (gananciaNum > maxGanancia) {
            maxGanancia = gananciaNum;
            mejorClienteData = {
              nombre: cliente,
              productos: clientesContador[cliente] as number,
              ganancia: gananciaNum
            };
          }
        });

        const topClientesArray = Object.entries(clientesContador)
          .map(([cliente, cantidad]) => ({
            nombre: cliente,
            productos: cantidad as number,
            ganancia: parseFloat(clientesGanancias[cliente] as string) || 0
          }))
          .sort((a, b) => b.productos - a.productos)
          .slice(0, 10);

        setEstadisticas({
          ...estadisticas, // Mantiene otros valores si es necesario
          filamentoConsumido,
          resinaConsumida,
          proyectosCompletados,
          tiempoImpresion,
          ganancias: gananciasTotales,
          eficiencia,
          tiempoPromedioProyecto,
        });
        setCategoriasVendidas(categoriasVendidasArray);
        setMejorCliente(mejorClienteData);
        setTopClientes(topClientesArray);
      };

      const fetchData = async () => {
        setLoading(true);
        try {
          const [
            materialesSnapshot,
            calculosSnapshot,
            proyectosSnapshot,
          ] = await Promise.all([
            getDocs(collection(db, 'usuarios', userUid, 'materiales')),
            getDocs(collection(db, 'usuarios', userUid, 'calculos')),
            getDocs(collection(db, 'usuarios', userUid, 'proyectos')),
          ]);

          const materialesData = materialesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // LISTA 1: Todos los trabajos de impresión para estadísticas físicas
          let todosLosCalculos = calculosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // LISTA 2: Todas las ventas (proyectos sueltos vendidos + carpetas vendidas)
          let todasLasVentas = calculosSnapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() } as any)) // <-- Añade "as any" aquí
  .filter(item => item.estadoVenta === 'vendido');

          for (const proyectoDoc of proyectosSnapshot.docs) {
            const proyectoData = proyectoDoc.data();
            const impresionesSnapshot = await getDocs(collection(db, 'usuarios', userUid, 'proyectos', proyectoDoc.id, 'impresiones'));
            const impresionesData = impresionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Añadir todas las piezas a la lista de trabajos de impresión
            todosLosCalculos = [...todosLosCalculos, ...impresionesData];

            // Si el PROYECTO está vendido, añadirlo como UNA SOLA VENTA a la lista de ventas
            if (proyectoData.estadoVenta === 'vendido') {
              todasLasVentas.push({ id: proyectoDoc.id, ...proyectoData });
            }
          }

          setMateriales(materialesData);
          // Pasamos ambas listas a la función de cálculo
          calcularEstadisticas(materialesData, todosLosCalculos, todasLasVentas);

        } catch (error) {
          console.error("Error fetching data for menu:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();

    }, [user, lang])
  );


  const colores = ['#00e676', '#ff9800', '#2196f3', '#9c27b0', '#b0b0b0', '#e53935', '#43a047', '#1e88e5'];
  const pieData = Object.entries(
    materiales
      .filter(m => m.categoria === 'Filamento' || m.categoria === 'Filament')
      .reduce((acc, m) => {
        const tipo = m.tipo || 'Otro';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {})
  ).map(([tipo, cantidad], i) => ({
    name: tipo,
    population: cantidad as number,
    color: colores[i % colores.length],
    legendFontColor: '#fff',
    legendFontSize: 13,
  }));

  return (
    <ScrollView style={styles.container}>
       <View style={{ alignItems: 'flex-end', marginTop: 20, marginRight: 20 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#181818', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1, borderColor: '#00e676' }}
          onPress={() => setLang(lang === 'es' ? 'en' : 'es')}
        >
          <Text style={{ color: '#00e676', fontWeight: 'bold' }}>{lang === 'es' ? 'ENGLISH' : 'ESPAÑOL'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
            <Image 
              source={{ uri: fotoUsuario }} 
              style={styles.userPhoto}
            />
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

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>{t.generalStats}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{estadisticas.proyectosCompletados.toLocaleString('es-MX')}</Text>
            <Text style={styles.statLabel}>{t.completedProjects}</Text>
            <Ionicons name="checkmark-circle" size={20} color="#00e676" style={styles.statIcon} />
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{Number(estadisticas.tiempoImpresion).toLocaleString('es-MX', { maximumFractionDigits: 1 })}h</Text>
            <Text style={styles.statLabel}>{t.totalPrintingTime}</Text>
            <Ionicons name="time" size={20} color="#00e676" style={styles.statIcon} />
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{Number(estadisticas.tiempoPromedioProyecto).toLocaleString('es-MX', { maximumFractionDigits: 1 })}h</Text>
            <Text style={styles.statLabel}>{t.averageProjectTime}</Text>
            <Ionicons name="analytics" size={20} color="#00e676" style={styles.statIcon} />
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{estadisticas.materialesDisponibles.toLocaleString('es-MX')}</Text>
            <Text style={styles.statLabel}>{t.availableMaterials}</Text>
            <Ionicons name="cube-outline" size={20} color="#00e676" style={styles.statIcon} />
          </View>
        </View>
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
        {pieData.length > 0 && (
          <View style={{ width: '100%' }}>
            <View style={{ flexDirection: 'row', height: 24, width: '100%', backgroundColor: '#222', borderRadius: 12, overflow: 'hidden', marginTop: 12, marginBottom: 8 }}>
              {pieData.map((segment) => (
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
                  {segment.population / pieData.reduce((a, b) => a + b.population, 0) > 0.12 && (
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                      {Math.round((segment.population / pieData.reduce((a, b) => a + b.population, 0)) * 100)}%
                    </Text>
                  )}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, justifyContent: 'center' }}>
              {pieData.map((segment) => (
                <View key={segment.name} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 4 }}>
                  <View style={{ width: 14, height: 14, backgroundColor: segment.color, borderRadius: 3, marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 12 }}>{segment.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

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

      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>{t.materialCategories}</Text>
        {categoriasMateriales.map((categoria, index) => (
          <View key={index} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <View style={[styles.categoryDot, { backgroundColor: categoria.color }]} />
              <Text style={styles.categoryName}>{traducirCategoria(categoria.nombre)}</Text>
            </View>
            <Text style={styles.categoryAmount}>{categoria.cantidad} {t.materials}</Text>
          </View>
        ))}
      </View>

      {categoriasVendidas.length > 0 && (
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>{t.topSellingCategories}</Text>
          <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
            <PieChart
              data={categoriasVendidas.map(cat => ({
                name: cat.nombre,
                population: cat.cantidad,
                color: cat.color,
                legendFontColor: '#fff',
                legendFontSize: 13,
              }))}
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
          <View style={{ marginTop: 16 }}>
            {categoriasVendidas.map((categoria, index) => (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryDot, { backgroundColor: categoria.color }]} />
                  <Text style={styles.categoryName}>{traducirCategoria(categoria.nombre)}</Text>
                </View>
                <Text style={styles.categoryAmount}>{categoria.cantidad} {t.sold}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {mejorCliente && (
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>{t.bestCustomer}</Text>
          <View style={styles.bestCustomerCard}>
            <View style={styles.bestCustomerHeader}>
              <Ionicons name="trophy" size={24} color="#ffd600" style={{ marginRight: 8 }} />
              <Text style={styles.bestCustomerName}>{mejorCliente.nombre}</Text>
            </View>
            <View style={styles.bestCustomerStats}>
              <View style={styles.bestCustomerStat}>
                <Text style={styles.bestCustomerStatLabel}>{t.productsSold}</Text>
                <Text style={styles.bestCustomerStatValue}>{mejorCliente.productos}</Text>
              </View>
              <View style={styles.bestCustomerStat}>
                <Text style={styles.bestCustomerStatLabel}>{t.totalProfit}</Text>
                <Text style={[styles.bestCustomerStatValue, { color: '#00e676' }]}>
                  ${mejorCliente.ganancia.toFixed(2)} ${getCurrency(lang)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {topClientes.length > 0 && (
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>{t.topCustomers}</Text>
          <View style={styles.topCustomersList}>
            {topClientes.map((cliente, index) => (
              <View key={index} style={styles.topCustomerItem}>
                <View style={styles.topCustomerRank}>
                  <Text style={styles.topCustomerRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topCustomerInfo}>
                  <Text style={styles.topCustomerName}>{cliente.nombre}</Text>
                  <Text style={styles.topCustomerDetails}>
                    {cliente.productos} {t.productsSold} • ${cliente.ganancia.toFixed(2)} ${getCurrency(lang)}
                  </Text>
                </View>
                {index === 0 && (
                  <Ionicons name="trophy" size={16} color="#ffd600" style={{ marginLeft: 8 }} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.financialContainer}>
        <Text style={styles.sectionTitle}>{t.financialMetrics}</Text>
        <View style={styles.financialGrid}>
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>{t.totalMaterialCost}</Text>
            <Text style={styles.financialAmount}>
              {isNaN(estadisticas.costoTotalMateriales) || estadisticas.costoTotalMateriales === 0 
                ? `$0.00 ${getCurrency(lang)}`
                : Number(estadisticas.costoTotalMateriales).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX', { style: 'currency', currency: getCurrency(lang) })
              }
            </Text>
            <Text style={styles.financialPeriod}>{t.currentInventory}</Text>
          </View>
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>{t.totalProjectValue}</Text>
            <Text style={[styles.financialAmount, { color: '#00e676' }]}> 
              {isNaN(estadisticas.ganancias) || estadisticas.ganancias === 0 
                ? `$0.00 ${getCurrency(lang)}`
                : Number(estadisticas.ganancias).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX', { style: 'currency', currency: getCurrency(lang) })
              }
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

      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>{t.quickActions}</Text>
        <View style={styles.actionsGrid}>
          {/* ... (tus botones de acción) ... */}
        </View>
      </View>

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
  bestCustomerCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 8,
  },
  bestCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bestCustomerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bestCustomerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bestCustomerStat: {
    flex: 1,
    alignItems: 'center',
  },
  bestCustomerStatLabel: {
    color: '#a0a0a0',
    fontSize: 12,
    marginBottom: 4,
  },
  bestCustomerStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topCustomersList: {
    gap: 8,
  },
  topCustomerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  topCustomerRank: {
    backgroundColor: '#00e676',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  topCustomerRankText: {
    color: '#222',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topCustomerInfo: {
    flex: 1,
  },
  topCustomerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  topCustomerDetails: {
    color: '#a0a0a0',
    fontSize: 12,
  },
});

export default MenuScreen;
