// Lectura y formato de números en español: «1.500» = 1500, «2,5» = 2,5.

const MAX = 1e18;

export function formatear(n, maxDec = 3) {
  if (!Number.isFinite(n)) return '—';
  const s = Math.abs(n).toFixed(maxDec);
  let [ent, dec = ''] = s.split('.');
  dec = dec.replace(/0+$/, '');
  ent = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '−' : '') + ent + (dec ? ',' + dec : '');
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export function potencia10(k) {
  return '10' + String(k).split('').map((c) => SUP[c]).join('');
}

// «2,5 millones», «3 mil millones»… (null si el número es pequeño)
export function enPalabras(n) {
  const tramos = [
    [1e12, 'billón', 'billones'],
    [1e9, 'mil millones', 'mil millones'],
    [1e6, 'millón', 'millones'],
    [1e4, 'mil', 'mil'],
  ];
  for (const [base, sing, plur] of tramos) {
    if (n >= base) {
      const x = Math.round((n / base) * 100) / 100;
      return `${formatear(x, 2)} ${x === 1 ? sing : plur}`;
    }
  }
  return null;
}

const ERR = (motivo, extra = {}) => ({ ok: false, motivo, ...extra });

export function analizar(texto) {
  let t = String(texto ?? '').replace(/[  ]/g, ' ').trim();
  if (!t) return ERR('Escribe un número.', { vacio: true });

  const ci = t.match(/^(\d+(?:,\d+)?)\s*[eE]\s*(\d{1,2})$/);
  if (ci) return resultado(parseFloat(ci[1].replace(',', '.')) * 10 ** Number(ci[2]));

  if (/^\d{1,3}( \d{3})+(,\d+)?$/.test(t)) t = t.replace(/ /g, '');
  if (!/^[\d.,]+$/.test(t)) return ERR('Usa solo cifras, puntos para los miles y coma para los decimales.');
  if (/^[.,]|[.,]$/.test(t)) return ERR('Revisa los separadores: el número no puede empezar ni acabar en punto o coma.');

  const comas = (t.match(/,/g) || []).length;
  if (comas > 1) return ERR('Solo puede haber una coma decimal.');
  const [ent, dec] = t.split(',');
  const miles = /^[1-9]\d{0,2}(\.\d{3})+$/;

  if (comas === 1) {
    if (!/^\d+$/.test(ent) && !miles.test(ent)) {
      return ERR('Los puntos deben separar grupos de tres cifras (1.500, no 1.50).');
    }
    return resultado(parseFloat(ent.replace(/\./g, '') + '.' + dec));
  }
  if (t.includes('.')) {
    if (miles.test(t)) return resultado(parseInt(t.replace(/\./g, ''), 10), { puntoMiles: true });
    return ERR(`«${t}» es ambiguo. En español los decimales llevan coma (2,5) y el punto separa miles (1.500).`, { ambiguo: true });
  }
  return resultado(parseInt(t, 10));
}

function resultado(valor, extra = {}) {
  if (!Number.isFinite(valor)) return ERR('No he podido leer ese número.');
  if (valor <= 0) return ERR('La estimación debe ser mayor que cero.');
  if (valor > MAX) return ERR('Ese número es demasiado grande.');
  return { ok: true, valor, ...extra };
}

// Aplica un multiplicador (×1.000, ×1.000.000) al texto del campo; null si no es válido.
export function multiplicar(texto, factor) {
  const r = analizar(texto);
  if (!r.ok) return null;
  const v = r.valor * factor;
  return v > MAX ? null : formatear(Math.round(v * 1e6) / 1e6, 6);
}
