/**
 * @file mapManager.js
 * @description Gestión del mapa Leaflet con soporte para exportación de imágenes (CORS).
 */
import { CONFIG } from './config.js';

export class MapManager {
    constructor(mapId) {
        // Inicializar mapa con la capa base por defecto y CORS habilitado
        const neutralCfg = CONFIG.tileLayers["Neutral (defecto)"];
        const initialLayer = L.tileLayer(neutralCfg.url, {
            ...neutralCfg.options,
            crossOrigin: 'anonymous' 
        });

        this.map = L.map(mapId, {
            center: CONFIG.initialCoords,
            zoom: CONFIG.initialZoom,
            minZoom: 5,
            layers: [initialLayer],
            zoomControl: false,
            preferCanvas: true
        });

        this.tempMarker = null;
        this.addControls();
    }

    addControls() {
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        // Crear control de capas con CORS habilitado en todas
        const baseLayers = {};
        Object.keys(CONFIG.tileLayers).forEach(key => {
            const cfg = CONFIG.tileLayers[key];
            baseLayers[key] = L.tileLayer(cfg.url, {
                ...cfg.options,
                crossOrigin: 'anonymous'
            });
        });

        L.control.layers(baseLayers, null, { collapsed: true, position: 'topright' }).addTo(this.map);
        this.addLegend();
        this.addLogo();
        L.control.scale({ position: 'bottomright', imperial: false }).addTo(this.map);
        this.addPrintControl();
    }

    addPrintControl() {
        const PrintControl = L.Control.extend({
            options: { position: 'bottomright' },
            onAdd: () => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.title = 'Exportar mapa como imagen';
                container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>`;
                container.style.backgroundColor = 'white';
                container.style.padding = '5px';
                container.style.cursor = 'pointer';

                L.DomEvent.on(container, 'click', async () => {
                    const node = document.getElementById(CONFIG.mapId);
                    const loader = document.getElementById('app-loader');
                    if(loader) loader.style.display = 'flex';
                    try {
                        const dataUrl = await htmlToImage.toPng(node, {
                            quality: 0.95, pixelRatio: 2,
                            filter: (n) => !['leaflet-control-zoom','leaflet-control-layers','leaflet-control-custom'].some(c => n.classList?.contains(c))
                        });
                        const link = document.createElement('a');
                        link.download = 'mapa_geovisor.png';
                        link.href = dataUrl;
                        link.click();
                    } catch (e) {
                        console.error(e);
                        alert('Error exportando mapa (posible bloqueo CORS en capa externa).');
                    } finally {
                        if(loader) loader.style.display = 'none';
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
            Object.keys(CONFIG.vulnerabilityMap).filter(k => k !== 'default').sort((a,b) => b-a).forEach(k => {
                const {color, label} = CONFIG.vulnerabilityMap[k];
                div.innerHTML += `<i style="background:${color}"></i> ${label} (${k})<br>`;
            });
            div.innerHTML += `<i style="background:${CONFIG.vulnerabilityMap.default.color};border:1px solid #999"></i> Sin Datos`;
            return div;
        };
        legend.addTo(this.map);
    }

    addLogo() {
        const logo = L.control({ position: 'bottomright' });
        logo.onAdd = () => {
            const div = L.DomUtil.create('div', 'leaflet-logo-control');
            div.innerHTML = `<img src="logos/Logo_SSIG.png" alt="SSIG" style="height:50px;">`;
            return div;
        };
        logo.addTo(this.map);
    }

    fitBounds(bounds) { if(bounds) this.map.fitBounds(bounds.pad(0.1)); }
    
    flyToCoords(lat, lon, name) {
        if(this.tempMarker) this.map.removeLayer(this.tempMarker);
        const pos = [lat, lon];
        this.tempMarker = L.marker(pos).addTo(this.map).bindPopup(name || "Ubicación").openPopup();
        this.map.flyTo(pos, 12);
    }

    resetView() {
        this.map.setView(CONFIG.initialCoords, CONFIG.initialZoom);
        if(this.tempMarker) { this.map.removeLayer(this.tempMarker); this.tempMarker = null; }
    }
}
