document.addEventListener('DOMContentLoaded', function () {
    // 1. Inicialización del mapa
    const map = L.map('map').setView([23.6345, -102.5528], 5);

    // 2. Mapa base
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    let geojsonLayer;
    // CAMBIO 1: La lógica de cómo llenamos este objeto cambiará.
    // Ahora guardará { "NombreAcuifero": [capa1, capa2, ...], ... }
    let acuiferoData = {};

    // 3. Función para obtener el color
    function getColor(vulnerabilidad) {
        const value = parseInt(vulnerabilidad, 10);
        return value === 5 ? '#D90404' :
               value === 4 ? '#F25C05' :
               value === 3 ? '#F2B705' :
               value === 2 ? '#99C140' :
               value === 1 ? '#2DC937' :
                             '#CCCCCC';
    }

    // 4. Estilo para los polígonos
    function style(feature) {
        return {
            fillColor: getColor(feature.properties.VULNERABIL),
            weight: 1.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.8
        };
    }
    
    // 5. Funciones de interactividad (sin cambios aquí)
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({ weight: 4, color: '#333', fillOpacity: 0.9 });
        layer.bringToFront();
    }

    function resetHighlight(e) {
        geojsonLayer.resetStyle(e.target);
    }
    
    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

    // 6. Asignar popups y eventos a cada polígono
    function onEachFeature(feature, layer) {
        const props = feature.properties;
        if (props && props.NOM_ACUIF) {
            layer.bindPopup(
                `<strong>Acuífero:</strong> ${props.NOM_ACUIF}<br>` +
                `<strong>Clave:</strong> ${props.CLAVE_ACUI}<br>` +
                `<strong>Vulnerabilidad:</strong> ${props.VULNERABIL}`
            );

            // --- CAMBIO 2: Lógica para agrupar polígonos por nombre ---
            const nombreAcuifero = props.NOM_ACUIF;

            // Si es la primera vez que vemos este nombre de acuífero,
            // creamos una nueva entrada en el objeto con un array que contiene la capa actual.
            if (!acuiferoData[nombreAcuifero]) {
                acuiferoData[nombreAcuifero] = [];
            }
            // Añadimos la capa actual al array correspondiente a su nombre de acuífero.
            acuiferoData[nombreAcuifero].push(layer);
            // ----------------------------------------------------------------

        }
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    }

    // 7. Cargar el GeoJSON (Asegúrate que el nombre del archivo sea exacto)
    // Nota: Los nombres de archivo son sensibles a mayúsculas y minúsculas. 'Vulnerabilidad.geojson' es diferente de 'vulnerabilidad.geojson'.
    fetch('data/Vulnerabilidad.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error de red. No se encontró 'data/Vulnerabilidad.geojson'. Revisa el nombre y la ubicación del archivo.`);
            }
            return response.json();
        })
        .then(data => {
            geojsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);
    
            // Poblar el menú desplegable (sin cambios aquí)
            const selector = document.getElementById('acuifero-select');
            const acuiferoNombres = Object.keys(acuiferoData).sort();
    
            acuiferoNombres.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                selector.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error Crítico:', error);
            alert('No se pudo cargar la capa de datos. Revisa la consola (F12) para más detalles.');
        });
        
    // 8. Funcionalidad del selector
    document.getElementById('acuifero-select').addEventListener('change', function(e) {
        const nombreSeleccionado = e.target.value;

        // --- CAMBIO 3: Lógica para hacer zoom al grupo de polígonos ---
        if (nombreSeleccionado && acuiferoData[nombreSeleccionado]) {
            // Obtenemos el ARRAY de capas para el acuífero seleccionado.
            const layers = acuiferoData[nombreSeleccionado];
            
            // Creamos un L.featureGroup temporal a partir de nuestro array de capas.
            // Esta es una manera sencilla que Leaflet nos da para tratar múltiples capas como una sola.
            const featureGroup = L.featureGroup(layers);

            // Obtenemos los límites combinados de todas las capas en el grupo y hacemos zoom.
            map.fitBounds(featureGroup.getBounds());
            
        } else {
            // Si el usuario deselecciona, volvemos a la vista general.
            map.setView([23.6345, -102.5528], 5);
        }
        // -------------------------------------------------------------
    });

    // 9. Leyenda (sin cambios)
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [1, 2, 3, 4, 5];
        div.innerHTML = '<h4>Vulnerabilidad</h4>';
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML += `<i style="background:${getColor(grades[i])}"></i> Nivel ${grades[i]}<br>`;
        }
        return div;
    };
    legend.addTo(map);
});
