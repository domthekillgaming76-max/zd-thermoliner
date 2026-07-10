export const queryKeys = {
  dashboard: (userId?: string) => ['dashboard', userId ?? 'anonymous'] as const,
  roadSheets: {
    all: ['roadSheets'] as const,
    list: () => ['roadSheets', 'list'] as const,
    detail: (id: string) => ['roadSheets', id] as const,
  },
  drivers: {
    all: ['drivers'] as const,
    list: () => ['drivers', 'list'] as const,
    module: () => ['drivers', 'module'] as const,
    detail: (id: string) => ['drivers', 'detail', id] as const,
    hrFolder: (userId: string) => ['drivers', 'hrFolder', userId] as const,
  },
  trucks: {
    all: ['trucks'] as const,
    list: () => ['trucks', 'list'] as const,
    module: () => ['trucks', 'module'] as const,
    detail: (id: string) => ['trucks', 'detail', id] as const,
  },
  integrations: {
    all: ['integrations'] as const,
    driver: (profileId: string) => ['integrations', 'driver', profileId] as const,
    admin: () => ['integrations', 'admin'] as const,
  },
  userRole: (userId?: string) => ['userRole', userId ?? 'anonymous'] as const,
  bank: {
    all: ['bank'] as const,
    data: (filters?: unknown) => ['bank', 'data', filters ?? {}] as const,
    financing: () => ['bank', 'financing'] as const,
  },
  recruitment: {
    all: ['recruitment', 'all'] as const,
    mine: (userId: string) => ['recruitment', 'mine', userId] as const,
  },
  dispatch: {
    all: ['dispatch'] as const,
    module: () => ['dispatch', 'module'] as const,
    detail: (id: string) => ['dispatch', 'detail', id] as const,
  },
  invoicing: {
    all: ['invoicing'] as const,
    module: () => ['invoicing', 'module'] as const,
    detail: (id: string) => ['invoicing', 'detail', id] as const,
  },
  admin: {
    all: ['admin'] as const,
    module: () => ['admin', 'module'] as const,
    permissions: (userId: string) => ['admin', 'permissions', userId] as const,
    activity: (userId: string) => ['admin', 'activity', userId] as const,
  },
  wall: {
    all: ['wall'] as const,
    module: (userId?: string) => ['wall', 'module', userId ?? 'anonymous'] as const,
  },
  assistant: {
    all: ['assistant'] as const,
    module: (userId?: string) => ['assistant', 'module', userId ?? 'anonymous'] as const,
  },
  reports: {
    all: ['reports'] as const,
    module: () => ['reports', 'module'] as const,
  },
  driverPortal: {
    all: ['driverPortal'] as const,
    module: (userId?: string) => ['driverPortal', 'module', userId ?? 'anonymous'] as const,
  },
  driverBank: {
    all: ['driverBank'] as const,
    bundle: (profileId: string) => ['driverBank', 'bundle', profileId] as const,
    adminAccounts: () => ['driverBank', 'adminAccounts'] as const,
    adminTransfers: () => ['driverBank', 'adminTransfers'] as const,
  },
  vault: {
    all: ['vault'] as const,
    module: (userId?: string) => ['vault', 'module', userId ?? 'anonymous'] as const,
  },
  tracking: {
    all: ['tracking'] as const,
    module: (userId?: string) => ['tracking', 'module', userId ?? 'anonymous'] as const,
  },
  freight: {
    all: ['freight'] as const,
    module: (userId?: string) => ['freight', 'module', userId ?? 'anonymous'] as const,
  },
  training: {
    all: ['training'] as const,
    module: (userId?: string) => ['training', 'module', userId ?? 'anonymous'] as const,
  },
  finance: {
    all: ['finance'] as const,
    module: () => ['finance', 'module'] as const,
    invoices: () => ['finance', 'invoices'] as const,
    salaries: (driverId?: string) => ['finance', 'salaries', driverId ?? 'all'] as const,
    settings: () => ['finance', 'settings'] as const,
    accounting: () => ['finance', 'accounting'] as const,
  },
  liveOps: {
    metrics: () => ['liveOps', 'metrics'] as const,
    fleetMap: (userId?: string) => ['liveOps', 'fleetMap', userId ?? 'anonymous'] as const,
  },
  statistics: {
    all: ['statistics'] as const,
    bundle: () => ['statistics', 'bundle'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (userId?: string) => ['notifications', 'list', userId ?? 'anonymous'] as const,
  },
  onlinePresence: {
    all: ['onlinePresence'] as const,
    list: () => ['onlinePresence', 'list'] as const,
  },
  appModules: {
    all: ['appModules'] as const,
  },
  telemetryJobs: {
    all: ['telemetryJobs'] as const,
    active: () => ['telemetryJobs', 'active'] as const,
    pending: () => ['telemetryJobs', 'pending'] as const,
    driver: (profileId: string) => ['telemetryJobs', 'driver', profileId] as const,
    timeline: (jobId: string) => ['telemetryJobs', 'timeline', jobId] as const,
  },
};
