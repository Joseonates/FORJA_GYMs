// FORJA · conexión con Firebase (compartida por index.html, panel.html y app.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp, increment, Timestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { FORJA } from "./forja-config.js";
export { FORJA };

export const configured = ["apiKey", "authDomain", "projectId", "appId"].every(k => firebaseConfig[k] && !String(firebaseConfig[k]).startsWith("PEGA"));
export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = configured ? getAuth(app) : null;
export const db = configured ? getFirestore(app) : null;
export const fs = { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp, increment, Timestamp };

/* ---------- utilidades ---------- */
export const dkey = d => { const x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
export const today = () => dkey(Date.now());
export const newId = (...path) => doc(collection(db, ...path)).id;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const makeCode = (n = 6) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
export const normEmail = e => String(e || "").trim().toLowerCase();

export const DEF_PLANS = [
  { id: "diario", n: "Pase diario", tipo: "tiempo", days: 1, price: 10000, on: true },
  { id: "semanal", n: "Semanal", tipo: "tiempo", days: 7, price: 40000, on: true },
  { id: "tiquetera10", n: "Tiquetera 10 entradas", tipo: "entradas", entries: 10, days: 60, price: 85000, on: true },
  { id: "mensual", n: "Mensual", tipo: "tiempo", days: 30, price: 120000, on: true },
  { id: "trimestral", n: "Trimestral", tipo: "tiempo", days: 90, price: 320000, on: true },
  { id: "anual", n: "Anual", tipo: "tiempo", days: 365, price: 1150000, on: true }
];
export const DEF_METHODS = [
  { id: "efectivo", n: "Efectivo", on: true }, { id: "nequi", n: "Nequi", on: true }, { id: "daviplata", n: "Daviplata", on: true },
  { id: "transferencia", n: "Transferencia", on: true }, { id: "tarjeta", n: "Tarjeta", on: true }
];

/* ---------- suscripción a FORJA (planes del gimnasio) ---------- */
export const PRUEBA_DIAS = 60;
export const TIERS = {
  gratis:   { id: "gratis",   n: "Gratis",   price: 0,      max: 30 },
  gimnasio: { id: "gimnasio", n: "Gimnasio", price: 79000,  max: 200 },
  pro:      { id: "pro",      n: "Pro",      price: 149000, max: Infinity }
};
/* Qué plan necesita cada función */
export const FEAT_TIER = { wa: "gimnasio", retos: "gimnasio", kiosk: "gimnasio", progs: "pro" };
const RANK = { gratis: 0, gimnasio: 1, pro: 2 };
export const toMs = v => v == null ? null : typeof v === "number" ? v : v.toMillis ? v.toMillis() : v.seconds ? v.seconds * 1000 : new Date(v).getTime();
/** Plan efectivo del gimnasio hoy: {id, trial, hasta, grace, expired, fundador} */
export function tierOf(gym, now = Date.now()) {
  const s = (gym && gym.sus) || {}, hasta = toMs(s.hasta), GRACIA = 5 * 864e5;
  if (!s.plan) { // gimnasios creados antes de los planes: prueba desde su creación
    const c = toMs(gym && gym.created), fin = c ? c + PRUEBA_DIAS * 864e5 : null;
    return fin && now < fin ? { id: "pro", trial: true, hasta: fin } : { id: "gratis", expired: "prueba" };
  }
  if (s.plan === "prueba") return hasta && now < hasta ? { id: "pro", trial: true, hasta } : { id: "gratis", expired: "prueba" };
  if (s.plan === "gratis" || !TIERS[s.plan]) return { id: "gratis" };
  if (!hasta || now < hasta + GRACIA) return { id: s.plan, hasta, fundador: !!s.fundador, grace: !!hasta && now > hasta };
  return { id: "gratis", expired: s.plan, hasta };
}
export const tierAllows = (t, feat) => RANK[t.id] >= RANK[FEAT_TIER[feat] || "gratis"];
export const daysLeft = ms => ms == null ? null : Math.ceil((ms - Date.now()) / 864e5);
export const weekKey = (d = new Date()) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dkey(x); }; // lunes de la semana
export const isAdminEmail = e => FORJA.adminEmails.map(normEmail).includes(normEmail(e));
/** Abre WhatsApp con el soporte de FORJA (o deja elegir el contacto si no hay número configurado) */
export const soporteUrl = text => "https://wa.me/" + String(FORJA.soporteWhatsApp || "").replace(/\D/g, "") + "?text=" + encodeURIComponent(text);

