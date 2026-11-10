import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analizar, formatear, multiplicar, enPalabras } from '../js/numeros.js';
import { puntuar, frase, veces } from '../js/puntuacion.js';
import { hoyMadrid, msHastaMedianoche, sumarDias } from '../js/fechas.js';
import { calcularRacha, crearAlmacen } from '../js/almacen.js';
import { resumen } from '../js/compartir.js';
import { estado, pasados, retoDeHoy, numero } from '../js/calendario.js';
import { calcularEscala } from '../js/escala.js';
import { calcular } from '../js/calculadora.js';
import { evaluar, operacionLegible } from '../js/calc.js';
import { validarBanco, validarReto } from '../js/validacion.js';

const retos = JSON.parse(readFileSync(new URL('../data/retos.json', import.meta.url), 'utf8'));
const v = (t) => analizar(t).valor;

test('separadores españoles', () => {
  assert.equal(v('1.500'), 1500);
  assert.equal(v('2,5'), 2.5);
  assert.equal(v('1.500.000'), 1500000);
  assert.equal(v('1.234,56'), 1234.56);
  assert.equal(v('0,5'), 0.5);
  assert.equal(v('1 500 000'), 1500000);
  assert.equal(v('25000'), 25000);
  assert.equal(v('2,5e3'), 2500);
});

test('entradas ambiguas o inválidas se rechazan', () => {
  for (const t of ['1.5', '0.500', '1.50.000', '1,2,3', 'abc', '', '0', '-5', '1.500,', '12..3', '1.5,2']) {
    assert.equal(analizar(t).ok, false, `«${t}» debería rechazarse`);
  }
  assert.equal(analizar('1.5').ambiguo, true);
  assert.equal(analizar('0.500').ambiguo, true);
  assert.equal(v('2,500'), 2.5); // la coma siempre es decimal; la vista previa lo deja claro
  assert.equal(v('6,366'), 6.366);
});

test('multiplicadores', () => {
  assert.equal(multiplicar('2,5', 1000), '2.500');
  assert.equal(multiplicar('1.500', 1e6), '1.500.000.000');
  assert.equal(multiplicar('1,1', 1000), '1.100');
  assert.equal(multiplicar('hola', 1000), null);
  assert.equal(analizar(multiplicar('3', 1e6)).valor, 3e6);
});

test('formato y palabras', () => {
  assert.equal(formatear(1234567.891), '1.234.567,891');
  assert.equal(formatear(1500, 0), '1.500');
  assert.equal(enPalabras(2500000), '2,5 millones');
  assert.equal(enPalabras(3e9), '3 mil millones');
  assert.equal(enPalabras(500), null);
});

test('puntuación: exacto, factor 2, factor 10, simetría, tope en 0', () => {
  assert.equal(puntuar(100, 100).puntuacion, 100);
  assert.equal(puntuar(200, 100).puntuacion, 85);
  assert.equal(puntuar(50, 100).puntuacion, 85);
  assert.equal(puntuar(1000, 100).puntuacion, 50);
  assert.equal(puntuar(10, 100).puntuacion, 50);
  assert.equal(puntuar(1e4, 100).puntuacion, 0);
  assert.equal(puntuar(1e9, 100).puntuacion, 0);
  for (const f of [1.3, 3, 7, 40]) {
    assert.equal(puntuar(100 * f, 100).puntuacion, puntuar(100 / f, 100).puntuacion);
  }
  assert.throws(() => puntuar(0, 5));
});

test('frases en lenguaje natural', () => {
  assert.equal(frase(puntuar(140, 100)), 'Tu estimación fue 1,4 veces la cifra de referencia.');
  assert.match(frase(puntuar(40, 100)), /2,5 veces menor/);
  assert.match(frase(puntuar(100, 100)), /clavado/);
  assert.equal(veces(12345), 'unas 12.000');
});

test('cambio de día a medianoche de Madrid (verano e invierno)', () => {
  // Verano (CEST, UTC+2): 21:59:59Z del 10 jun sigue siendo 10 jun; 22:00:00Z ya es 11 jun.
  assert.equal(hoyMadrid(new Date('2026-06-10T21:59:59Z')), '2026-06-10');
  assert.equal(hoyMadrid(new Date('2026-06-10T22:00:00Z')), '2026-06-11');
  // Invierno (CET, UTC+1)
  assert.equal(hoyMadrid(new Date('2026-11-10T22:59:59Z')), '2026-11-10');
  assert.equal(hoyMadrid(new Date('2026-11-10T23:00:00Z')), '2026-11-11');
  // Cambio de hora de octubre (día de 25 horas): medianoche del 26 de octubre = 23:00Z del 25
  assert.equal(hoyMadrid(new Date('2026-10-25T21:59:59Z')), '2026-10-25');
  assert.equal(hoyMadrid(new Date('2026-10-25T22:00:00Z')), '2026-10-25');
  assert.equal(hoyMadrid(new Date('2026-10-25T23:00:00Z')), '2026-10-26');
});

test('cuenta atrás hasta la medianoche de Madrid', () => {
  const ms = msHastaMedianoche(new Date('2026-11-10T22:30:00Z'));
  assert.ok(Math.abs(ms - 30 * 60e3) <= 100, `esperado ~30 min, salió ${ms}`);
  // Día de 25 h (fin del horario de verano): desde las 02:00 CEST quedan 23 h reales hasta la medianoche.
  const dia25h = msHastaMedianoche(new Date('2026-10-25T00:00:00Z'));
  assert.ok(Math.abs(dia25h - 23 * 3600e3) <= 100, `salió ${dia25h}`);
});

