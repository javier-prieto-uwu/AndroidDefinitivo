# 📱 Distribución de APK en Vercel - 3D Material

## 🚨 Problema: Vercel tiene límite de 100MB por deployment

**Tu APK (~70MB) está cerca del límite, pero es posible alojarlo. Aquí tienes varias estrategias:**

## 🎯 Estrategia 1: Alojar APK Directamente en Vercel (Recomendado)

### Pasos:

1. **Generar el APK:**
   ```bash
   eas build -p android --profile production
   ```

2. **Descargar y renombrar:**
   - Descarga el APK de EAS
   - Renómbralo a: `3d-material-v1.0.0.apk`
   - Colócalo en la carpeta `vercel-distribution/`

3. **Actualizar el enlace de descarga:**
   - Edita `index.html` línea del botón de descarga
   - Cambia `href="#"` por `href="./3d-material-v1.0.0.apk"`

4. **Desplegar en Vercel:**
   ```bash
   cd vercel-distribution
   npx vercel --prod
   ```

## 🎯 Estrategia 2: Usar GitHub Releases (Alternativa)

### Si el APK supera 100MB:

1. **Subir APK a GitHub Releases:**
   - Ve a tu repositorio en GitHub
   - Crea un nuevo Release
   - Sube el APK como asset

2. **Obtener enlace directo:**
   ```
   https://github.com/TU_USUARIO/TU_REPO/releases/download/v1.0.0/3d-material-v1.0.0.apk
   ```

3. **Actualizar index.html:**
   - Cambia el `href` del botón por el enlace de GitHub

## 🎯 Estrategia 3: Usar Firebase Storage

### Para máxima confiabilidad:

1. **Subir a Firebase Storage:**
   ```javascript
   // En Firebase Console > Storage
   // Sube el APK y obtén la URL pública
   ```

2. **Configurar reglas de Storage:**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /apk/{allPaths=**} {
         allow read: if true;
       }
     }
   }
   ```

## 📁 Estructura de Archivos

```
vercel-distribution/
├── index.html              # Página de descarga
├── vercel.json            # Configuración de Vercel
├── 3d-material-v1.0.0.apk # Tu APK (después de generarlo)
└── README.md              # Este archivo
```

## 🚀 Comandos Rápidos

### Generar APK:
```bash
eas build -p android --profile production
```

### Desplegar en Vercel:
```bash
cd vercel-distribution
npx vercel --prod
```

### Verificar tamaño del APK:
```bash
ls -lh 3d-material-v1.0.0.apk
```

## ⚠️ Consideraciones Importantes

### Límites de Vercel:
- **Tamaño máximo por deployment:** 100MB
- **Ancho de banda:** 100GB/mes (plan gratuito)
- **Funciones:** 10 segundos timeout

### Optimización del APK:
- Usa `--clear-cache` si el APK es muy grande
- Considera dividir assets grandes
- Revisa dependencias innecesarias

## 🔧 Troubleshooting

### Si el APK supera 100MB:
1. Usa GitHub Releases
2. Usa Firebase Storage
3. Optimiza el APK removiendo assets no usados

### Si Vercel falla al desplegar:
1. Verifica que el APK esté en la carpeta correcta
2. Asegúrate de que el nombre del archivo coincida en `index.html`
3. Usa `vercel --debug` para más información

## 📞 Próximos Pasos

1. ✅ Genera tu APK con EAS
2. ✅ Coloca el APK en `vercel-distribution/`
3. ✅ Actualiza el enlace en `index.html`
4. ✅ Despliega con `npx vercel --prod`
5. ✅ Comparte el enlace de Vercel con tus usuarios

**¡Tu app estará disponible para descarga en minutos!**