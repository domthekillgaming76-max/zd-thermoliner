export interface DriverScore {
  driverId: string;
  driverName: string;
  score: number;
  availability: number;
  distanceScore: number;
  performanceScore: number;
  activityScore: number;
  currentCity: string | null;
  reasons: string[];
}

export interface DispatchAiSuggestion {
  missionId: string;
  missionReference: string;
  pickupCity: string;
  rankings: DriverScore[];
  suggestedDriverId: string | null;
  suggestedDriverName: string | null;
}
