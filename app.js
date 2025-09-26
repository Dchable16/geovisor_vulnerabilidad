document.addEventListener('DOMContentLoaded', () => {

    const GeovisorApp = {

        // --- 1. CONFIGURACIÓN Y ESTADO ---

        CONFIG: {
            mapId: 'map',
            initialCoords: [23.6345, -102.5528],
            initialZoom: 5,
            tileLayers: {
                "Neutral (ESRI)": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }),
                "OpenStreetMap": L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }),
                "Estándar (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' }),
                "Satélite (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' }),
                "Topográfico (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' }),
                "Terreno (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', { attribution:'&copy; Esri' }),
                "Océanos (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', { attribution:'&copy; Esri' }),
                "Gris Oscuro (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution:'&copy; Esri' })
            },
            styles: {
                muted: { fillColor: '#A9A9A9', weight: 1, color: '#A9A9A9', fillOpacity: 0.2 },
                selection: { color: '#00FFFF', weight: 2, opacity: .7 },
                hover: { weight: 2.5, color: '#000', dashArray: '', fillOpacity: 0.7 }
            }
        },

        state: {
            opacity: 0.6,
            filterValue: 'all',
            selectedAquiferName: null,
        },

        nodes: {}, // Referencias a elementos del DOM
        leaflet: {}, // Referencias a objetos de Leaflet
        data: { // Datos cargados y procesados
            aquifers: {}
        },

        // --- 2. MÉTODO DE INICIALIZACIÓN ---

        init() {
            this.cacheDomNodes();
            this.initMap();
            this.setupEventListeners();
            this.loadData();
        },

        // --- 3. MÉTODOS DE CONFIGURACIÓN INICIAL ---

        cacheDomNodes() {
            this.nodes.mapContainer = document.getElementById(this.CONFIG.mapId);
            this.nodes.aquiferSelect = document.getElementById('acuifero-select');
            this.nodes.opacitySlider = document.getElementById('opacity-slider');
            this.nodes.opacityValueSpan = document.getElementById('opacity-value');
            this.nodes.filterRadios = document.querySelectorAll('input[name="vulnerability"]');
        },

        initMap() {
            const initialLayer = this.CONFIG.tileLayers["Neutral (defecto)"];
            this.leaflet.map = L.map(this.CONFIG.mapId, {
                center: this.CONFIG.initialCoords,
                zoom: this.CONFIG.initialZoom,
                layers: [initialLayer]
            });
            L.control.layers(this.CONFIG.tileLayers).addTo(this.leaflet.map);
            this.initLegend();
            this.initLogoControl();
        },

        setupEventListeners() {
            this.nodes.aquiferSelect.addEventListener('change', e => this.handleAquiferSelect(e.target.value));
            this.nodes.opacitySlider.addEventListener('input', e => this.handleOpacityChange(e.target.value));
            this.nodes.filterRadios.forEach(radio => {
                radio.addEventListener('change', e => this.handleFilterChange(e.target.value));
            });
        },

        async loadData() {
            try {
                const response = await fetch('data/Vulnerabilidad.geojson');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const geojsonData = await response.json();
                
                this.leaflet.geojsonLayer = L.geoJson(geojsonData, {
                    style: feature => this.getFeatureStyle(feature),
                    onEachFeature: (feature, layer) => {
                        this.processFeature(feature, layer);
                    }
                }).addTo(this.leaflet.map);
                
                this.populateAquiferSelect();
                this.updateView();
            } catch (error) {
                console.error("Error crítico al cargar los datos:", error);
                alert("No se pudo cargar la capa de datos. Revisa la consola (F12) para más detalles.");
            }
        },

        // --- 4. MANEJADORES DE ESTADO (Actualizan el estado y disparan el render) ---

        handleAquiferSelect(aquiferName) {
            this.state.selectedAquiferName = aquiferName || null;
            if (this.state.selectedAquiferName) {
                const layers = this.data.aquifers[this.state.selectedAquiferName];
                this.leaflet.map.fitBounds(L.featureGroup(layers).getBounds().pad(0.1));
            } else {
                this.leaflet.map.setView(this.CONFIG.initialCoords, this.CONFIG.initialZoom);
            }
            this.render();
        },

        handleOpacityChange(opacity) {
            this.state.opacity = parseFloat(opacity);
            this.render();
        },

        handleFilterChange(filterValue) {
            this.state.filterValue = filterValue;
            this.render();
        },

        // --- 5. LÓGICA DE RENDERIZADO Y ESTILOS ---

        render() {
            if (!this.leaflet.geojsonLayer) return;

            this.leaflet.geojsonLayer.eachLayer(layer => {
                layer.setStyle(this.getLayerStyle(layer));
            });
            
            this.updateView();
        },

        updateView() {
            // Actualiza elementos de la UI que dependen del estado
            this.nodes.opacityValueSpan.textContent = `${Math.round(this.state.opacity * 100)}%`;
            this.nodes.opacitySlider.value = this.state.opacity;
        },

        getLayerStyle(layer) {
            const { VULNERABIL, NOM_ACUIF } = layer.feature.properties;
            
            const matchesFilter = (this.state.filterValue === 'all' || VULNERABIL == this.state.filterValue);
            if (!matchesFilter) {
                return this.CONFIG.styles.muted;
            }

            let finalStyle = this.getFeatureStyle(layer.feature);

            const isSelected = (this.state.selectedAquiferName === NOM_ACUIF);
            if (isSelected) {
                finalStyle = { ...finalStyle, ...this.CONFIG.styles.selection };
            }
            
            return finalStyle;
        },

        getFeatureStyle(feature) {
            const { VULNERABIL } = feature.properties;
            const color = this.getColor(VULNERABIL);
            return {
                fillColor: color,
                weight: 1.5,
                opacity: 1,
                color: 'white',
                fillOpacity: this.state.opacity
            };
        },
        
        getColor(v) { /* Función pura, no necesita `this` */
            const value = parseInt(v);
            switch (value) {
                case 5: return '#D90404'; case 4: return '#F25C05';
                case 3: return '#F2B705'; case 2: return '#99C140';
                case 1: return '#2DC937'; default: return '#CCCCCC';
            }
        },

        // --- 6. PROCESAMIENTO DE DATOS Y UTILIDADES ---

        processFeature(feature, layer) {
            const { NOM_ACUIF, CLAVE_ACUI, VULNERABIL } = feature.properties;
            
            // Poblar popup
            layer.bindPopup(`<strong>Acuífero:</strong> ${NOM_ACUIF}<br><strong>Clave:</strong> ${CLAVE_ACUI}<br><strong>Vulnerabilidad:</strong> ${VULNERABIL}`);
            
            // Agrupar acuíferos por nombre
            if (!this.data.aquifers[NOM_ACUIF]) {
                this.data.aquifers[NOM_ACUIF] = [];
            }
            this.data.aquifers[NOM_ACUIF].push(layer);

            layer.on({
                mouseover: e => {
                    const highlightedLayer = e.target;
                    highlightedLayer.setStyle(this.CONFIG.styles.hover);
                    
                    // Esta línea trae la capa al frente, por encima de sus vecinas.
                    highlightedLayer.bringToFront(); 
                },
                mouseout: e => this.render() // Al redibujar, el orden se restablece automáticamente.
            });
        },
        
        populateAquiferSelect() {
            const sortedNames = Object.keys(this.data.aquifers).sort();
            sortedNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                this.nodes.aquiferSelect.appendChild(option);
            });
        },

    };

    // Iniciar la aplicación
    GeovisorApp.init();

});
