/**
 * @file main.js
 * @description Orquestador principal estable y optimizado.
 */
import { CONFIG } from './config.js';
import { MapManager } from './mapManager.js';
import { UIManager } from './uiManager.js';
import { StateManager } from './StateManager.js';
import { LayerFactory } from './LayerFactory.js';
import { fetchAllGeoJSON, fetchGeoJSON } from './dataLoader.js';

class GeovisorApp {
    constructor() {
        this.state = new StateManager();
        this.map = new MapManager(CONFIG.mapId);
        
        this.ui = new UIManager(this.map.map, (newState) => {
            // Si la UI pide seleccionar un acuífero, asumimos que el usuario quiere ir a él
            if (newState.selectedAquifer !== undefined) {
                newState.zoomToSelection = true;
            }
            this.state.setState(newState);
        });

        this.state.subscribe((s) => this.render(s));
        
        // Cache de datos y capas
        this.data = { aquifers: null, wells: null, coastline: null };
        this.layers = { aquifers: null, wells: null, static: {} };
        this.prev = {}; // Estado previo para diffing

        this.init();
    }

    async init() {
        this.ui.setLoading(true);
        try {
            const [manifest, wells, coast] = await Promise.all([
                fetchGeoJSON(CONFIG.endpoints.manifest),
                fetchGeoJSON(CONFIG.endpoints.wells),
                fetchGeoJSON(CONFIG.endpoints.coastline)
            ]);

            this.data.wells = wells;
            this.data.coastline = coast;

            if (manifest && manifest.files) {
                const files = await fetchAllGeoJSON(manifest.files.map(f => `data/${f}`));
                this.data.aquifers = {
                    type: "FeatureCollection",
                    features: files.flatMap(f => f.features)
                };
                this.initSearch();
            }
            
            this.render(this.state.getState(), true);
        } catch (e) {
            console.error("Error init:", e);
        } finally {
            this.ui.setLoading(false);
        }
    }

    initSearch() {
        const names = [...new Set(this.data.aquifers.features.map(f => f.properties.NOM_ACUIF || f.properties.nombre).filter(Boolean))];
        this.ui.populateControls(names);
    }

    render(state, force = false) {
        if (!this.data.aquifers) return;

        // 1. CAPA ACUÍFEROS (Smart Update)
        const filterChanged = state.filterValue !== this.prev.filterValue;
        
        if (force || filterChanged || !this.layers.aquifers) {
            if (this.layers.aquifers) this.map.map.removeLayer(this.layers.aquifers);
            
            let source = this.data.aquifers;
            if (state.filterValue && state.filterValue !== 'all') {
                source = { ...source, features: source.features.filter(f => String(f.properties.VULNERABIL) === state.filterValue) };
            }

            this.layers.aquifers = LayerFactory.createAquiferLayer(
                source, 
                (f) => this.onMapClick(f), // Clic en mapa
                state
            ).addTo(this.map.map);
        } else if (state.opacity !== this.prev.opacity) {
            this.layers.aquifers.eachLayer(l => l.setStyle({ fillOpacity: state.opacity }));
        }

        // 2. CAPA POZOS
        if (state.areWellsVisible && !this.layers.wells) {
            this.layers.wells = LayerFactory.createWellsLayer(this.data.wells, f => this.ui.showInfoPanel(f.properties)).addTo(this.map.map);
        } else if (!state.areWellsVisible && this.layers.wells) {
            this.map.map.removeLayer(this.layers.wells);
            this.layers.wells = null;
        }

        // 3. CAPAS ESTÁTICAS
        this._toggleStatic('coastline', this.data.coastline, state.isCoastlineVisible, {color: '#007BFF'});

        // 4. SELECCIÓN (La lógica clave)
        if (state.selectedAquifer && state.selectedAquifer !== this.prev.selectedAquifer) {
            const feature = this.data.aquifers.features.find(f => (f.properties.NOM_ACUIF || f.properties.nombre) === state.selectedAquifer);
            if (feature) {
                // Solo hacemos zoom si viene del menú (zoomToSelection = true)
                if (state.zoomToSelection) {
                    this.map.fitBounds(L.geoJSON(feature).getBounds());
                }
                this.ui.showInfoPanel(feature.properties, CONFIG.vulnerabilityMap);
            }
        } else if (!state.selectedAquifer && this.prev.selectedAquifer) {
            this.ui.hideInfoPanel();
        }

        if (state.reset) {
            this.map.resetView();
            this.state.setState({ reset: false, selectedAquifer: null });
        }

        this.ui.updateView(state);
        this.prev = { ...state };
    }

    onMapClick(feature) {
        const name = feature.properties.NOM_ACUIF || feature.properties.nombre;
        // Al hacer clic, actualizamos estado pero SIN zoom
        this.state.setState({ 
            selectedAquifer: name, 
            zoomToSelection: false 
        });
        // Forzamos mostrar el panel por si acaso
        this.ui.showInfoPanel(feature.properties, CONFIG.vulnerabilityMap);
    }

    _toggleStatic(key, data, visible, style) {
        if (visible && !this.layers.static[key] && data) {
            this.layers.static[key] = L.geoJSON(data, { style }).addTo(this.map.map);
        } else if (!visible && this.layers.static[key]) {
            this.map.map.removeLayer(this.layers.static[key]);
            this.layers.static[key] = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => window.app = new GeovisorApp());
