// Your Firebase configuration
// Replace these placeholder values with your actual Firebase project details
const firebaseConfig = {
    apiKey: "AIzaSyB0IgvRl64oJDND3hassNuQGmQQ0-javOA",
    authDomain: "countdown-site-cdecd.firebaseapp.com",
    projectId: "countdown-site-cdecd",
    storageBucket: "countdown-site-cdecd.firebasestorage.app",
    messagingSenderId: "438095434264",
    appId: "1:438095434264:web:2c9b7d2fb9790c9cee296d",
    measurementId: "G-N8FWKCB5WY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch(err => {
        if (err.code === 'failed-precondition') {
            console.error('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.error('The current browser does not support all of the features required to enable persistence.');
        }
    }); 