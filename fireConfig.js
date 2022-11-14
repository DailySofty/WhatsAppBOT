<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAYOiY2eR25oddedpHNxkjgNeaW3gzhXgo",
    authDomain: "dailysoft-bot-9sfr.firebaseapp.com",
    databaseURL: "https://dailysoft-bot-9sfr-default-rtdb.firebaseio.com",
    projectId: "dailysoft-bot-9sfr",
    storageBucket: "dailysoft-bot-9sfr.appspot.com",
    messagingSenderId: "80149016318",
    appId: "1:80149016318:web:5bad18bc9914505eac3faf",
    measurementId: "G-S64R5E7K9G"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>