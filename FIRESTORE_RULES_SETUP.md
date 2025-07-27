# Configuración de Reglas de Firestore

## Problema Identificado
La aplicación está experimentando errores de permisos en Firestore:
- `ERROR Error en listener de cálculos: [FirebaseError: Missing or insufficient permissions.]`
- `ERROR Error cargando categorías y clientes: [FirebaseError: Missing or insufficient permissions.]`

## Solución
Se han creado reglas de Firestore actualizadas en el archivo `firestore.rules` que permiten el acceso completo a los usuarios autenticados para sus propios datos.

## Cómo Aplicar las Reglas

### Paso 1: Acceder a la Consola de Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `dmaterial-84cb4`
3. En el menú lateral, haz clic en "Firestore Database"
4. Ve a la pestaña "Reglas" (Rules)

### Paso 2: Actualizar las Reglas
1. Copia todo el contenido del archivo `firestore.rules`
2. Reemplaza las reglas existentes en la consola de Firebase
3. Haz clic en "Publicar" (Publish)
4. **IMPORTANTE**: Espera al menos 2-3 minutos para que las reglas se propaguen completamente

### Paso 3: Verificar la Aplicación
1. Cierra completamente la aplicación
2. Espera unos minutos para que las reglas se propaguen
3. Reinicia la aplicación
4. Verifica que los errores de permisos hayan desaparecido

## Estructura de Reglas Simplificada
Las nuevas reglas utilizan un patrón simplificado que permite acceso completo a:
- **Toda la estructura**: `usuarios/{userId}/{document=**}`
- Esto incluye automáticamente todas las subcolecciones y documentos anidados
- Cubre todas las colecciones: `materiales`, `calculos`, `categoriasVenta`, `clientes`, `clientesVenta`, `proyectos`, `categoriasPersonalizadas`, `categoriasBase`, etc.

## Seguridad
- Solo usuarios autenticados pueden acceder a sus propios datos
- Cada usuario solo puede leer/escribir en su propia subcarpeta
- Se deniega el acceso a cualquier otro documento

## Notas Importantes
- Las reglas deben aplicarse desde la consola de Firebase
- Los cambios pueden tardar unos minutos en propagarse
- Asegúrate de que los usuarios estén autenticados antes de acceder a Firestore