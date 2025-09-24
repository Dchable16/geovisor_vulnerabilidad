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
    let acuiferoData = {}; // Objeto para almacenar las capas por nombre

    // 3. Función de color según vulnerabilidad
    function getColor(vulnerabilidad) {
        return vulnerabilidad == 5 ? '#D90404' : // Rojo
               vulnerabilidad == 4 ? '#F25C05' : // Naranja
               vulnerabilidad == 3 ? '#F2B705' : // Amarillo
               vulnerabilidad == 2 ? '#99C140' :
               vulnerabilidad == 1 ? '#2DC937' : // Verde
                                     '#FFFFFF'; 
    }

    // 4. Estilo de los polígonos
    function style(feature) {
        return {
            fillColor: getColor(feature.properties.Vulberabil),
            weight: 1.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    }
    
    // 5. Funciones de interactividad
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 4,
            color: '#333',
            fillOpacity: 0.8
        });
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

    // 6. Asignar popups y eventos a cada polígono (ACTUALIZADO)
    function onEachFeature(feature, layer) {
        const props = feature.properties;
        // Verifica que existan las nuevas propiedades antes de crear el popup
        if (props && props.NOM_ACUIF && props.CLAVE_ACUIF) { 
            // Popup actualizado para mostrar Nombre, Clave y Vulnerabilidad
            layer.bindPopup(
                `<strong>Acuífero:</strong> ${props.NOM_ACUIF}<br>` +
                `<strong>Clave:</strong> ${props.CLAVE_ACUIF}<br>` +
                `<strong>Vulnerabilidad:</strong> ${props.Vulberabil}`
            );
            
            // Llenar el objeto de datos para el selector usando el nombre del acuífero
            acuiferoData[props.NOM_ACUIF] = layer;
        }

        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    }

    // 7. Cargar el GeoJSON UNIFICADO
    fetch('data/vulnerabilidad.geojson') // Esto ahora funcionará si completaste el Paso 1
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error de red - Estatus: ${response.status}. Asegúrate de que 'data/vulnerabilidad.geojson' existe.`);
            }
            return response.json();
        })
        .then(data => {
            geojsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);
    
            // Poblar el menú desplegable (ACTUALIZADO)
            const selector = document.getElementById('acuifero-select');
            // Obtener los nombres de los acuíferos y ordenarlos alfabéticamente
            const acuiferoNombres = Object.keys(acuiferoData).sort();
    
            acuiferoNombres.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre; // El texto visible será el nombre del acuífero
                selector.appendChild(option);
            });
    
        })
        .catch(error => {
            console.error('Error al cargar o procesar el GeoJSON:', error);
            alert('No se pudo cargar la capa de datos. Revisa la consola (F12) para más detalles.');
        });
        
    // 8. Funcionalidad del selector de acuíferos (ACTUALIZADO)
    document.getElementById('acuifero-select').addEventListener('change', function(e) {
        const nombreSeleccionado = e.target.value;
        if (nombreSeleccionado && acuiferoData[nombreSeleccionado]) {
            const layer = acuiferoData[nombreSeleccionado];
            map.fitBounds(layer.getBounds());
            layer.openPopup();
        } else {
            // Si se selecciona "Todos los acuíferos", se reinicia la vista
            map.setView([23.6345, -102.5528], 5);
        }
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
