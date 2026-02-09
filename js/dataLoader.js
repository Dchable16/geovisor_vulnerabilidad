/**
 * @file dataLoader.js
 * @description Módulo para cargar datos GeoJSON con control de concurrencia y manejo de errores visual.
 */

// Helper para notificaciones visuales
function _showErrorNotification(message) {
    if (document.querySelector('.dataload-error-toast')) return;
    const alertBox = document.createElement('div');
    alertBox.className = 'dataload-error-toast';
    alertBox.style.cssText = `
        position: fixed; top: 20px; right: 20px; background-color: #e74c3c; color: white;
        padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999; font-family: sans-serif; display: flex; align-items: center; gap: 12px;
    `;
    alertBox.innerHTML = `<span>⚠️ ${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;cursor:pointer;font-weight:bold;margin-left:10px;">&times;</button>`;
    document.body.appendChild(alertBox);
    setTimeout(() => { if (alertBox.parentElement) alertBox.remove(); }, 8000);
}

export async function fetchGeoJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn(`⚠️ Falló carga: ${url}`, error);
        return null;
    }
}

export async function fetchAllGeoJSON(urls, concurrency = 5) {
    const results = [];
    async function processBatch(batch) {
        return await Promise.all(batch.map(url => fetchGeoJSON(url)));
    }

    try {
        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);
            results.push(...await processBatch(batch));
        }
        const validData = results.filter(data => data !== null);
        
        if (validData.length === 0 && urls.length > 0) {
            _showErrorNotification("Error crítico: No se pudieron cargar los datos.");
        }
        return validData;
    } catch (error) {
        console.error("Error en carga por lotes:", error);
        _showErrorNotification("Error del sistema cargando datos.");
        return [];
    }
}
