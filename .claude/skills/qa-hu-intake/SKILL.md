---
name: qa-hu-intake
description: Protocolo de análisis contextual antes de automatizar una HU — guardar la HU, recopilar contexto en orden (impedimentos, lecciones, conocimiento-sistema, HUs vecinas, POMs), analizar gaps de información, preguntar solo lo necesario con AskUserQuestion, automatizar y documentar aprendizajes. Invocar al recibir una HU nueva para automatizar, ANTES de tocar código.
---

# Protocolo de Análisis Contextual antes de Automatizar

> **Convención de intake de HUs del proyecto** (§Protocolo de Análisis Contextual + §Beneficios de este enfoque).

## Principio fundamental

**NUNCA empezar la automatización sin entender completamente la HU y su contexto.**

Cuando recibas una Historia de Usuario (HU), el proceso es:

## 1. GUARDAR la HU

```
docs/user-stories/<ID>-<titulo-slug>.md
```
Ejemplo: `docs/user-stories/ABC-172-<titulo-slug>.md`

## 2. RECOPILAR contexto completo

Leer en este orden:

- ✅ **`docs/impedimentos-bloqueos-qa.md`** — **PRIMERO**: verificar si la HU cae en un `IMP-XXX` abierto. Si cae, documenta en la tabla de "Tests bloqueados" de ese IMP los nuevos specs/tests afectados antes de empezar. Los tests que queden skip deben referenciar el IMP en su comentario (`// SKIP [IMP-003]: ...`).
- ✅ **`docs/lecciones-aprendidas.md`** — **SEGUNDO**: buscar (Ctrl+F) problemas similares ya resueltos, preguntas recurrentes, patrones relacionados con el módulo/funcionalidad de esta HU
- ✅ **`docs/conocimiento-sistema.md`** — buscar el módulo relacionado (ej: el módulo/feature que toca la HU) para entender:
  - Funcionalidades disponibles en esa página
  - Reglas de negocio ya descubiertas
  - Validaciones y mensajes exactos
  - Estados y transiciones
  - Limitaciones conocidas
- ✅ **La HU completa** — entender qué se solicita
- ✅ **Carpeta `docs/user-stories/`** — buscar HUs similares o relacionadas (mismo módulo, flujo similar, funcionalidad relacionada) para entender patrones y convenciones. **Regla de contradicción**: si la HU actual contradice una HU anterior del mismo módulo (diferente flujo, validación distinta, elemento removido), la HU **más reciente es la fuente de verdad** — la anterior queda implícitamente deprecada para ese punto. Actualizar POMs, specs y docs afectados según la nueva HU. Esta regla NO es excusa para bloquear una HU; si hay duda real sobre si es contradicción o error, preguntar al usuario.
- ✅ **`docs/coverage-register.md`** — identificar tests existentes del mismo módulo/área
- ✅ **`docs/app-map.md`** — identificar rutas y POMs involucrados
- ✅ **Specs relacionados** — leer tests del mismo feature (ej: leer otros specs en `tests/<area>/`) para entender cómo se han manejado flujos similares
- ✅ **POMs potencialmente involucrados** — leer los POMs completos para conocer métodos/locators ya disponibles
- ✅ **`docs/environments.md`** — si la HU menciona ambiente específico o credenciales
- ✅ **`docs/guia-casos-automatizacion.md`** — **estrategia de cobertura**: cuántos tests crear por CA, qué priorizar, patrones comunes del proyecto

**IMPORTANTE**: Si encuentras un POM relacionado (ej: un POM de edición para una HU de edición de la misma entidad), **LEER EL POM COMPLETO** antes de planear qué agregar. Esto evita duplicar trabajo ya hecho.

## 3. ANALIZAR gaps de información

Después de leer el contexto, identificar qué falta para automatizar. Hacerse estas preguntas:

### Sobre el flujo:
- ¿La HU describe el flujo completo desde el inicio (URL/pantalla inicial) hasta el fin?
- ¿El punto de partida es claro? (¿desde login? ¿desde dashboard? ¿URL directa?)
- ¿Hay pasos intermedios que no están descritos?
- ¿El POM existente ya cubre parte del flujo? ¿Qué parte falta?

### Sobre validaciones:
- ¿Los criterios de aceptación tienen **textos EXACTOS** de mensajes/labels/botones o son genéricos?
- ¿Las validaciones especifican qué elementos aparecen/desaparecen/cambian?
- ¿Los casos de error mencionan los mensajes de error exactos?

### Sobre datos:
- ¿Los datos de entrada están especificados o debo generarlos?
- ¿Las precondiciones indican qué usuario usar? (fixture específico, `defaultUser`, nuevo usuario)
- ¿El usuario necesita algún estado previo? (cuenta activada, productos asociados, permisos)
- ¿Hay datos maestros o configuraciones que deben existir antes?

> 🔗 Al planear las precondiciones de data, aplicar la **"REGLA OBLIGATORIA — Data 100% dinámica"** de `CLAUDE.md` (sección Conventions): todo test crea su propia data dentro del flujo (nombres con timestamp, crear cuenta/entidad/registro en el test, cleanup), nunca depende de seeds estáticos. Los anti-patrones y excepciones están ahí.

### Sobre dependencias:
- ¿El flujo depende de emails? (¿debo validar con un servicio de email temporal / buzón de prueba?)
- ¿Hay integraciones externas? (APIs, archivos, descargas)
- ¿Debo ejecutar otros flujos primero? (setup de datos, configuraciones)

### Sobre ambiente:
- ¿En qué ambiente(s) debe correr? (`stable`, `qa`, `dev`)
- ¿Hay diferencias de comportamiento entre ambientes?

