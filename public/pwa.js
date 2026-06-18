/**
 * FURY X ONE 👿 - PWA Service Worker Registration
 * Enregistrement du service worker pour l'installation PWA
 * Signé: SOLITAIRE HACK
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker enregistré avec succès:', registration.scope);
        
        // Écouter les mises à jour du service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouveau service worker disponible
              console.log('Nouveau Service Worker disponible');
              // Notification à l'utilisateur pour recharger la page
              if (confirm('Une nouvelle version est disponible. Voulez-vous recharger?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.log('Erreur lors de l\'enregistrement du Service Worker:', error);
      });
  });
}

// Écouter les messages du service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('Cache mis à jour');
    }
  });
}
