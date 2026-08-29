Jira: [IMAS-4450](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4450) — creado 2026-08-26, tipo Error, linkeado con "Blocks" a `IMAS-3610`, estado Backlog. **Actualizado el mismo día**, más tarde: el alcance real es mayor al reportado originalmente — ver adenda al final de este archivo.

## Adenda 2026-08-26 (tarde) — el gap es más profundo: cantidad base también incorrecta, no solo el tope

Comparando contra el componente real de Figma ("Vetify Premium", página "Landing conversion", `Seccion cuadro cobertura/Emergencias/Desplegado`, nodo `10302:28307`): la fila "Diagnóstico por imagen y estudios cardiológicos" para el plan Emergencias especifica **"6 por año"**, tope **"$35.000 c/u"**, **"Fuera de la red"**, **"Servicio activo a partir de los 60 días"**. La UI en QA muestra únicamente **"1 por año"**, sin tope ni ninguna otra aclaración.

No es solo que faltara agregar el tope (lo ya reportado originalmente) — **la cantidad base tampoco coincide con el diseño** (1 vs. 6). No confirmado si "1 por año" fue una decisión de negocio posterior nunca reflejada en ese componente de Figma, o si el gap de implementación es más profundo — recomendado confirmar con diseño/producto antes de estimar el fix. Campo "Descripción del error" de Jira y comentario actualizados en `IMAS-4450` con este detalle.

[Título]: BUG | Landing Salud Mascotas: plan Emergencias, fila "Diagnóstico por imagen" sin tope fuera de cartilla
[Severidad]: Bajo-Medio — no bloquea ningún flujo funcional (la landing y el checkout funcionan normal), es información de cobertura incompleta para el visitante que compara planes antes de contratar.
[Categoría]: Frontend / Contenido
[HU relacionada]: IMAS-3610 (Landing de Performance de Conversión B2C) — una de las correcciones pedidas en el mail de feedback de diseño del 25/8 (adjunto a la HU), aplicada en las demás filas pero no en esta.

[Información del entorno]:
- Ambiente: QA — `https://qa.vetify.com.ar/salud-mascotas`
- Fecha de detección y confirmación: 2026-08-26

[Descripción]:
El mail de correcciones del 25/8 pidió agregar el tope "por fuera de la cartilla" a varias filas del cuadro comparativo de coberturas, entre ellas "Diagnóstico por imagen: le falta el tope por fuera de la cartilla al plan emergencias y classic". La corrección se aplicó en Classic (y en Premium) — ambos ya muestran "Con tope de $35.000. Activo a partir de los 60 días." — pero **no se aplicó en el plan Emergencias**, que sigue mostrando solo "1 por año" sin ningún tope.

El resto de las filas corregidas en el mismo mail (Vacunación, Desparasitaciones, Intervención quirúrgica, Especialidades) sí quedaron con el tope agregado en las 3 columnas correspondientes — este es el único caso donde la corrección quedó aplicada de forma parcial (2 de 3 planes).

[Pasos para reproducir]:
1. Ir a `https://qa.vetify.com.ar/salud-mascotas`.
2. Bajar hasta "Conocé lo que incluye cada plan" (el switch "Ampliar detalles" viene expandido por default).
3. Buscar la fila "Diagnósticos por imagen y estudios cardiológicos".
4. Comparar la columna Emergencias contra Classic y Premium.

[Resultado esperado]:
Las 3 columnas deberían mostrar el tope "por fuera de la cartilla", igual que ya lo muestran Classic y Premium.

[Resultado actual]:
Emergencias muestra únicamente "1 por año", sin ningún texto de tope — inconsistente con las otras 2 columnas de la misma fila, y con el resto de las filas que sí se corrigieron en el mismo mail.

[Notas adicionales]:
- Es la única fila de la corrección del mail del 25/8 que quedó sin aplicar completamente — las demás (Vacunación, Desparasitaciones, Intervención quirúrgica en Emergencias, Especialidades) sí se corrigieron en las columnas correspondientes.
- Encontrado durante la verificación de correcciones pendientes de IMAS-3610, validado en vivo por el usuario del proyecto antes de reportar.
- Ver `docs/user-stories/IMAS-3610-landing-performance-conversion-b2c.md` para el checklist completo de correcciones verificadas.
