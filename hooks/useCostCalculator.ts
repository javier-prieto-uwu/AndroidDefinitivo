import { useState } from 'react';
import { limpiarPrecio } from '../utils/materialUtils';

// Interfaces (sin cambios)
interface Material {
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
  cantidadRestante?: string;
  precioBobina?: string;
  pesoBobina?: string;
  gramosUtilizados?: string;
  marca?: string;
  imagen?: string;
  fechaRegistro?: string;
}
interface Proyecto {
  id: string;
  nombre: string;
  fechaCreacion?: string;
  archivado?: boolean;
}
interface CalculoState {
  nombre: string;
  usuario: string;
  materialSeleccionado: any;
  materialesMultiples: any[];
  detallesImpresion: any;
  filamento: any;
  manoObra: any;
  avanzados: any;
  fecha: string;
}
interface UseCostCalculatorProps {
  materialesGuardados: Material[];
  proyectos: Proyecto[];
}

export function useCostCalculator({ materialesGuardados, proyectos }: UseCostCalculatorProps) {
  const [calculo, setCalculo] = useState<CalculoState>({
    nombre: '',
    usuario: '',
    materialSeleccionado: {},
    materialesMultiples: [],
    detallesImpresion: {},
    filamento: {},
    manoObra: {},
    avanzados: {},
    fecha: new Date().toISOString(),
  });

  const [esMultifilamento, setEsMultifilamento] = useState(false);
  const [cantidadMateriales, setCantidadMateriales] = useState(1);

  // =================================================================
  //  INICIO DE LA SECCIÓN CORREGIDA
  // =================================================================
  
  const calcularCostoProporcional = (material, cantidadUsada) => {
    if (!material || !cantidadUsada) return 0;
  
    const precioTotal = parseFloat(limpiarPrecio(material.precioBobina || material.precio || '0'));
    let cantidadTotal;
  
    if (material.categoria === 'Filamento' || material.categoria === 'Resina') {
      cantidadTotal = parseFloat(material.pesoBobina || material.peso || '0');
    } else {
      // Para Pintura, Aros, etc., la cantidad total es el volumen/unidades del envase.
      cantidadTotal = parseFloat(material.cantidad || '0');
    }
  
    if (!precioTotal || !cantidadTotal || cantidadTotal <= 0) {
      return 0;
    }
  
    const costoPorUnidad = precioTotal / cantidadTotal;
    return costoPorUnidad * parseFloat(cantidadUsada);
  };

  const calcularCostoFilamento = () => {
    let costoTotal = 0;

    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      costoTotal = calculo.materialesMultiples.reduce((total, material) => {
        if (!material) return total;
        
        const categoria = material.categoria;
        let cantidadUsada = 0;

        switch (categoria) {
            case 'Filamento': case 'Resina':
                cantidadUsada = material.gramosUtilizados;
                break;
            case 'Pintura':
                cantidadUsada = material.cantidadPintura;
                break;
            case 'Aros de llavero':
                cantidadUsada = material.cantidadLlaveros;
                break;
            default:
                cantidadUsada = material.cantidadUtilizada;
        }

        return total + calcularCostoProporcional(material, cantidadUsada);
      }, 0);

    } else if (calculo.materialSeleccionado?.id) {
      const mat = materialesGuardados.find(m => m.id === calculo.materialSeleccionado.id);
      if (mat) {
        costoTotal = calcularCostoProporcional(mat, calculo.filamento.gramosUtilizados);
      }
    }
    
    setCalculo(prev => ({
      ...prev,
      filamento: {
        ...prev.filamento,
        costoFilamento: costoTotal.toFixed(2),
        costoMaterialSolo: costoTotal.toFixed(2),
      }
    }));
  };
  
  // =================================================================
  //  FIN DE LA SECCIÓN CORREGIDA
  // =================================================================


  const calcularManoObra = () => {
    const horas = parseFloat(calculo.manoObra.preparacionTiempo) || 0;
    const costoPorHora = parseFloat(calculo.manoObra.preparacionCosto) || 0;
    const total = horas * costoPorHora;
    setCalculo(prev => ({ ...prev, manoObra: { ...prev.manoObra, costoTotalManoObra: total.toFixed(2) } }));
  };

  const calcularAvanzado = () => {
    const aros = parseFloat(calculo.avanzados.arosLlavero) || 0;
    const otros = parseFloat(calculo.avanzados.otrosMateriales) || 0;
    const kwh = parseFloat(calculo.avanzados.consumoKwh) || 0;
    const costoKwh = parseFloat(calculo.avanzados.costoKwh) || 0;
    const horasimpresion = parseFloat(calculo.avanzados.horasimpresion) || 0;
    const costoLuz = ((kwh / 1000) * costoKwh) * horasimpresion;
    const totalMaterialesExtra = aros + otros;
    setCalculo(prev => ({ ...prev, avanzados: { ...prev.avanzados, costoLuz: costoLuz.toFixed(2), totalMaterialesExtra: totalMaterialesExtra.toFixed(2), } }));
  };

  const getTotal = () => {
    const filamento = parseFloat(calculo.filamento.costoMaterialSolo) || 0;
    const manoObra = parseFloat(calculo.manoObra.costoTotalManoObra) || 0;
    const extra = parseFloat(calculo.avanzados.totalMaterialesExtra) || 0;
    const luz = parseFloat(calculo.avanzados.costoLuz) || 0;
    return (filamento + manoObra + extra + luz).toFixed(2);
  };

  const getProduccion = () => {
    return getTotal();
  };

  const limpiarFormulario = () => {
    setCalculo({
      nombre: '',
      usuario: '',
      materialSeleccionado: {},
      materialesMultiples: [],
      detallesImpresion: {},
      filamento: {},
      manoObra: {},
      avanzados: {},
      fecha: new Date().toISOString(),
    });
    setEsMultifilamento(false);
    setCantidadMateriales(1);
  };

  return {
    calculo,
    setCalculo,
    esMultifilamento,
    setEsMultifilamento,
    cantidadMateriales,
    setCantidadMateriales,
    limpiarFormulario,
    calcularCostoFilamento,
    calcularManoObra,
    calcularAvanzado,
    getTotal,
    getProduccion,
  };
}