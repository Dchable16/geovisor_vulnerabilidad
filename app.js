document.addEventListener('DOMContentLoaded', function () {

    // --- SECCIÓN 1: DEFINICIÓN DE MAPAS BASE (CON SELECCIÓN AMPLIADA DE ESRI) ---
    
    // Mapa neutral claro (el que usamos por defecto)
    const cartoDB_Positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });

    // Satélite de Esri
    const esri_Imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Topográfico de Esri
    const esri_Topo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, etc.'
    });

    // Callejero Estándar de Esri
    const esri_Street = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, etc.'
    });

    // NUEVO: Terreno con sombras de Esri
    const esri_Terrain = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA'
    });

    // NUEVO: Océanos de Esri (con batimetría)
    const esri_Oceans = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri'
    });
    
    // Lienzo gris oscuro de Esri
    const esri_DarkGray = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    });

    // Agrupamos todos los mapas base en un objeto para el control de capas
    const baseMaps = {
        "Neutral (defecto)": cartoDB_Positron,
        "Estándar (ESRI)": esri_Street,
        "Satélite (ESRI)": esri_Imagery,
        "Topográfico (ESRI)": esri_Topo,
        "Terreno (ESRI)": esri_Terrain,
        "Océanos (ESRI)": esri_Oceans,
        "Gris Oscuro (ESRI)": esri_DarkGray
    };


    // --- SECCIÓN 2: INICIALIZACIÓN DEL MAPA ---
    const map = L.map('map', {
        center: [23.6345, -102.5528],
        zoom: 5,
        layers: [cartoDB_Positron] // La capa que se mostrará por defecto
    });
    
    L.control.layers(baseMaps).addTo(map);

    // Variables globales
    let geojsonLayer;
    let acuiferoData = {};


    // --- (El resto del código no necesita cambios y permanece idéntico) ---


    // --- SECCIÓN 3: LÓGICA DE DATOS GEOJSON Y ESTILOS ---
    function getColor(vulnerabilidad) {
        const value = parseInt(vulnerabilidad, 10);
        switch (value) {
            case 5: return '#D90404';
            case 4: return '#F25C05';
            case 3: return '#F2B705';
            case 2: return '#99C140';
            case 1: return '#2DC937';
            default: return '#CCCCCC';
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
