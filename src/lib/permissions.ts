export const hasRole = (roles: string[], targetRole: string) => roles.includes(targetRole);

export const isAdmin = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["administrador", "presidente", "secretaria", "entrenador"].includes(r));

export const isPresidente = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["presidente", "administrador"].includes(r));

export const isTesorero = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["tesorero", "administrador", "presidente"].includes(r));

export const isSecretaria = (roles: string[], isSuperAdmin = false) =>
    isSuperAdmin || roles.some(r => ["secretaria", "administrador", "presidente"].includes(r));
