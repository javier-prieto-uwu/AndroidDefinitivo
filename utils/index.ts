export * from './materialUtils';

// Función para obtener la moneda según el idioma
export const getCurrency = (lang: 'es' | 'en'): string => {
  return lang === 'en' ? 'USD' : 'MXN';
};