### Sobre POMs existentes:
- ¿Qué métodos del POM existente puedo reutilizar directamente?
- ¿Qué locators ya existen que puedo usar?
- ¿Hay métodos que cubren parcialmente mi necesidad?

## 4. PREGUNTAR solo lo necesario

Usar **`AskUserQuestion`** para clarificar únicamente los gaps identificados.

**NO hacer un cuestionario genérico** — las preguntas deben ser específicas para esta HU.

### Ejemplos de buenas preguntas:

❌ **Genérica**: "¿Qué datos necesitas?"
✅ **Específica**: "La HU menciona 'monto inválido' en CA2. ¿Cuál es el mensaje de error exacto que debe aparecer?"

❌ **Genérica**: "¿Qué usuario uso?"
✅ **Específica**: "Para este flujo, ¿debo usar `defaultUser` o necesito un usuario con productos ya creados? Si es lo segundo, ¿existe un fixture o debo crearlo en el test?"

❌ **Genérica**: "¿Dónde empieza el flujo?"
✅ **Específica**: "La HU no especifica desde dónde inicia el usuario. ¿Debo asumir que ya está logueado en el dashboard o debo incluir el login desde `URLS.web`?"

✅ **Específica sobre POMs**: "Vi que `XPage.flujoCompleto()` ya cubre el wizard de extremo a extremo (paso A→B→C→…→final). La HU menciona validaciones adicionales en uno de los pasos intermedios. ¿Debo extender el POM con métodos atómicos para esas validaciones, o el flujo completo es diferente?"

### Formato de las preguntas:

- Agrupar por categoría cuando sea posible
- Explicar por qué necesito la información
- Mencionar qué ya existe (POMs, métodos, specs) para contexto
- Ofrecer opciones cuando identifique alternativas
- Ser conciso pero claro

## 5. AUTOMATIZAR con toda la información

Solo después de tener todas las clarificaciones:

1. **EXTENDER o CREAR POMs** (seguir la skill `qa-pom-authoring` — "Extender, nunca romper")
2. **ESCRIBIR el spec** en `tests/<area>/` (seguir la skill `qa-spec-conventions`)
3. **ACTUALIZAR documentación**: `docs/coverage-register.md` y `docs/app-map.md`

## 6. DOCUMENTAR aprendizajes (después de completar la automatización)

> 🔗 El ciclo completo de aprendizaje (qué documentar, cuándo promover a regla) vive en la skill `qa-continuous-learning`.

### A) Documentar en `lecciones-aprendidas.md`:

Si durante el proceso encontré:
- **Preguntas que se repiten entre HUs** → Agregar a sección "Preguntas recurrentes"
- **Problemas específicos del ambiente/datos** → Documentar en sección "Ambiente y datos de prueba"
- **Patrones de código útiles** → Documentar en sección "POMs y patrones de código"
- **Decisiones de automatización importantes** → Documentar con justificación

**IMPORTANTE**: Si la misma pregunta aparece en 2+ HUs diferentes, es una pregunta recurrente que merece:
1. Documentación en lecciones-aprendidas.md
2. Considerar mejora en la plantilla de HUs
3. Agregar ejemplo/guía en guia-casos-automatizacion.md si aplica

### B) Actualizar `conocimiento-sistema.md`:

**Cuándo actualizar**:
- ✅ **Después de explorar con MCP** una página/funcionalidad nueva o poco documentada
- ✅ **Al automatizar una HU** que revela reglas de negocio, validaciones, o comportamientos
- ✅ **Durante mantenimiento** si descubro que cambió el comportamiento del sistema
- ✅ **Al responder preguntas del usuario** sobre funcionalidades del sistema

**Qué documentar**:
1. **Funcionalidades disponibles** - Qué puede hacer el usuario en esa página
2. **Reglas de negocio descubiertas** - Validaciones, límites, comportamientos obligatorios
3. **Estados y transiciones** - Flujos de estado de entidades (Borrador→Activo→Inactivo)
4. **Validaciones UI exactas** - Mensajes de error/éxito con texto exacto
5. **Permisos/roles** - Quién puede hacer qué
6. **Limitaciones conocidas** - Bugs, edge cases, comportamientos inesperados

**Ejemplo de actualización después de una HU de creación de entidad**:
```markdown
## Módulo: <Nombre del módulo>

### Página: Listado de <entidad>

**Reglas de negocio**:
1. Nombre único - No puede haber 2 <entidad> con el mismo nombre ✅ AGREGADO
2. Nombre válido - Min 3 caracteres, sin caracteres especiales ✅ AGREGADO
3. Usuario sin <entidad> - Muestra estado vacío ✅ AGREGADO

**Validaciones UI (Modal de creación)**: ✅ SECCIÓN NUEVA
| Caso | Mensaje exacto | Comportamiento |
|------|----------------|----------------|
| Nombre vacío | "Este campo es obligatorio" | Borde rojo, botón deshabilitado |
...

**Última actualización**: YYYY-MM-DD (<ID de la HU>) ✅ ACTUALIZADO
```

**IMPORTANTE**: Mantener la sección "Última actualización" con fecha y HU/spec que generó el conocimiento

---

## Beneficios de este enfoque

✅ **Inteligente**: Preguntas contextuales basadas en gaps reales, no genéricas
✅ **Eficiente**: No hace preguntas innecesarias ni duplica trabajo existente
✅ **Aprendizaje**: Usa HUs previas y POMs existentes como referencia
✅ **Sin bloqueos silenciosos**: Garantiza claridad antes y durante la automatización
✅ **Trazabilidad**: El proceso de Q&A queda documentado en el chat
✅ **Mantenibilidad**: Código extendido, no duplicado — fácil de mantener
