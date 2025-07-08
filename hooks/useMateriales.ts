import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, updateDoc, query, where, doc, onSnapshot } from 'firebase/firestore';
import { auth, app } from '../api/firebase';
import { useFocusEffect } from '@react-navigation/native';

interface Material {
  id: string;
  nombre: string;
  categoria?: string;
  tipo?: string;
  subtipo?: string;
  color?: string;
  precio?: string;
  precioBobina?: string;
  cantidad?: string;
  cantidadRestante?: string;
  peso?: string;
  marca?: string;
  imagen?: string;
  fechaRegistro?: string;
}

interface UseMaterialesReturn {
  materiales: Material[];
  loading: boolean;
  error: string | null;
  cargarMateriales: () => Promise<void>;
  agregarMaterial: (material: Omit<Material, 'id'>) => Promise<void>;
  actualizarMaterial: (materialId: string, material: Partial<Material>) => Promise<void>;
  eliminarMaterial: (materialId: string) => Promise<void>;
  materialesFiltrados: Material[];
  setFiltro: (filtro: string) => void;
}

export const useMateriales = (): UseMaterialesReturn => {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

  const db = getFirestore(app);

  const cargarMateriales = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const user = auth.currentUser;
    if (!user) {
      setMateriales([]);
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'materiales'));
      const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
      setMateriales(mats);
    } catch (e: any) {
      setError('Error al cargar materiales: ' + (e.message || e));
      setMateriales([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const agregarMaterial = useCallback(async (material: Omit<Material, 'id'>) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Debes iniciar sesión para guardar materiales');
    }

    try {
      await addDoc(collection(db, 'usuarios', user.uid, 'materiales'), material);
      // No necesitamos recargar manualmente porque el listener se encargará
    } catch (e: any) {
      throw new Error('Error al guardar el material: ' + (e.message || e));
    }
  }, [db]);

  const actualizarMaterial = useCallback(async (materialId: string, materialData: Partial<Material>) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Debes iniciar sesión para actualizar materiales');
    }

    try {
      await updateDoc(doc(db, 'usuarios', user.uid, 'materiales', materialId), materialData);
      // No necesitamos recargar manualmente porque el listener se encargará
    } catch (e: any) {
      throw new Error('Error al actualizar el material: ' + (e.message || e));
    }
  }, [db]);

  const eliminarMaterial = useCallback(async (materialId: string) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Debes iniciar sesión para eliminar materiales');
    }

    try {
      await deleteDoc(doc(db, 'usuarios', user.uid, 'materiales', materialId));
      // No necesitamos recargar manualmente porque el listener se encargará
    } catch (e: any) {
      throw new Error('Error al eliminar el material: ' + (e.message || e));
    }
  }, [db]);

  // Filtrar materiales por búsqueda
  const materialesFiltrados = materiales.filter(mat => {
    const texto = `${mat.nombre || ''} ${mat.tipo || ''} ${mat.subtipo || ''} ${mat.categoria || ''}`.toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });

  // Listener en tiempo real para materiales
  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) {
        setMateriales([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const unsubscribe = onSnapshot(
        collection(db, 'usuarios', user.uid, 'materiales'),
        (snapshot) => {
          const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
          setMateriales(mats);
          setLoading(false);
        },
        (error) => {
          console.error('Error en listener de materiales:', error);
          setError('Error al cargar materiales: ' + error.message);
          setLoading(false);
        }
      );

      // Cleanup function
      return () => unsubscribe();
    }, [db])
  );

  return {
    materiales,
    loading,
    error,
    cargarMateriales,
    agregarMaterial,
    actualizarMaterial,
    eliminarMaterial,
    materialesFiltrados,
    setFiltro,
  };
}; 