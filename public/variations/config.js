/* Fill these in after running the push server (see README.md).
   With no vapidPublicKey the app still shows real OS notifications for
   on-device reminders (while the app is open or recently used). With a key and
   an api URL, notifications also arrive when the app is closed. */
window.IMPACT_CONFIG = {
  vapidPublicKey: '',   // output of: npx web-push generate-vapid-keys
  api: ''               // e.g. https://your-app.vercel.app  (no trailing slash). Empty = same origin /api
};
