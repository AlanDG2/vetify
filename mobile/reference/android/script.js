// Muestra el teclado nativo al hacer focus en inputs de Chakra UI,
// donde focus() de JS no alcanza porque Chakra cancela eventos nativos.
document.addEventListener('focus', function(e) {
    var el = e.target;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.disabled && !el.readOnly) {
        if (window.AndroidBridge) {
            window.AndroidBridge.showKeyboard();
        }
    }
}, true);

if (!window._vetifyObserverActivo) {
    window._vetifyObserverActivo = true;

    var observer = new MutationObserver(function() {
        try {
            var homeSubServiciosGrid = document.querySelector('[data-cy="subServiceGrid"]');
            if (homeSubServiciosGrid) {
                homeSubServiciosGrid.style.gridTemplateColumns = "repeat(1, minmax(0px, 1fr))";
                homeSubServiciosGrid.style.gridTemplateRows = "repeat(1, minmax(0px, 1fr))";
                homeSubServiciosGrid.style.padding = "0 0.25em";
            }

            var perfilProductosVehiculosDropdownInfo = document.getElementsByClassName("css-1im9n34");
            if (perfilProductosVehiculosDropdownInfo.length > 0) {
                perfilProductosVehiculosDropdownInfo[0].style.flexDirection = "column";
            }
        } catch (err) {
            // Silenciar errores si el DOM cambia durante la mutación
        }
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
}
