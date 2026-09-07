# ⚽ Hay Fulbo

Organizador de picados entre amigos con **flyers verticales 9:16** generados en el navegador.
Sin backend, sin cuentas, sin build: es HTML, CSS y JavaScript plano.

> Armá la convocatoria → sumá la gente → balanceá los equipos → coroná la figura.
> Cada paso tiene su flyer de 1080×1920 listo para el estado de WhatsApp o una story de Instagram.

---

## Qué hace

| Paso | Para qué sirve |
|---|---|
| **1 · Partido** | Título, cancha, fecha, horario, formato (F5 a F11 o libre) y lo que sale el turno por persona. |
| **2 · Lista** | Alta de jugadores con su puesto, suplentes automáticos al pasarse del cupo, control de quién pagó, importación de listas pegadas de WhatsApp y texto listo para volver a pegar en el grupo. |
| **3 · Equipos** | Balanceador que reparte a los titulares en dos equipos parejos y los dibuja en formación sobre la cancha. |
| **4 · Figura** | Puntaje de 1 a 10 por jugador, goles y elección de la figura del partido. |
| **5 · Historial** | Ranking histórico por promedio, partidos jugados, goles y MVPs de todos los picados guardados. |

### Los tres flyers (1080×1920)

- **Convocatoria** — cuántos faltan, cuándo, dónde, cuánto sale y la lista completa con los cupos libres.
- **Formaciones** — los dos equipos plantados sobre una cancha, con camiseta, dorsal y nombre.
- **Figura** — el MVP en formato figurita de álbum, con puntaje, puesto y el resto de las notas.

Cada flyer se dibuja en `<canvas>` a resolución final y se puede descargar como PNG o mandar
directo por el menú de compartir del sistema (Web Share API) cuando el navegador lo soporta.
Hay **cinco paletas** para elegir: Noche, Fuego, Hielo, Oro y Neón.

---

## Detalles que hacen la diferencia

- **Todo se guarda solo.** El partido en curso, las preferencias y el historial viven en `localStorage`.
- **Link para compartir la convocatoria.** El estado del partido se comprime en el hash de la URL,
  así que cualquiera del grupo abre el mismo link y ve la misma lista, sin servidor de por medio.
- **El nivel se aprende del historial.** No se carga a mano: cuando anotás a alguien que ya jugó,
  su nivel para el balanceador sale del promedio de las notas que le puso el grupo en los
  partidos anteriores. El que debuta arranca en 7.
- **Balanceo real.** Reparte a los arqueros primero, hace un draft serpiente por nivel y después
  optimiza con intercambios locales minimizando diferencia de nivel, de puestos y de cantidad.
- **Formaciones de verdad.** Según cuántos jugadores de campo tenga cada equipo se elige una
  línea clásica (2-2, 2-2-1, 3-3-2, 4-4-2…) y los jugadores se ubican por puesto.

---

## Se instala en el celu

Es una **PWA**: se puede instalar como una app más y funciona sin conexión.

- **Android / Chrome:** aparece el cartel *"Instalá Hay Fulbo en el celu"*, o desde el menú
  de tres puntos → **Instalar aplicación**.
- **iPhone / iPad:** en Safari, **Compartir** → **Agregar a inicio**.
- **Escritorio:** el ícono de instalar aparece a la derecha de la barra de direcciones.

Una vez instalada abre a pantalla completa, sin barra del navegador, y el service worker
cachea toda la app: entrás a la cancha sin señal y podés armar la lista y generar los flyers igual.
Cuando se publica una versión nueva aparece un aviso para actualizar.

---

## Cómo se usa

Es un sitio estático: alcanza con abrir `index.html`. Para desarrollo conviene levantar un
servidor local, así funcionan los links compartibles y el banco de pruebas de flyers:

```bash
node tools/serve.js
```

Después entrá a `http://localhost:4321`.

### Banco de pruebas de flyers

`http://localhost:4321/tools/preview.html` renderiza cualquiera de los tres flyers a tamaño
completo con datos de ejemplo. Sirve para iterar el diseño sin pasar por toda la app.
No forma parte del sitio publicado.

---

## Estructura

```
index.html            La app entera (marcado + sprite de iconos)
manifest.webmanifest  Metadatos de la app instalable
sw.js                 Service worker: caché offline y actualizaciones
css/styles.css        Sistema de diseño: tokens, componentes, layout
js/util.js            DOM, formato, almacenamiento, toasts, confeti, modales
js/state.js           Estado único, persistencia y codec de links compartibles
js/teams.js           Balanceador de equipos
js/canvas-kit.js      Primitivas de dibujo: cancha, red, camisetas, tipografía
js/themes.js          Las cinco paletas de los flyers
js/flyers.js          Los tres flyers 9:16
js/ui.js              Render de pantallas y eventos
js/pwa.js             Instalación, offline y aviso de versión nueva
js/main.js            Arranque
tools/serve.js        Servidor estático de desarrollo
tools/preview.html    Banco de pruebas de flyers
tools/icons.html      Generador de los iconos de la app
legacy/index-v1.html  La primera versión, de un solo archivo
```

Los módulos se cargan como scripts clásicos y se cuelgan de un único namespace `window.HF`,
así que la app corre igual abierta desde el disco que servida por HTTP.

---

## Compatibilidad

Navegadores modernos de escritorio y móvil. `canvas.roundRect`, `navigator.share`,
`document.fonts` y el service worker se usan con alternativa cuando no están disponibles:
sin ellos la app sigue funcionando, sólo pierde esa función puntual.

## Licencia

MIT — ver [LICENSE](LICENSE).
