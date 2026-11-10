import { formatear, potencia10 } from './numeros.js';

// Eje logarítmico que abarca estimación, referencia y rango plausible.
export function calcularEscala(valores) {
  const logs = valores.map(Math.log10);
  let min = Math.floor(Math.min(...logs) - 0.1);
  let max = Math.ceil(Math.max(...logs) + 0.1);
  while (max - min < 3) { max++; if (max - min < 3) min--; }
  const pos = (v) => (Math.log10(v) - min) / (max - min);
  const paso = max - min > 8 ? 2 : 1;
  const marcas = [];
  for (let k = min; k <= max; k += 1) {
    const etiqueta = k >= -2 && k <= 4 ? formatear(10 ** k, 3) : potencia10(k);
    marcas.push({ k, pos: (k - min) / (max - min), etiqueta, visible: (k - min) % paso === 0 });
  }
  return { min, max, pos, marcas };
}
