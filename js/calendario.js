export function ordenar(retos) {
  return [...retos].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function numero(retos, id) {
  return ordenar(retos).findIndex((r) => r.id === id) + 1;
}

export function retoDeHoy(retos, hoy) {
  return retos.find((r) => r.fecha === hoy) || null;
}

export function pasados(retos, hoy) {
  return ordenar(retos).filter((r) => r.fecha < hoy).reverse();
}

// 'hoy' | 'agotado' | 'pronto' | 'hueco'
export function estado(retos, hoy) {
  if (retoDeHoy(retos, hoy)) return 'hoy';
  const o = ordenar(retos);
  if (!o.length || o[0].fecha > hoy) return 'pronto';
  if (o[o.length - 1].fecha < hoy) return 'agotado';
  return 'hueco';
}

export function diasRestantes(retos, hoy) {
  return retos.filter((r) => r.fecha > hoy).length;
}
