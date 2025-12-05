import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase untuk SENJA DIGITAL SD NEGERI 5 BILATO
const firebaseConfig = {
  apiKey: "AIzaSyBy1DcpB-DJn1bXLr2hEpmjCWQdGiJ02nc",
  authDomain: "senja-digital-sdn5.firebaseapp.com",
  projectId: "senja-digital-sdn5",
  storageBucket: "senja-digital-sdn5.firebasestorage.app",
  messagingSenderId: "450505792496",
  appId: "1:450505792496:web:b1fc99478d270ddac81b35",
  measurementId: "G-3HB2ST3B1H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export database reference agar bisa dipakai di file lain
export const db = getFirestore(app);