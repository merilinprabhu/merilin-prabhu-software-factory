// ─── FIREBASE CLOUD DATABASE INTEGRATION LAYER ──────────────────────────
// Supports Firebase Realtime Database & Firestore with Local Fallback Sync

let firebaseApp = null;
let firebaseDB = null;
let isFirebaseActive = false;

// Default / Stored Firebase Configuration (Pre-configured for BLOAPP bloapp-44dea)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAOn3pW2RL4fm_ABzBKZNadFFYgjTRlhgQ",
  authDomain: "bloapp-44dea.firebaseapp.com",
  projectId: "bloapp-44dea",
  storageBucket: "bloapp-44dea.firebasestorage.app",
  messagingSenderId: "14108268729",
  appId: "1:14108268729:web:601d1a154f8fc0ca8ba368",
  databaseURL: "https://bloapp-44dea-default-rtdb.firebaseio.com"
};

function getStoredFirebaseConfig() {
  const saved = localStorage.getItem("blo_firebase_config");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return DEFAULT_FIREBASE_CONFIG;
}

function saveFirebaseConfig(config) {
  localStorage.setItem("blo_firebase_config", JSON.stringify(config));
  initFirebaseEngine();
}

function initFirebaseEngine() {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey) {
    isFirebaseActive = false;
    updateFirebaseUIStatus(false, "Local Database Mode");
    return false;
  }

  try {
    if (typeof firebase === 'undefined') {
      isFirebaseActive = false;
      updateFirebaseUIStatus(false, "Firebase SDK Loading...");
      return false;
    }

    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }

    firebaseDB = firebase.database();
    isFirebaseActive = true;
    updateFirebaseUIStatus(true, "🟢 LIVE AUTO CLOUD SYNC");
    console.log("✅ Firebase Cloud Database initialized successfully!");
    return true;
  } catch (err) {
    console.error("Firebase init error:", err);
    isFirebaseActive = false;
    updateFirebaseUIStatus(false, `Firebase Error: ${err.message}`);
    return false;
  }
}

// ─── CLOUD SYNC FUNCTIONS ──────────────────────────────────────────────

// 1. Sync Current Voter Roll to Firebase
async function syncVotersToFirebase(partNo, votersList) {
  if (!isFirebaseActive || !firebaseDB) {
    initFirebaseEngine();
  }
  if (!isFirebaseActive || !firebaseDB) return false;
  try {
    const ref = firebaseDB.ref(`voters_part_${partNo}`);
    const superLight = votersList.map(v => ({
      id: v.id || '',
      partNo: v.partNo || partNo,
      slNo: v.slNo || '',
      epicNo: v.epicNo || '',
      nameKn: v.nameKn || '',
      nameEn: v.nameEn || '',
      relNameKn: v.relNameKn || '',
      relNameEn: v.relNameEn || '',
      relType: v.relType || 'Father',
      houseNo: v.houseNo || '-',
      age: v.age || '0',
      gender: v.gender || 'M',
      mobile: v.mobile || '',
      status: v.status || 'Unverified',
      remarks: v.remarks || '',
      isMapDone: !!v.isMapDone,
      isProgenyDone: !!v.isProgenyDone,
      ref2002Epic: v.ref2002Epic || '',
      updatedAt: new Date().toISOString()
    }));

    await ref.set(superLight);
    console.log(`☁️ Synced ${votersList.length} voters to Firebase Cloud for Part #${partNo}`);
    updateFirebaseUIStatus(true, `☁️ Firebase Synced (${votersList.length} Voters)`);
    return true;
  } catch (err) {
    console.error("Cloud voter sync failed:", err);
    return false;
  }
}

// 1.5 Real-Time Cross-Browser Firebase Subscription
let currentVoterRef = null;
function subscribeToVotersFirebase(partNo, onUpdateCallback) {
  let attempts = 0;
  const trySubscribe = () => {
    attempts++;
    if (!isFirebaseActive || !firebaseDB) {
      initFirebaseEngine();
    }

    if ((!isFirebaseActive || !firebaseDB) && attempts < 15) {
      setTimeout(trySubscribe, 300);
      return;
    }

    if (!isFirebaseActive || !firebaseDB) return;

    try {
      if (currentVoterRef) currentVoterRef.off();
      currentVoterRef = firebaseDB.ref(`voters_part_${partNo}`);
      currentVoterRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Array.isArray(data) ? data : Object.values(data);
          if (list && list.length > 0) {
            console.log(`⚡ Realtime Firebase Update received: ${list.length} voters for Part #${partNo}`);
            
            // Auto-persist to LocalStorage so all pages have it locally
            try {
              localStorage.setItem(`voters_v5_part_${partNo}`, JSON.stringify(list));
              localStorage.setItem(`voters_part_${partNo}`, JSON.stringify(list));
            } catch (e) {}

            if (typeof onUpdateCallback === 'function') {
              onUpdateCallback(list);
            }
          }
        }
      });
    } catch (err) {
      console.error("Realtime subscription error:", err);
    }
  };

  trySubscribe();
}

