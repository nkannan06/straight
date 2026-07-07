export const SERVER_HTTP_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8787';
export const SERVER_WS_URL = SERVER_HTTP_URL.replace(/^http/, 'ws') + '/ws';
