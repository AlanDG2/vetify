#!/usr/bin/env node
// Valida que el control plane del proyecto esté completo y bien formado.
// Parametrizado: no asume ningún proyecto ni gestor concreto.
import fs from 'fs';

const required = [
  'CLAUDE.md',
  'AGENTS.md',
  'core/dod/dod-core.md',
  'qa-workspace/current-state.md',
  'qa-workspace/context-index.json',
];

const errors = [];
for (const f of required) {
  if (!fs.existsSync(f)) errors.push(`Falta archivo requerido: ${f}`);
  else if (fs.statSync(f).size === 0) errors.push(`Archivo vacío: ${f}`);
}

// context-index.json debe definir bootstrapOrder[]
try {
  const ci = JSON.parse(fs.readFileSync('qa-workspace/context-index.json', 'utf8'));
  if (!Array.isArray(ci.bootstrapOrder)) errors.push('context-index.json debe definir bootstrapOrder[]');
} catch (e) {
  errors.push(`context-index.json no es JSON válido: ${e.message}`);
}

// Debe haber un adaptador activo
import('fs').then(() => {
  const adapters = fs.existsSync('adapters') ? fs.readdirSync('adapters', { withFileTypes: true }).filter(d => d.isDirectory()) : [];
  let active = 0;
  for (const a of adapters) {
    const cfg = `adapters/${a.name}/adapter.config.json`;
    if (fs.existsSync(cfg)) {
      try { if (JSON.parse(fs.readFileSync(cfg, 'utf8')).active === true) active++; } catch {}
    }
  }
  if (adapters.length && active === 0) errors.push('Ningún adaptador marcado "active": true (debería estar al menos `none`).');
  if (active > 1) errors.push(`${active} adaptadores activos a la vez (debe ser exactamente 1).`);

  if (errors.length) { console.error('Validación del control plane FALLÓ:\n - ' + errors.join('\n - ')); process.exit(1); }
  console.log('Validación del control plane OK.');
});
