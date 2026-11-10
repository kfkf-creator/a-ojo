import { analizar, formatear, enPalabras, multiplicar } from './numeros.js';
import { puntuar, frase, ordenes, nivel } from './puntuacion.js';
import { hoyMadrid, msHastaMedianoche, fechaLarga, fechaCorta, cuentaAtras } from './fechas.js';
import { numero, retoDeHoy, pasados, estado } from './calendario.js';
import { crearAlmacen } from './almacen.js';
import { resumen, copiar } from './compartir.js';
import { calcularEscala } from './escala.js';
import { calcular } from './calculadora.js';
import { operacionLegible, varsHasta } from './calc.js';

const $main = document.getElementById('contenido');
const $avisos = document.getElementById('avisos');
const $racha = document.getElementById('racha');

// ---------- Reloj (se puede adelantar con ?ahora=… solo en local, para probar el cambio de día) ----------
const desfase = (() => {
  if (!['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname)) return 0;
  try {
    const q = new URLSearchParams(location.search).get('ahora');
    if (q !== null) {
      const t = Date.parse(q);
      if (q && !Number.isNaN(t)) sessionStorage.setItem('aojo.desfase', String(t - Date.now()));
      else sessionStorage.removeItem('aojo.desfase');
    }
    return Number(sessionStorage.getItem('aojo.desfase')) || 0;
  } catch { return 0; }
})();
const ahora = () => new Date(Date.now() + desfase);

function almacenamiento() {
  try {
    localStorage.setItem('aojo.prueba', '1');
    localStorage.removeItem('aojo.prueba');
    return localStorage;
  } catch {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  }
}
const almacen = crearAlmacen(almacenamiento());
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let retos = [];
let diaMostrado = '';
let animar = false;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TIPO = { estimacion: 'Estimación', exacto: 'Cálculo exacto' };
const ETQ = { dato: 'Dato consultado', supuesto: 'Supuesto', enunciado: 'Del enunciado', calculo: 'Cálculo' };

// ---------- Datos ----------
// Si un reto se revisó después de que jugaras, se muestra la versión con la que jugaste.
function versionDe(r, v) {
  if (!v || v === r.version) return r;
  const h = (r.historial || []).find((x) => x.version === v);
  return h ? { ...r, ...h } : r;
}

// ---------- Vistas ----------
function cabecera(hoy) {
  const ruta = rutaActual();
  document.querySelectorAll('nav a').forEach((a) => {
    const activo = a.dataset.nav === (ruta.pagina === 'reto' ? 'archivo' : ruta.pagina);
    if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const e = almacen.estadisticas(hoy);
  $racha.innerHTML = e.actual
    ? `Racha: <strong>${e.actual} ${e.actual === 1 ? 'día' : 'días'}</strong> · mejor: ${e.mejor}`
    : `Racha: <strong>0</strong> · resuelve el reto de hoy para empezarla`;
}

function chips(r, modo) {
  return `<div class="meta">
    <span class="chip chip--num">Reto n.º ${numero(retos, r.id)}</span>
    <span class="chip">${TIPO[r.tipo]}</span>
    <span class="chip">${esc(r.tema)}</span>
    <span class="fecha">${esc(fechaLarga(r.fecha))}${modo === 'practica' ? ' · archivo' : ''}</span>
  </div>`;
}

function vistaReto(r, hoy) {
  const modoVista = r.fecha === hoy ? 'diario' : 'practica';
  const jug = almacen.jugada(r.id);
  const borrador = almacen.borrador(r.id);
  const condiciones = (r.condiciones || []).map((c) => `<li>${esc(c)}</li>`).join('');
  $main.innerHTML = `
    <article class="reto" data-reto="${esc(r.id)}">
      ${chips(r, modoVista)}
      ${modoVista === 'practica' && !jug ? '<p class="aviso">Estás practicando con el archivo: este reto no cuenta para tu racha diaria.</p>' : ''}
      ${!almacen.persistente ? '<p class="aviso">Tu navegador no deja guardar datos: el progreso se perderá al cerrar la pestaña.</p>' : ''}
      <h1 class="pregunta" id="pregunta" tabindex="-1">${esc(r.enunciado)}</h1>
      ${condiciones ? `<ul class="condiciones" aria-label="Condiciones">${condiciones}</ul>` : ''}
      <p class="unidad">Responde en <strong>${esc(r.unidad)}</strong>.</p>
      ${jug ? '' : formularioHTML(r)}
      ${jug ? '' : calculadoraHTML(borrador.calculo)}
      ${jug ? resultadoHTML(r, jug, modoVista, hoy) : ''}
    </article>`;
  if (jug) { ligarResultado(r, jug, modoVista); return; }
  ligarFormulario(r, hoy, borrador);
}

const TECLAS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ',', '(', ')', '+', '^', 'C', '⌫'];

function calculadoraHTML() {
  return `<details class="calc" id="det-calc" open>
    <summary>Calculadora</summary>
    <label class="pequeno" for="calc">Para hacer tus cuentas. Escribe una operación o usa las teclas.</label>
    <input id="calc" type="text" inputmode="none" autocomplete="off" spellcheck="false" placeholder="Ej.: 17.000 × 53" aria-describedby="calc-res">
    <p id="calc-res" class="calc-res" aria-live="polite"></p>
    <div class="teclas" role="group" aria-label="Teclas de la calculadora">
      ${TECLAS.map((t) => `<button type="button" data-tecla="${t}" aria-label="${{ '÷': 'dividir', '×': 'multiplicar', '−': 'restar', '+': 'sumar', '^': 'elevar a', 'C': 'borrar todo', '⌫': 'borrar un carácter', ',': 'coma decimal', '(': 'abrir paréntesis', ')': 'cerrar paréntesis' }[t] || t}">${t}</button>`).join('')}
    </div>
    <div class="acciones">
      <button type="button" id="calc-igual">= Calcular</button>
      <button type="button" id="calc-usar">Usar como mi estimación</button>
    </div>
  </details>`;
}

function formularioHTML(r) {
  return `<form id="form" novalidate autocomplete="off">
    <label for="est">Tu estimación <span class="pequeno">(${esc(r.unidad)})</span></label>
    <input id="est" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false"
      aria-describedby="vista" placeholder="Ej.: 25.000 o 2,5">
    <div class="mult" role="group" aria-label="Multiplicadores">
      <button type="button" data-mult="1000">×1.000</button>
      <button type="button" data-mult="1000000">×1.000.000</button>
    </div>
    <p id="vista" class="vista" aria-live="polite"></p>
    <button class="primario" type="submit">Fijar estimación</button>
    <p class="pequeno" style="margin-top:.6rem">Un único intento por reto: al fijarla ya no se puede cambiar. Sin cronómetro.</p>
  </form>`;
}

function ligarFormulario(r, hoy, borrador) {
  const $est = document.getElementById('est');
  const $vista = document.getElementById('vista');
  const $calc = document.getElementById('calc');
  const $calcRes = document.getElementById('calc-res');
  $est.value = borrador.texto || '';
  $calc.value = borrador.calculo || '';

  function actualizar(esEnvio = false) {
    const res = analizar($est.value);
    $est.setAttribute('aria-invalid', String(!res.ok && !res.vacio));
    if (res.vacio) {
      $vista.className = 'vista';
      $vista.textContent = esEnvio ? 'Escribe un número para poder fijar tu estimación.' : 'Escribe un número: admito 1.500, 2,5 o los atajos ×1.000 y ×1.000.000.';
      if (esEnvio) $vista.className = 'vista vista--error';
    } else if (!res.ok) {
      $vista.className = 'vista vista--error';
      $vista.textContent = 'Corrígelo antes de fijar: ' + res.motivo;
    } else {
      const pal = enPalabras(res.valor);
      $vista.className = 'vista vista--ok';
      $vista.innerHTML = `Se interpretará como: <strong>${esc(formatear(res.valor, 6))}</strong> ${esc(r.unidad)}${pal ? ` <span class="pequeno">(${esc(pal)})</span>` : ''}`;
    }
    return res;
  }
  actualizar();
  $est.addEventListener('input', () => { almacen.guardarBorrador(r.id, { texto: $est.value }); actualizar(); });
  function actualizarCalc() {
    almacen.guardarBorrador(r.id, { calculo: $calc.value });
    const c = calcular($calc.value);
    $calcRes.textContent = c.ok ? `= ${formatear(c.valor, 6)}` : c.vacio ? '' : c.motivo;
    return c;
  }
  actualizarCalc();
  $calc.addEventListener('input', actualizarCalc);
  $calc.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); igual(); } });
  function igual() {
    const c = actualizarCalc();
    if (c.ok) { $calc.value = formatear(c.valor, 6).replace(/\./g, ''); actualizarCalc(); }
    $calc.focus();
  }
  document.querySelectorAll('[data-tecla]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.tecla;
    if (t === 'C') $calc.value = '';
    else if (t === '⌫') $calc.value = $calc.value.slice(0, -1);
    else $calc.value += t;
    actualizarCalc();
    $calc.focus();
  }));
  document.getElementById('calc-igual').addEventListener('click', igual);
  document.getElementById('calc-usar').addEventListener('click', () => {
    const c = actualizarCalc();
    if (!c.ok) { $calcRes.textContent = c.vacio ? 'Calcula algo primero.' : c.motivo; return; }
    if (c.valor <= 0) { $calcRes.textContent = 'La estimación debe ser mayor que cero.'; return; }
    $est.value = formatear(Math.round(c.valor * 1e6) / 1e6, 6);
    almacen.guardarBorrador(r.id, { texto: $est.value });
    actualizar();
    $est.focus();
  });
  document.querySelectorAll('[data-mult]').forEach((b) => b.addEventListener('click', () => {
    const nuevo = multiplicar($est.value, Number(b.dataset.mult));
    if (nuevo === null) { actualizar(true); $est.focus(); return; }
    $est.value = nuevo;
    almacen.guardarBorrador(r.id, { texto: nuevo });
    actualizar();
    $est.focus();
  }));
  document.getElementById('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const res = actualizar(true);
    if (!res.ok) { $est.focus(); return; }
    const hoyAhora = hoyMadrid(ahora());
    const p = puntuar(res.valor, r.referencia);
    const ok = almacen.registrar(r.id, {
      estimacion: res.valor, texto: $est.value.trim(), referencia: r.referencia, puntuacion: p.puntuacion,
      fechaReto: r.fecha, fechaJuego: hoyAhora, modo: r.fecha === hoyAhora ? 'diario' : 'practica',
      version: r.version, ts: Date.now(),
    });
    animar = ok;
    render();
  });
}

