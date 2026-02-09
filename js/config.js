/**
 * @file config.js
 * @description Configuración centralizada de la aplicación.
 * Define rutas, colores, mapas base y coordenadas iniciales.
 */

export const CONFIG = {
    mapId: 'map',
    initialCoords: [23.6345, -102.5528],
    initialZoom: 6,

    // Rutas de datos agrupadas para el cargador
    endpoints: {
        manifest: 'data/manifest.json',
        wells: 'data/boundaries/pozos.geojson',
        coastline: 'data/Linea_Costa_10km.geojson',
        coastline1km: 'data/Linea_Costa_1km.geojson'
    },

    // Configuración de Mapas Base
    tileLayers: {
        "Neutral (defecto)": {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            options: { attribution: '&copy; CARTO', crossOrigin: 'anonymous' }
        },
        "OpenStreetMap": {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            options: { attribution: '&copy; OpenStreetMap', crossOrigin: 'anonymous' }
        },
        "Estándar (ESRI)": {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            options: { attribution: '&copy; Esri', crossOrigin: 'anonymous' }
        },
        "Satélite (ESRI)": {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            options: { attribution: '&copy; Esri', crossOrigin: 'anonymous' }
        },
        "Topográfico (ESRI)": {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            options: { attribution: '&copy; Esri', crossOrigin: 'anonymous' }
        },
        "Terreno (ESRI)": {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
            options: { attribution: '&copy; Esri', crossOrigin: 'anonymous' }
        },
        "Océanos (ESRI)": {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
            options: { attribution: '&copy; Esri', crossOrigin: 'anonymous' }
        },
        "Gris Oscuro (ESRI)": {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            options: { attribution: '&copy; Esri', crossOrigin: 'anonymous' }
        }
    },

    // Escala de colores para Vulnerabilidad (5 = Muy Alta)
    vulnerabilityMap: {
        '5': { color: '#D90404', label: 'Muy Alta' }, // Rojo
        '4': { color: '#F25C05', label: 'Alta' },
        '3': { color: '#F2B705', label: 'Media' },
        '2': { color: '#99C140', label: 'Baja' },
        '1': { color: '#2DC937', label: 'Muy Baja' }, // Verde
        'default': { color: '#CCCCCC', label: 'Sin Datos' }
    }
};
