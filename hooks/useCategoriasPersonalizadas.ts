import { useState, useCallback } from 'react';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { auth, app } from '../api/firebase';
import { useFocusEffect } from '@react-navigation/native';

interface CategoriaPersonalizada {
  id: string;
  nombre: string;
  tipo?: string;
  color?: string;
  costo?: string;
  tieneTipo?: boolean;
  tieneColor?: boolean;
  tieneMarca?: boolean;
}

interface UseCategoriasPersonalizadasReturn {
  categorias: CategoriaPersonalizada[];
  loading: boolean;
  error: string | null;
  agregarCategoria: (categoria: Omit<CategoriaPersonalizada, 'id'>) => Promise<void>;
  eliminarCategoria: (nombre: string) => Promise<void>;
}

export const useCategoriasPersonalizadas = (): UseCategoriasPersonalizadasReturn => {
  const [categorias, setCategorias] = useState<CategoriaPersonalizada[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const db = getFirestore(app);

  const cargarCategorias = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const user = auth.currentUser;
    if (!user) {
      setCategorias([]);
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas'));
      const cats = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as CategoriaPersonalizada[];
      const catsFiltradas = cats.filter(cat => !!cat.nombre);
      setCategorias(catsFiltradas);
    } catch (e: any) {
      setError('Error al cargar categorías: ' + (e.message || e));
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const agregarCategoria = useCallback(async (categoria: Omit<CategoriaPersonalizada, 'id'>) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Debes iniciar sesión para guardar categorías');
    }

    try {
      await addDoc(collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas'), categoria);
      await cargarCategorias(); // Recargar categorías
    } catch (e: any) {
      throw new Error('Error al guardar la categoría: ' + (e.message || e));
    }
  }, [db, cargarCategorias]);

  const eliminarCategoria = useCallback(async (nombre: string) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Debes iniciar sesión para eliminar categorías');
    }

    try {
      const q = query(collection(db, 'usuarios', user.uid, 'categoriasPersonalizadas'), where('nombre', '==', nombre));
      const snapshot = await getDocs(q);
      for (const docu of snapshot.docs) {
        await deleteDoc(docu.ref);
      }
      await cargarCategorias(); // Recargar categorías
    } catch (e: any) {
      throw new Error('Error al eliminar la categoría: ' + (e.message || e));
    }
  }, [db, cargarCategorias]);

  // Cargar categorías cuando la pantalla gane el foco
  useFocusEffect(
    useCallback(() => {
      cargarCategorias();
    }, [cargarCategorias])
  );

  return {
    categorias,
    loading,
    error,
    agregarCategoria,
    eliminarCategoria,
  };
}; 