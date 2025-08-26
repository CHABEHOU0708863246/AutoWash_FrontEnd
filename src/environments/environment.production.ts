export const environment = {
  production: true,
  apiUrl: "https://your-production-api.com",

  security: {
    tokenValidityMinutes: 30, // Plus court en production
    tokenRefreshBeforeExpiryMinutes: 5,
    secureDebugMode: false, // Pas de logs en production
    enforceHttps: true
  },

  allowedRedirectUrls: [
    'https://your-production-domain.com'
  ],

  http: {
    timeoutMs: 15000,
    retryAttempts: 2
  }
};
