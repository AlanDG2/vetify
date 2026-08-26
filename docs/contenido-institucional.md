# Contenido institucional de los sitios (QA vs PROD)

> Relevamiento de las páginas públicas/institucionales de cada sitio del proyecto — textos, secciones, planes, preguntas frecuentes. Complementa `docs/conocimiento-sistema.md` (que cubre comportamiento funcional/técnico) con el contenido de marketing/institucional real de cada landing. Hecho navegando QA y PROD en paralelo para detectar diferencias.
>
> **Última actualización**: 2026-08-14.

---

## Resumen ejecutivo

- Los **4 sitios de venta/landing** (Vetify B2C, OSDE Adquirente, OSDE Capitado, Flux Capitado) tienen contenido **idéntico entre QA y PROD** — mismo copy, mismos precios, mismas coberturas. No hay drift de contenido entre ambientes.
- Ninguno de los 4 tiene una página dedicada "Quiénes somos" / "Misión" / "Visión" como tal — la identidad de marca se transmite a través del hero ("Tu mascota más tiempo con vos"), la sección "¿Por qué elegir Vetify?" y el Aviso de Privacidad (que sí identifica formalmente a la razón social).
- Las **apps logueadas** (Vetify WebApp, Ike WebApp, Reintegros Backoffice, Prestadores) no tienen contenido institucional propio — son herramientas transaccionales, solo pantalla de login antes de autenticarse.
- **🐛 Hallazgo**: la landing de **Flux Capitado** (QA y PROD, ambos) tiene las preguntas frecuentes **copiadas literalmente de OSDE** — dice "Alianza Vetify x OSDE" y "¿por qué OSDE lo eligió como aliado...?" en una página que se presenta como "Vetify x Flux". No reportado a Jira todavía, pendiente de confirmación con el usuario del proyecto.

---

## 1. Vetify institucional (B2C) — venta directa con tarjeta

- **QA**: `https://qa.vetify.com.ar/`
- **PROD**: `https://vetify.com.ar/`
- **Título de página**: "Vetify | Tu Mascota Más Tiempo con Vos"

### Contenido de la landing
- **Hero**: *"Tu mascota más tiempo con vos"* — "En Vetify diseñamos el plan de salud integral ideal para cuidar a tu mascota en cada etapa de su vida, con medicina preventiva, urgencias 24 horas y la red de veterinarios más completa del país."
- **¿Por qué elegir Vetify?**: cita fuente *"con los cuidados preventivos adecuados, la vida de tus mascotas puede extenderse un 20% más"* (Veterinary Focus / Vol. 22 Nº 2). 4 pilares: Medicina veterinaria integral, Veterinarios disponibles 24/7, Beneficios exclusivos (descuentos alimentos/accesorios), Atención en todo el país (red + reintegros).
- **Qué cubre**: Consultas veterinarias, Guardia 24h, Vacunas, Desparasitación, Exámenes bioquímicos, Diagnóstico por imagen y Estudio cardiológico, Intervención quirúrgica e Internación, Tratamiento periodontal, Médicos especialistas, Descuentos alimentos/accesorios.
- **20% de descuento por grupo familiar** (banner recurrente en todos los sitios de venta).
- **4 planes** (precios sin descuento, tal como se ven en B2C puro):

| Plan | Precio/mes | Incluye |
|---|---|---|
| Emergencias | $19.990 | Exclusivo accidentes/enfermedades de riesgo vital. Videollamadas ilimitadas, emergencias y guardias 24h, análisis y estudios, intervenciones quirúrgicas, traslados |
| Classic | $62.990 | Todo Emergencias + consultas presenciales ilimitadas en red, vacunas y desparasitación, internaciones, nutricionistas online, especialistas 50% off |
| Premium | $88.990 | Todo Classic + resonancias magnéticas, tratamientos periodontales, mayor cobertura en cirugías/internaciones/diagnóstico por imagen/estudios cardiológicos |
| Cachorros (0-1 año) | $79.990 | Todo Classic + mayor cobertura especialistas en comportamiento, calendario de vacunación 1er año 100% off |

