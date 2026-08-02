/**
 * Shared API configuration.
 * In production, NEXT_PUBLIC_API_URL points to the deployed Render gateway.
 * In development, it defaults to localhost:3001.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
