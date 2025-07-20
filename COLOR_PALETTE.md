# Paleta de Colores - Aplicación 3D Printing

## Objetivo
Reemplazar colores agresivos (rojo) por alternativas más suaves y profesionales para indicar gastos y costos.

## Nueva Paleta de Colores

### 🟠 Naranja Suave (#ff9800)
- **Uso**: Advertencias, campos requeridos, errores, costos de producción
- **Propósito**: Indicar atención sin ser agresivo
- **Aplicación**: 
  - Campos obligatorios (*)
  - Mensajes de error
  - Bordes de validación
  - Botones de alerta de error
  - Costo de producción en resumen
  - Elementos archivados

### 🟢 Verde (#00e676)
- **Uso**: Valores positivos, éxito, cantidades restantes
- **Propósito**: Indicar valores favorables
- **Aplicación**:
  - Cantidad restante de materiales
  - Botones de éxito
  - Elementos seleccionados
  - Valores positivos

### 🟡 Amarillo (#ffd600)
- **Uso**: Precios, valores monetarios
- **Propósito**: Destacar información financiera
- **Aplicación**:
  - Precios de materiales
  - Costos totales
  - Información monetaria
  - Iconos de dinero

### 🔵 Azul (#2196f3)
- **Uso**: Información, datos neutros, acciones secundarias
- **Propósito**: Información general y acciones no críticas
- **Aplicación**:
  - Alertas informativas
  - Datos de referencia
  - Información contextual

### 🔴 Rojo Suave (#d32f2f)
- **Uso**: Errores críticos, fallos, acciones de alerta
- **Propósito**: Indicar problemas o errores importantes
- **Aplicación**:
  - Botón de registro de fallo de impresión
  - Errores críticos del sistema

## Beneficios del Cambio

### ✅ Mejor Experiencia de Usuario
- Colores menos agresivos y más profesionales
- Mejor legibilidad y contraste
- Reducción de fatiga visual

### ✅ Indicación Clara de Gastos
- Naranja suave indica atención sin ser alarmante
- Amarillo destaca información monetaria
- Verde muestra valores positivos

### ✅ Consistencia Visual
- Paleta coherente en toda la aplicación
- Colores que funcionan bien en modo oscuro
- Accesibilidad mejorada

## Archivos Modificados

- `screens/CostCalculatorScreen.tsx`
  - Resumen de costos: Costo de producción (naranja suave)
  - Botón de registro de fallo (rojo suave #d32f2f)
  - Botones "Ver más" archivados (naranja suave)
  - Campos requeridos y validaciones (naranja suave)
- `screens/PrintScreen.tsx`
- `screens/InventoryScreen.tsx`

## Implementación

Los cambios incluyen:
1. Reemplazo de `red` por `#ff9800` (naranja suave)
2. Actualización de estilos de validación
3. Mejora de alertas y mensajes de error
4. Reemplazo de emojis por iconos de Ionicons
5. Documentación de la nueva paleta

## Iconos Utilizados

### ✅ Éxito/Completado
- **Ionicons**: `checkmark-circle`
- **Color**: Verde (`#00e676`)
- **Uso**: Proyectos completados, impresiones exitosas

### ❌ Error/Fallo
- **Ionicons**: `close-circle`
- **Color**: Rojo suave (`#d32f2f`)
- **Uso**: Impresiones fallidas, errores

### 📦 Materiales/Inventario
- **Ionicons**: `cube-outline`
- **Color**: Verde (`#00e676`)
- **Uso**: Materiales utilizados, inventario

### 🧮 Calculadora/Historial
- **Ionicons**: `calculator-outline`
- **Color**: Verde (`#00e676`)
- **Uso**: Historial de cálculos, costos

### 🗑️ Eliminar
- **Ionicons**: `trash-outline`
- **Color**: Rojo suave (`#d32f2f`)
- **Uso**: Botones de eliminación 