function escalaHTML(r, est, ref) {
  const valores = [est, ref, ...(r.rango || [])];
  const esc2 = calcularEscala(valores);
  const x = (v) => (Math.min(1, Math.max(0, esc2.pos(v))) * 100).toFixed(2) + '%';
  const marcas = esc2.marcas.map((m) => `<span class="marca" style="left:${(m.pos * 100).toFixed(2)}%" aria-hidden="true"><i></i>${m.visible ? `<b>${esc(m.etiqueta)}</b>` : ''}</span>`).join('');
  const rango = r.rango ? `<span class="rango" style="left:${x(r.rango[0])};width:calc(${x(r.rango[1])} - ${x(r.rango[0])})" aria-hidden="true"></span>` : '';
  const aria = `Escala logarítmica de ${esc2.marcas[0].etiqueta} a ${esc2.marcas[esc2.marcas.length - 1].etiqueta}. Tu estimación: ${formatear(est, 3)}. Cifra de referencia: ${formatear(ref, 3)}.`;
  const listo = reducido() || !animar ? ' listo' : '';
  return `<figure class="escala${listo}" id="escala">
    <div class="eje" role="img" aria-label="${esc(aria)}">
      ${marcas}${rango}
      <span class="pin pin--ref" style="--x:${x(ref)}" aria-hidden="true"><span class="forma"></span><span class="rot">Referencia</span></span>
      <span class="pin pin--tu" style="--x:${x(est)}" aria-hidden="true"><span class="forma"></span><span class="rot">Tú</span></span>
    </div>
    <figcaption class="leyenda">Escala logarítmica: cada marca vale 10 veces la anterior. ● Tú · ◆ Referencia${r.rango ? ' · ▭ rango plausible' : ''}</figcaption>
  </figure>`;
}

