document.addEventListener('DOMContentLoaded', function () {
    // 1. Inicialización del mapa centrado en México
    const map = L.map('map').setView([23.6345, -102.5528], 5);

    // 2. Añadir mapa base de tonos neutros (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    let geojsonLayer;
    let acuiferoData = {}; // Para almacenar referencias a las capas

    // 3. Función para obtener el color basado en el nivel de vulnerabilidad
    function getColor(vulnerabilidad) {
        return vulnerabilidad == 5 ? '#D90404' : // Rojo
               vulnerabilidad == 4 ? '#F25C05' : // Naranja
               vulnerabilidad == 3 ? '#F2B705' : // Amarillo
               vulnerabilidad == 2 ? '#99C140' :
               vulnerabilidad == 1 ? '#2DC937' : // Verde
                                     '#FFFFFF'; // Blanco por defecto
    }

    // 4. Estilo para los polígonos
    function style(feature) {
        return {
            fillColor: getColor(feature.properties.VULNERA), // IMPORTANTE: Usa el nombre exacto de tu campo
            weight: 1.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    }
    
    // 5. Funciones de interactividad (resaltado)
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 4,
            color: '#333',
            dashArray: '',
            fillOpacity: 0.8
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }

    function resetHighlight(e) {
        geojsonLayer.resetStyle(e.target);
    }
    
    // Función de zoom al hacer clic
    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

    // 6. Asignar listeners a cada capa
    function onEachFeature(feature, layer) {
        if (feature.properties && feature.properties.NOMBRE && feature.properties.VULNERA) { // IMPORTANTE: usa los nombres de campo correctos
            layer.bindPopup(`<strong>Acuífero:</strong> ${feature.properties.NOMBRE}<br><strong>Vulnerabilidad:</strong> ${feature.properties.VULNERA}`);
            
            // Llenar el objeto de datos para el selector
            acuiferoData[feature.properties.NOMBRE] = layer;
        }

        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    }

    // 7. Cargar el GeoJSON de forma asíncrona
    fetch('data/vulnerabilidad.geojson')
        .then(response => response.json())
        .then(data => {
            geojsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);

            // 8. Poblar el menú desplegable
            const selector = document.getElementById('acuifero-select');
            const acuiferoNombres = Object.keys(acuiferoData).sort();

            acuiferoNombres.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                selector.appendChild(option);
            });
            
        }).catch(error => console.error('Error cargando el GeoJSON:', error));
        
    // 9. Funcionalidad del selector de acuíferos
    document.getElementById('acuifero-select').addEventListener('change', function(e) {
        const nombreSeleccionado = e.target.value;
        if (nombreSeleccionado && acuiferoData[nombreSeleccionado]) {
            const layer = acuiferoData[nombreSeleccionado];
            map.fitBounds(layer.getBounds());
            layer.openPopup();
        } else {
            map.setView([23.6345, -102.5528], 5); // Vuelve a la vista general si se deselecciona
        }
    });


    // 10. Añadir la leyenda al mapa
    const legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [1, 2, 3, 4, 5];
        const labels = [];
        
        div.innerHTML = '<h4>Vulnerabilidad</h4>';

        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i]) + '"></i> ' +
                grades[i] + (grades[i+1] ? '' : ' (Muy Alta)<br>') ;
        }
        div.innerHTML += '<i style="background:#2DC937"></i> 1 (Muy Baja)';

        return div;
    };

    legend.addTo(map);
});
