/**
 * Maps database/API errors to safe, user-friendly messages.
 * Prevents leaking internal schema details (table names, columns, constraints).
 */
export function getSafeErrorMessage(error: unknown): string {
  const err = error as any;
  const code = err?.code;
  const message = err?.message || '';

  // PostgreSQL error codes
  if (code === '23505') return 'Este registro ya existe. Verifica los datos e intenta nuevamente.';
  if (code === '23503') return 'No se puede completar la acción porque hay datos relacionados.';
  if (code === '23514') return 'Los datos ingresados no son válidos. Revisa los campos e intenta nuevamente.';
  if (code === '42501' || message.includes('permission denied')) return 'No tienes permisos para realizar esta acción.';
  if (code === '42P01') return 'Error interno del sistema. Contacta al administrador.';
  if (code === '22P02') return 'Formato de datos inválido. Revisa los campos e intenta nuevamente.';
  if (code === '23502') return 'Faltan campos obligatorios. Completa todos los campos requeridos.';

  // RLS / auth errors
  if (message.includes('row-level security') || message.includes('RLS')) return 'No tienes permisos para acceder a estos datos.';
  if (message.includes('JWT') || message.includes('token')) return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
  if (message.includes('not authenticated') || message.includes('Not authenticated')) return 'Debes iniciar sesión para realizar esta acción.';

  // Known application errors (pass through safely)
  if (message.includes('No tienes permisos')) return message;
  if (message.includes('Ya existe un')) return message;
  if (message.includes('Invitación inválida')) return message;
  if (message.includes('Acceso denegado')) return message;
  if (message.includes('Solo el Super Admin')) return message;

  // Network errors
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) return 'Error de conexión. Verifica tu conexión a internet.';
  if (message.includes('timeout')) return 'La operación tardó demasiado. Intenta nuevamente.';

  // Log the full error for debugging (server-side)
  if (import.meta.env.DEV) console.error('Unhandled error:', err);

  // Generic fallback - never expose internal details
  return 'Ha ocurrido un error. Por favor, intenta nuevamente.';
}
