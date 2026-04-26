// firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBO5WdFQIYpwCylsIFIkAvV6ZHnp5imd-o',
  authDomain: 'dwaraka-hostel.firebaseapp.com',
  projectId: 'dwaraka-hostel',
  storageBucket: 'dwaraka-hostel.firebasestorage.app',
  messagingSenderId: '135610429009',
  appId: '1:135610429009:web:5a3a485ea6e88f4f855270',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Dwaraka Stays';
  const options = {
    body: payload.notification?.body || 'New update received',
    icon: '/dwaraka-logo.png',
  };

  self.registration.showNotification(title, options);
});