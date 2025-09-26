/**
 * @file app.js
 * @description Lógica principal para el Geovisor de Vulnerabilidad.
 * Este script sigue una arquitectura encapsulada en un objeto `GeovisorApp`
 * para gestionar el estado, las interacciones y la renderización del mapa.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    /**
     * @class GeovisorApp
     * Objeto principal que encapsula toda la funcionalidad del geovisor.
     */
    const GeovisorApp = {

        // --- 1. CONFIGURACIÓN Y ESTADO INICIAL ---

        CONFIG: {
            mapId: 'map',
            initialCoords: [23.6345, -102.5528],
            initialZoom: 5,
            dataUrl: 'data/Vulnerabilidad.geojson',
            tileLayers: {
                "Neutral (defecto)": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }),
                "OpenStreetMap": L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }),
                "Estándar (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' }),
                "Satélite (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' }),
                "Topográfico (ESRI)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' })
            },
            styles: {
                base: { weight: 1.5, opacity: 1, color: 'white' },
                muted: { fillColor: '#A9A9A9', weight: 1, color: '#A9A9A9', fillOpacity: 0.2 },
                selection: { color: '#00FFFF', weight: 4, opacity: 1 },
                hover: { weight: 3, color: '#000', dashArray: '', fillOpacity: 0.95 }
            }
        },

        state: {
            opacity: 0.8,
            filterValue: 'all',
            selectedAquiferName: null,
            isPanelCollapsed: false,
        },

        nodes: {}, 
        leaflet: {},
        data: { aquifers: {} },

        // --- 2. PUNTO DE ENTRADA DE LA APLICACIÓN ---

        init() {
            this.initMap();
            this.setupEventListeners();
            this.loadData();
        },

        // --- 3. MÉTODOS DE INICIALIZACIÓN ---

        initMap() {
            this.leaflet.map = L.map(this.CONFIG.mapId, {
                center: this.CONFIG.initialCoords,
                zoom: this.CONFIG.initialZoom,
                layers: [this.CONFIG.tileLayers["Neutral (defecto)"]]
            });
            L.control.layers(this.CONFIG.tileLayers).addTo(this.leaflet.map);
            this.initUiControlsPanel();
            this.initToggleControlButton(); 
            this.initLegend();
            this.initLogoControl();
        },

        initUiControlsPanel() {
            const UiControl = L.Control.extend({
                onAdd: (map) => {
                    const container = L.DomUtil.create('div', 'leaflet-custom-controls');
                    this.nodes.uiControlContainer = container;
                    container.innerHTML = `
                        <h1>Vulnerabilidad a la Intrusión Salina</h1>
                        <div class="control-section">
                            <label for="acuifero-select">Selecciona un acuífero:</label>
                            <select id="acuifero-select"><option value="">-- Mostrar todos --</option></select>
                        </div>
                        <div class="control-section">
                            <label for="opacity-slider">Opacidad general: <span id="opacity-value"></span></label>
                            <input id="opacity-slider" type="range" min="0" max="1" step="0.05">
                        </div>
                        <div class="control-section">
                            <label>Iluminar por vulnerabilidad:</label>
                            <div class="radio-group">
                                <input type="radio" id="vul-todos" name="vulnerability" value="all" checked><label for="vul-todos">Todos</label>
                                <input type="radio" id="vul-1" name="vulnerability" value="1"><label for="vul-1">1</label>
                                <input type="radio" id="vul-2" name="vulnerability" value="2"><label for="vul-2">2</label>
                                <input type="radio" id="vul-3" name="vulnerability" value="3"><label for="vul-3">3</label>
                                <input type="radio" id="vul-4" name="vulnerability" value="4"><label for="vul-4">4</label>
                                <input type="radio" id="vul-5" name="vulnerability" value="5"><label for="vul-5">5</label>
                            </div>
                        </div>
                    `;
                    
                    this.nodes.aquiferSelect = container.querySelector('#acuifero-select');
                    this.nodes.opacitySlider = container.querySelector('#opacity-slider');
                    this.nodes.opacityValueSpan = container.querySelector('#opacity-value');
                    this.nodes.filterRadios = container.querySelectorAll('input[name="vulnerability"]');
                    
                    if (this.state.isPanelCollapsed) container.classList.add('collapsed');

                    L.DomEvent.disableClickPropagation(container);
                    return container;
                }
            });
            new UiControl({ position: 'topleft' }).addTo(this.leaflet.map);
        },

        initToggleControlButton() {
            const ToggleControl = L.Control.extend({
                onAdd: (map) => {
                    const button = L.DomUtil.create('div', 'leaflet-custom-toggle-button');
                    button.innerHTML = '☰'; // Ícono de menú (hamburguesa)
                    button.title = "Mostrar/Ocultar controles";
                    L.DomEvent.on(button, 'click', this.togglePanel, this);
                    L.DomEvent.disableClickPropagation(button);
                    return button;
                }
            });
            new ToggleControl({ position: 'topleft' }).addTo(this.leaflet.map);
        },
        
        setupEventListeners() {
            this.nodes.aquiferSelect.addEventListener('change', e => this.handleAquiferSelect(e.target.value));
            this.nodes.opacitySlider.addEventListener('input', e => this.handleOpacityChange(e.target.value));
            this.nodes.filterRadios.forEach(radio => radio.addEventListener('change', e => this.handleFilterChange(e.target.value)));
        },

        async loadData() {
            try {
                const response = await fetch(this.CONFIG.dataUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
                const geojsonData = await response.json();
                
                this.leaflet.geojsonLayer = L.geoJson(geojsonData, {
                    style: feature => this.getFeatureStyle(feature),
                    onEachFeature: (feature, layer) => this.processFeature(feature, layer)
                }).addTo(this.leaflet.map);
                
                this.populateAquiferSelect();
                this.updateView();
            } catch (error) {
                console.error("Error al cargar los datos geoespaciales:", error);
                alert("No se pudo cargar la capa de datos. Verifique la consola (F12) para más detalles.");
            }
        },

        // --- 4. MANEJADORES DE ESTADO (Actualizan el estado y disparan la renderización) ---
        initToggleControlButton() {
            const ToggleControl = L.Control.extend({
                onAdd: (map) => {
                    const button = L.DomUtil.create('div', 'leaflet-custom-toggle-button');
                    this.nodes.toggleButton = button; // <-- AÑADE ESTA LÍNEA
        
                    button.innerHTML = '☰';
                    button.title = "Mostrar/Ocultar controles";
                    L.DomEvent.on(button, 'click', this.togglePanel, this);
                    L.DomEvent.disableClickPropagation(button);
                    return button;
                }
            });
            new ToggleControl({ position: 'topleft' }).addTo(this.leaflet.map);
        },


        togglePanel() {
            this.state.isPanelCollapsed = !this.state.isPanelCollapsed;
            this.nodes.uiControlContainer.classList.toggle('collapsed', this.state.isPanelCollapsed);
            this.nodes.toggleButton.classList.toggle('panel-collapsed', !this.state.isPanelCollapsed); // <-- AÑADE ESTA LÍNEA
        },

        // --- 5. LÓGICA DE RENDERIZADO Y ESTILOS ---

        render() {
            if (!this.leaflet.geojsonLayer) return;
            this.leaflet.geojsonLayer.eachLayer(layer => layer.setStyle(this.getLayerStyle(layer)));
            this.updateView();
        },

        updateView() {
            this.nodes.opacityValueSpan.textContent = `${Math.round(this.state.opacity * 100)}%`;
            this.nodes.opacitySlider.value = this.state.opacity;
        },

        getLayerStyle(layer) {
            const { VULNERABIL, NOM_ACUIF } = layer.feature.properties;
            const matchesFilter = (this.state.filterValue === 'all' || VULNERABIL == this.state.filterValue);
            
            if (!matchesFilter) return this.CONFIG.styles.muted;

            let finalStyle = this.getFeatureStyle(layer.feature);
            const isSelected = (this.state.selectedAquiferName === NOM_ACUIF);
            
            if (isSelected) finalStyle = { ...finalStyle, ...this.CONFIG.styles.selection };
            
            return finalStyle;
        },

        getFeatureStyle(feature) {
            return {
                ...this.CONFIG.styles.base,
                fillColor: this.getColor(feature.properties.VULNERABIL),
                fillOpacity: this.state.opacity
            };
        },
        
        getColor(v) {
            const value = parseInt(v, 10);
            switch (value) {
                case 5: return '#D90404'; case 4: return '#F25C05';
                case 3: return '#F2B705'; case 2: return '#99C140';
                case 1: return '#2DC937'; default: return '#CCCCCC';
            }
        },

        // --- 6. PROCESAMIENTO DE DATOS Y UTILIDADES ---

        processFeature(feature, layer) {
            const { NOM_ACUIF, CLAVE_ACUI, VULNERABIL } = feature.properties;
            layer.bindPopup(`<strong>Acuífero:</strong> ${NOM_ACUIF}<br><strong>Clave:</strong> ${CLAVE_ACUI}<br><strong>Vulnerabilidad:</strong> ${VULNERABIL}`);
            
            if (!this.data.aquifers[NOM_ACUIF]) this.data.aquifers[NOM_ACUIF] = [];
            this.data.aquifers[NOM_ACUIF].push(layer);

            layer.on({
                mouseover: e => {
                    const highlightedLayer = e.target;
                    highlightedLayer.setStyle(this.CONFIG.styles.hover);
                    highlightedLayer.bringToFront();
                },
                mouseout: e => this.render()
            });
        },
        
        populateAquiferSelect() {
            const sortedNames = Object.keys(this.data.aquifers).sort();
            this.nodes.aquiferSelect.innerHTML += sortedNames.map(name => `<option value="${name}">${name}</option>`).join('');
        },
        
        initLegend() {
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = () => {
                const div = L.DomUtil.create('div', 'info legend');
                const grades = [1, 2, 3, 4, 5];
                const labels = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];
                let content = '<h4>Vulnerabilidad</h4>';
                grades.forEach((grade, i) => {
                    content += `<i style="background:${this.getColor(grade)}"></i> ${labels[i]} (Nivel ${grade})<br>`;
                });
                div.innerHTML = content;
                return div;
            };
            legend.addTo(this.leaflet.map);
        },
        
        initLogoControl() {
            const LogoControl = L.Control.extend({
                onAdd: map => {
                    const container = L.DomUtil.create('div', 'leaflet-logo-control');
                    container.innerHTML = `<img src="https://raw.githubusercontent.com/Dchable16/geovisor_vulnerabilidad/main/logos/Logo_SSSIG.png" alt="Logo SSSIG">`;
                    L.DomEvent.disableClickPropagation(container);
                    return container;
                }
            });
            new LogoControl({ position: 'bottomleft' }).addTo(this.leaflet.map);
        }
    };
    
    // Inicia la aplicación.
    GeovisorApp.init();
});
