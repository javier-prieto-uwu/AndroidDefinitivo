# 🔒 Configuración de Seguridad - Firebase

## ⚠️ IMPORTANTE: Protección de Credenciales

### Problema Identificado
El archivo `google-services.json` contiene credenciales sensibles de Firebase que **NO DEBEN** ser públicas:
- API Key: Permite acceso a servicios de Firebase
- Project ID y números de proyecto
- OAuth client IDs

### ✅ Solución Implementada

1. **Archivo agregado a .gitignore**
   - `google-services.json` ya no se versionará en Git
   - Protege las credenciales de exposición pública

2. **Archivo de ejemplo creado**
   - `google-services.example.json` muestra la estructura necesaria
   - Los desarrolladores pueden usar este template

### 🚀 Pasos para Nuevos Desarrolladores

1. **Obtener credenciales propias:**
   ```bash
   # Copiar el archivo de ejemplo
   cp google-services.example.json google-services.json
   ```

2. **Configurar Firebase Console:**
   - Ir a [Firebase Console](https://console.firebase.google.com/)
   - Seleccionar el proyecto `dmaterial-84cb4`
   - Descargar el `google-services.json` real
   - Reemplazar el archivo de ejemplo

3. **Verificar configuración:**
   ```bash
   # El archivo NO debe aparecer en git status
   git status
   ```

### 🔐 Mejores Prácticas de Seguridad

#### Para Producción:
- [ ] Regenerar API keys si fueron expuestas públicamente
- [ ] Configurar restricciones de API en Firebase Console
- [ ] Habilitar App Check para proteger APIs
- [ ] Revisar reglas de Firestore regularmente

#### Para Desarrollo:
- [ ] Nunca commitear archivos con credenciales reales
- [ ] Usar variables de entorno cuando sea posible
- [ ] Mantener credenciales de desarrollo separadas de producción

### 🚨 Si las Credenciales Fueron Comprometidas

1. **Inmediatamente:**
   - Ir a Firebase Console → Configuración del proyecto
   - Regenerar todas las API keys
   - Actualizar restricciones de API

2. **Verificar acceso:**
   - Revisar logs de Firebase Authentication
   - Verificar actividad inusual en Firestore
   - Cambiar reglas de seguridad si es necesario

3. **Actualizar aplicación:**
   - Distribuir nueva versión con credenciales actualizadas
   - Invalidar versiones anteriores si es posible

### 📞 Contacto
Si tienes dudas sobre seguridad, consulta la documentación oficial de Firebase Security o contacta al equipo de desarrollo.