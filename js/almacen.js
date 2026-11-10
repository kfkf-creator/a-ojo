import { sumarDias } from './fechas.js';

const CLAVE = 'aojo.v1';

// Racha = días consecutivos con el reto diario resuelto EL MISMO día (practicar en el archivo no cuenta).
export function calcularRacha(dias, hoy) {
  const set = new Set(dias);
  let actual = 0;
  let d = set.has(hoy) ? hoy : sumarDias(hoy, -1);
  while (set.has(d)) { actual++; d = sumarDias(d, -1); }
  let mejor = 0;
  for (const dia of set) {
    if (set.has(sumarDias(dia, -1))) continue;
    let n = 0, x = dia;
    while (set.has(x)) { n++; x = sumarDias(x, 1); }
    mejor = Math.max(mejor, n);
  }
  return { actual, mejor };
}

export function crearAlmacen(storage) {
  let persistente = true;
  let memoria = null;

  function leer() {
    try {
      const crudo = storage.getItem(CLAVE);
      const e = crudo ? JSON.parse(crudo) : null;
      if (e && e.v === 1 && e.jugadas && e.borradores) return e;
    } catch { persistente = false; }
    return memoria || { v: 1, jugadas: {}, borradores: {} };
  }
  function escribir(e) {
    memoria = e;
    try { storage.setItem(CLAVE, JSON.stringify(e)); } catch { persistente = false; }
  }

  return {
    get persistente() { return persistente; },
    borrador: (id) => leer().borradores[id] || { texto: '', calculo: '' },
    guardarBorrador(id, parte) {
      const e = leer();
      e.borradores[id] = { ...(e.borradores[id] || { texto: '', calculo: '' }), ...parte };
      escribir(e);
    },
    jugada: (id) => leer().jugadas[id] || null,
    // Un único intento: si ya existe, no se sobrescribe.
    registrar(id, jugada) {
      const e = leer();
      if (e.jugadas[id]) return false;
      e.jugadas[id] = jugada;
      delete e.borradores[id];
      escribir(e);
      return true;
    },
    todas: () => leer().jugadas,
    estadisticas(hoy) {
      const js = Object.values(leer().jugadas);
      const diarias = js.filter((j) => j.modo === 'diario').map((j) => j.fechaReto);
      const racha = calcularRacha(diarias, hoy);
      const media = js.length ? Math.round(js.reduce((s, j) => s + j.puntuacion, 0) / js.length) : null;
      return { ...racha, jugadas: js.length, media, diarias: diarias.length };
    },
  };
}
