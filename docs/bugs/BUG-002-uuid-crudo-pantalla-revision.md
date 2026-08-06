[Título]: ⚠️ NO CONFIRMADO — Posible desajuste petId en formulario, probablemente contaminación de datos de prueba, no bug de producto

[Estado]: **RETRACTADO / EN DUDA (2026-08-04)** — no reportar en Jira todavía. Ver "Corrección" abajo.

[Severidad]: N/A hasta re-confirmar con una cuenta limpia.

[Categoría]: Posible bug de datos / Estado de frontend — pendiente de descartar contaminación de test data.

[HU relacionada]: IMAS-3174 (CA06), IMAS-3889 (CA08), epic IMAS-2877

[Corrección 2026-08-04]:
Este reporte se armó originalmente con **alta confianza** ("Confirmado en 4 corridas distintas") pero **todas esas corridas usaron la misma cuenta reutilizada** (`user_1782309368512@automation.com`), sobre la que se corrió repetidamente en la misma sesión: el spec automatizado (`TS-02 TC-01`, que agenda y cancela turnos en un `beforeEach`), múltiples exploraciones manuales, y cambios de estado del formulario. Nunca se probó con una cuenta "limpia" independiente.

El usuario del proyecto reprodujo los mismos pasos con su propia cuenta y **el bug NO apareció**: el bloque "Mascota" mostró correctamente "Kira", y en `sessionStorage` (`serviceQuestionForm:493`) el `itemId` y el `answer` del campo `petId` **coincidían exactamente** (`"4dd77165-6396-4407-9954-2006bfc22586"` ambos).

Esto contradice directamente la "causa raíz confirmada" que se había documentado (desajuste `itemId` ≠ `answer`). La explicación más probable ahora es que el desajuste observado en `user_1782309368512` fue **contaminación de datos** causada por las propias pruebas repetidas de esta sesión sobre esa cuenta compartida — no un bug reproducible de forma independiente.

[Cómo re-confirmar antes de reportar]:
1. Usar una cuenta que **no** haya sido tocada por testing automatizado/manual repetido en esta sesión (evitar `user_1782309368512@automation.com` hasta limpiar su estado).
2. Repetir los pasos de reproducción originales (ver abajo) con esa cuenta limpia.
3. Si el bloque "Mascota" muestra el nombre correctamente y `itemId === answer` en `sessionStorage`, el hallazgo se descarta — no había bug de producto, era contaminación de datos de prueba de este mismo proceso de validación.
4. Si en cambio SÍ se reproduce con una cuenta que nadie tocó de forma repetida, recién ahí se recupera este reporte y se re-arma con severidad confirmada.

[Pasos de reproducción originales, para referencia]:
1. Loguearse con un usuario con una única mascota, credencial vigente.
2. Iniciar una solicitud de videollamada ("Agendar nueva videollamada").
3. En el paso "Seleccioná el motivo de tu consulta", observar el bloque "Mascota".
4. Abrir devtools → Application/Storage → Session Storage → key `serviceQuestionForm:493` → comparar `items[].itemId` vs `answer` del objeto con `questionId: "petId"`.

[Notas adicionales]:
- Lección de proceso: al reutilizar una única cuenta de test para múltiples corridas de exploración + automatización en la misma sesión, no se puede diferenciar "bug real" de "estado contaminado por mis propias pruebas anteriores" sin una cuenta de control limpia. Para el próximo hallazgo de este tipo, confirmar siempre con al menos 2 cuentas independientes (una no tocada) antes de escribir "confirmado".
- No se creó el Defect en Jira — correctamente, dado que no está confirmado.
