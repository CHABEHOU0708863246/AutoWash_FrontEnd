const { execSync } = require('child_process');

console.log('🚀 Démarrage du build pour Vercel...');

try {
  // Installation des dépendances
  console.log('📦 Installation des dépendances...');
  execSync('npm ci', { stdio: 'inherit' });

  // Build de l'application
  console.log('🔨 Construction de l\'application Angular...');
  execSync('npm run build:ssr', { stdio: 'inherit' });

  console.log('✅ Build terminé avec succès!');
} catch (error) {
  console.error('❌ Erreur lors du build:', error.message);
  process.exit(1);
}
