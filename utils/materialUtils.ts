export interface Material {
  id: string;
  nombre: string;
  categoria?: string;
  tipo?: string;
  subtipo?: string;
  color?: string;
  tipoPintura?: string;
  colorPintura?: string;
  cantidadPintura?: string;
  precio?: string;
  peso?: string;
  cantidad?: string;
  cantidadInicial?: string; // stock original
  cantidadRestante?: string;
  precioBobina?: string;
  pesoBobina?: string;
  gramosUtilizados?: string;
  marca?: string;
  imagen?: string;
  fechaRegistro?: string;
  svgSeleccionado?: string; // Nuevo campo para la imagen SVG
}

// Función para limpiar precio removiendo símbolos $ y caracteres no numéricos
export const limpiarPrecio = (precio: string): string => {
  if (!precio) return '0';
  return precio.replace(/[^\d.]/g, '');
};

// Obtener precio de visualización según categoría
export const getPrecioDisplay = (material: Material): string => {
  const categoria = material.categoria || 'Filamento';
  let precio: string;
  switch (categoria) {
    case 'Pintura':
    case 'Aros de llavero':
      precio = material.precio || '0';
      break;
    case 'Filamento':
    case 'Resina':
    default:
      precio = material.precioBobina || material.precio || '0';
      break;
  }
  return limpiarPrecio(precio);
};

// Obtener cantidad restante
export const getCantidadRestante = (material: Material): string => {
  return typeof material.cantidadRestante !== 'undefined' 
    ? material.cantidadRestante 
    : material.cantidad || '0';
};

// Validar si un material puede ser guardado
export const validarMaterialCompleto = (material: Material, t?: any): boolean => {
  const { categoria, precio, cantidad, marca, imagen, svgSeleccionado } = material;
  // Validar que haya imagen (acepta imagen o svgSeleccionado)
  if (!imagen && !svgSeleccionado) {
    return false;
  }
  if (!categoria || !precio || !cantidad || !marca) {
    return false;
  }

  // Permitir validación con strings fijos o traducciones
  const FILAMENTO = t ? [t.filament, 'Filamento'] : ['Filamento'];
  const RESINA = t ? [t.resin, 'Resina'] : ['Resina'];
  const PINTURA = t ? [t.paint, 'Pintura'] : ['Pintura'];
  const AROS = t ? [t.keychainRings, 'Aros de llavero'] : ['Aros de llavero'];

  if (FILAMENTO.includes(categoria)) {
    return !!(material.tipo && material.subtipo && material.color && material.peso);
  }
  if (RESINA.includes(categoria)) {
    return !!(material.tipo && material.color && material.peso);
  }
  if (PINTURA.includes(categoria)) {
    return !!(material.tipoPintura && material.colorPintura && material.cantidadPintura);
  }
  if (AROS.includes(categoria)) {
    return !!material.color;
  }
  // Para categorías personalizadas
  return true;
};

// Generar nombre automático del material
export const generarNombreMaterial = (material: Material): string => {
  const { categoria, tipo, subtipo, color, tipoPintura, colorPintura, marca } = material;
  
  if (categoria === 'Filamento') {
    return [tipo, subtipo, color].filter(Boolean).join(' ');
  } else if (categoria === 'Resina') {
    return [tipo, subtipo, color].filter(Boolean).join(' ');
  } else if (categoria === 'Pintura') {
    return [tipoPintura, colorPintura].filter(Boolean).join(' ');
  } else if (categoria === 'Aros de llavero') {
    return 'Aro de llavero';
  } else if (categoria) {
    return [categoria, tipo, color, marca].filter(Boolean).join(' ');
  }
  
  return '';
};

// Agrupar materiales por tipo
export const agruparMaterialesPorTipo = (materiales: Material[]): { [tipo: string]: Material[] } => {
  const matsPorTipo: { [tipo: string]: Material[] } = {};
  materiales.forEach(mat => {
    const tipo = mat.tipo || 'Sin tipo';
    if (!matsPorTipo[tipo]) matsPorTipo[tipo] = [];
    matsPorTipo[tipo].push(mat);
  });
  return matsPorTipo;
};

// Filtrar materiales por texto de búsqueda
export const filtrarMateriales = (materiales: Material[], filtro: string): Material[] => {
  return materiales.filter(mat => {
    const texto = `${mat.nombre || ''} ${mat.tipo || ''} ${mat.subtipo || ''} ${mat.categoria || ''}`.toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });
};

// Obtener unidad de medida según categoría
export const getUnidadMaterial = (categoria: string): string => {
  switch (categoria) {
    case 'Filamento':
    case 'Resina':
      return 'gramos';
    case 'Pintura':
      return 'ml';
    case 'Aros de llavero':
      return 'unidades';
    default:
      return 'unidades';
  }
};

// Obtener campo de cantidad según categoría
export const getCampoCantidad = (categoria: string): string => {
  switch (categoria) {
    case 'Filamento':
    case 'Resina':
      return 'peso';
    case 'Pintura':
      return 'cantidadPintura';
    default:
      return 'cantidad';
  }
};

// Obtener label de cantidad según categoría
export const getLabelCantidad = (categoria: string): string => {
  switch (categoria) {
    case 'Filamento':
      return 'Peso de la bobina (gramos)';
    case 'Resina':
      return 'Peso de la resina (gramos)';
    case 'Pintura':
      return 'Cantidad (ml)';
    default:
      return 'Cantidad disponible';
  }
}; 