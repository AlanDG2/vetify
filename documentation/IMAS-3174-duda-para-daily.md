# ✅ RESUELTO — IMAS-3174 (era duda para la daily)

> **Actualización**: esta duda ya se validó. Se revisó el video adjunto al comentario de la HU y se confirmó que fue **un error de redacción** del comentario. **Vale lo que dice Figma**: en el flujo de 1 sola mascota **NO** hay pantalla de selección de mascota, se va directo a "Motivo de la consulta". Se deja el documento completo abajo como registro de la validación.

---

## ¿De qué HU hablamos?

**[IMAS-3174](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3174)** — *"Rediseño Solicitud de Turno x 1 mascota (sin turno previo)"*

Es el flujo de pedir una videollamada para un tutor que **tiene una sola mascota** cargada.

---

## ¿Cuál es el problema?

Hay **dos fuentes que se contradicen** sobre qué pantalla debería aparecer primero.

### 🎨 Lo que dice el diseño (Figma) + el propio título de la HU

Como el tutor tiene **una sola mascota**, no hace falta preguntarle cuál es — el sistema ya sabe cuál es y **arranca directo en la pantalla de "Motivo de la consulta"**.

(Esto es distinto al caso de un tutor con **varias** mascotas, HU [IMAS-3889](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3889), donde ahí sí aparece una pantalla para elegir cuál mascota).

### 💬 Lo que dice el comentario de validación de la propia HU IMAS-3174

Paula Scalzo escribió, textual, en el comentario de esa HU:

> *"Debe aparecer una **pantalla previa** a la pantalla de 'motivo' en la cual se elija **la mascota**... En la pantalla para confirmar el turno debe poder **editarse la mascota elegida**."*

O sea: el comentario dice que **sí aparece** una pantalla para elegir mascota, incluso con una sola mascota. Eso choca con lo que dice el diseño y el título de la HU.

---

## ¿Por qué importa esto?

Porque estamos por escribir los casos de prueba / automatizar este flujo, y necesitamos saber **con certeza** cuál de las dos cosas es la correcta antes de dar por bueno un comportamiento:

- Si armamos el test asumiendo que **no** hay pantalla de selección (como dice el diseño)... y en realidad **sí la hay** → el test va a fallar apenas se corra, o peor, puede quedar mal armado sin que nadie lo note hasta más tarde.
- Si armamos el test asumiendo que **sí** hay pantalla de selección... y en realidad **no la hay** → mismo problema, al revés.

No queremos adivinar. Mejor preguntar una vez y quedar tranquilos.

---

## Posibles explicaciones (ninguna confirmada todavía)

| # | Explicación posible | ¿Qué haríamos si es esta? |
|---|---|---|
| 1 | El comentario se **copió y pegó por error** desde la HU de multi-mascota (IMAS-3889) | Ignoramos ese comentario, seguimos el diseño: sin pantalla de selección para 1 mascota |
| 2 | El alcance **cambió de verdad** y ahora incluso con 1 sola mascota se muestra una pantalla (aunque sea solo para confirmar, no para "elegir" entre varias) | Ajustamos el mapeo y los casos de prueba para incluir esa pantalla también en el flujo de 1 mascota |

---

## 👉 Conclusión (validado)

**Explicación #1 confirmada**: el comentario de validación de IMAS-3174 fue un error de redacción — copió texto pensado para el flujo multi-mascota (IMAS-3889). El video adjunto al mismo comentario muestra el flujo real, que **coincide con Figma**: sin pantalla de selección de mascota para el caso de 1 sola mascota, va directo a "Motivo de la consulta".

**Acción tomada**: se ignora ese comentario para el diseño de casos de prueba de esta HU. El mapeo (`documentation/Videollamada-Nuevo-Flujo-Figma-Mapeo.md`, §0 y §16) fue actualizado marcando este punto como resuelto — ya no es un bloqueante para escribir los casos de prueba de IMAS-3174.
