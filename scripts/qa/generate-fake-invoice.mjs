#!/usr/bin/env node
// Genera una factura sintética (PNG) para pruebas manuales/E2E de Reintegros.
// Uso:
//   node scripts/qa/generate-fake-invoice.mjs
//   node scripts/qa/generate-fake-invoice.mjs --monto 250 --prestador "Otra Veterinaria" --out mi-factura.png
//
// Por default genera un numero de comprobante y CUIT distintos en cada corrida,
// para no chocar con el check de "comprobante duplicado" (mismo CUIT + numero de factura).

import sharp from 'sharp';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (key) args[key] = argv[i + 1];
  }
  return args;
}

function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function cuitChecksum(base10) {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = base10.split('').reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
  const mod = 11 - (sum % 11);
  return mod === 11 ? 0 : mod === 10 ? 9 : mod;
}

function randomCuit() {
  const tipo = '30';
  const nro = randomDigits(8);
  const base = tipo + nro;
  const check = cuitChecksum(base);
  return `${tipo}-${nro}-${check}`;
}

const args = parseArgs(process.argv.slice(2));

const cuit = args.cuit || randomCuit();
const comprobante = args.comprobante || String(Date.now()).slice(-8).padStart(8, '0');
const puntoVenta = args.puntoVenta || '0001';
const monto = args.monto || String(Math.floor(Math.random() * 900) + 100);
const prestador = args.prestador || 'Clinica Veterinaria QA';
const concepto = args.concepto || 'Consulta veterinaria';
const tipoComprobante = args.tipo || 'C';
const fecha = args.fecha || new Date().toLocaleDateString('es-AR');
const outPath = args.out
  ? path.resolve(args.out)
  : path.resolve('.playwright-mcp', `factura-qa-${Date.now()}.png`);

const svg = `
<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="40" y="60" font-size="28" font-family="Arial" font-weight="bold">FACTURA ${tipoComprobante}</text>
  <text x="40" y="110" font-size="18" font-family="Arial">${prestador}</text>
  <text x="40" y="140" font-size="16" font-family="Arial">CUIT: ${cuit}</text>
  <text x="40" y="180" font-size="16" font-family="Arial">Punto de Venta: ${puntoVenta}</text>
  <text x="40" y="210" font-size="16" font-family="Arial">Comp. Nro: ${comprobante}</text>
  <text x="40" y="240" font-size="16" font-family="Arial">Fecha: ${fecha}</text>
  <text x="40" y="300" font-size="16" font-family="Arial">Concepto: ${concepto}</text>
  <text x="40" y="360" font-size="22" font-family="Arial" font-weight="bold">Importe Total: $ ${monto},00</text>
</svg>
`;

await sharp(Buffer.from(svg)).png().toFile(outPath);

console.log('Factura generada:', outPath);
console.log({ cuit, puntoVenta, comprobante, monto, prestador, concepto, tipoComprobante, fecha });
