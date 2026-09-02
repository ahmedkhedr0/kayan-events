import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const fallbackConfig = {
  projectId: "clever-center-czp2g",
  appId: "1:464743357581:web:e543a364d9aed214fa96c4",
  apiKey: "AIzaSyDPis0jgqTcISkUwRLTMhh0D0NfhbvmOGE",
  authDomain: "clever-center-czp2g.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-kayanevents-be3565eb-4266-4844-a6c3-7c64a1958b59",
  storageBucket: "clever-center-czp2g.firebasestorage.app",
  messagingSenderId: "464743357581",
};

const config = {
  ...fallbackConfig,
  ...(firebaseConfigJson || {}),
};

const app = !getApps().length ? initializeApp(config) : getApp();

export const db = getFirestore(
  app,
  config.firestoreDatabaseId && config.firestoreDatabaseId !== ''
    ? config.firestoreDatabaseId
    : '(default)'
);

export { app };
export default app;
