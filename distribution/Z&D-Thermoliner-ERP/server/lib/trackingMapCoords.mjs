/** European city coordinates for telemetry map projection. */
export const CITY_COORDS = {
  Paris: { lat: 48.8566, lng: 2.3522 },
  Lyon: { lat: 45.764, lng: 4.8357 },
  Marseille: { lat: 43.2965, lng: 5.3698 },
  Lille: { lat: 50.6292, lng: 3.0573 },
  Bordeaux: { lat: 44.8378, lng: -0.5792 },
  Toulouse: { lat: 43.6047, lng: 1.4442 },
  Nice: { lat: 43.7102, lng: 7.262 },
  Nantes: { lat: 47.2184, lng: -1.5536 },
  Strasbourg: { lat: 48.5734, lng: 7.7521 },
  Montpellier: { lat: 43.6108, lng: 3.8767 },
  Rennes: { lat: 48.1173, lng: -1.6778 },
  'Le Havre': { lat: 49.4944, lng: 0.1079 },
  Dijon: { lat: 47.322, lng: 5.0415 },
  Grenoble: { lat: 45.1885, lng: 5.7245 },
  Rouen: { lat: 49.4432, lng: 1.0993 },
  Calais: { lat: 50.9513, lng: 1.8587 },
  Metz: { lat: 49.1193, lng: 6.1757 },
  Brest: { lat: 48.3904, lng: -4.4861 },
  Limoges: { lat: 45.8336, lng: 1.2611 },
  Poitiers: { lat: 46.5802, lng: 0.3404 },
  Mulhouse: { lat: 47.7508, lng: 7.3359 },
  Genève: { lat: 46.2044, lng: 6.1432 },
  Zurich: { lat: 47.3769, lng: 8.5417 },
  Milan: { lat: 45.4642, lng: 9.19 },
  Barcelone: { lat: 41.3874, lng: 2.1686 },
  Madrid: { lat: 40.4168, lng: -3.7038 },
  Lisbonne: { lat: 38.7223, lng: -9.1393 },
  Londres: { lat: 51.5074, lng: -0.1278 },
  Bruxelles: { lat: 50.8503, lng: 4.3517 },
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Hambourg: { lat: 53.5511, lng: 9.9937 },
  Francfort: { lat: 50.1109, lng: 8.6821 },
  Munich: { lat: 48.1351, lng: 11.582 },
  Berlin: { lat: 52.52, lng: 13.405 },
  Prague: { lat: 50.0755, lng: 14.4378 },
  Vienne: { lat: 48.2082, lng: 16.3738 },
  Rome: { lat: 41.9028, lng: 12.4964 },
  Turin: { lat: 45.0703, lng: 7.6869 },
};

export function resolveCityCoords(city) {
  if (!city) return null;
  const direct = CITY_COORDS[city];
  if (direct) return direct;
  const key = Object.keys(CITY_COORDS).find(
    (k) => k.toLowerCase() === city.toLowerCase() || city.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? CITY_COORDS[key] : null;
}

export function interpolatePosition(from, to, progressPercent) {
  const t = Math.max(0, Math.min(1, (progressPercent ?? 0) / 100));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

export function isValidEuropeCoords(lat, lng) {
  return lat != null && lng != null
    && lat >= 35 && lat <= 58
    && lng >= -10 && lng <= 20;
}

export function resolveRoutePosition(sourceCity, destinationCity, progressPercent, rawPosition) {
  const dep = resolveCityCoords(sourceCity);
  const arr = resolveCityCoords(destinationCity);

  if (rawPosition && isValidEuropeCoords(rawPosition.lat, rawPosition.lng)) {
    return rawPosition;
  }

  if (dep && arr) {
    return interpolatePosition(dep, arr, progressPercent ?? 5);
  }

  if (dep) return dep;
  if (arr) return arr;
  return { lat: 48.8566, lng: 2.3522 };
}
