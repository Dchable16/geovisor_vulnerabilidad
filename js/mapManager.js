/**
 * @file mapManager.js
 * @description Gestiona la creación y manipulación del mapa Leaflet.
 * Versión Original.
 */

import { CONFIG } from './config.js';

export class MapManager {
    constructor(mapId) {
        const neutralCfg = CONFIG.tileLayers["Neutral (defecto)"];
        const initialLayer = L.tileLayer(neutralCfg.url, neutralCfg.options);

        this.map = L.map(mapId, {
            center: CONFIG.initialCoords,
            zoom: CONFIG.initialZoom,
            minZoom: 6,
            layers: [initialLayer],
            zoomControl: false,
            preferCanvas: true
        });

        this.tempMarker = null;
        this.addControls();
    }

    addControls() {
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        const baseLayers = {};
        Object.keys(CONFIG.tileLayers).forEach(key => {
            const cfg = CONFIG.tileLayers[key];
            baseLayers[key] = L.tileLayer(cfg.url, cfg.options);
        });

        L.control.layers(baseLayers, null, {
            collapsed: true,
            position: 'topright',
            sortLayers: true
        }).addTo(this.map);

        this.addLegend();
        this.addLogo();
        L.control.scale({ position: 'bottomright', imperial: false }).addTo(this.map);
        this.addCustomPrintControl();
    }

    addCustomPrintControl() {
        // Implementación básica sin manejo de CORS explícito
        const PrintControl = L.Control.extend({
            options: { position: 'bottomright' },
            onAdd: () => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>`;
                L.DomEvent.on(container, 'click', async () => {
                    const mapNode = document.getElementById(CONFIG.mapId);
                    // Aquí solía fallar por CORS
                    try {
                        const dataUrl = await htmlToImage.toPng(mapNode);
                        const link = document.createElement('a');
                        link.download = 'mapa.png';
                        link.href = dataUrl;
                        link.click();
                    } catch (error) {
                        console.error('Error exportando mapa:', error);
                    }
                });
                return container;
            }
        });
        this.map.addControl(new PrintControl());
    }

    addLegend() {
        const legend = L.control({ position: 'bottomleft' });
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = '<h4>Vulnerabilidad</h4>';
            // Lógica simple de leyenda
            return div;
        };
        legend.addTo(this.map);
    }

    addLogo() {
        const LogoControl = L.Control.extend({
            onAdd: () => {
                const c = L.DomUtil.create('div', 'leaflet-logo-control');
                c.innerHTML = `<img src="logos/Logo_SSIG.png" alt="Logo">`;
                return c;
            }
        });
        new LogoControl({ position: 'bottomright' }).addTo(this.map);
    }

    fitBounds(bounds) {
        if (bounds) this.map.fitBounds(bounds.pad(0.1));
    }
    
    flyToCoords(lat, lon, name) {
        if (this.tempMarker) this.map.removeLayer(this.tempMarker);
        const latLng = L.latLng(lat, lon);
        this.tempMarker = L.marker(latLng).addTo(this.map).bindPopup(name || "").openPopup();
        this.map.flyTo(latLng, 13);
    }
    
    resetView() {
        this.map.setView(CONFIG.initialCoords, CONFIG.initialZoom);
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
    }
}
