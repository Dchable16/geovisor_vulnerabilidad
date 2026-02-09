/**
 * @file uiManager.js
 * @description Gestión de UI. Versión Original.
 */

import { CONFIG } from './config.js';

export class UIManager {
    constructor(map, onStateChange) {
        this.map = map;
        this.onStateChange = onStateChange; // Callback simple
        this.nodes = {}; 
        
        this.initInfoPanel();
        this.initControlsPanel();
        this.initOpenButton();
    }
    
    initInfoPanel() {
        const mapContainer = document.querySelector('.map-container');
        const infoPanel = L.DomUtil.create('div', 'info-panel');
        // Usaba innerHTML directo
        infoPanel.innerHTML = `
            <div class="info-panel-header">
                <h2 id="info-panel-title">Detalles</h2>
                <button class="info-panel-close">✕</button>
            </div>
            <div id="info-panel-content"></div>
        `;
        mapContainer.appendChild(infoPanel);
        
        this.nodes.infoPanelContainer = infoPanel;
        this.nodes.infoPanelContent = infoPanel.querySelector('#info-panel-content');
        this.nodes.infoPanelTitle = infoPanel.querySelector('#info-panel-title');
        
        infoPanel.querySelector('.info-panel-close').addEventListener('click', () => this.hideInfoPanel());
        L.DomEvent.disableClickPropagation(infoPanel);
    }

    showInfoPanel(properties) {
        // Vulnerabilidad XSS presente aquí:
        let htmlContent = '';
        Object.keys(properties).forEach(key => {
            htmlContent += `<div><strong>${key}:</strong> ${properties[key]}</div>`;
        });
        
        this.nodes.infoPanelContent.innerHTML = htmlContent;
        this.nodes.infoPanelTitle.textContent = properties.nombre || "Detalles";
        this.nodes.infoPanelContainer.classList.add('is-visible');
    }

    hideInfoPanel() {
        this.nodes.infoPanelContainer.classList.remove('is-visible');
    }

    initControlsPanel() {
        const UiControl = L.Control.extend({
            onAdd: () => {
                const container = L.DomUtil.create('div', 'leaflet-custom-controls collapsed');
                // Carga de template insegura
                container.innerHTML = document.querySelector('#panel-template').innerHTML;
                
                this.nodes.uiControlContainer = container;
                this.cacheNodes(container);
                this.addListeners();
                L.DomEvent.disableClickPropagation(container);
                return container;
            }
        });
        new UiControl({ position: 'topleft' }).addTo(this.map);
    }

    initOpenButton() {
        // ... Lógica básica del botón hamburguesa ...
    }
    
    cacheNodes(container) {
        // Referencias a inputs
        this.nodes.searchInput = container.querySelector('#search-input');
        this.nodes.aquiferSelect = container.querySelector('#acuifero-select');
        this.nodes.opacitySlider = container.querySelector('#opacity-slider');
        this.nodes.resetButton = container.querySelector('#reset-button');
    }

    addListeners() {
        // Listeners básicos
        this.nodes.aquiferSelect.addEventListener('change', (e) => {
            this.onStateChange({ selectedAquifer: e.target.value });
        });
        
        this.nodes.opacitySlider.addEventListener('input', (e) => {
            this.onStateChange({ opacity: e.target.value });
        });
    }

    refreshControls(names) {
        // Rellenar select
        let html = '<option value="">-- Seleccionar --</option>';
        names.sort().forEach(name => {
            html += `<option value="${name}">${name}</option>`;
        });
        this.nodes.aquiferSelect.innerHTML = html;
    }
}
