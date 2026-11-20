# Cotrali · Impresión de códigos de barras en albaranes

Aplicación web que toma los albaranes (PDF) y el Excel de relación, y estampa en cada hoja el código de barras
Code 128 con el Nº de albarán de Cotrali. Los PDF se procesan **en el navegador**; no se guarda nada en ningún servidor.

## Cómo funciona
1. Se suben los PDF y el Excel (Hoja1: referencia → Nº de albarán).
2. Cada hoja se lee con el **servicio de lectura** (OCR por API) y también por su texto y su código de barras impreso.
3. Se revisan las coincidencias, se asignan a mano las dudosas y se generan los PDF con el código.
4. La app vuelve a leer cada código estampado para comprobar que es correcto.

## Privacidad
- Los archivos y los resultados viven solo en la memoria de la pestaña: **al recargar se borra todo**.
- Solo se envía al servicio de lectura la imagen de cada hoja. El intermediario (Cloudflare Worker) no guarda ni registra nada.
- Google Cloud Vision se usa con el endpoint de la UE (`eu-vision.googleapis.com`). Revisa en la documentación de Google
  la política de retención vigente y firma el contrato de tratamiento de datos de tu cuenta.

## Puesta en marcha (una vez)

### 1. Google Cloud Vision
1. En https://console.cloud.google.com crea un proyecto y activa la facturación.
2. Activa la API **Cloud Vision API**.
3. *APIs y servicios → Credenciales → Crear credenciales → Clave de API*.
4. Edita la clave y en **Restricciones de API** elige solo *Cloud Vision API*.
5. Crea una **alerta de presupuesto** (Facturación → Presupuestos y alertas) para controlar el gasto.

### 2. Cloudflare Worker (intermediario que guarda la clave)
1. En https://dash.cloudflare.com crea una cuenta gratuita → *Workers & Pages → Create → Create Worker*.
2. Ponle de nombre `cotrali-ocr`, despliégalo y pulsa *Edit code*; pega el contenido de `worker/worker.js`; *Deploy*.
3. *Settings → Variables and Secrets*:
   - `VISION_KEY` (tipo **Secret**): la clave de API de Google.
   - `ACCESS_CODE` (tipo **Secret**): un código largo que compartirás con el equipo.
   - `ALLOWED_ORIGIN` (tipo Text): `https://TU-USUARIO.github.io` (la dirección de la página, sin barra final).
4. Copia la dirección del Worker (`https://cotrali-ocr.TU-SUBDOMINIO.workers.dev`).
5. Recomendado: *Security → WAF → Rate limiting rules* para limitar las peticiones por minuto.

### 3. Página en GitHub Pages
1. Edita `config.js` y pon la dirección del Worker en `apiUrl`.
2. En el repositorio: *Settings → Pages → Build and deployment → Deploy from a branch → main / (root)*.
3. La página queda en `https://TU-USUARIO.github.io/cotrali-impresion-albaranes/`.
4. Comparte con el equipo esa dirección y el código de acceso (por un canal seguro, no por el repositorio).

## Notas
- **Nunca** subas claves ni el código de acceso al repositorio.
- Si cambias la dirección de la página, actualiza `ALLOWED_ORIGIN` en Cloudflare.
- Para cambiar el código de acceso: edita el secreto `ACCESS_CODE` y avisa al equipo.
