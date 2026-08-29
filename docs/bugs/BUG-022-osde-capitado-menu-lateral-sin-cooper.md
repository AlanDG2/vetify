Jira: creado 2026-08-27, tipo Error, linkeado con "Blocks" a IMAS-4356.

[Título]: BUG | OSDE Capitado: menú lateral no muestra "Cooper" tras remover "Vetify PLUS"
[Severidad]: Medio — no bloquea ningún flujo funcional, pero el usuario OSDE pierde el único punto de acceso persistente al beneficio de Cooper fuera del banner de Home.
[Categoría]: Divergencia HU vs UI (IMAS-4356, banner Cooper OSDE — menú lateral)
[HU relacionada]: IMAS-4356

[Información del entorno]:
- Ambiente: QA — `https://vetify-qa.ikeapp.com`
- Usuario: OSDE Capitado real del pool, perfil completo (`user_1783951005615@automation.com`, tags `ACTIVE`/`WITH_PET`/`NO_EMPTY_PLAN`)
- Fecha de detección: 2026-08-26/27, confirmado como bug por la PO el 2026-08-27

[Descripción]:
IMAS-4356 pide reemplazar las referencias a "Vetify PLUS" por un beneficio de Cooper específico para clientes OSDE. En el banner de Home esto está implementado correctamente (banner "Cooper", 20% off primer servicio, botón "Ir a Cooper" que abre `cooperpetcare.app`). Pero en el menú lateral ("Más" → sección "Cuenta"), la entrada "Vetify PLUS" fue removida sin ser reemplazada por ninguna entrada de "Cooper" — la sección quedó con 3 ítems (Perfil, Mascotas, Planes y coberturas) en vez de 4.

Esto había quedado documentado como pregunta abierta (sin fuente escrita que confirmara cuál era el comportamiento esperado) en `docs/user-stories/IMAS-4356-banner-cooper-webapp-osde.md` (CP03). La PO confirmó directamente (2026-08-27, vía el usuario del proyecto): *"Si este usuario es osde, no tiene q ver nada de vetify plus... En osde en el menu hamburguesa tiene q decir cooper"* — con esto queda confirmado como bug real, no como comportamiento esperado.

[Pasos para reproducir]:
1. Ir a `https://vetify-qa.ikeapp.com`.
2. Iniciar sesión con un usuario OSDE Capitado de perfil completo (`user_1783951005615@automation.com`).
3. Confirmar en Home que el banner de Cooper se ve bien (control, no es parte del bug).
4. Tocar "Más" en la barra de navegación inferior.
5. Mirar la sección "Cuenta" del menú.

[Resultado esperado]:
La sección "Cuenta" del menú muestra una entrada "Cooper" (según lo confirmado por la PO).

[Resultado actual]:
La sección "Cuenta" solo muestra Perfil / Mascotas / Planes y coberturas — sin ninguna entrada de Cooper ni de Vetify PLUS.

[Notas adicionales]:
- Ver `docs/user-stories/IMAS-4356-banner-cooper-webapp-osde.md` y `.tests.md` (CP03) para el contexto completo de la HU.
- El banner de Home y el destino del botón "Ir a Cooper" (`cooperpetcare.app/?referral_code=VTFY-2026`) ya están correctos — el bug es específicamente sobre la entrada faltante en el menú lateral.
