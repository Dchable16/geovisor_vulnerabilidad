document.addEventListener('DOMContentLoaded', function () {
    // --- 1. DEFINICIÓN DE MAPAS BASE ---
    
    // Mapa actual (nuestro mapa por defecto)
    const cartoDB_Positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    });

    // Google Maps - Híbrido (requiere el plugin GoogleMutant)
    const googleHybrid = L.gridLayer.googleMutant({
        type: 'hybrid' // Puede ser 'roadmap', 'satellite', 'hybrid' o 'terrain'
    });

    // Google Maps - Carreteras (requiere el plugin GoogleMutant)
    const googleRoadmap = L.gridLayer.googleMutant({
        type: 'roadmap'
    });

    // Mapa Topográfico de ESRI (una excelente alternativa gratuita)
    const esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    });

    // Objeto que agrupa los mapas base para el control
    const baseMaps = {
        "Mapa Neutral": cartoDB_Positron,
        "Google Híbrido": googleHybrid,
        "Google Carreteras": googleRoadmap,
        "Topográfico (ESRI)": esri_WorldTopoMap
    };


    // --- 2. INICIALIZACIÓN DEL MAPA ---
    const map = L.map('map', {
        center: [23.6345, -102.5528],
        zoom: 5,
        layers: [cartoDB_Positron] // Añadimos la capa por defecto aquí
    });
    
    // AÑADIMOS EL CONTROL DE CAPAS AL MAPA
    L.control.layers(baseMaps).addTo(map);

    let geojsonLayer;
    let acuiferoData = {}; // Guardará { "NombreAcuifero": [capa1, capa2, ...] }


    // --- SECCIÓN 3: LÓGICA DE DATOS GEOJSON (sin cambios) ---

    function getColor(vulnerabilidad) {
        const value = parseInt(vulnerabilidad, 10);
        return value === 5 ? '#D90404' :
               value === 4 ? '#F25C05' :
               value === 3 ? '#F2B705' :
               value === 2 ? '#99C140' :
               value === 1 ? '#2DC937' :
                             '#CCCCCC';
    }

    function style(feature) {
        return {
            fillColor: getColor(feature.properties.VULNERABIL),
            weight: 1.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.8
        };
    }
    
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

    function onEachFeature(feature, layer) {
        const props = feature.properties;
        if (props && props.NOM_ACUIF) {
            layer.bindPopup(
                `<strong>Acuífero:</strong> ${props.NOM_ACUIF}<br>` +
                `<strong>Clave:</strong> ${props.CLAVE_ACUI}<br>` +
                `<strong>Vulnerabilidad:</strong> ${props.VULNERABIL}`
            );

            const nombreAcuifero = props.NOM_ACUIF;
            if (!acuiferoData[nombreAcuifero]) {
                acuiferoData[nombreAcuifero] = [];
            }
            acuiferoData[nombreAcuifero].push(layer);
        }
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    }

    fetch('data/Vulnerabilidad.geojson')
        .then(response => {
            if (!response.ok) throw new Error(`Error de red. No se encontró 'data/Vulnerabilidad.geojson'.`);
            return response.json();
        })
        .then(data => {
            geojsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);
    
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
        
    // Selector de acuíferos
    document.getElementById('acuifero-select').addEventListener('change', function(e) {
        const nombreSeleccionado = e.target.value;
        if (nombreSeleccionado && acuiferoData[nombreSeleccionado]) {
            const layers = acuiferoData[nombreSeleccionado];
            const featureGroup = L.featureGroup(layers);
            map.fitBounds(featureGroup.getBounds());
        } else {
            map.setView([23.6345, -102.5528], 5);
        }
    });

    // Leyenda
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
