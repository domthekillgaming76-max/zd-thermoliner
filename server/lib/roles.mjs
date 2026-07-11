const RAW_TO_APP_ROLE = {
  visiteur: 'visiteur', visitor: 'visiteur', invité: 'visiteur', invite: 'visiteur',
  guest: 'visiteur', candidat: 'visiteur', recruit: 'visiteur', recruitment: 'visiteur',
  recruteur: 'visiteur', recrue: 'visiteur',
  chauffeur: 'chauffeur', driver: 'chauffeur', conducteur: 'chauffeur', member: 'chauffeur',
  membre: 'chauffeur', flotte: 'chauffeur', dispatcher: 'chauffeur', directeur: 'chauffeur',
  fleet_manager: 'chauffeur', manager: 'chauffeur', tractionnaire: 'chauffeur',
  responsable: 'chauffeur', modérateur: 'chauffeur', moderateur: 'chauffeur',
  comptable: 'chauffeur', accountant: 'chauffeur',
  admin: 'admin', administrator: 'admin', administrateur: 'admin',
  owner: 'admin', superadmin: 'admin', pdg: 'admin', patron: 'admin',
};

const DOM76_EMAIL = (process.env.DOM76_ADMIN_EMAIL || 'dom76@zdthermoliner.fr').toLowerCase();

export function normalizeRole(role) {
  if (!role) return 'visiteur';
  const key = String(role).trim().toLowerCase();
  return RAW_TO_APP_ROLE[key] ?? 'visiteur';
}

export function isAdministratorEmail(email) {
  if (!email) return false;
  return String(email).trim().toLowerCase() === DOM76_EMAIL;
}

export function requireRole(role, email, allowed) {
  if (isAdministratorEmail(email)) return;
  const norm = normalizeRole(role);
  if (!allowed.includes(norm)) {
    const err = new Error(`Rôle requis : ${allowed.join(', ')}`);
    err.status = 403;
    throw err;
  }
}

export function roleMatchesVisible(roles, userRole) {
  const appRole = normalizeRole(userRole);
  return (roles ?? []).some(r => normalizeRole(r) === appRole || r === userRole);
}

export function canAccessRoom(role, email, roomKey, rooms) {
  if (isAdministratorEmail(email)) return true;
  const room = (rooms ?? []).find(r => r.room_key === roomKey);
  if (!room) return true;
  if (!room.enabled) return false;
  return roleMatchesVisible(room.visible_to_roles, role);
}
