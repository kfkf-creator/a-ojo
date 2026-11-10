// Validador del banco de retos. Devuelve { errores, avisos } por reto.
import { comprobarPasos } from './calc.js';
import { esFechaValida } from './fechas.js';

const TIPOS = ['estimacion', 'exacto'];
const PASOS = ['dato', 'supuesto', 'enunciado', 'calculo'];
const ESTADOS = ['verificado', 'secundaria', 'calculado', 'pendiente'];

export function validarReto(r) {
  const e = [];
  const av = [];
  const texto = (k, max) => {
    if (typeof r[k] !== 'string' || !r[k].trim()) e.push(`falta «${k}»`);
    else if (max && r[k].length > max) av.push(`«${k}» tiene ${r[k].length} caracteres (máx. recomendado ${max})`);
  };
  texto('id'); texto('enunciado', 260); texto('unidad', 40); texto('tema');
  if (!/^[a-z0-9-]+$/.test(r.id || '')) e.push('el id solo admite minúsculas, números y guiones');
  if (!esFechaValida(r.fecha)) e.push('fecha inválida (usa AAAA-MM-DD)');
  if (!TIPOS.includes(r.tipo)) e.push(`tipo debe ser ${TIPOS.join(' o ')}`);
  if (!ESTADOS.includes(r.estado)) e.push(`estado debe ser ${ESTADOS.join(', ')}`);
  if (!(r.referencia > 0)) e.push('la referencia debe ser un número positivo');
  if (!Array.isArray(r.condiciones) || r.condiciones.length > 3) e.push('condiciones: lista de 0 a 3 frases');
  if (!Number.isInteger(r.version) || r.version < 1) e.push('version debe ser un entero ≥ 1');
  if (!Array.isArray(r.historial)) e.push('historial debe ser una lista (vacía si no hay versiones previas)');
  else {
    r.historial.forEach((h) => {
      if (!h.version || h.version >= r.version || !(h.referencia > 0) || !Array.isArray(h.pasos)) {
        e.push('historial: cada entrada necesita version < actual, referencia y pasos');
      }
    });
  }

  if (!Array.isArray(r.pasos) || r.pasos.length < 2 || r.pasos.length > 4) {
    e.push('la explicación necesita entre 2 y 4 pasos');
  } else {
    r.pasos.forEach((p, i) => {
      if (!PASOS.includes(p.tipo)) e.push(`paso ${i + 1}: tipo desconocido «${p.tipo}»`);
      if (!p.texto) e.push(`paso ${i + 1}: falta texto`);
      if (p.tipo === 'calculo' && !p.expr) e.push(`paso ${i + 1}: un cálculo necesita expr`);
    });
    e.push(...comprobarPasos(r));
    if (r.tipo === 'estimacion' && !r.pasos.some((p) => p.tipo === 'supuesto' || p.tipo === 'dato')) {
      e.push('una estimación debe mostrar al menos un dato o un supuesto');
    }
    if (r.pasos.some((p) => p.tipo === 'dato') && !(r.fuentes || []).length) {
      e.push('hay datos consultados pero no hay fuentes');
    }
  }

  (r.fuentes || []).forEach((f, i) => {
    if (!f.titulo || !/^https?:\/\//.test(f.url || '') || !f.fecha) e.push(`fuente ${i + 1}: necesita titulo, url y fecha`);
  });

  if (r.tipo === 'estimacion') {
    if (!r.clave) e.push('una estimación necesita «clave» (el supuesto que más mueve la cifra)');
    if (r.rango) {
      const [lo, hi] = r.rango;
      if (!(lo > 0 && hi > lo)) e.push('rango: [bajo, alto] con 0 < bajo < alto');
      else if (r.referencia < lo || r.referencia > hi) e.push('la referencia queda fuera del rango plausible');
    } else av.push('estimación sin rango plausible');
  } else if (r.rango) {
    av.push('un problema exacto no necesita rango');
  }
  return { errores: e, avisos: av };
}

export function validarBanco(retos, hoy) {
  const resultado = retos.map((r) => ({ id: r.id, ...validarReto(r) }));
  const global = [];
  const dup = (campo) => {
    const vistos = new Set();
    retos.forEach((r) => {
      if (vistos.has(r[campo])) global.push(`${campo} duplicado: ${r[campo]}`);
      vistos.add(r[campo]);
    });
  };
  dup('id'); dup('fecha');
  const est = retos.filter((r) => r.tipo === 'estimacion').length;
  if (retos.length < 21) global.push(`hay ${retos.length} retos; el mínimo es 21`);
  if (est <= retos.length / 2) global.push('la mayoría de retos debe ser de estimación');
  const avisos = [];
  if (hoy) {
    const futuros = retos.filter((r) => r.fecha > hoy).length;
    if (futuros < 7) avisos.push(`solo quedan ${futuros} retos futuros: añade más antes de que se agote el calendario`);
  }
  return { resultado, global, avisos };
}
