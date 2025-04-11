import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDuejeV9uXiLT4IhD-uKvgbT8ZipPkYo34",
  authDomain: "redemption-page.firebaseapp.com",
  projectId: "redemption-page",
  storageBucket: "redemption-page.appspot.com",
  messagingSenderId: "769888279262",
  appId: "1:769888279262:web:358ceb060a62062077404f",
  measurementId: "G-TLFCW9Q4MH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };  // Make db available to other files
