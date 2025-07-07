# Modularización de Componentes de Materiales

## Resumen de la Refactorización

Se ha realizado una modularización completa de los componentes relacionados con materiales para mejorar la mantenibilidad, reutilización y escalabilidad del código.

## Nueva Estructura de Carpetas

```
dmaterial-manager/
├── components/
│   └── Material/
│       ├── index.ts          # Exportaciones centralizadas
│       ├── MaterialCard.tsx  # Tarjeta individual de material
│       └── MaterialList.tsx  # Lista agrupada de materiales
├── hooks/
│   ├── index.ts              # Exportaciones centralizadas
│   └── useMateriales.ts      # Hook para gestión de materiales
├── utils/
│   ├── index.ts              # Exportaciones centralizadas
│   └── materialUtils.ts      # Utilidades para materiales
└── screens/                  # Pantallas existentes (actualizadas)
```

## Componentes Extraídos

### 1. MaterialCard.tsx
- **Propósito**: Renderizar una tarjeta individual de material
- **Props**:
  - `material`: Objeto con datos del material
  - `isSelected`: Boolean para estado de selección
  - `onPress`: Función callback para selección
- **Características**:
  - Muestra indicador de color
  - Información de cantidad restante y precio
  - Estilos dinámicos según selección

### 2. MaterialList.tsx
- **Propósito**: Renderizar lista agrupada de materiales
- **Props**:
  - `materiales`: Array de materiales
  - `materialSeleccionado`: ID del material seleccionado
  - `onMaterialSelect`: Función callback para selección
  - `maxItems`: Número máximo de elementos a mostrar (opcional)
- **Características**:
  - Agrupa materiales por tipo
  - Renderiza en filas de 2 elementos
  - Manejo de espacios vacíos

### 3. ColorSelector.tsx
- **Propósito**: Selector visual de colores reutilizable
- **Props**:
  - `selectedColor`: Color seleccionado actualmente
  - `onColorSelect`: Función callback para selección de color
  - `title`: Título opcional del selector
  - `subtitle`: Subtítulo opcional
- **Características**:
  - Paleta de colores predefinida
  - Indicador visual de selección
  - Estilos consistentes

### 4. CategorySelector.tsx
- **Propósito**: Selector de categorías con pastillas
- **Props**:
  - `categoriasBase`: Array de categorías base
  - `categoriasPersonalizadas`: Array de categorías personalizadas
  - `categoriaSeleccionada`: Categoría seleccionada actualmente
  - `onCategoriaSelect`: Función callback para selección
  - `onNuevaCategoria`: Función callback para agregar nueva categoría
  - `onEliminarCategoria`: Función callback para eliminar categoría (opcional)
  - `showDeleteButton`: Boolean para mostrar botón de eliminar
- **Características**:
  - Separación entre categorías base y personalizadas
  - Botón para agregar nuevas categorías
  - Botón opcional para eliminar categorías personalizadas

## Hooks Personalizados

### useMateriales.ts
- **Funcionalidades**:
  - Carga automática de materiales desde Firestore
  - Filtrado por texto de búsqueda
  - Operaciones CRUD (Crear, Leer, Actualizar, Eliminar)
  - Manejo de estados de carga y error
- **Retorna**:
  - `materiales`: Array de materiales
  - `loading`: Estado de carga
  - `error`: Mensaje de error
  - `cargarMateriales`: Función para recargar
  - `agregarMaterial`: Función para agregar
  - `eliminarMaterial`: Función para eliminar
  - `materialesFiltrados`: Materiales filtrados
  - `setFiltro`: Función para establecer filtro

### useCategoriasPersonalizadas.ts
- **Funcionalidades**:
  - Carga automática de categorías personalizadas desde Firestore
  - Operaciones CRUD para categorías
  - Manejo de estados de carga y error
- **Retorna**:
  - `categorias`: Array de categorías personalizadas
  - `loading`: Estado de carga
  - `error`: Mensaje de error
  - `agregarCategoria`: Función para agregar categoría
  - `eliminarCategoria`: Función para eliminar categoría

## Utilidades

### materialUtils.ts
- **Funciones**:
  - `getPrecioDisplay()`: Obtener precio según categoría
  - `getCantidadRestante()`: Obtener cantidad restante
  - `validarMaterialCompleto()`: Validar material para guardado
  - `generarNombreMaterial()`: Generar nombre automático
  - `agruparMaterialesPorTipo()`: Agrupar por tipo
  - `filtrarMateriales()`: Filtrar por texto
  - `getUnidadMaterial()`: Obtener unidad según categoría
  - `getCampoCantidad()`: Obtener campo de cantidad
  - `getLabelCantidad()`: Obtener label de cantidad

## Pantallas Actualizadas

### CostCalculatorScreen.tsx
- **Cambios**:
  - Reemplazado lógica de carga con `useMateriales`
  - Reemplazado renderizado con `MaterialList`
  - Eliminado código duplicado de renderizado
  - Simplificado manejo de estados

## Beneficios de la Modularización

1. **Reutilización**: Los componentes pueden usarse en múltiples pantallas
2. **Mantenibilidad**: Código más organizado y fácil de mantener
3. **Escalabilidad**: Fácil agregar nuevas funcionalidades
4. **Testabilidad**: Componentes aislados más fáciles de testear
5. **Consistencia**: UI uniforme en toda la aplicación

## Uso de los Nuevos Componentes

```typescript
// Importar componentes
import { MaterialCard, MaterialList, ColorSelector, CategorySelector } from '../components/Material';
import { useMateriales, useCategoriasPersonalizadas } from '../hooks';

// Usar hooks
const { materiales, loading, error } = useMateriales();
const { categorias, agregarCategoria } = useCategoriasPersonalizadas();

// Usar componentes
<MaterialList
  materiales={materiales}
  materialSeleccionado={selectedId}
  onMaterialSelect={handleSelect}
/>

<ColorSelector
  selectedColor={color}
  onColorSelect={setColor}
  title="Selecciona un color:"
/>

<CategorySelector
  categoriasBase={['Filamento', 'Resina', 'Pintura']}
  categoriasPersonalizadas={categorias.map(c => c.nombre)}
  categoriaSeleccionada={categoria}
  onCategoriaSelect={setCategoria}
  onNuevaCategoria={handleNuevaCategoria}
  showDeleteButton={true}
/>
```

## Próximos Pasos

1. **Actualizar InventoryScreen**: Usar los nuevos componentes
2. **Actualizar AddMaterialScreen**: Usar utilidades comunes
3. **Crear más hooks**: Para categorías, marcas, etc.
4. **Agregar tests**: Para componentes y hooks
5. **Documentación**: JSDoc para todos los componentes 