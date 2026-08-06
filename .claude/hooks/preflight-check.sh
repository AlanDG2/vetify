#!/bin/bash
# Hook UserPromptSubmit — inyecta el recordatorio del DoD compuesto antes de cada respuesta.
# DoD final = core/dod/dod-core.md (5 universales) + el dod-ticket.md del adaptador activo.

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

cat << 'EOF'

═══════════════════════════════════════════════════════════════════════
🚨 PRE-FLIGHT — Definition of Done
═══════════════════════════════════════════════════════════════════════

Antes de declarar una HU "lista / al 100%", verificar el DoD compuesto:
los 5 criterios universales (core) + los del adaptador de tickets activo.

5 universales: (1) cada CA mapea a ≥1 test; (2) pasos completos
(Acción+Datos+Resultado); (3) idioma del proyecto; (4) 0 duplicados;
(5) re-ejecutados y pasando en esta sesión.

Regla dura: si falta CUALQUIER criterio aplicable → la HU NO está al 100%.
Es "casi 100%" o "no cumple". NUNCA inflar el estado.
EOF

# Detectar el adaptador activo y mostrar sus criterios de ticket (si los hay)
ACTIVE_DOD=""
for cfg in "$ROOT"/adapters/*/adapter.config.json; do
  [ -f "$cfg" ] || continue
  if grep -q '"active"[[:space:]]*:[[:space:]]*true' "$cfg" 2>/dev/null; then
    dir="$(dirname "$cfg")"
    name="$(basename "$dir")"
    if [ -f "$dir/dod-ticket.md" ] && grep -qvE '^\s*(<!--|$)' "$dir/dod-ticket.md" 2>/dev/null; then
      echo ""
      echo "── Criterios extra del adaptador activo: $name ──"
      grep -E '^[0-9]+\.' "$dir/dod-ticket.md" 2>/dev/null
      ACTIVE_DOD="$name"
    fi
  fi
done

if [ -z "$ACTIVE_DOD" ]; then
  echo ""
  echo "Adaptador de tickets: ninguno con criterios extra (DoD = los 5 universales)."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
