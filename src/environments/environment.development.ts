export const environment = {
  production: false,
  apiUrl: "https://localhost:7139",

  // Configuration de sécurité
  security: {
    // Durée de validité du token en minutes (optionnel, géré côté serveur)
    tokenValidityMinutes: 60,

    // Durée avant rafraîchissement automatique du token en minutes
    tokenRefreshBeforeExpiryMinutes: 5,

    // Activation du mode debug sécurisé (logs sans données sensibles)
    secureDebugMode: true,

    // Configuration HTTPS
    enforceHttps: true
  },

  // URLs de redirection autorisées (liste blanche)
  allowedRedirectUrls: [
    'https://localhost:4200',
    'https://localhost:7139'
  ],

  // Configuration des timeouts HTTP
  http: {
    timeoutMs: 30000,
    retryAttempts: 3
  }
};
