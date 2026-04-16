# Cambios - Timer Update v4

## Fix 1: Settings como panel flotante (app.js + styles.css + index.html)
**Problema**: Las configuraciones se mostraban como seccion inline dentro del contenido principal, ocupando espacio y siendo invasivas.
**Fix**: Convertidas a panel flotante que se desliza desde la derecha. Incluye:
- Panel de 340px con animacion slide-in
- Overlay semi-transparente para cerrar clickeando fuera
- Toggle switches compactos y modernos (bandeja, autostart, sidebar)
- Seccion de atajos de teclado con reasignacion interactiva
- Seccion de datos con reset total
- Cierra con Escape o clic en overlay

## Fix 2: Feedback del boton Iniciar/Pausar con timers personalizados (timer.js)
**Problema**: La animacion del boton iniciar/detener se disparaba en cada tick (cada segundo), impidiendo que la animacion se reprodujera correctamente. Con timers personalizados el feedback visual era inexistente porque la animacion no se reiniciaba.
**Fix**: Agregado flag `_wasRunning` para detectar cambios de estado reales. La animacion `timer-btn-swap` solo se dispara cuando `running` cambia de true a false o viceversa, no en cada actualizacion de display.

## Fix 3: Cuenta atras personalizadas persisten (timer.js)
**Problema**: Los timers personalizados creados por el usuario se guardaban en SQLite correctamente, pero al cargar la app no aparecian en la UI porque la carga era asincrona y el render ocurria antes de que los datos estuvieran disponibles.
**Fix**: Agregado metodo `_refreshPresetsDOM()` que actualiza el DOM de presets despues de la carga asincrona. Tambien actualiza la lista del panel de configuracion del timer con `_updateConfigPanelCustomList()`. Ahora los timers personalizados aparecen inmediatamente al abrir la seccion.

## Archivos modificados:
- `frontend/js/timer.js` - Button feedback fix + custom presets persistence
- `frontend/js/app.js` - Floating settings panel (ya estaba implementado)
- `frontend/css/styles.css` - Settings panel CSS + toggle switches
- `frontend/index.html` - Settings panel HTML structure
