// Evaluador aritmético seguro para las explicaciones de los retos.
import { formatear } from './numeros.js';

const TOKEN = /\s*(\d+(?:\.\d+)?|[A-Za-z_]\w*|\*\*|[-+*/()])/y;

function tokenizar(expr) {
  const out = [];
  let pos = 0;
  while (pos < expr.length) {
    if (expr.slice(pos).trim() === '') break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(expr);
    if (!m) throw new Error(`Carácter no permitido en «${expr}»`);
    out.push(m[1]);
    pos = TOKEN.lastIndex;
  }
  return out;
}

export function evaluar(expr, vars = {}) {
  const toks = tokenizar(expr);
  for (const t of toks) {
    if (/^[A-Za-z_]/.test(t) && t !== 'floor' && !(t in vars)) throw new Error(`Variable desconocida «${t}»`);
  }
  const f = new Function(...Object.keys(vars), 'floor', `"use strict"; return (${toks.join(' ')});`);
  return f(...Object.values(vars), Math.floor);
}

export function operacionLegible(expr, vars = {}) {
  const toks = tokenizar(expr);
  const pila = [];
  let s = '';
  for (const t of toks) {
    if (t === 'floor') { pila.push('floor?'); continue; }
    if (t === '(') {
      if (pila[pila.length - 1] === 'floor?') { pila[pila.length - 1] = '⌋'; s += '⌊'; } else { pila.push(')'); s += '('; }
    } else if (t === ')') s += pila.pop() ?? ')';
    else if (t === '*') s += ' × ';
    else if (t === '/') s += ' ÷ ';
    else if (t === '+') s += ' + ';
    else if (t === '-') s += ' − ';
    else if (t === '**') s += '^';
    else if (/^[A-Za-z_]/.test(t)) s += formatear(vars[t], 6);
    else s += formatear(Number(t), 6);
  }
  return s;
}

export function varsHasta(reto, n) {
  const vars = {};
  reto.pasos.slice(0, n).forEach((p) => { if (p.var) vars[p.var] = p.valor; });
  return vars;
}

// Recorre los pasos de un reto y devuelve la lista de errores de coherencia.
export function comprobarPasos(reto) {
  const errores = [];
  const vars = {};
  const tol = reto.tipo === 'exacto' ? 1e-4 : 1e-3;
  reto.pasos.forEach((p, i) => {
    const etq = `paso ${i + 1}`;
    if (p.expr) {
      let v;
      try { v = evaluar(p.expr, vars); } catch (e) { errores.push(`${etq}: ${e.message}`); return; }
      if (typeof p.valor !== 'number' || Math.abs(v - p.valor) > tol * Math.abs(p.valor)) {
        errores.push(`${etq}: «${p.expr}» da ${v}, pero valor=${p.valor}`);
      }
    }
    if (p.var) {
      if (typeof p.valor !== 'number') errores.push(`${etq}: la variable ${p.var} no tiene valor`);
      else vars[p.var] = p.valor;
    }
  });
  const ult = reto.pasos[reto.pasos.length - 1];
  if (!ult || !ult.expr) errores.push('el último paso debe ser un cálculo con expr');
  else if (Math.abs(ult.valor - reto.referencia) > tol * reto.referencia) {
    errores.push(`el último paso (${ult.valor}) no coincide con la referencia (${reto.referencia})`);
  }
  return errores;
}
