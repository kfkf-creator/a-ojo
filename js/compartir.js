// Resumen sin spoilers: solo número de reto y puntuación.
export function resumen({ numero, puntuacion, url }) {
  const llenos = Math.round(puntuacion / 20);
  const barra = '■'.repeat(llenos) + '□'.repeat(5 - llenos);
  return `A ojo #${numero} · ${puntuacion}/100\n${barra}${url ? '\n' + url : ''}`;
}

export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* sin portapapeles */ }
    ta.remove();
    return ok;
  }
}
