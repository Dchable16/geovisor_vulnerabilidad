/**
 * @file uiManager.js
 * @description Gestión de interfaz con seguridad XSS implementada.
 */
import { CONFIG } from './config.js';

export class UIManager {
    constructor(map, onStateChange) {
        this.map = map;
        this.onStateChange = onStateChange;
        this.nodes = { loader: document.querySelector('#app-loader') };
        this.initInfoPanel();
        this.initControls();
    }

    initInfoPanel() {
        const container = document.querySelector('.map-container');
        const panel = L.DomUtil.create('div', 'info-panel');
        this.nodes.infoPanel = panel;
        
        const template = document.querySelector('#info-panel-template');
        if(template) panel.appendChild(template.content.cloneNode(true));
        
        container.appendChild(panel);
        
        this.nodes.infoContent = panel.querySelector('#info-panel-content');
        this.nodes.infoTitle = panel.querySelector('#info-panel-title');
        
        panel.querySelector('.info-panel-close').addEventListener('click', () => this.hideInfoPanel());
        L.DomEvent.disableClickPropagation(panel);
    }

    showInfoPanel(props, vulMap) {
        // Limpieza segura
        this.nodes.infoContent.innerHTML = '';
        const frag = document.createDocumentFragment();

        // Título seguro
        const title = props.NOM_ACUIF || props.nombre || props.Nombre || "Detalle";
        this.nodes.infoTitle.textContent = title;

        // Construcción segura de filas
        if (props.VULNERABIL !== undefined) {
            // Modo Vulnerabilidad
            const fields = [
                {k:'NOM_ACUIF', l:'Nombre'}, 
                {k:'CLAVE_ACUI', l:'Clave'}, 
                {k:'VULNERABIL', l:'Vulnerabilidad'}
            ];
            fields.forEach(f => {
                let val = props[f.k];
                if(f.k === 'VULNERABIL' && vulMap) {
                    const vInfo = vulMap[String(val)];
                    val = val ? `${val} (${vInfo ? vInfo.label : ''})` : 'N/A';
                }
                frag.appendChild(this._createRow(f.l, val));
            });
        } else {
            // Modo Genérico (Pozos/Otros)
            const ignore = ['geometry','fid','id','type'];
            Object.keys(props).forEach(key => {
                if(!ignore.includes(key.toLowerCase()) && props[key]) {
                    frag.appendChild(this._createRow(key, props[key]));
                }
            });
        }
        
        this.nodes.infoContent.appendChild(frag);
        this.nodes.infoPanel.classList.add('is-visible');
    }

    hideInfoPanel() {
        this.nodes.infoPanel.classList.remove('is-visible');
        if(this.onStateChange) this.onStateChange({ selectedAquifer: null });
    }

    _createRow(label, value) {
        const row = document.createElement('div');
        row.className = 'info-panel-row';
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        const span = document.createElement('span');
        span.textContent = value;
        row.appendChild(strong);
        row.appendChild(span);
        return row;
    }

    setLoading(loading) {
        if(this.nodes.loader) this.nodes.loader.style.display = loading ? 'flex' : 'none';
    }

    // Controles Principales
    initControls() {
        const ControlBox = L.Control.extend({
            onAdd: () => {
                const div = L.DomUtil.create('div', 'leaflet-custom-controls collapsed');
                const tpl = document.querySelector('#panel-template');
                if(tpl) div.appendChild(tpl.content.cloneNode(true));
                
                this.nodes.controls = div;
                this.bindEvents(div);
                L.DomEvent.disableClickPropagation(div);
                return div;
            }
        });
        new ControlBox({ position: 'topleft' }).addTo(this.map);

        // Botón de menú hamburguesa
        const MenuBtn = L.Control.extend({
            onAdd: () => {
                const btn = L.DomUtil.create('div', 'leaflet-open-button is-visible');
                btn.innerHTML = '☰';
                btn.onclick = () => this.toggleMenu(true);
                this.nodes.menuBtn = btn;
                return btn;
            }
        });
        new MenuBtn({ position: 'topleft' }).addTo(this.map);
    }

    bindEvents(container) {
        container.querySelector('.panel-close-button').onclick = () => this.toggleMenu(false);
        
        // Buscador
        const searchInput = container.querySelector('#search-input');
        const resultsBox = container.querySelector('#search-results-container');
        
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value, resultsBox));
        
        // Select
        this.nodes.select = container.querySelector('#acuifero-select');
        this.nodes.select.onchange = (e) => this.onStateChange({ selectedAquifer: e.target.value });

        // Capas
        container.querySelector('#wells-toggle').onchange = (e) => this.onStateChange({ areWellsVisible: e.target.checked });
        container.querySelector('#coastline-toggle').onchange = (e) => this.onStateChange({ isCoastlineVisible: e.target.checked });
        
        // Opacidad
        const slider = container.querySelector('#opacity-slider');
        const label = container.querySelector('#opacity-value');
        slider.oninput = (e) => {
            const v = e.target.value;
            label.textContent = Math.round(v*100) + '%';
            this.onStateChange({ opacity: parseFloat(v) });
        };

        // Radios Vulnerabilidad
        const radios = container.querySelectorAll('input[name="vulnerability"]');
        radios.forEach(r => {
            r.onchange = (e) => this.onStateChange({ filterValue: e.target.value });
        });
        
        // Botón Reset
        container.querySelector('#reset-button').onclick = () => {
            searchInput.value = '';
            resultsBox.style.display = 'none';
            this.onStateChange({ reset: true });
        };
    }

    toggleMenu(show) {
        this.nodes.controls.classList.toggle('collapsed', !show);
        this.nodes.menuBtn.classList.toggle('is-visible', !show);
    }

    handleSearch(query, container) {
        if(query.length < 2) { container.style.display = 'none'; return; }
        const matches = this.searchList.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
        
        container.innerHTML = '';
        if(matches.length) {
            matches.forEach(name => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.textContent = name;
                div.onclick = () => {
                    container.style.display = 'none';
                    this.onStateChange({ selectedAquifer: name });
                };
                container.appendChild(div);
            });
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }

    populateControls(names) {
        this.searchList = names;
        if(this.nodes.select) {
            const opts = names.sort().map(n => `<option value="${n}">${n}</option>`).join('');
            this.nodes.select.innerHTML += opts;
        }
    }

    updateView(state) {
        // Sincronizar UI con Estado
        if(this.nodes.select) this.nodes.select.value = state.selectedAquifer || "";
    }
}
