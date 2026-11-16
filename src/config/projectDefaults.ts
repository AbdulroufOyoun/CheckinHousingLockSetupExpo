/** Team defaults — clone + npm install, no manual env setup. */

export const PRODUCTION_API_BASE = 'https://checkin-api.learnnowsyria.com';

/**
 * Fallback when EXPO_PUBLIC_API_BASE / Settings override are unset.
 * `npm start` sets EXPO_PUBLIC_API_BASE to the LAN API (`http://<lan>:8000`).
 */
export const DEV_API_BASE = PRODUCTION_API_BASE;

export const TTLOCK_CLIENT_ID = '6515a7be0115469f90ad7b1bddbc4b5b';
