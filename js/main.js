/**
 * @file main.js
 * @description Lógica principal. Versión Original Monolítica.
 */

import { CONFIG } from './config.js';
import { MapManager } from './mapManager.js';
import { UIManager } from './uiManager.js';
import { fetchAllGeoJSON, fetchGeoJSON } from './dataLoader.js';

class GeovisorApp {
    constructor() {
        this.mapManager = new MapManager(CONFIG.mapId);
        this.uiManager = new UIManager(this.mapManager.map, this.updateState.bind(this));
        
        this.state = {
            opacity: 0.8,
            filterValue: 'all',
            selectedAquifer: null
        };
        
        this.layers = {};
        this.geoJsonData = null;
        
        this.init();
    }

    async init() {
        try {
            // Carga secuencial o paralela básica
            const manifest = await fetchGeoJSON(CONFIG.dataManifestUrl);
            if (manifest && manifest.files) {
                const files = await fetchAllGeoJSON(manifest.files.map(f => `data/${f}`));
                this.geoJsonData = {
                    type: "FeatureCollection",
                    features: files.flatMap(f => f.features)
                };
                
                this.setupSearch();
                this.render();
            }
        } catch (e) {
            console.error(e);
        }
    }

    setupSearch() {
        const names = this.geoJsonData.features.map(f => f.properties.NOM_ACUIF).filter(Boolean);
        this.uiManager.refreshControls([...new Set(names)]);
    }

    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    render() {
        // Lógica de "destruir y crear" que causaba parpadeos
        if (this.layers.mainLayer) {
            this.mapManager.map.removeLayer(this.layers.mainLayer);
        }

        let data = this.geoJsonData;
        if (this.state.filterValue !== 'all') {
            data = {
                ...data,
                features: data.features.filter(f => f.properties.VULNERABIL == this.state.filterValue)
            };
        }

        this.layers.mainLayer = L.geoJSON(data, {
            style: (feature) => this.getStyle(feature),
            onEachFeature: (feature, layer) => {
                layer.on('click', () => {
                    this.uiManager.showInfoPanel(feature.properties);
                });
            }
        }).addTo(this.mapManager.map);
        
        // Manejo de zoom si hay selección
        if (this.state.selectedAquifer) {
            const feature = this.geoJsonData.features.find(f => f.properties.NOM_ACUIF === this.state.selectedAquifer);
            if (feature) {
                const bounds = L.geoJSON(feature).getBounds();
                this.mapManager.fitBounds(bounds);
            }
        }
    }

    getStyle(feature) {
        // Estilo básico
        const vul = feature.properties.VULNERABIL;
        const color = CONFIG.vulnerabilityMap[vul] ? CONFIG.vulnerabilityMap[vul].color : '#ccc';
        return {
            fillColor: color,
            fillOpacity: this.state.opacity,
            weight: 1,
            color: 'white'
        };
    }
}

// Inicialización global
document.addEventListener('DOMContentLoaded', () => {
    new GeovisorApp();
});