/* ---------- sesión ---------- */
export function waitUser() {
  return new Promise(res => { const off = onAuthStateChanged(auth, u => { off(); res(u); }); });
}
export async function getProfile(uid) {
  const s = await getDoc(doc(db, "usuarios", uid));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export const homeFor = rol => rol === "miembro" ? "app.html" : "panel.html";

/** Protege una página: devuelve {user, profile, gym} o redirige. */
export async function session(allowed) {
  if (!configured) { location.replace("index.html"); throw new Error("sin configuración"); }
  const user = await waitUser();
  if (!user) { location.replace("index.html"); throw new Error("sin sesión"); }
  const profile = await getProfile(user.uid);
  if (!profile) { location.replace("index.html"); throw new Error("sin perfil"); }
  if (!allowed.includes(profile.rol)) { location.replace(homeFor(profile.rol)); throw new Error("rol"); }
  const g = await getDoc(doc(db, "gimnasios", profile.gymId));
  return { user, profile, gym: { id: g.id, ...g.data() } };
}

export const login = (email, pass) => signInWithEmailAndPassword(auth, normEmail(email), pass);
export const logout = () => signOut(auth).then(() => location.replace("index.html"));
export const resetPass = email => sendPasswordResetEmail(auth, normEmail(email));
export const createAccount = (email, pass) => createUserWithEmailAndPassword(auth, normEmail(email), pass);

/** Dueño: crea la cuenta y su gimnasio. */
export async function registerOwner({ name, email, pass, gymName, sede }) {
  const cred = await createAccount(email, pass);
  return createGymFor(cred.user, { name, gymName, sede });
}
export async function createGymFor(user, { name, gymName, sede }) {
  const gid = newId("gimnasios");
  const b = writeBatch(db);
  b.set(doc(db, "gimnasios", gid), {
    owner: user.uid, name: gymName.trim(), sede: (sede || "").trim(), color: "#2143F0",
    welcome: `Bienvenido a ${gymName.trim()}. Aquí se entrena en serio.`, code: makeCode(),
    plans: DEF_PLANS, methods: DEF_METHODS, created: serverTimestamp(),
    sus: { plan: "prueba", hasta: Timestamp.fromMillis(Date.now() + PRUEBA_DIAS * 864e5) }
  });
  b.set(doc(db, "usuarios", user.uid), { rol: "dueno", gymId: gid, n: name.trim(), email: normEmail(user.email), created: serverTimestamp() });
  await b.commit();
  return "panel.html";
}

/** Miembro o equipo: se une a un gimnasio con su código. */
export async function joinWithCode(user, { code, name }) {
  const email = normEmail(user.email);
  const gq = await getDocs(query(collection(db, "gimnasios"), where("code", "==", String(code).trim().toUpperCase()), limit(1)));
  if (gq.empty) throw new Error("NO_GYM");
  const gid = gq.docs[0].id;
  // ¿Invitación del equipo (recepción o entrenador)?
  const eq = await getDoc(doc(db, "gimnasios", gid, "equipo", email));
  if (eq.exists()) {
    const b = writeBatch(db);
    b.set(doc(db, "usuarios", user.uid), { rol: eq.data().rol, gymId: gid, n: (name || eq.data().n || "").trim(), email, created: serverTimestamp() });
    b.update(doc(db, "gimnasios", gid, "equipo", email), { uid: user.uid });
    await b.commit();
    return "panel.html";
  }
  // ¿Miembro registrado por el gimnasio con este correo?
  const mq = await getDocs(query(collection(db, "gimnasios", gid, "miembros"), where("email", "==", email), limit(1)));
  if (mq.empty) throw new Error("NO_MEMBER");
  const m = mq.docs[0];
  if (m.data().uid && m.data().uid !== user.uid) throw new Error("TAKEN");
  const b = writeBatch(db);
  b.update(doc(db, "gimnasios", gid, "miembros", m.id), { uid: user.uid });
  b.set(doc(db, "usuarios", user.uid), { rol: "miembro", gymId: gid, memberId: m.id, n: (name || m.data().n || "").trim(), email, created: serverTimestamp() });
  await b.commit();
  return "app.html";
}
export async function registerWithCode({ code, name, email, pass }) {
  const cred = await createAccount(email, pass);
  return joinWithCode(cred.user, { code, name });
}

/** Mensajes de error en español. */
export function errMsg(e) {
  const c = (e && (e.code || e.message)) || "";
  const M = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/network-request-failed": "Sin conexión a internet.",
    "permission-denied": "No tienes permiso para esta acción.",
    NO_GYM: "No existe un gimnasio con ese código. Revísalo con recepción.",
    NO_MEMBER: "Tu correo no está registrado en este gimnasio. Pide en recepción que lo agreguen y vuelve a intentarlo.",
    TAKEN: "Ese miembro ya tiene una cuenta vinculada."
  };
  for (const k in M) if (c.includes(k)) return M[k];
  return "Algo salió mal. Intenta de nuevo. (" + c + ")";
}
