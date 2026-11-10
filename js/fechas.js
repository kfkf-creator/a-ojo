// Todo el juego se rige por la fecha civil de Madrid (Europe/Madrid).
const TZ = 'Europe/Madrid';
const partes = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export function hoyMadrid(ahora = new Date()) {
  const p = Object.fromEntries(partes.formatToParts(ahora).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

// Milisegundos hasta el primer instante en que la fecha de Madrid cambia.
export function msHastaMedianoche(ahora = new Date()) {
  const base = hoyMadrid(ahora);
  let lo = ahora.getTime();
  let hi = lo + 26 * 3600e3;
  while (hi - lo > 100) {
    const mid = Math.floor((lo + hi) / 2);
    if (hoyMadrid(new Date(mid)) === base) lo = mid; else hi = mid;
  }
  return hi - ahora.getTime();
}

export function utc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function sumarDias(iso, n) {
  return new Date(utc(iso).getTime() + n * 86400e3).toISOString().slice(0, 10);
}

export function esFechaValida(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && utc(iso).toISOString().slice(0, 10) === iso;
}

export function fechaLarga(iso) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(utc(iso));
}

export function fechaCorta(iso) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(utc(iso));
}

export function cuentaAtras(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const x = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${x}`;
}
