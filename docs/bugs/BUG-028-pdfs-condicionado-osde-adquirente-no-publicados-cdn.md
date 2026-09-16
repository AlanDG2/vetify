[Título]: DEFECT | PDF de condicionado inaccesible para planes OSDE Adquirente (Classic, Cachorro, Premium, Emergencias) — muestra landing page en vez del documento
[Severidad]: Alto — el cliente no puede acceder al condicionado de su plan OSDE Adquirente; al presionar "Condiciones del Servicio" se abre la landing page de ikeargentina.com.ar en vez del PDF. Afecta la transparencia contractual y el cumplimiento regulatorio.
[Categoría]: Flujo
[HU relacionada]: IMAS-4488

[Información del entorno]:
- Ambiente: QA — `https://qa.vetify.com.ar` / `https://www.atencionike.com.ar/pdf/condicionados/`
- Fecha de detección: 2026-09-02
- Método: verificación directa del CDN + flujo UI con cuenta OSDE Capitado (patriciacarpinacci@gmail.com)
- Probado en: OSDE Capitado (CP10) y verificación CDN para OSDE Adquirente

[Descripción]:
Cuando un cliente con un plan OSDE Adquirente (cualquiera excepto Esencial) presiona el botón "Condiciones del Servicio" en la sección "Planes y coberturas" de la webapp, se abre una pestaña nueva que muestra la landing page de `ikeargentina.com.ar` en vez del PDF del condicionado. Los PDFs de los planes Classic, Cachorro, Premium y Emergencias de OSDE Adquirente no están publicados en el CDN `atencionike.com.ar/pdf/condicionados/` — el servidor responde con un redirect 301 permanente a la landing page.

El plan Esencial OSDE (clCuenta 2349) sí tiene su PDF publicado correctamente (`0163-2349.pdf`, 924KB, HTTP 200) y funciona bien.

[Pasos para reproducir]:
1. Abrir el navegador en `https://www.atencionike.com.ar/pdf/condicionados/0163-2358.pdf` (verificar directamente sin cuenta).
   Alternativa con cuenta: iniciar sesión en `https://qa.vetify.com.ar` con una cuenta OSDE Adquirente que tenga plan Classic (2358), Cachorro (2360), Premium (2362) o Emergencias (2364).
2. Ir a la sección "Planes y coberturas" (`/section/myplans`).
3. Expandir el acordeón del plan.
4. Presionar el botón "Condiciones del Servicio".
5. Observar qué se muestra en la nueva pestaña.

[Resultado esperado]:
Se abre una pestaña nueva con un PDF accesible (HTTP 200, Content-Type: application/pdf) desde `atencionike.com.ar/pdf/condicionados/`. El documento corresponde al plan del cliente y no contiene la cadena "Vetify Plus".

[Resultado actual]:
Se abre la landing page `https://www.ikeargentina.com.ar/index.php`. El PDF no existe — el CDN responde `HTTP 301 Moved Permanently` con redirect a esa URL.

[Notas adicionales]:
- **Los 4 PDFs faltantes** (scope de IMAS-4488):
  - `0163-2358.pdf` → HTTP 301 → ikeargentina.com.ar (Vetify Classic OSDE)
  - `0163-2360.pdf` → HTTP 301 → ikeargentina.com.ar (Vetify Cachorro OSDE)
  - `0163-2362.pdf` → HTTP 301 → ikeargentina.com.ar (Vetify Premium OSDE)
  - `0163-2364.pdf` → HTTP 301 → ikeargentina.com.ar (Vetify Emergencias OSDE)
- **El plan que SÍ funciona**: `0163-2349.pdf` (Esencial OSDE) → HTTP 200, 924KB, PDF real. Confirmado con cuenta OSDE Capitado (patriciacarpinacci@gmail.com) y extracción de texto con pdftotext — sin "Vetify Plus".
- **Scope**: afecta a los planes OSDE Adquirente Classic, Cachorro, Premium y Emergencias. Los planes OSDE Capitado usan el mismo PDF de Esencial OSDE (0163-2349.pdf) y no están afectados. Los planes VET no-OSDE (grupo 158) tampoco están afectados por este bug.
- **Preguntas para el equipo de dev/infra**: ¿Los PDFs nuevos ya fueron generados y están en algún repositorio esperando ser subidos al CDN? ¿O todavía no existen y hay que generarlos? La HU IMAS-4488 menciona PDFs adjuntos y un link SharePoint — confirmar si esos archivos ya están listos para publicar o si todavía están en desarrollo.
- Documentado en `docs/user-stories/IMAS-4490-prueba-qa-condicionados-osde.tests.md` con los resultados de la sesión de testing.
