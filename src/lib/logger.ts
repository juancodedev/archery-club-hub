/**
 * Centralized logging utility for the platform.
 * Logs are only displayed in the development environment.
 */

const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: unknown[]) => {
        if (isDev) {
            console.log(...args);
        }
    },
    error: (...args: unknown[]) => {
        if (isDev) {
            console.error(...args);
        }
    },
    warn: (...args: unknown[]) => {
        if (isDev) {
            console.warn(...args);
        }
    },
    info: (...args: unknown[]) => {
        if (isDev) {
            console.info(...args);
        }
    },
    debug: (...args: unknown[]) => {
        if (isDev) {
            console.debug(...args);
        }
    }
};

export default logger;
