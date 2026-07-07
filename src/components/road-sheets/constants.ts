export const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Toulouse', 'Nice', 'Nantes',
  'Strasbourg', 'Montpellier', 'Rennes', 'Le Havre', 'Dijon', 'Grenoble', 'Rouen',
  'Calais', 'Metz', 'Brest', 'Limoges', 'Poitiers', 'Mulhouse',
  'Genève', 'Zurich', 'Milan', 'Barcelone', 'Madrid', 'Lisbonne',
  'Londres', 'Bruxelles', 'Amsterdam', 'Hambourg', 'Francfort', 'Munich', 'Berlin',
];

export const TRAILER_TYPES = [
  'Tautliner',
  'Frigo',
  'Citerne',
  'Plateau',
  'Benne',
  'Fourgon',
] as const;

export type TrailerType = (typeof TRAILER_TYPES)[number];

export const DRIVER_SALARY_MODES = [
  { value: 'fixed', label: 'Fixe (€)' },
  { value: 'percentage', label: 'Pourcentage (%)' },
  { value: 'per_km', label: 'Par km (€/km)' },
] as const;

export type DriverSalaryMode = 'fixed' | 'percentage' | 'per_km';
