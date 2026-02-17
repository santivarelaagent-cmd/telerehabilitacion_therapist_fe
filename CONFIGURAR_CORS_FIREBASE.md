# Configuración de CORS en Firebase Storage

Este documento detalla cómo configurar las reglas de CORS (Cross-Origin Resource Sharing) en tu bucket de Firebase Storage. Esto es necesario para permitir que aplicaciones web (como tu panel de administración en Vue.js) accedan a los datos de los archivos (videos, imágenes) para procesarlos con herramientas como MediaPipe.

## Prerrequisitos

*   Tener acceso a la consola de Firebase del proyecto.
*   Usar Google Cloud Shell (integrado en la consola) o tener `gsutil` instalado localmente.

## Paso a Paso

### 1. Abrir Google Cloud Shell

1.  Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2.  Selecciona tu proyecto (`telerehabilitacion-9559e`).
3.  Haz clic en el icono de **Cloud Shell** en la barra superior derecha (parece una terminal `>_`).
4.  Espera a que se inicie la terminal.

### 2. Crear el archivo de configuración

En la terminal, crea un archivo `cors.json` con la configuración deseada.

**Para desarrollo (Permitir todo):**
Útil cuando trabajas en `localhost` o múltiples entornos de prueba.

```bash
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
EOF
```

**Para producción (Restringir a tu dominio):**
Recomendado para mayor seguridad una vez despliegues la aplicación. Reemplaza `https://tu-dominio.com` con la URL real de tu web.

```bash
cat > cors.json <<EOF
[
  {
    "origin": ["https://tu-dominio.com", "http://localhost:8080"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
EOF
```

### 3. Aplicar la configuración

Ejecuta el siguiente comando para subir la configuración a tu bucket. Asegúrate de usar el nombre correcto de tu bucket (generalmente `gs://<ID-PROYECTO>.firebasestorage.app`).

```bash
gsutil cors set cors.json gs://telerehabilitacion-9559e.firebasestorage.app
```

### 4. Verificar la configuración

Para confirmar que los cambios se han aplicado correctamente:

```bash
gsutil cors get gs://telerehabilitacion-9559e.firebasestorage.app
```

Deberías ver una respuesta JSON con la configuración que acabas de subir.

## Solución de Problemas

*   **El navegador sigue mostrando error CORS:**
    *   Limpia la caché del navegador. Los navegadores guardan las respuestas de las peticiones `GET`. Si la primera vez falló o no tenía headers, el navegador recordará eso.
    *   Abre las DevTools (F12), ve a la pestaña **Network** y marca **Disable cache** mientras pruebas.
    *   Asegúrate de que el elemento `<video>` o `<img>` en tu código HTML tenga el atributo `crossorigin="anonymous"`.

*   **Error "Bucket not found":**
    *   Verifica el nombre exacto de tu bucket en la sección "Storage" de la consola de Firebase.