test('racha: solo cuenta días consecutivos del reto diario', () => {
  assert.deepEqual(calcularRacha([], '2026-11-10'), { actual: 0, mejor: 0 });
  assert.deepEqual(calcularRacha(['2026-11-08', '2026-11-09', '2026-11-10'], '2026-11-10'), { actual: 3, mejor: 3 });
  // si hoy aún no se ha jugado, la racha de ayer sigue viva
  assert.deepEqual(calcularRacha(['2026-11-08', '2026-11-09'], '2026-11-10'), { actual: 2, mejor: 2 });
  // un hueco la rompe, pero se recuerda la mejor
  assert.deepEqual(calcularRacha(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-09'], '2026-11-10'), { actual: 1, mejor: 3 });
  assert.deepEqual(calcularRacha(['2026-11-05'], '2026-11-10'), { actual: 0, mejor: 1 });
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01');
});

function memoria() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, x) => m.set(k, x), removeItem: (k) => m.delete(k) };
}

test('almacén: borrador, un único intento y racha separada de la práctica', () => {
  const st = memoria();
  const a = crearAlmacen(st);
  a.guardarBorrador('x', { texto: '1.500' });
  a.guardarBorrador('x', { calculo: '2*3' });
  assert.deepEqual(crearAlmacen(st).borrador('x'), { texto: '1.500', calculo: '2*3' }); // sobrevive a recargar
  const j = { estimacion: 10, puntuacion: 80, fechaReto: '2026-11-10', modo: 'diario' };
  assert.equal(a.registrar('x', j), true);
  assert.equal(a.registrar('x', { ...j, puntuacion: 100 }), false);
  assert.equal(crearAlmacen(st).jugada('x').puntuacion, 80);
  assert.deepEqual(crearAlmacen(st).borrador('x'), { texto: '', calculo: '' });
  a.registrar('p', { estimacion: 5, puntuacion: 60, fechaReto: '2026-11-09', modo: 'practica' });
  const e = a.estadisticas('2026-11-10');
  assert.equal(e.actual, 1); // la práctica no suma
  assert.equal(e.jugadas, 2);
  assert.equal(e.media, 70);
});

test('almacén sigue funcionando si el navegador bloquea el almacenamiento', () => {
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  const a = crearAlmacen(roto);
  assert.equal(a.registrar('x', { puntuacion: 50, fechaReto: '2026-11-10', modo: 'diario' }), true);
  assert.equal(a.persistente, false);
  assert.equal(a.jugada('x').puntuacion, 50);
});

test('resumen para compartir no revela la referencia', () => {
  const t = resumen({ numero: 18, puntuacion: 85, url: 'https://a-ojo.example/' });
  assert.equal(t, 'A ojo #18 · 85/100\n■■■■□\nhttps://a-ojo.example/');
  assert.doesNotMatch(t, /referencia|\d{4,}/i);
});

test('calendario', () => {
  assert.equal(estado(retos, '2026-11-10'), 'hoy');
  assert.equal(estado(retos, '2026-10-01'), 'pronto');
  assert.equal(estado(retos, '2027-01-01'), 'agotado');
  assert.equal(retoDeHoy(retos, '2026-11-10').id, 'habitaciones-champu');
  assert.equal(pasados(retos, '2026-11-10')[0].fecha, '2026-11-09');
  assert.equal(pasados(retos, '2026-11-10').length, 17);
  assert.equal(numero(retos, 'habitaciones-champu'), 18);
});

test('escala logarítmica abarca magnitudes muy distintas', () => {
  const e = calcularEscala([3, 1e9]);
  assert.ok(e.pos(3) > 0 && e.pos(3) < 0.2 && e.pos(1e9) > 0.8 && e.pos(1e9) < 1);
  const cerca = calcularEscala([100, 100]);
  assert.ok(cerca.max - cerca.min >= 3);
});

test('evaluador de expresiones', () => {
  assert.equal(evaluar('floor(13.6/0.6)*2', {}), 44);
  assert.equal(evaluar('a*2**3', { a: 2 }), 16);
  assert.throws(() => evaluar('process.exit()', {}));
  assert.throws(() => evaluar('x+1', {}));
  assert.equal(operacionLegible('floor(13.6/0.6)', {}), '⌊13,6 ÷ 0,6⌋');
});

test('banco de retos: válido, ≥ 21, mayoría de estimación y cuentas coherentes', () => {
  const r = validarBanco(retos, '2026-11-10');
  assert.deepEqual(r.global, []);
  for (const x of r.resultado) assert.deepEqual(x.errores, [], x.id);
  assert.ok(retos.length >= 21);
  assert.ok(retos.filter((x) => x.tipo === 'estimacion').length > retos.length / 2);
  assert.ok(retos.some((x) => x.tipo === 'exacto'));
});

test('el validador detecta una explicación que no suma', () => {
  const malo = structuredClone(retos[0]);
  malo.pasos[2].valor = 99999;
  assert.ok(validarReto(malo).errores.length > 0);
  const sinFuente = structuredClone(retos.find((x) => x.id === 'barajas-dia'));
  sinFuente.fuentes = [];
  assert.ok(validarReto(sinFuente).errores.some((m) => m.includes('fuentes')));
});

test('calculadora de la partida', () => {
  const c = (t) => calcular(t).valor;
  assert.equal(c('17.000 × 53,3'), 906100);
  assert.equal(c('2+3*4'), 14);
  assert.equal(c('(2+3)*4'), 20);
  assert.equal(c('80*365*24*60'), 42048000);
  assert.equal(c('10/4'), 2.5);
  assert.equal(c('2^10'), 1024);
  assert.equal(c('-3+5'), 2);
  assert.equal(c('1,5 x 2'), 3);
  for (const t of ['2+', '(2+3', '2+3)', '1/0', '2 $ 3', '1,2,3']) assert.equal(calcular(t).ok, false, t);
  assert.equal(calcular('').vacio, true);
});
