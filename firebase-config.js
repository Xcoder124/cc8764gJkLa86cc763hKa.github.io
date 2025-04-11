<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDuejeV9uXiLT4IhD-uKvgbT8ZipPkYo34",
    authDomain: "redemption-page.firebaseapp.com",
    projectId: "redemption-page",
    storageBucket: "redemption-page.firebasestorage.app",
    messagingSenderId: "769888279262",
    appId: "1:769888279262:web:358ceb060a62062077404f",
    measurementId: "G-TLFCW9Q4MH"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>