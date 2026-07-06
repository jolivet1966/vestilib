// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || 'AIzaSyAqLc9JMabbm23B7oGUBS_Hh48Xtr0nnbs',
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || 'vestilib-98890.firebaseapp.com',
  projectId:         self.FIREBASE_PROJECT_ID         || 'vestilib-98890',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || 'vestilib-98890.appspot.com',
  messagingSenderId: '184460207571',
  appId:             self.FIREBASE_APP_ID             || '1:184460207571:web:e52f660c038fcd29e3bb26'
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification ?? {}
  self.registration.showNotification(title ?? 'VESTILIB', {
    body:  body  ?? 'Vous avez une nouvelle notification.',
    icon:  icon  ?? '/icon-192.png',
    badge: '/icon-192.png',
    data:  payload.data ?? {},
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(clients.openWindow(url))
})