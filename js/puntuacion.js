import { formatear } from './numeros.js';

export function factor(estimacion, referencia) {
  return Math.max(estimacion / referencia, referencia / estimacion);
}

export function puntuar(estimacion, referencia) {
  if (!(estimacion > 0) || !(referencia > 0)) throw new RangeError('Se necesitan valores positivos');
  const f = factor(estimacion, referencia);
  const puntuacion = Math.round(100 * Math.max(0, 1 - Math.log10(f) / 2));
  return { factor: f, puntuacion, direccion: Math.sign(estimacion - referencia) };
}

export function veces(f) {
  if (f < 10) return formatear(Math.round(f * 10) / 10, 1);
  if (f < 1000) return formatear(Math.round(f), 0);
  const mag = 10 ** (Math.floor(Math.log10(f)) - 1);
  return 'unas ' + formatear(Math.round(f / mag) * mag, 0);
}

export function frase({ factor: f, direccion }) {
  if (f < 1.005) return 'Has clavado la cifra de referencia.';
  if (f < 1.05) {
    const pct = Math.max(1, Math.round((f - 1) * 100));
    return `Tu estimación fue prácticamente igual a la cifra de referencia (un ${pct} % ${direccion > 0 ? 'por encima' : 'por debajo'}).`;
  }
  return direccion > 0
    ? `Tu estimación fue ${veces(f)} veces la cifra de referencia.`
    : `Tu estimación fue ${veces(f)} veces menor que la cifra de referencia.`;
}

export function ordenes(f) {
  const o = Math.log10(f);
  return o >= 1 ? `Eso son unos ${formatear(Math.round(o * 10) / 10, 1)} órdenes de magnitud de diferencia.` : '';
}

export function nivel(p) {
  if (p >= 95) return 'Clavado';
  if (p >= 85) return 'Muy buen ojo';
  if (p >= 70) return 'Buen ojo';
  if (p >= 50) return 'Mismo orden de magnitud';
  if (p >= 25) return 'Te pasaste de largo';
  return 'Muy lejos esta vez';
}