- **Tabla comparativa detallada** por categoría: Consulta veterinaria, Videollamadas, Asistencia telefónica 24h, Vacunas, Desparasitación, Traslado con mascota, Análisis bioquímico, Diagnóstico por imagen/Estudio cardiológico, Resonancia magnética, Tratamiento periodontal, Intervención quirúrgica, Internación, Nutricionista online, Especialidades, Alimentos/accesorios, Asesoramiento legal telefónico, Cremación (hasta $100.000).
- **App Vetify**: enlaces a Google Play (`vetify.cliente`) / App Store, y acceso web sin descarga vía `https://vetify.ikeapp.com/`.
- **Testimonios** de 6 veterinarios matriculados reales (nombre + matrícula).
- **Proceso en 3 pasos**: llamar al 0800 122 1183 → elegir profesional → presentar DNI/credencial el día del turno.
- **Formulario de contacto** ("¿Ya sos cliente?" alternativo) con radios de horario/medio de contacto preferido.
- **FAQ** (9 preguntas, títulos): qué pasa luego de contratar, dónde atender, cómo funciona el reintegro, proceso de atención, por qué un plan para la familia, por qué elegir plan según etapa de vida, descuento por más de una mascota, inscripción sin restricción de raza/edad/preexistencias, diferencia plan de salud vs. seguro.
- **Footer**: WhatsApp `+54 9 11 7248-7444`, `info@vetify.com.ar`, `0800 122 1183`. Links: Aviso legal, Defensa del consumidor (gob.ar), Libro de quejas online. Redes: LinkedIn, Instagram, Facebook, YouTube. Botón "SOLICITAR BAJA".

### `/legales` — Aviso de Privacidad (QA, idéntico esperado en PROD)
- Razón social: **IKÉ ASISTENCIA ARGENTINA S.A.**, CUIT **33-71006859-9**, domicilio Lavardén 157, Piso 2° "201", CABA (C.P. 1437).
- Base de datos inscripta ante el Registro Nacional de Bases de Datos (AAIP). Marco legal: Ley 25.326, Decreto 1558/01.
- Contacto oficial de privacidad: **privacidad-vetify@vetify.com.ar**.
- Datos que recolectan: identificatorios/contacto (incl. DNI/CUIT), datos de la mascota (especie, raza, edad, sexo, antecedentes médicos), datos económicos (tarjeta — **no almacenan CVV ni número completo**, lo procesan plataformas PCI-DSS certificadas), datos de navegación/marketing (IP, geolocalización aproximada, cookies, cupones promocionales), datos sensibles solo por obtención directa, datos de menores/incapaces (bajo responsabilidad parental/tutela del titular que los carga).
- Última actualización del aviso: 12 de enero de 2026.

---

## 2. OSDE Adquirente — venta directa con tarjeta, descuento por convenio OSDE

- **QA**: `https://qa.vetify.com.ar/mas-osde-beneficios`
- **PROD**: `https://vetify.com.ar/mas-osde-beneficios`
- **Título**: mismo que Vetify B2C (reusa el mismo template, distinto banner de descuento).

### Contenido
- Banner: **"30% OFF POR TRES MESES EXCLUSIVO OSDE"** + "20% de descuento por grupo familiar" (adicional).
- Hero: *"Cuidá la salud de tu mascota con lo mejor"* — "Por tener OSDE, podés acceder a una bonificación especial en Vetify."
- Precios con descuento aplicado (30% off por 3 meses, luego 10% off fijo desde el 4to mes):

| Plan | Precio normal | Precio con 30% off (primeros 3 meses) |
|---|---|---|
| Emergencias | $19.990 | $13.791 |
| Classic ★ Más elegido | $62.990 | $43.591 |
| Premium | $88.990 | $61.591 |
| Cachorros | $79.990 | $55.391 |

- Mismo cuadro comparativo de coberturas que B2C. Mismo footer/legales (es el mismo sitio Vetify, solo cambia el landing de entrada).

---

## 3. OSDE Capitado — canje de cupón (plan corporativo, sin pago)

- **QA**: `https://qa.vetify.com.ar/osde`
- **PROD**: `https://vetify.com.ar/osde`
- **Título**: "OSDE | Plan de salud para tu mascota"