function pasosHTML(v) {
  return v.pasos.map((p, i) => {
    const vars = varsHasta(v, i);
    const op = p.expr ? `<p class="op">${esc(operacionLegible(p.expr, vars))} = ${esc(formatear(p.valor, 6))}</p>` : '';
    return `<li class="paso paso--${p.tipo}"><span class="etq">${ETQ[p.tipo]}</span><div><p>${esc(p.texto)}</p>${op}</div></li>`;
  }).join('');
}

function resultadoHTML(r, jug, modoVista, hoy) {
  const v = versionDe(r, jug.version);
  const est = jug.estimacion;
  const p = puntuar(est, v.referencia);
  const num = numero(retos, r.id);
  const texto = resumen({ numero: num, puntuacion: jug.puntuacion, url: location.origin + location.pathname });
  const e = almacen.estadisticas(hoy);
  const fuentes = (v.fuentes || []).map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a> <span class="estado-dato">(${esc(f.fecha)})</span></li>`).join('');
  const esExacto = r.tipo === 'exacto';
  return `
    <section class="resultado" aria-labelledby="h-res">
      <h2 id="h-res" tabindex="-1">${jug.modo === 'diario' ? 'Tu resultado' : 'Tu resultado (práctica)'}</h2>
      <div class="puntos"><span class="num">${jug.puntuacion}</span><span class="de">/ 100</span><span class="nivel">${esc(nivel(jug.puntuacion))}</span></div>
      <p class="frase">${esc(frase(p))}</p>
      ${ordenes(p.factor) ? `<p class="pequeno">${esc(ordenes(p.factor))}</p>` : ''}
      ${escalaHTML(v, est, v.referencia)}
      <dl class="cifras">
        <div><dt>Tu estimación</dt><dd>${esc(formatear(est, 6))}<small>${esc(r.unidad)}</small></dd></div>
        <div><dt>${esExacto ? 'Resultado exacto' : 'Cifra de referencia'}</dt><dd>${esc(formatear(v.referencia, 6))}<small>${esc(r.unidad)}</small></dd></div>
        ${v.rango ? `<div class="ancho"><dt>Rango plausible (contexto editorial)</dt><dd>${esc(formatear(v.rango[0]))} – ${esc(formatear(v.rango[1]))}<small>${esc(r.unidad)}</small></dd></div>` : ''}
      </dl>

      <section class="explicacion" aria-labelledby="h-exp">
        <h2 id="h-exp">${esExacto ? 'El cálculo, paso a paso' : 'Cómo se llega a la cifra'}</h2>
        <ol class="pasos">${pasosHTML(v)}</ol>
        <p class="final">${esExacto ? 'Resultado exacto' : 'Cifra de referencia'}: <strong>${esc(formatear(v.referencia, 6))} ${esc(r.unidad)}</strong></p>
        ${!esExacto && v.clave ? `<div class="nota-caja"><h3>Lo que más mueve la cifra</h3><p>${esc(v.clave)}</p></div>` : ''}
        ${!esExacto ? '<p class="pequeno">En los casos abiertos, la cifra es una referencia razonada, no la única respuesta posible.</p>' : ''}
        ${v.curiosidad ? `<div class="nota-caja"><h3>Para comentar</h3><p>${esc(v.curiosidad)}</p></div>` : ''}
        ${fuentes ? `<h3>Fuentes</h3><ul class="fuentes">${fuentes}</ul>` : ''}
      </section>


      <section class="compartir" aria-labelledby="h-comp">
        <h2 id="h-comp">Compartir sin spoilers</h2>
        <pre id="resumen">${esc(texto)}</pre>
        <div class="acciones">
          <button type="button" id="copiar">Copiar resumen</button>
          ${navigator.share ? '<button type="button" id="compartir">Compartir…</button>' : ''}
          <span id="copiado" class="copiado" role="status"></span>
        </div>
        <p class="pequeno" style="margin:.6rem 0 0">Solo incluye el número del reto y tu puntuación.</p>
      </section>

      <div class="siguiente">
        ${jug.modo === 'diario' && r.fecha === hoy ? `<p>Próximo reto en <span class="cuenta" id="cuenta">${cuentaAtras(msHastaMedianoche(ahora()))}</span> (medianoche de Madrid).</p>` : ''}
        <a class="boton" href="#/archivo">${jug.modo === 'diario' ? 'Practicar con el archivo' : 'Volver al archivo'}</a>
      </div>
      <dl class="estad" aria-label="Tus estadísticas">
        <div><dt>Racha</dt><dd>${e.actual}</dd></div><div><dt>Mejor</dt><dd>${e.mejor}</dd></div>
        <div><dt>Jugados</dt><dd>${e.jugadas}</dd></div><div><dt>Media</dt><dd>${e.media ?? '–'}</dd></div>
      </dl>
    </section>`;
}

function ligarResultado(r, jug, modoVista) {
  const titulo = document.getElementById('h-res');
  if (animar) {
    titulo.focus();
    titulo.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' });
    const esc2 = document.getElementById('escala');
    if (!esc2.classList.contains('listo')) requestAnimationFrame(() => requestAnimationFrame(() => esc2.classList.add('listo')));
  }
  const $c = document.getElementById('copiado');
  const texto = document.getElementById('resumen').textContent;
  document.getElementById('copiar').addEventListener('click', async () => {
    const ok = await copiar(texto);
    $c.textContent = ok ? 'Copiado ✓' : 'No se pudo copiar: selecciona el texto a mano.';
  });
  const $n = document.getElementById('compartir');
  if ($n) $n.addEventListener('click', () => navigator.share({ text: texto }).catch(() => {}));
}

function vistaSinReto(st, hoy) {
  const o = [...retos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const msg = {
    agotado: ['Has llegado al final del calendario', 'Ya has visto todos los retos programados. Vuelve pronto: se añadirán nuevos. Mientras tanto, el archivo sigue abierto.'],
    pronto: ['Aún no ha empezado', `El primer reto llega el ${o[0] ? fechaLarga(o[0].fecha) : 'próximamente'}.`],
    hueco: ['Hoy no hay reto programado', 'Hoy no toca reto nuevo. Puedes seguir practicando con el archivo.'],
  }[st];
  $main.innerHTML = `<div class="vacio"><h1 class="pregunta" tabindex="-1" id="pregunta">${msg[0]}</h1><p>${msg[1]}</p><a class="boton" href="#/archivo">Ir al archivo</a></div>`;
}

function vistaArchivo(hoy) {
  const lista = pasados(retos, hoy);
  const e = almacen.estadisticas(hoy);
  const items = lista.map((r) => {
    const j = almacen.jugada(r.id);
    const est = j ? `<span class="estado estado--hecho">${j.puntuacion}/100</span>` : '<span class="estado">Sin jugar</span>';
    return `<li><a href="#/reto/${esc(r.id)}" aria-label="Reto ${numero(retos, r.id)}, ${esc(fechaCorta(r.fecha))}, ${esc(r.tema)}, ${j ? 'puntuación ' + j.puntuacion : 'sin jugar'}">
      <span class="n">#${numero(retos, r.id)}</span>
      <span class="t">${esc(r.tema)} · ${TIPO[r.tipo]}<small>${esc(fechaCorta(r.fecha))}</small></span>${est}</a></li>`;
  }).join('');
  $main.innerHTML = `<h1 class="pregunta" id="pregunta" tabindex="-1">Archivo</h1>
    <p>Retos pasados. Practicar aquí no afecta a tu racha diaria: esa solo suma si resuelves el reto de cada día el mismo día.</p>
    <dl class="estad" aria-label="Tus estadísticas">
      <div><dt>Racha</dt><dd>${e.actual}</dd></div><div><dt>Mejor</dt><dd>${e.mejor}</dd></div>
      <div><dt>Jugados</dt><dd>${e.jugadas}</dd></div><div><dt>Media</dt><dd>${e.media ?? '–'}</dd></div>
    </dl>
    ${lista.length ? `<ul class="lista">${items}</ul>` : '<p class="vacio">Todavía no hay retos pasados. Vuelve mañana.</p>'}
    ${estado(retos, hoy) !== 'hoy' && estado(retos, hoy) !== 'pronto' ? '<p class="aviso">No hay reto nuevo hoy: se han agotado los retos programados.</p>' : ''}`;
}

function vistaAyuda() {
  $main.innerHTML = `<div class="ayuda"><h1 class="pregunta" id="pregunta" tabindex="-1">Cómo se juega</h1>
    <p>Cada día hay un minicaso. Se responde con <strong>un número</strong> y tienes <strong>un solo intento</strong>. No hay cronómetro: piensa, divide el problema en partes y haz las cuentas con la calculadora.</p>
    <h2>Escribir el número</h2>
    <p>En español: <code>1.500</code> es mil quinientos y <code>2,5</code> es dos y medio. Los botones <code>×1.000</code> y <code>×1.000.000</code> multiplican lo que has escrito. La coma siempre es decimal. Si algo es ambiguo (como <code>1.5</code>: ¿1,5 o 15?) o inválido, te pediré que lo corrijas antes de fijarlo; antes de confirmar siempre ves cómo se interpretará.</p>
    <h2>Puntuación (0 a 100)</h2>
    <p>Se mide cuántas <em>veces</em> te has desviado, por arriba o por abajo: estimar el doble o la mitad penaliza igual.</p>
    <p><code>factor = máx(estimación ÷ referencia, referencia ÷ estimación)</code><br><code>puntuación = redondear(100 × máx(0, 1 − log₁₀(factor) ÷ 2))</code></p>
    <table><thead><tr><th>Te desvías…</th><th>Puntos</th></tr></thead><tbody>
      <tr><td>Nada</td><td>100</td></tr><tr><td>Factor 2 (el doble o la mitad)</td><td>85</td></tr>
      <tr><td>Factor 10</td><td>50</td></tr><tr><td>Factor 100 o más</td><td>0</td></tr></tbody></table>
    <h2>Dos tipos de reto</h2>
    <p><strong>Estimación:</strong> la cifra de referencia es una respuesta razonada a partir de datos y supuestos explicados; puede haber otras razonables. <strong>Cálculo exacto:</strong> hay una única respuesta correcta.</p>
    <h2>Tus datos</h2>
    <p>No hay registro. Tu progreso, tu estimación y tu racha se guardan solo en este navegador; si borras los datos del sitio, se pierden.</p>
    <h2>Racha y archivo</h2>
    <p>La racha cuenta los días seguidos en que resuelves el reto del día ese mismo día. El día cambia a medianoche de Madrid. Los retos pasados están en el <a href="#/archivo">archivo</a>.</p>
    <p><a class="boton" href="#/">Ir al reto de hoy</a></p></div>`;
}

// ---------- Ruteo ----------
function rutaActual() {
  const [pagina = '', id = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { pagina: pagina || 'hoy', id };
}

function render() {
  const hoy = hoyMadrid(ahora());
  diaMostrado = hoy;
  $avisos.innerHTML = '';
  const { pagina, id } = rutaActual();
  if (pagina === 'hoy') {
    const r = retoDeHoy(retos, hoy);
    if (r) vistaReto(r, hoy); else vistaSinReto(estado(retos, hoy), hoy);
  } else if (pagina === 'archivo') vistaArchivo(hoy);
  else if (pagina === 'ayuda') vistaAyuda();
  else if (pagina === 'reto') {
    const r = retos.find((x) => x.id === id);
    if (r && r.fecha === hoy) { location.replace('#/'); return; }
    if (r && r.fecha < hoy) vistaReto(r, hoy);
    else $main.innerHTML = '<div class="vacio"><h1 class="pregunta" id="pregunta" tabindex="-1">Ese reto no existe (o aún no toca)</h1><a class="boton" href="#/archivo">Ir al archivo</a></div>';
  } else $main.innerHTML = '<div class="vacio"><h1 class="pregunta" id="pregunta" tabindex="-1">Página no encontrada</h1><a class="boton" href="#/">Ir al reto de hoy</a></div>';
  cabecera(hoy);
  // al cambiar de página, el foco va al título
  if (!animar && lastHash !== location.hash) document.getElementById('pregunta')?.focus({ preventScroll: true });
  lastHash = location.hash;
  animar = false;
}
let lastHash = location.hash;

function tick() {
  const hoy = hoyMadrid(ahora());
  const $c = document.getElementById('cuenta');
  if ($c) $c.textContent = cuentaAtras(msHastaMedianoche(ahora()));
  if (hoy !== diaMostrado && !$avisos.firstChild) {
    $avisos.innerHTML = '<div class="banner" role="status">Ha empezado un nuevo día en Madrid: hay reto nuevo. <button type="button" id="nuevo-dia">Ver el reto de hoy</button></div>';
    document.getElementById('nuevo-dia').addEventListener('click', () => {
      if (location.hash && location.hash !== '#/') location.hash = '#/'; else render();
    });
  }
}

async function init() {
  try {
    const resp = await fetch('data/retos.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error(resp.status);
    retos = await resp.json();
  } catch {
    $main.innerHTML = '<p class="aviso">No he podido cargar los retos. Recarga la página; si abres el archivo directamente desde el disco, usa un servidor local (npm start).</p>';
    return;
  }
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', (e) => {
    if (e.key !== 'aojo.v1') return;
    const art = document.querySelector('[data-reto]');
    if (art && almacen.jugada(art.dataset.reto) && document.getElementById('form')) render();
  });
  document.addEventListener('visibilitychange', tick);
  render();
  setInterval(tick, 1000);
}
init();
