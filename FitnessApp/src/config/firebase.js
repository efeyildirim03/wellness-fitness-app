import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCBKALjBe_ETC2HGoFnu1y33dFD1kbvkuI",
  authDomain: "fitnessapp-8d4cc.firebaseapp.com",
  projectId: "fitnessapp-8d4cc",
  storageBucket: "fitnessapp-8d4cc.firebasestorage.app",
  messagingSenderId: "670224771084",
  appId: "1:670224771084:web:d556e9985fc57146142629",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
