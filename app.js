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
    let acuiferoData = {};

    // 3. Función para obtener el color (Mejorada)
    function getColor(vulnerabilidad) {
        // Se convierte el valor a número para una comparación segura
        const value = parseInt(vulnerabilidad, 10);
        return value === 5 ? '#D90404' :
               value === 4 ? '#F25C05' :
               value === 3 ? '#F2B705' :
               value === 2 ? '#99C140' :
               value === 1 ? '#2DC937' :
                             '#CCCCCC'; // Gris por defecto si no hay valor
    }

    // 4. Estilo para los polígonos
    function style(feature) {
        return {
            fillColor: getColor(feature.properties.Vulnerabil),
            weight: 1.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.8
        };
    }
    
    // 5. Funciones de interactividad
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({ weight: 4, color: '#333', fillOpacity: 0.9 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }

    function resetHighlight(e) {
        geojsonLayer.resetStyle(e.target);
    }
    
    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

    // 6. Asignar popups y eventos a cada polígono (CORREGIDO)
    function onEachFeature(feature, layer) {
        const props = feature.properties;
        if (props && props.NOM_ACUIF) {
            layer.bindPopup(
                `<strong>Acuífero:</strong> ${props.NOM_ACUIF}<br>` +
                // CORRECCIÓN: Se cambió 'CLAVE_ACUIF' a 'CLAVE_ACUI'
                `<strong>Clave:</strong> ${props.CLAVE_ACUI}<br>` +
                `<strong>Vulnerabilidad:</strong> ${props.Vulnerabil}`
            );
            acuiferoData[props.NOM_ACUIF] = layer;
        }
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    }

    // 7. Cargar el GeoJSON
    fetch('data/Vulnerabilidad.geojson') // Asegúrate que el nombre coincide (V mayúscula)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error de red. No se encontró 'data/Vulnerabilidad.geojson'.`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.features) {
                throw new Error("El archivo GeoJSON no tiene la estructura correcta (falta 'features').");
            }
            geojsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);
    
            // Poblar el menú desplegable
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
        if (nombreSeleccionado && acuiferoData[nombreSeleccionado]) {
            const layer = acuiferoData[nombreSeleccionado];
            map.fitBounds(layer.getBounds());
            layer.openPopup();
        } else {
            map.setView([23.6345, -102.5528], 5);
        }
    });

    // 9. Leyenda
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