// 2. Fetch Voter Roll from Firebase
async function fetchVotersFromFirebase(partNo) {
  if (!isFirebaseActive || !firebaseDB) {
    initFirebaseEngine();
  }
  if (!isFirebaseActive || !firebaseDB) return null;
  try {
    const snapshot = await firebaseDB.ref(`voters_part_${partNo}`).once('value');
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Array.isArray(data) ? data : Object.values(data);
      console.log(`☁️ Fetched ${list.length} voters from Firebase for Part #${partNo}`);
      return list;
    }
  } catch (err) {
    console.error("Cloud voter fetch failed:", err);
  }
  return null;
}

// 3. Sync 2002 Reference Master Roll to Firebase
async function sync2002RollToFirebase(partNo, roll2002) {
  if (!isFirebaseActive || !firebaseDB) {
    initFirebaseEngine();
  }
  if (!isFirebaseActive || !firebaseDB) return false;
  try {
    const ref = firebaseDB.ref(`roll2002_part_${partNo}`);
    await ref.set(roll2002);
    console.log(`☁️ Synced ${roll2002.length} 2002 Master Roll records to Firebase`);
    return true;
  } catch (err) {
    console.error("Cloud 2002 sync failed:", err);
    return false;
  }
}

// 4. Fetch 2002 Reference Roll from Firebase
async function fetch2002RollFromFirebase(partNo) {
  if (!isFirebaseActive || !firebaseDB) {
    initFirebaseEngine();
  }
  if (!isFirebaseActive || !firebaseDB) return null;
  try {
    const snapshot = await firebaseDB.ref(`roll2002_part_${partNo}`).once('value');
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Array.isArray(data) ? data : Object.values(data);
    }
  } catch (err) {
    console.error("Cloud 2002 fetch failed:", err);
  }
  return null;
}

// 4.5 Realtime 2002 Roll Subscription
let current2002Ref = null;
function subscribeTo2002RollFirebase(partNo, onUpdateCallback) {
  let attempts = 0;
  const trySub = () => {
    attempts++;
    if (!isFirebaseActive || !firebaseDB) {
      initFirebaseEngine();
    }
    if ((!isFirebaseActive || !firebaseDB) && attempts < 15) {
      setTimeout(trySub, 300);
      return;
    }
    if (!isFirebaseActive || !firebaseDB) return;

    try {
      if (current2002Ref) current2002Ref.off();
      current2002Ref = firebaseDB.ref(`roll2002_part_${partNo}`);
      current2002Ref.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Array.isArray(data) ? data : Object.values(data);
          if (list && list.length > 0) {
            try {
              localStorage.setItem(`blo_2002_roll_part_${partNo}`, JSON.stringify(list));
            } catch (e) {}
            if (typeof onUpdateCallback === 'function') {
              onUpdateCallback(list);
            }
          }
        }
      });
    } catch (e) {
      console.error("Realtime 2002 subscription error:", e);
    }
  };

  trySub();
}

// 5. Sync BLO Notes to Firebase
async function syncNotesToFirebase(notesList) {
  if (!isFirebaseActive || !firebaseDB) return false;
  try {
    const ref = firebaseDB.ref('blo_notes');
    await ref.set(notesList);
    return true;
  } catch (err) {
    console.error("Cloud notes sync failed:", err);
    return false;
  }
}

// ─── UI STATUS BADGE UPDATER ───────────────────────────────────────────
function updateFirebaseUIStatus(isConnected, message) {
  const badge = document.getElementById("firebaseStatusBadge");
  if (badge) {
    badge.className = `badge ${isConnected ? 'badge-success' : 'badge-outline'}`;
    badge.innerHTML = `<i class="fa-solid ${isConnected ? 'fa-cloud-check' : 'fa-database'}"></i> ${message}`;
  }
}

// ─── SETUP MODAL CONTROLLER ────────────────────────────────────────────
function openFirebaseSetupModal() {
  const modal = document.getElementById("firebaseSetupModal");
  if (!modal) return;

  const config = getStoredFirebaseConfig() || {};
  if (document.getElementById("fbApiKeyInput")) document.getElementById("fbApiKeyInput").value = config.apiKey || "";
  if (document.getElementById("fbAuthDomainInput")) document.getElementById("fbAuthDomainInput").value = config.authDomain || "";
  if (document.getElementById("fbDbUrlInput")) document.getElementById("fbDbUrlInput").value = config.databaseURL || "";
  if (document.getElementById("fbProjectIdInput")) document.getElementById("fbProjectIdInput").value = config.projectId || "";
  if (document.getElementById("fbStorageBucketInput")) document.getElementById("fbStorageBucketInput").value = config.storageBucket || "";

  modal.classList.add("active");
}

function closeFirebaseSetupModal() {
  const modal = document.getElementById("firebaseSetupModal");
  if (modal) modal.classList.remove("active");
}

