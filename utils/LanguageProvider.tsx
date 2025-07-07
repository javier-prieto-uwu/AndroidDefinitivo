import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../api/firebase';

export type Lang = 'es' | 'en';

const LanguageContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
}>({
  lang: 'es',
  setLang: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('es');

  // Al iniciar, carga de AsyncStorage y de Firebase si hay usuario
  useEffect(() => {
    let unsub: any;
    AsyncStorage.getItem('lang').then(stored => {
      if (stored === 'en' || stored === 'es') setLangState(stored as Lang);
    });
    unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'usuarios', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().lang) {
          setLangState(snap.data().lang);
          AsyncStorage.setItem('lang', snap.data().lang);
        }
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const setLang = async (newLang: Lang) => {
    setLangState(newLang);
    AsyncStorage.setItem('lang', newLang);
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, 'usuarios', user.uid);
      await setDoc(docRef, { lang: newLang }, { merge: true });
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}; 