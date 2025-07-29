import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useFocusEffect } from '@react-navigation/native'
import { auth } from '../api/firebase'
import { signOut } from 'firebase/auth'
import { getDocs, collection, getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageProvider';
import { getCurrency } from '../utils';
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

const MenuScreen: React.FC = ({ setIsLoggedIn }: { setIsLoggedIn: (value: boolean) => void }) => {
  const navigation = useNavigation();
  const { lang, setLang } = useLanguage();
  const t = translations[lang];
  
  // Estado para estadísticas y categorías
  const [estadisticas, setEstadisticas] = useState(estadisticasEjemplo);
  // Definir categoriasEjemplo aquí para que tenga acceso a 't'
  const categoriasEjemplo = [
    { nombre: t.filament, cantidad: 2, color: '#00e676' },
    { nombre: t.resin, cantidad: 1, color: '#2196f3' },
    { nombre: t.paint, cantidad: 0, color: '#ff9800' },
    { nombre: t.keychainRings, cantidad: 0, color: '#9c27b0' }
  ];
  const [categoriasMateriales, setCategoriasMateriales] = useState(categoriasEjemplo);
  const [categoriasVendidas, setCategoriasVendidas] = useState<any[]>([]);
  const [mejorCliente, setMejorCliente] = useState<any>(null);
  const [topClientes, setTopClientes] = useState<any[]>([]);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Datos del usuario autenticado
  const user = auth.currentUser;
  const nombreUsuario = user?.displayName || t.user;
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
              Alert.alert(t.error, t.logoutError);
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    // TODO: Implementar edición de perfil
    Alert.alert(t.editProfile, t.functionInDevelopment);
  };

  const traducirCategoria = (categoria: string) => {
    if (categoria === 'Filamento' || categoria === 'Filament') {
      return lang === 'en' ? 'Filament' : 'Filamento';
    }
    if (categoria === 'Resina' || categoria === 'Resin') {
      return lang === 'en' ? 'Resin' : 'Resina';
    }
    if (categoria === 'Pintura' || categoria === 'Paint') {
      return lang === 'en' ? 'Paint' : 'Pintura';
    }
    if (categoria === 'Aros de llavero' || categoria === 'Keychain Rings') {
      return lang === 'en' ? 'Keychain Rings' : 'Aros de llavero';
    }
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
          // Comparar con las categorías originales en español e inglés
          if (cat.nombre === 'Filamento' || cat.nombre === 'Filament') cat.color = '#00e676';
          else if (cat.nombre === 'Resina' || cat.nombre === 'Resin') cat.color = '#2196f3';
          else if (cat.nombre === 'Pintura' || cat.nombre === 'Paint') cat.color = '#ff9800';
          else if (cat.nombre === 'Aros de llavero' || cat.nombre === 'Keychain Rings' || cat.nombre.toLowerCase().includes('aro') || cat.nombre.toLowerCase().includes('ring')) cat.color = '#9c27b0';
          else cat.color = '#b0b0b0';
        });

        // Calcular categorías vendidas
        const categoriasVendidasContador = {};
        calculos.forEach(calc => {
          if (calc.estadoVenta === 'vendido' && calc.categoriaVenta) {
            if (!categoriasVendidasContador[calc.categoriaVenta]) {
              categoriasVendidasContador[calc.categoriaVenta] = 0;
            }
            categoriasVendidasContador[calc.categoriaVenta] += 1;
          }
        });

        // Convertir a array y asignar colores
        const categoriasVendidasArray = Object.entries(categoriasVendidasContador).map(([nombre, cantidad], index) => {
          const colores = ['#00e676', '#2196f3', '#ff9800', '#9c27b0', '#e53935', '#43a047', '#1e88e5', '#f57c00'];
          return {
            nombre,
            cantidad,
            color: colores[index % colores.length]
          };
        });

        // Calcular mejor cliente y top 10 de clientes
        const clientesContador = {};
        const clientesGanancias = {};
        
        calculos.forEach(calc => {
          if (calc.estadoVenta === 'vendido' && calc.cliente && calc.cliente !== 'Pendiente') {
            if (!clientesContador[calc.cliente]) {
              clientesContador[calc.cliente] = 0;
              clientesGanancias[calc.cliente] = 0;
            }
            clientesContador[calc.cliente] += 1;
            clientesGanancias[calc.cliente] += parseFloat(calc.ganancia || 0);
          }
        });

        // Encontrar el mejor cliente (por ganancias)
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

        // Crear top 10 de clientes (por cantidad de productos)
        const topClientesArray = Object.entries(clientesContador)
          .map(([cliente, cantidad]) => ({
            nombre: cliente,
            productos: cantidad as number,
            ganancia: parseFloat(clientesGanancias[cliente] as string) || 0
          }))
          .sort((a, b) => b.productos - a.productos)
          .slice(0, 10);

        // Filamento y resina consumidos (basado en cálculos reales)
        let filamentoConsumido = 0;
        let resinaConsumida = 0;
        calculos.forEach(calc => {
          // Para cálculos con un solo material
          if (!calc.esMultifilamento && calc.materialSeleccionado && calc.filamento?.gramosUtilizados) {
            const categoria = calc.materialSeleccionado.categoria;
            const gramosUtilizados = parseFloat(calc.filamento.gramosUtilizados) || 0;
            
            if (categoria === 'Filamento' || categoria === 'Filament') {
              filamentoConsumido += gramosUtilizados;
              console.log('Filamento consumido en cálculo:', calc.nombre, 'gramos:', gramosUtilizados);
            }
            if (categoria === 'Resina' || categoria === 'Resin') {
              resinaConsumida += gramosUtilizados;
              console.log('Resina consumida en cálculo:', calc.nombre, 'gramos:', gramosUtilizados);
            }
          }
          
          // Para cálculos con múltiples materiales
          if (calc.esMultifilamento && calc.materialesMultiples) {
            calc.materialesMultiples.forEach(mat => {
              if (mat && mat.gramosUtilizados) {
                const categoria = mat.categoria;
                const gramosUtilizados = parseFloat(mat.gramosUtilizados) || 0;
                
                if (categoria === 'Filamento' || categoria === 'Filament') {
                  filamentoConsumido += gramosUtilizados;
                  console.log('Filamento multi consumido:', mat.nombre, 'gramos:', gramosUtilizados);
                }
                if (categoria === 'Resina' || categoria === 'Resin') {
                  resinaConsumida += gramosUtilizados;
                  console.log('Resina multi consumida:', mat.nombre, 'gramos:', gramosUtilizados);
                }
              }
            });
          }
        });
        console.log('Total filamento consumido:', filamentoConsumido);
        console.log('Total resina consumida:', resinaConsumida);

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
        
        console.log('Calculando costo total de materiales...');
        console.log('Total materiales:', materiales.length);
        materiales.forEach((mat, index) => {
          console.log(`Material ${index + 1}:`, {
            nombre: mat.nombre,
            precio: mat.precio,
            cantidad: mat.cantidad,
            peso: mat.peso,
            precioBobina: mat.precioBobina,
            precioResina: mat.precioResina,
            precioPintura: mat.precioPintura
          });
          
          // Intentar diferentes campos de precio
          let precio = 0;
          if (mat.precio) precio = parseFloat(mat.precio);
          else if (mat.precioBobina) precio = parseFloat(mat.precioBobina);
          else if (mat.precioResina) precio = parseFloat(mat.precioResina);
          else if (mat.precioPintura) precio = parseFloat(mat.precioPintura);
          
          // Intentar diferentes campos de cantidad
          let cantidad = 0;
          if (mat.cantidad) cantidad = parseFloat(mat.cantidad);
          else if (mat.peso) cantidad = parseFloat(mat.peso);
          else if (mat.pesoBobina) cantidad = parseFloat(mat.pesoBobina);
          
          const costoMaterial = precio * cantidad;
          
          console.log('Valores calculados:', { precio, cantidad, costoMaterial });
          
          if (!isNaN(costoMaterial) && costoMaterial > 0) {
            costoTotalMateriales += costoMaterial;
          }
        });
        
        console.log('Costo total materiales:', costoTotalMateriales);
        
        calculos.forEach(calc => {
          const ganancia = parseFloat(calc.costoTotal || 0);
          if (!isNaN(ganancia)) {
            ganancias += ganancia;
          }
        });
        
        console.log('Ganancias totales:', ganancias);

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
        setCategoriasVendidas(categoriasVendidasArray);
        setMejorCliente(mejorClienteData);
        setTopClientes(topClientesArray);
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
  const materialesFilamento = materiales.filter(m => m.categoria === 'Filamento' || m.categoria === 'Filament');
  console.log('Materiales de filamento encontrados:', materialesFilamento.length);
  materialesFilamento.forEach(m => {
    const tipo = m.tipo || 'Otro';
    tiposFilamentoContador[tipo] = (tiposFilamentoContador[tipo] || 0) + 1;
    console.log('Tipo de filamento:', tipo, 'material:', m.nombre);
  });
  console.log('Tipos de filamento contados:', tiposFilamentoContador);
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
              <Text style={styles.categoryName}>{traducirCategoria(categoria.nombre)}</Text>
            </View>
            <Text style={styles.categoryAmount}>{categoria.cantidad} {t.materials}</Text>
          </View>
        ))}
      </View>

      {/* Categorías más vendidas */}
      {categoriasVendidas.length > 0 && (
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>{t.topSellingCategories}</Text>
          
          {/* Gráfico de pastel de categorías vendidas */}
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
          
          {/* Lista de categorías vendidas */}
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

      {/* Mejor Cliente */}
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

      {/* Top 10 Clientes */}
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

      {/* Métricas financieras */}
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

      {/* Acciones rápidas */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>{t.quickActions}</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('add')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#00e676" />
            <Text style={styles.actionText}>{t.addMaterial}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('inventory')}
          >
            <Ionicons name="cube-outline" size={24} color="#00e676" />
            <Text style={styles.actionText}>{t.inventory}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('calculator')}
          >
            <Ionicons name="calculator-outline" size={24} color="#00e676" />
            <Text style={styles.actionText}>{t.calculator}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('history')}
          >
            <Ionicons name="time-outline" size={24} color="#00e676" />
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
  // Estilos para mejor cliente
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
  // Estilos para top 10 clientes
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