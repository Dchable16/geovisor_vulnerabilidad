/**
 * @file config.js
 * @description Almacena la configuración estática del geovisor.
 * Versión Original.
 */

export const CONFIG = {
    mapId: 'map',
    initialCoords: [23.6345, -102.5528],
    initialZoom: 6,
    dataManifestUrl: 'data/manifest.json', // Nota: Aquí no se usaba 'endpoints'
    
    // Mapas base
    tileLayers: {
        "Neutral (defecto)": {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            options: { attribution: '&copy; CARTO' }
        },
        "OpenStreetMap": {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            options: { attribution: '&copy; OpenStreetMap' }
        },
        "Estándar (ESRI)": {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            options: { attribution: '&copy; Esri' }
        },
        "Satélite (ESRI)": {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            options: { attribution: '&copy; Esri' }
        }
    },

    // Escala de colores original
    vulnerabilityMap: {
        '5': { color: '#D90404', label: 'Muy Alta' },
        '4': { color: '#F25C05', label: 'Alta' },
        '3': { color: '#F2B705', label: 'Media' },
        '2': { color: '#99C140', label: 'Baja' },
        '1': { color: '#2DC937', label: 'Muy Baja' },
        'default': { color: '#CCCCCC', label: 'Sin Datos' }
    },
    
    styles: {
        base: { weight: 1, opacity: 0.8, color: '#555555', fillOpacity: 0.65 },
        hover: { weight: 2.5, color: '#007BFF', fillOpacity: .75 },
        clickHighlight: { color: "#FFFF00", weight: 4, opacity: 1, fillOpacity: 0.85 }
    }
};
