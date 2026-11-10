// Calculadora de la partida: + − × ÷ ( ) ^ con coma decimal.
// Devuelve { ok: true, valor } o { ok: false, motivo }.

function numero(t) {
  if (t.includes(',')) {
    if ((t.match(/,/g) || []).length > 1) return NaN;
    return Number(t.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number(t); // «1.5» o «25»: el punto es decimal
}

function tokenizar(texto) {
  const toks = [];
  const re = /\s*(?:([\d.,]+)|([-+*/×÷x^()−]))/gy;
  let m;
  let pos = 0;
  const s = texto.trim();
  re.lastIndex = 0;
  while (pos < s.length) {
    re.lastIndex = pos;
    m = re.exec(s);
    if (!m) throw new Error('Hay un carácter que no entiendo.');
    if (m[1] !== undefined) {
      const v = numero(m[1]);
      if (!Number.isFinite(v)) throw new Error(`«${m[1]}» no es un número válido.`);
      toks.push({ n: v });
    } else {
      toks.push({ o: { '×': '*', 'x': '*', '÷': '/', '−': '-' }[m[2]] || m[2] });
    }
    pos = re.lastIndex;
  }
  return toks;
}

export function calcular(texto) {
  if (!String(texto).trim()) return { ok: false, vacio: true, motivo: 'Escribe una operación.' };
  try {
    const t = tokenizar(texto);
    let i = 0;
    const op = () => t[i]?.o;
    const suma = () => {
      let v = prod();
      while (op() === '+' || op() === '-') { const o = t[i++].o; const w = prod(); v = o === '+' ? v + w : v - w; }
      return v;
    };
    const prod = () => {
      let v = unario();
      while (op() === '*' || op() === '/') {
        const o = t[i++].o;
        const w = unario();
        if (o === '/' && w === 0) throw new Error('No se puede dividir entre cero.');
        v = o === '*' ? v * w : v / w;
      }
      return v;
    };
    const unario = () => {
      if (op() === '-') { i++; return -unario(); }
      if (op() === '+') { i++; return unario(); }
      return pot();
    };
    const pot = () => {
      const b = atomo();
      if (op() === '^') { i++; return b ** unario(); }
      return b;
    };
    const atomo = () => {
      const x = t[i];
      if (!x) throw new Error('Falta un número al final.');
      if (x.n !== undefined) { i++; return x.n; }
      if (x.o === '(') {
        i++;
        const v = suma();
        if (op() !== ')') throw new Error('Falta cerrar un paréntesis.');
        i++;
        return v;
      }
      throw new Error('Falta un número.');
    };
    const valor = suma();
    if (i < t.length) throw new Error(t[i].o === ')' ? 'Sobra un paréntesis.' : 'Revisa la operación.');
    if (!Number.isFinite(valor)) throw new Error('El resultado es demasiado grande.');
    return { ok: true, valor };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}