### Contenido
- Hero: *"Activá hoy el plan de salud de tu mascota"* — "Por tener OSDE, tu mascota cuenta con Vetify. Sólo necesitamos unos datos para activar su cobertura 100% bonificada."
- Formulario de activación: Nombre, Apellido, **Tipo de documento** (opciones: DNI, Libreta Cívica, Libreta Enrolamiento, Pasaporte, DNI Extranjero, CUIT, CUIL, Cédula Identidad, Documento Único, No Determinado), Nº Documento, Cód. de área + Teléfono, Email, **Cupón**, botón "ACTIVÁ SU PLAN".
- **"Plan Esencial"** (único plan de este canal, cobertura fija):
  - Videollamadas con veterinarios 24h — 2 anuales
  - Consultas en centros veterinarios — 2 anuales hasta $35.000 c/u
  - Traslados — hasta 5km o $15.000
  - Análisis bioquímicos — 1 por año hasta $40.000 (servicio activo a partir de los 60 días)
  - Certificado de salud — 1 por año hasta $35.000
- **FAQ extenso** organizado en 6 categorías: Alianza Vetify OSDE, Condiciones, Cómo acceder, Qué incluye el plan y cómo funciona, Mi mascota y la inscripción, Red de atención/urgencias/soporte, Gestión y uso (~25 preguntas en total).
- Mensaje clave repetido: *"Vetify no es un seguro"* — es medicina preventiva.

---

## 4. Flux Capitado — canje de cupón (plan corporativo, sin pago)

- **QA**: `https://qa.vetify.com.ar/flux`
- **PROD**: `https://vetify.com.ar/flux`
- **Título**: "Vetify x Flux | Plan de salud para tu mascota"

### Contenido
- Estructura **idéntica** a OSDE Capitado (mismo formulario, mismo "Plan Esencial", mismas 6 categorías de FAQ) — solo cambia "FLUX" por "OSDE" en el hero: *"Por tener FLUX, tu mascota cuenta con Vetify..."*.

### 🐛 Hallazgo de contenido — reportado como `IMAS-4430`

Las respuestas del FAQ **no fueron adaptadas de OSDE a Flux** — quedaron con el copy original:
- Categoría del FAQ: **"Alianza Vetify x OSDE"** (debería decir "Alianza Vetify x Flux").
- Primera pregunta/respuesta: *"¿Qué es Vetify y por qué **OSDE** lo eligió como aliado para el cuidado de mascotas? ... **OSDE** nos eligió porque compartimos la misma visión..."* — debería decir "Flux".
- Confirmado en **QA y PROD por igual** (no es drift de ambiente, es el mismo contenido mal copiado en el CMS/código de ambos).
- **Re-confirmado en vivo 2026-08-25** (11 días después del hallazgo original, sin cambios) y reportado como [`IMAS-4430`](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4430) (`docs/bugs/BUG-016-flux-faq-copy-osde-sin-adaptar.md`).

---

## 5. Apps logueadas — sin contenido institucional propio

| App | QA | PROD | Notas |
|---|---|---|---|
| Vetify WebApp | `vetify-qa.ikeapp.com` | `vetify.ikeapp.com` | Portal del titular ya con plan — funcionalidad documentada en detalle en `docs/conocimiento-sistema.md`. Sin página "quiénes somos" propia. |
| Ike WebApp | `ikeargentina-qa.ikeapp.com` | `ikeargentina.ikeapp.com` | Sistema legacy de gestión de planes Iké — solo pantalla de login pública, sin landing institucional. |
| Reintegros Backoffice (Calidad) | `reintegros-backoffice.ike.qa` | `reintegros-backoffice.ike.ar` | Herramienta interna de backoffice — no tiene landing pública (VPN inestable al momento de este relevamiento, no se pudo re-confirmar en esta pasada puntual, pero ya explorado funcionalmente a fondo en sesiones previas). |
| Webapp Prestadores | `qa.prestadores.ike.ar` | (no confirmado — inferido `prestadores.ike.ar`, no verificado en esta pasada) | Portal para veterinarias/prestadores — solo login + flujo de atención, sin contenido de marketing. |

---

## Notas metodológicas

- Contenido extraído navegando cada sitio con el MCP de Playwright (`document.body.innerText`), no HTML crudo — puede omitir texto oculto por CSS o cargado solo on-hover/on-click (ej. respuestas de FAQ colapsadas que no se expandieron todas).
- No se verificó exhaustivamente cada pregunta del FAQ expandida individualmente — se relevó el listado de preguntas + las que ya estaban visibles/expandidas por defecto.
- Reintegros Backoffice y Prestadores quedaron con verificación QA/PROD incompleta por un corte de VPN durante el relevamiento — repetir si se necesita certeza total de que no tienen contenido público adicional.
