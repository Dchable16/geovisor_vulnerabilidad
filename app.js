document.addEventListener('DOMContentLoaded', function () {

    // --- SECCIÓN 1: DEFINICIÓN DE MAPAS BASE (CON ESRI) ---
    
    // Mapa neutral claro (bueno por defecto)
    const cartoDB_Positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });

    // Satélite de Esri
    const esri_Imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Topográfico de Esri
    const esri_Topo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    });

    // Callejero de Esri
    const esri_Street = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    });
    
    // Lienzo gris oscuro de Esri (ideal para resaltar datos)
    const esri_DarkGray = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    });

    // Agrupamos los mapas base en un objeto para el control de capas
    const baseMaps = {
        "Neutral (defecto)": cartoDB_Positron,
        "Satélite (ESRI)": esri_Imagery,
        "Topográfico (ESRI)": esri_Topo,
        "Calles (ESRI)": esri_Street,
        "Gris Oscuro (ESRI)": esri_DarkGray
    };


    // --- SECCIÓN 2: INICIALIZACIÓN DEL MAPA ---
    const map = L.map('map', {
        center: [23.6345, -102.5528], // Centrado en México
        zoom: 5,
        layers: [cartoDB_Positron] // La capa que se mostrará por defecto
    });
    
    L.control.layers(baseMaps).addTo(map);

    // Variables globales para la lógica
    let geojsonLayer;
    let acuiferoData = {};


    // --- (El resto del código es idéntico al anterior) ---


    // --- SECCIÓN 3: LÓGICA DE DATOS GEOJSON Y ESTILOS ---
    function getColor(vulnerabilidad) {
        const value = parseInt(vulnerabilidad, 10);
        switch (value) {
            case 5: return '#D90404'; // Rojo
            case 4: return '#F25C05'; // Naranja
            case 3: return '#F2B705'; // Amarillo
            case 2: return '#99C140';
            case 1: return '#2DC937'; // Verde
            default: return '#CCCCCC';// Gris por defecto
        }
    }
    function style(feature) {
        return {
            fillColor: getColor(feature.properties.VULNERABIL),
            weight: 1.5, opacity: 1, color: 'white', fillOpacity: 0.8
        };
    }

    // --- SECCIÓN 4: INTERACTIVIDAD DEL MAPA ---
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({ weight: 5, color: '#000', dashArray: '', fillOpacity: 0.9 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }
    function resetHighlight(e) { geojsonLayer.resetStyle(e.target); }
    function onEachFeature(feature, layer) {
        const props = feature.properties;
        if (props && props.NOM_ACUIF && props.VULNERABIL) {
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
        layer.on({ mouseover: highlightFeature, mouseout: resetHighlight });
    }

    // --- SECCIÓN 5: CARGA DE DATOS Y LÓGICA DEL SELECTOR ---
    fetch('data/Vulnerabilidad.geojson')
        .then(response => {
            if (!response.ok) { throw new Error(`Error de red - Estatus ${response.status}. No se pudo encontrar el archivo GeoJSON.`); }
            return response.json();
        })
        .then(data => {
            geojsonLayer = L.geoJson(data, { style: style, onEachFeature: onEachFeature }).addTo(map);
            const selector = document.getElementById('acuifero-select');
            const acuiferoNombres = Object.keys(acuiferoData).sort();
            acuiferoNombres.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre; option.textContent = nombre;
                selector.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error Crítico:', error);
            alert('No se pudo cargar la capa de datos. Revisa la consola del navegador (F12).');
        });
        
    document.getElementById('acuifero-select').addEventListener('change', function(e) {
        const nombreSeleccionado = e.target.value;
        if (nombreSeleccionado && acuiferoData[nombreSeleccionado]) {
            const layers = acuiferoData[nombreSeleccionado];
            const featureGroup = L.featureGroup(layers);
            map.fitBounds(featureGroup.getBounds().pad(0.1));
        } else {
            map.setView([23.6345, -102.5528], 5);
        }
    });

    // --- SECCIÓN 6: LEYENDA ---
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [1, 2, 3, 4, 5];
        const labels = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];
        div.innerHTML = '<h4>Vulnerabilidad</h4>';
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML += 
                `<i style="background:${getColor(grades[i])}"></i> ${labels[i]} (Nivel ${grades[i]})<br>`;
        }
        return div;
    };
    legend.addTo(map);
});
