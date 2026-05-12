// types/google-maps.d.ts
// Déclaration minimale pour éviter les erreurs TypeScript avec google.maps
// chargé dynamiquement via script tag

declare global {
  interface Window {
    google: typeof google
  }
}