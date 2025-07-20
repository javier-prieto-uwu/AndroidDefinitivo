# Sistema de Gestión de Ventas - Diagrama de Firebase

## Estructura de Datos

### 📁 Colección: `usuarios/{userId}/proyectos/{proyectoId}/impresiones/{impresionId}`

```json
{
  "id": "impresion_123",
  "nombre": "Llavero personalizado",
  "fecha": "2024-01-15T10:30:00Z",
  "costoTotal": "45.50",
  "materialSeleccionado": { ... },
  "esMultifilamento": false,
  "materialesMultiples": [ ... ],
  "filamento": { ... },
  "manoObra": { ... },
  "avanzados": { ... },
  "detallesImpresion": { ... },
  "fallo": false,
  
  // NUEVOS CAMPOS PARA VENTAS
  "estadoVenta": "vendido" | "pendiente",
  "categoriaVenta": "llaveros" | "figuras" | "prototipos" | "otros",
  "cliente": "Cliente A" | "Cliente B" | "Pendiente",
  "fechaVenta": "2024-01-20T14:00:00Z",
  "precioVenta": "80.00",
  "ganancia": "34.50",
  "notasVenta": "Llavero con logo personalizado"
}
```

### 📊 Campos de Venta Detallados

| Campo | Tipo | Descripción | Valores |
|-------|------|-------------|---------|
| `estadoVenta` | string | Estado de la venta | `"vendido"` / `"pendiente"` |
| `categoriaVenta` | string | Categoría del producto vendido | `"llaveros"`, `"figuras"`, `"prototipos"`, `"otros"` |
| `cliente` | string | Nombre del cliente | Texto libre |
| `fechaVenta` | timestamp | Fecha de la venta | ISO string |
| `precioVenta` | string | Precio de venta al cliente | Número como string |
| `ganancia` | string | Ganancia calculada | `precioVenta - costoTotal` |
| `notasVenta` | string | Notas adicionales | Texto libre |

### 🎯 Categorías de Venta Predefinidas

```javascript
const CATEGORIAS_VENTA = [
  { id: 'llaveros', nombre: 'Llaveros', icon: 'key-outline' },
  { id: 'figuras', nombre: 'Figuras', icon: 'cube-outline' },
  { id: 'prototipos', nombre: 'Prototipos', icon: 'construct-outline' },
  { id: 'otros', nombre: 'Otros', icon: 'ellipsis-horizontal-outline' }
];
```

### 🔍 Filtros Disponibles

#### Por Estado:
- ✅ **Vendidos**: `estadoVenta === "vendido"`
- ⏳ **Pendientes**: `estadoVenta === "pendiente"`
- 📊 **Todos**: Sin filtro

#### Por Categoría:
- 🔑 **Llaveros**: `categoriaVenta === "llaveros"`
- 🎲 **Figuras**: `categoriaVenta === "figuras"`
- 🔧 **Prototipos**: `categoriaVenta === "prototipos"`
- 📦 **Otros**: `categoriaVenta === "otros"`

#### Por Cliente:
- 👤 **Cliente específico**: `cliente === "nombre_cliente"`
- 📋 **Todos los clientes**: Sin filtro

### 📈 Estadísticas Calculadas

```javascript
const estadisticas = {
  totalVendido: impresiones.filter(i => i.estadoVenta === 'vendido').length,
  totalPendiente: impresiones.filter(i => i.estadoVenta === 'pendiente').length,
  gananciaTotal: impresiones
    .filter(i => i.estadoVenta === 'vendido')
    .reduce((sum, i) => sum + parseFloat(i.ganancia || 0), 0),
  ventasPorCategoria: {
    llaveros: impresiones.filter(i => i.categoriaVenta === 'llaveros').length,
    figuras: impresiones.filter(i => i.categoriaVenta === 'figuras').length,
    prototipos: impresiones.filter(i => i.categoriaVenta === 'prototipos').length,
    otros: impresiones.filter(i => i.categoriaVenta === 'otros').length
  }
};
```

### 🔄 Flujo de Trabajo

1. **Crear Impresión** → Estado inicial: `"pendiente"`
2. **Marcar como Vendido** → Seleccionar categoría y cliente
3. **Actualizar Precio** → Calcular ganancia automáticamente
4. **Filtrar y Ver** → Por estado, categoría o cliente

### 🎨 UI Components

#### Filtros Superiores:
```
[📊 Todos] [✅ Vendidos] [⏳ Pendientes]
[🔑 Llaveros] [🎲 Figuras] [🔧 Prototipos] [📦 Otros]
```

#### Tarjeta de Impresión:
```
┌─────────────────────────────────────┐
│ Llavero personalizado    [✅ Vendido]│
│ 🔑 Llaveros → Cliente A            │
│ 💰 $80.00 (Ganancia: $34.50)      │
│ 📅 20/01/2024                      │
└─────────────────────────────────────┘
```

### 🔧 Funciones Principales

```javascript
// Marcar como vendido
const marcarComoVendido = async (impresionId, categoria, cliente, precioVenta) => {
  const ganancia = parseFloat(precioVenta) - parseFloat(calculo.costoTotal);
  await updateDoc(doc(db, 'usuarios', userId, 'proyectos', proyectoId, 'impresiones', impresionId), {
    estadoVenta: 'vendido',
    categoriaVenta: categoria,
    cliente: cliente,
    precioVenta: precioVenta,
    ganancia: ganancia.toString(),
    fechaVenta: new Date().toISOString()
  });
};

// Marcar como pendiente
const marcarComoPendiente = async (impresionId) => {
  await updateDoc(doc(db, 'usuarios', userId, 'proyectos', proyectoId, 'impresiones', impresionId), {
    estadoVenta: 'pendiente',
    categoriaVenta: null,
    cliente: 'Pendiente',
    precioVenta: null,
    ganancia: null,
    fechaVenta: null
  });
};
```

### 📱 Pantallas a Modificar

1. **PrintScreen.tsx**:
   - Agregar filtros superiores
   - Modificar tarjetas de impresión
   - Agregar modal de venta

2. **Nuevo Componente**: `SalesModal.tsx`
   - Formulario de venta
   - Selección de categoría
   - Input de cliente y precio

3. **Estadísticas**: Dashboard de ventas
   - Resumen de ventas por categoría
   - Ganancia total
   - Gráficos de rendimiento 