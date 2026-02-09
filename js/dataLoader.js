/**
 * @file dataLoader.js
 * @description Módulo para cargar los datos GeoJSON.
 * Versión Original.
 */

export async function fetchGeoJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`No se pudo cargar el archivo desde ${url}:`, error);
        return null;
    }
}

export async function fetchAllGeoJSON(urls) {
    try {
        const promises = urls.map(url => fetchGeoJSON(url));
        const results = await Promise.all(promises);
        return results.filter(data => data !== null);
    } catch (error) {
        console.error("Error cargando archivos GeoJSON en paralelo:", error);
        return [];
    }
}
