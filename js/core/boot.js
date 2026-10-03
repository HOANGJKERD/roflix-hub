// Lightweight boot diagnostics.
window.addEventListener('error', (event) => {
  console.error('[RoFlix] Runtime error:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[RoFlix] Unhandled promise rejection:', event.reason);
});