function saveFirebaseCredentialsFromModal() {
  const apiKey = (document.getElementById("fbApiKeyInput")?.value || "").trim();
  const authDomain = (document.getElementById("fbAuthDomainInput")?.value || "").trim();
  const databaseURL = (document.getElementById("fbDbUrlInput")?.value || "").trim();
  const projectId = (document.getElementById("fbProjectIdInput")?.value || "").trim();
  const storageBucket = (document.getElementById("fbStorageBucketInput")?.value || "").trim();

  if (!apiKey || !databaseURL) {
    alert("ದಯವಿಟ್ಟು ಕನಿಷ್ಠ Firebase API Key ಹಾಗೂ Database URL ನಮೂದಿಸಿ!");
    return;
  }

  const config = { apiKey, authDomain, databaseURL, projectId, storageBucket };
  saveFirebaseConfig(config);

  const success = initFirebaseEngine();
  if (success) {
    alert("✅ Firebase ಡಾಟಾಬೇಸ್ ಯಶಸ್ವಿಯಾಗಿ ಕನೆಕ್ಟ್ ಆಗಿದೆ!");
    closeFirebaseSetupModal();
    // Trigger immediate sync
    if (typeof currentPartNo !== 'undefined' && typeof voters !== 'undefined') {
      syncVotersToFirebase(currentPartNo, voters);
    }
  } else {
    alert("❌ Firebase ಕನೆಕ್ಟ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. Credentials ಪರಿಶೀಲಿಸಿ.");
  }
}

// Auto-initialize when script loads
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initFirebaseEngine, 800);
});

// ─── FIREBASE LIVE USER PRESENCE & ADMIN MONITORING ENGINE ─────────────
async function trackLiveUserPresence(profile) {
  if (!initFirebaseEngine() || !firebaseDB) return;

  try {
    const key = (profile.mobile || profile.partNo || "87").toString().replace(/[^a-zA-Z0-9_]/g, "_");
    const userPresenceRef = firebaseDB.ref(`online_users/${key}`);

    const presenceData = {
      bloName: profile.bloName || "BLO ಅಧಿಕಾರಿ",
      partNo: profile.partNo || "87",
      stationName: profile.stationName || "-",
      mobile: profile.mobile || "-",
      status: "online",
      lastSeen: new Date().toISOString(),
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    await userPresenceRef.set(presenceData);

    // Set offline on disconnect
    userPresenceRef.onDisconnect().set({
      ...presenceData,
      status: "offline",
      lastSeen: new Date().toISOString(),
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    console.log("🟢 Live user presence registered on Firebase Cloud for:", profile.bloName);
  } catch (err) {
    console.error("Error tracking live user presence:", err);
  }
}

function subscribeToAllRegisteredUsers(callback) {
  if (!initFirebaseEngine() || !firebaseDB) return;

  try {
    // Listen to registered profiles
    firebaseDB.ref("blo_profiles").on("value", (snapshot) => {
      const profiles = snapshot.val() || {};
      
      // Also fetch online statuses
      firebaseDB.ref("online_users").once("value", (onlineSnap) => {
        const onlineUsers = onlineSnap.val() || {};
        const userList = [];

        Object.keys(profiles).forEach(k => {
          const prof = profiles[k];
          const onlineInfo = onlineUsers[k] || {};
          userList.push({
            ...prof,
            isOnline: onlineInfo.status === "online",
            lastSeen: onlineInfo.lastSeen || prof.lastUpdated || "N/A"
          });
        });

        callback(userList);
      });
    });
  } catch (err) {
    console.error("Error subscribing to registered users:", err);
  }
}

async function saveUserProfileToFirebase(profile) {
  if (!initFirebaseEngine() || !firebaseDB) {
    console.warn("Firebase DB not active, saving profile locally");
    return false;
  }

  try {
    const key = (profile.mobile || profile.partNo || "87").toString().replace(/[^a-zA-Z0-9_]/g, "_");
    const profilesRef = firebaseDB.ref(`blo_profiles/${key}`);
    await profilesRef.set({
      ...profile,
      lastUpdated: new Date().toISOString()
    });

    // Also update by part number
    if (profile.partNo) {
      await firebaseDB.ref(`blo_part_profiles/${profile.partNo}`).set({
        ...profile,
        lastUpdated: new Date().toISOString()
      });
    }

    console.log("✅ User profile saved to Firebase Cloud under key:", key);
    return true;
  } catch (err) {
    console.error("Error saving user profile to Firebase:", err);
    return false;
  }
}

async function fetchUserProfileFromFirebase(identifier) {
  if (!initFirebaseEngine() || !firebaseDB) return null;

  try {
    const key = identifier.toString().replace(/[^a-zA-Z0-9_]/g, "_");
    let snapshot = await firebaseDB.ref(`blo_profiles/${key}`).once("value");
    if (snapshot.exists()) return snapshot.val();

    // Check by part number
    snapshot = await firebaseDB.ref(`blo_part_profiles/${key}`).once("value");
    if (snapshot.exists()) return snapshot.val();

    return null;
  } catch (err) {
    console.error("Error fetching user profile from Firebase:", err);
    return null;
  }
}

