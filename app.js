document.addEventListener('DOMContentLoaded', () => {

    const GeovisorApp = {

// --- 1. CONFIGURACIÓN Y ESTADO ---
        CONFIG: { /* ...sin cambios... */ },
        state: { /* ...sin cambios... */ },
        nodes: {}, 
        leaflet: {},
        data: { aquifers: {} },

        // --- 2. MÉTODO DE INICIALIZACIÓN ---
        init() {
            this.initMap();
            // cacheDomNodes ya no es necesario aquí
            this.setupEventListeners();
            this.loadData();
        },

        // --- 3. MÉTODOS DE CONFIGURACIÓN INICIAL ---
        
        // ELIMINADO: cacheDomNodes() ya no es un método separado. Su lógica se ha movido a initUiControls().

        initMap() {
            const initialLayer = this.CONFIG.tileLayers["Neutral (defecto)"];
            this.leaflet.map = L.map(this.CONFIG.mapId, { center: this.CONFIG.initialCoords, zoom: this.CONFIG.initialZoom, layers: [initialLayer] });
            L.control.layers(this.CONFIG.tileLayers).addTo(this.leaflet.map);
            this.initLegend();
            this.initLogoControl();
            this.initUiControls(); 
        },
        
        // MODIFICADO: Este método ahora también se encarga de cachear los nodos que crea.
        initUiControls() {
            const UiControl = L.Control.extend({
                // Usamos una función de flecha para mantener el contexto de 'this' apuntando a GeovisorApp
                onAdd: (map) => {
                    const container = L.DomUtil.create('div', 'leaflet-custom-controls');
                    
                    container.innerHTML = `
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
                    
                    // --- LÓGICA MOVIDA AQUÍ ---
                    // En lugar de buscar en 'document', buscamos dentro del 'container' que acabamos de crear.
                    // Esto garantiza que los elementos existen.
                    this.nodes.aquiferSelect = container.querySelector('#acuifero-select');
                    this.nodes.opacitySlider = container.querySelector('#opacity-slider');
                    this.nodes.opacityValueSpan = container.querySelector('#opacity-value');
                    this.nodes.filterRadios = container.querySelectorAll('input[name="vulnerability"]');
                    // -------------------------

                    L.DomEvent.disableClickPropagation(container);
                    return container;
                }
            });

            new UiControl({ position: 'topright' }).addTo(this.leaflet.map);
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
        
        initLegend() {
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = () => {
                const div = L.DomUtil.create('div', 'info legend');
                const grades = [1, 2, 3, 4, 5];
                const labels = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];
                let legendHtml = '<h4>Vulnerabilidad</h4>';
                grades.forEach((grade, i) => {
                    legendHtml += `<i style="background:${this.getColor(grade)}"></i> ${labels[i]} (Nivel ${grade})<br>`;
                });
                div.innerHTML = legendHtml;
                return div;
            };
            legend.addTo(this.leaflet.map);
        },
        
        initLogoControl() {
            // 1. Crear una nueva clase de control en la posición 'bottomleft'
            const LogoControl = L.Control.extend({
                onAdd: function(map) {
                    // 2. Crear el elemento HTML (un div que contendrá la imagen)
                    const container = L.DomUtil.create('div', 'leaflet-logo-control');
                    container.innerHTML = `<img src="https://raw.githubusercontent.com/Dchable16/geovisor_vulnerabilidad/main/logos/Logo_SSIG.png" alt="Logo SSIG">`;
                    
                    // 3. Importante: Deshabilitar la propagación de eventos del mapa al logo
                    L.DomEvent.disableClickPropagation(container);
                    
                    return container;
                }
            });

            // 4. Instanciar y añadir el nuevo control al mapa
            new LogoControl({ position: 'bottomleft' }).addTo(this.leaflet.map);
        }
    };

    // Iniciar la aplicación
    GeovisorApp.init();

});
