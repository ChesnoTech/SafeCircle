import { config } from '../config/index.js';

// Convert lat/lng to a grid cell string — must match the mobile client's getGridCell()
export function getGridCell(latitude, longitude) {
  const gridSize = config.geoGridSize;
  const latCell = Math.floor(latitude / gridSize) * gridSize;
  const lngCell = Math.floor(longitude / gridSize) * gridSize;
  return `${latCell.toFixed(2)},${lngCell.toFixed(2)}`;
}

// Get all grid cells within a radius (for broadcasting alerts to multiple regions)
export function getGridCellsInRadius(latitude, longitude, radiusKm) {
  const gridSize = config.geoGridSize;
  // Approximate degrees per km (rough, good enough for grid cells)
  const latDegPerKm = 1 / 111;
  const lngDegPerKm = 1 / (111 * Math.cos(latitude * Math.PI / 180));

  const latSpan = radiusKm * latDegPerKm;
  const lngSpan = radiusKm * lngDegPerKm;

  const cells = [];
  for (let lat = latitude - latSpan; lat <= latitude + latSpan; lat += gridSize) {
    for (let lng = longitude - lngSpan; lng <= longitude + lngSpan; lng += gridSize) {
      cells.push(getGridCell(lat, lng));
    }
  }

  return [...new Set(cells)];
}
