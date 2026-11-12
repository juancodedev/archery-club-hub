export const hasRole = (roles: string[], targetRole: string) => roles.includes(targetRole);

export const isAdmin = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["administrador", "presidente", "secretaria", "entrenador"].includes(r));

export const isPresidente = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["presidente", "administrador"].includes(r));

export const isTesorero = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["tesorero", "administrador", "presidente"].includes(r));

export const isSecretaria = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["secretaria", "administrador", "presidente"].includes(r));

/** Same roles the tournaments and tournament_registrations RLS policies let manage. */
export const isTournamentManager = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["gestor_torneos", "administrador", "presidente"].includes(r));

/** Who can open the tournaments page: club admins and tournament managers. */
export const canOpenTournaments = (roles: string[]) => isAdmin(roles) || isTournamentManager(roles);

export const isReadOnlyMode = (member: { club_status?: string; block_type?: string | null } | null) => {
    return member?.club_status === 'bloqueado' && member?.block_type === 'partial';
};
