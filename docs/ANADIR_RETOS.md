# Cómo añadir retos

Los retos viven en `data/retos.json` (una lista). Añade un objeto, ejecuta `npm run validar` y `npm test`.

## Campos

| Campo | Obligatorio | Notas |
| --- | --- | --- |
| `id` | sí | Único; minúsculas, números y guiones. No lo cambies una vez publicado: la clave del progreso del jugador es el id |
| `fecha` | sí | `AAAA-MM-DD`, única. Es el día (de Madrid) en que sale el reto |
| `tipo` | sí | `estimacion` (referencia razonada) o `exacto` (una única respuesta) |
| `tema` | sí | Logística, Consumo, Ciudades, Objetos cotidianos, Ciencia, Cuerpo, Espacio… |
| `estado` | sí | Estado de la verificación de los datos: `verificado` (cifra comprobada en la fuente), `secundaria` (solo comprobada a través de un medio que cita la fuente primaria), `calculado` (solo aritmética sobre datos del enunciado o supuestos), `pendiente` (datos de memoria o sin confirmar: revisar antes de publicar) |
| `enunciado` | sí | Una pregunta, ≤ 260 caracteres |
| `condiciones` | sí | 0 a 3 frases que cierren las ambigüedades (qué cuenta, qué no, cuándo) |
| `unidad` | sí | Cómo se responde: «botes de champú», «metros»… |
| `referencia` | sí | Positiva; debe coincidir con el último paso |
| `rango` | estimación | `[bajo, alto]` plausible, que incluya la referencia. Es contexto editorial |
| `pasos` | sí | De 2 a 4 (ver abajo) |
| `clave` | estimación | Qué supuesto mueve más la cifra |
| `curiosidad` | no | Un dato para comentar |
| `fuentes` | si hay `dato` | `{ titulo, url, fecha }`; primarias siempre que existan |
| `version`, `historial` | sí | `1` y `[]` al crear |

## Pasos y cuentas comprobables

Cada paso tiene `tipo` (`dato` consultado, `supuesto`, `enunciado` o `calculo`) y `texto`. Los pasos con cifra llevan `var` (nombre) y `valor`. Los cálculos llevan `expr`, una expresión que usa números y las `var` anteriores (`+ - * / ** ( )` y `floor(...)`); el validador la evalúa y exige que dé `valor` (tolerancia 0,1 % en estimaciones, 0,01 % en exactos). **El último paso debe ser un cálculo cuyo valor sea la `referencia`.** La web muestra la operación automáticamente: `17.000 × 53,3 = 906.100`.

```json
{
  "id": "ejemplo-bar",
  "fecha": "2026-11-17",
  "tipo": "estimacion",
  "tema": "Ciudades",
  "estado": "calculado",
  "enunciado": "¿Cuántas …?",
  "condiciones": ["Solo … ", "Una sola noche."],
  "unidad": "…",
  "referencia": 12000,
  "rango": [8000, 16000],
  "pasos": [
    { "tipo": "supuesto", "var": "a", "valor": 300, "texto": "…" },
    { "tipo": "supuesto", "var": "b", "valor": 40, "texto": "…" },
    { "tipo": "calculo", "expr": "a*b", "valor": 12000, "texto": "…" }
  ],
  "clave": "…",
  "fuentes": [],
  "version": 1,
  "historial": []
}
```

## Lista de comprobación editorial

1. ¿Habitaciones, plazas, pernoctaciones, viajes, viajeros…? Define exactamente qué se cuenta, el periodo y el ámbito geográfico en `condiciones`.
2. Si hay dos interpretaciones que cambian el resultado más de ~1,5×, reformula.
3. No debe bastar con leer una cifra: tiene que haber una descomposición razonable.
4. Redondea las cifras de los pasos para que las operaciones se sigan de cabeza.
5. Con datos reales: primaria primero, fecha de la publicación y año de referencia en el texto.
6. Corregir un reto ya publicado: copia `{ version, referencia, rango, pasos, clave, fuentes }` de la versión anterior a `historial`, y sube `version`.

Si se agota el calendario, la web muestra un mensaje claro y deja abierto el archivo. El validador avisa cuando quedan menos de 7 retos futuros.
