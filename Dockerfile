# Étape de build
FROM node:18-alpine AS build

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./

# Installer TOUTES les dépendances (sans les flags obsolètes)
RUN npm ci

# Copier le code source
COPY . .

# Construire l'application (sans --prod qui est obsolète)
RUN npm run build

# Étape de production avec nginx
FROM nginx:alpine

# Copier les fichiers construits
COPY --from=build /app/dist/auto-wash-frontend /usr/share/nginx/html

# Copier la configuration nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port 8080 (requis par Cloud Run)
EXPOSE 8080

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]
