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

  const calcularCostoFilamento = () => {
    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      const costoTotal = calculo.materialesMultiples.reduce((total, material) => {
        if (!material) return total;
        const categoria = material.categoria;
        let costo = 0;
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            if (material.precioBobina && material.pesoBobina && material.gramosUtilizados) {
              const costoPorGramo = parseFloat(limpiarPrecio(material.precioBobina)) / parseFloat(material.pesoBobina);
              costo = costoPorGramo * parseFloat(material.gramosUtilizados);
            }
            break;
          case 'Pintura':
            if (material.precio && material.cantidad && material.cantidadPintura) {
              const cantidadTotalPintura = parseFloat(material.cantidad);
              const mlUtilizados = parseFloat(material.cantidadPintura);
              const costoPorMl = parseFloat(limpiarPrecio(material.precio)) / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          case 'Aros de llavero':
            if (material.precio && material.cantidadLlaveros) {
              costo = parseFloat(limpiarPrecio(material.precio)) * parseFloat(material.cantidadLlaveros);
            }
            break;
          default:
            if (material.precio && material.cantidadUtilizada) {
              costo = parseFloat(limpiarPrecio(material.precio)) * parseFloat(material.cantidadUtilizada);
            }
        }
        return total + costo;
      }, 0);
      setCalculo(prev => ({
        ...prev,
        filamento: {
          ...prev.filamento,
          costoFilamento: costoTotal.toFixed(2),
          costoMaterialSolo: costoTotal.toFixed(2),
        }
      }));
    } else {
      const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
      if (mat) {
        const categoria = mat.categoria;
        let costo = 0;
        switch (categoria) {
          case 'Filamento':
          case 'Resina': {
            // CORRECCIÓN: Usar los datos del material original ('mat') en lugar del estado temporal ('calculo.filamento')
            const precioBobina = mat.precioBobina || mat.precio;
            const pesoBobina = mat.pesoBobina || mat.peso;
            const { gramosUtilizados } = calculo.filamento;
            if (precioBobina && pesoBobina && gramosUtilizados) {
              const costoPorGramo = parseFloat(limpiarPrecio(precioBobina)) / parseFloat(pesoBobina);
              costo = costoPorGramo * parseFloat(gramosUtilizados);
            }
            break;
          }
          case 'Pintura': {
            const precioPintura = parseFloat(limpiarPrecio(mat.precio || '0'));
            const cantidadTotalPintura = parseFloat(mat.cantidad || '0');
            const mlUtilizados = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioPintura && cantidadTotalPintura > 0 && mlUtilizados) {
              const costoPorMl = precioPintura / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          }
          case 'Aros de llavero': {
            const precioLlavero = parseFloat(limpiarPrecio(mat.precio || '0'));
            const cantidadLlaveros = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioLlavero && cantidadLlaveros) {
              costo = precioLlavero * cantidadLlaveros;
            }
            break;
          }
          default: {
            const precio = parseFloat(limpiarPrecio(mat.precio || '0'));
            const cantidad = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precio && cantidad) {
              costo = precio * cantidad;
            }
          }
        }
        setCalculo(prev => ({
          ...prev,
          filamento: {
            ...prev.filamento,
            costoFilamento: costo.toFixed(2),
            costoMaterialSolo: costo.toFixed(2),
          }
        }));
      }
    }
  };

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
    let filamento = 0;
    if (esMultifilamento && calculo.materialesMultiples?.length > 0) {
      filamento = calculo.materialesMultiples.reduce((total, material) => {
        if (!material) return total;
        const categoria = material.categoria;
        let costo = 0;
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            if (material.precioBobina && material.pesoBobina && material.gramosUtilizados) {
              const costoPorGramo = parseFloat(limpiarPrecio(material.precioBobina)) / parseFloat(material.pesoBobina);
              costo = costoPorGramo * parseFloat(material.gramosUtilizados);
            }
            break;
          case 'Pintura':
            if (material.precio && material.cantidad && material.cantidadPintura) {
              const cantidadTotalPintura = parseFloat(material.cantidad);
              const mlUtilizados = parseFloat(material.cantidadPintura);
              const costoPorMl = parseFloat(limpiarPrecio(material.precio)) / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          case 'Aros de llavero':
            if (material.precio && material.cantidadLlaveros) {
              costo = parseFloat(limpiarPrecio(material.precio)) * parseFloat(material.cantidadLlaveros);
            }
            break;
          default:
            if (material.precio && material.cantidadUtilizada) {
              costo = parseFloat(limpiarPrecio(material.precio)) * parseFloat(material.cantidadUtilizada);
            }
        }
        return total + costo;
      }, 0);
    } else {
      const mat = materialesGuardados.find((m: any) => m.id === calculo.materialSeleccionado.id);
      if (mat) {
        const categoria = mat.categoria;
        let costo = 0;
        switch (categoria) {
          case 'Filamento':
          case 'Resina':
            // CORRECCIÓN: Usar los datos del material original ('mat') aquí también
            const precioBobina = mat.precioBobina || mat.precio;
            const pesoBobina = mat.pesoBobina || mat.peso;
            const { gramosUtilizados } = calculo.filamento;
            if (precioBobina && pesoBobina && gramosUtilizados) {
              const costoPorGramo = parseFloat(limpiarPrecio(precioBobina)) / parseFloat(pesoBobina);
              costo = costoPorGramo * parseFloat(gramosUtilizados);
            }
            break;
          case 'Pintura':
            const precioPintura = parseFloat(limpiarPrecio(mat.precio || '0'));
            const cantidadTotalPintura = parseFloat(mat.cantidad || '0');
            const mlUtilizados = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioPintura && cantidadTotalPintura > 0 && mlUtilizados) {
              const costoPorMl = precioPintura / cantidadTotalPintura;
              costo = costoPorMl * mlUtilizados;
            }
            break;
          case 'Aros de llavero':
            const precioLlavero = parseFloat(limpiarPrecio(mat.precio || '0'));
            const cantidadLlaveros = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precioLlavero && cantidadLlaveros) {
              costo = precioLlavero * cantidadLlaveros;
            }
            break;
          default:
            const precio = parseFloat(limpiarPrecio(mat.precio || '0'));
            const cantidad = parseFloat(calculo.filamento.gramosUtilizados || '0');
            if (precio && cantidad) {
              costo = precio * cantidad;
            }
        }
        filamento = costo;
      } else {
        filamento = parseFloat(calculo.filamento.costoMaterialSolo) || 0;
      }
    }
    const manoObra = parseFloat(calculo.manoObra.costoTotalManoObra) || 0;
    const extra = parseFloat(calculo.avanzados.totalMaterialesExtra) || 0;
    const luz = parseFloat(calculo.avanzados.costoLuz) || 0;
    return (filamento + manoObra + extra + luz).toFixed(2);
  };

  const getProduccion = () => {
     // La lógica es idéntica a getTotal, así que reutilizamos el cálculo
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
