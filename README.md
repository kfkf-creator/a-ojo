# A ojo

Un reto de estimación al día, en español. Sin registro, sin anuncios, sin cronómetro. Sitio 100 % estático (HTML + CSS + JavaScript sin dependencias).

## Abrir la web

```bash
npm start          # o: node scripts/serve.mjs  →  http://localhost:5173
```

Hace falta un servidor (aunque sea este mínimo) porque la web carga módulos ES y `data/retos.json`; abrir `index.html` con doble clic no funciona. Para publicar, sube la carpeta tal cual a cualquier alojamiento estático (Netlify, GitHub Pages, Cloudflare Pages…). No hay paso de compilación.

## Pruebas y validación

```bash
npm test           # 17 pruebas unitarias (node:test, Node ≥ 18)
npm run validar    # valida data/retos.json y comprueba las cuentas de cada explicación
```

## Probar el cambio de día

En local (`localhost`) puedes adelantar el reloj: `http://localhost:5173/?ahora=2026-11-10T23:59:50%2B01:00`. El reloj sigue corriendo desde ese instante; `?ahora=` (vacío) lo restablece. Fuera de localhost se ignora.

## Estructura

| Ruta | Qué contiene |
| --- | --- |
| `index.html`, `css/estilos.css` | Página y estilos (modo claro/oscuro, movimiento reducido) |
| `js/app.js` | Interfaz: rutas `#/` (hoy), `#/archivo`, `#/reto/<id>`, `#/ayuda` |
| `js/numeros.js` | Lectura/formato de números en español y multiplicadores |
| `js/puntuacion.js` | Puntuación logarítmica simétrica y frases del resultado |
| `js/fechas.js` | Día civil de Madrid, cuenta atrás hasta medianoche |
| `js/almacen.js` | Progreso en `localStorage`, borradores, un intento por reto y racha |
| `js/calendario.js`, `js/escala.js`, `js/compartir.js` | Calendario, eje logarítmico, resumen sin spoilers |
| `js/calc.js`, `js/validacion.js` | Evaluador de las cuentas y reglas del validador |
| `data/retos.json` | El banco de retos |
| `docs/ANADIR_RETOS.md` | Guía para añadir retos |

## Decisiones de diseño

- **Un reto por día** según `fecha`; el cambio es a las 00:00 de Madrid (`Europe/Madrid`, con horario de verano). Si el día cambia con la pestaña abierta aparece un aviso.
- **Racha** = días seguidos con el reto diario resuelto *el mismo día*. Los retos del archivo se guardan, pero no suman a la racha. Si confirmas después de medianoche un reto que abriste el día anterior, cuenta como práctica.
- **Versiones**: cada reto tiene `version` e `historial`. Si corriges una cifra, mueve la versión antigua a `historial`; quien ya jugó seguirá viendo su resultado con la versión con la que jugó.
- **Privacidad**: todo se guarda en el navegador (`aojo.v1`). Si el almacenamiento está bloqueado, el juego sigue funcionando en memoria y avisa.

## Limitaciones conocidas

- Al ser estático, los retos futuros viajan en `data/retos.json`: alguien con ganas puede leerlos. Para un juego casual es aceptable; si importara, habría que servir cada día desde un endpoint.
- Sin cuentas, la racha no se sincroniza entre dispositivos.
- Quedan 6 retos futuros (hasta el 16 de noviembre de 2026): hay que añadir más (el validador avisa cuando queden menos de 7).
