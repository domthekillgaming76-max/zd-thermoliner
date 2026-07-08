import { CITIES } from '../components/road-sheets/constants';

const CUSTOM_CITIES_KEY = 'zd-custom-cities';

/** Villes ETS2 / ATS courantes (en plus des villes réelles). */
export const ETS2_ATS_CITIES = [
  'Berlin', 'Hambourg', 'Munich', 'Francfort', 'Cologne', 'Stuttgart', 'Dresde', 'Leipzig',
  'Vienne', 'Salzbourg', 'Innsbruck', 'Graz', 'Linz',
  'Prague', 'Brno', 'Ostrava', 'Plzeň',
  'Warsaw', 'Kraków', 'Gdańsk', 'Poznań', 'Wrocław',
  'Budapest', 'Debrecen', 'Szeged',
  'Bucarest', 'Cluj-Napoca', 'Timișoara',
  'Sofia', 'Plovdiv', 'Varna',
  'Istanbul', 'Ankara', 'Izmir', 'Bursa',
  'Moscou', 'Saint-Pétersbourg', 'Kazan', 'Novossibirsk',
  'Helsinki', 'Tampere', 'Turku',
  'Stockholm', 'Göteborg', 'Malmö',
  'Oslo', 'Bergen', 'Trondheim',
  'Copenhague', 'Aarhus', 'Odense',
  'Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven',
  'Bruxelles', 'Anvers', 'Gand', 'Liège',
  'Londres', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh', 'Liverpool',
  'Dublin', 'Cork', 'Galway',
  'Madrid', 'Barcelone', 'Valence', 'Séville', 'Bilbao', 'Malaga',
  'Lisbonne', 'Porto', 'Faro',
  'Rome', 'Milan', 'Turin', 'Naples', 'Florence', 'Bologne', 'Gênes',
  'Zurich', 'Genève', 'Bâle', 'Berne', 'Lausanne',
  'Luxembourg', 'Monaco',
  'Calais', 'Dunkerque', 'Reims', 'Troyes', 'Orléans', 'Tours', 'Angers',
  'Clermont-Ferrand', 'Saint-Étienne', 'Perpignan', 'Toulon', 'Nîmes',
  'Ajaccio', 'Bastia',
  'Los Angeles', 'San Francisco', 'Las Vegas', 'Phoenix', 'Denver', 'Seattle',
  'Dallas', 'Houston', 'Chicago', 'New York', 'Boston', 'Miami', 'Atlanta',
  'Calgary', 'Vancouver', 'Toronto', 'Montreal', 'Québec',
  'Mexico City', 'Guadalajara', 'Monterrey',
] as const;

const BASE_CITY_POOL: string[] = [...new Set([...CITIES, ...ETS2_ATS_CITIES])];

function normalizeCity(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function loadCustomCities(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CITIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').map(normalizeCity).filter(Boolean);
  } catch {
    return [];
  }
}

export function rememberCustomCity(city: string): void {
  const normalized = normalizeCity(city);
  if (!normalized || normalized.length < 2) return;

  const existing = new Set([...BASE_CITY_POOL, ...loadCustomCities()].map(c => c.toLowerCase()));
  if (existing.has(normalized.toLowerCase())) return;

  const custom = loadCustomCities();
  const next = [normalized, ...custom.filter(c => c.toLowerCase() !== normalized.toLowerCase())].slice(0, 80);
  localStorage.setItem(CUSTOM_CITIES_KEY, JSON.stringify(next));
}

export function getAllCitySuggestions(extra?: string[]): string[] {
  const pool = new Set<string>();
  for (const city of [...BASE_CITY_POOL, ...loadCustomCities(), ...(extra ?? [])]) {
    const n = normalizeCity(city);
    if (n) pool.add(n);
  }
  return [...pool].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function filterCitySuggestions(query: string, limit = 12, extra?: string[]): string[] {
  const q = normalizeCity(query).toLowerCase();
  const all = getAllCitySuggestions(extra);

  if (!q) return all.slice(0, limit);

  const starts: string[] = [];
  const contains: string[] = [];

  for (const city of all) {
    const lower = city.toLowerCase();
    if (lower.startsWith(q)) starts.push(city);
    else if (lower.includes(q)) contains.push(city);
    if (starts.length + contains.length >= limit * 2) break;
  }

  return [...starts, ...contains].slice(0, limit);
}

export function isValidCityInput(value: string): boolean {
  return normalizeCity(value).length >= 2;
}

export { normalizeCity };
