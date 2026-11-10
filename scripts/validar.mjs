// Uso: node scripts/validar.mjs   (sale con código 1 si hay errores)
import { readFileSync } from 'node:fs';
import { validarBanco } from '../js/validacion.js';
import { hoyMadrid } from '../js/fechas.js';

const retos = JSON.parse(readFileSync(new URL('../data/retos.json', import.meta.url), 'utf8'));
const { resultado, global, avisos } = validarBanco(retos, hoyMadrid());

let fallos = global.length;
global.forEach((m) => console.error(`✗ banco: ${m}`));
for (const r of resultado) {
  r.errores.forEach((m) => { fallos++; console.error(`✗ ${r.id}: ${m}`); });
  r.avisos.forEach((m) => console.warn(`! ${r.id}: ${m}`));
}
avisos.forEach((m) => console.warn(`! ${m}`));

const por = (k) => retos.reduce((a, r) => ({ ...a, [r[k]]: (a[r[k]] || 0) + 1 }), {});
console.log(`${retos.length} retos · tipos ${JSON.stringify(por('tipo'))} · estado de las fuentes ${JSON.stringify(por('estado'))}`);
console.log(fallos ? `${fallos} error(es)` : 'Banco válido ✓');
process.exit(fallos ? 1 : 0);
