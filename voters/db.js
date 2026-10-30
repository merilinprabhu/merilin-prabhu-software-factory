// ══════════════════════════════════════════════════════════════════════════
//  BLO SMART PORTAL V5.0 - UNIFIED DATA STORE & INDEXEDDB MANAGER (db.js)
// ══════════════════════════════════════════════════════════════════════════

let currentBloName = "ರಾಮಚಂದ್ರ ಕೆ.";
let currentPartNo = "87";

// ─── INDEXEDDB FOR UNLIMITED PHOTOS, NOTES & VOTERS DATA STORAGE ─────────
const photoCache = {};
const windowVoterMemoryCache = {};

const photoDB = {
  dbName: "BLO_Voter_App_DB_V5",
  dbVersion: 2,
  db: null,
  async init() {
    if (this.db) return this.db;
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.dbName, this.dbVersion);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos");
          if (!db.objectStoreNames.contains("notes")) db.createObjectStore("notes");
          if (!db.objectStoreNames.contains("voters")) db.createObjectStore("voters");
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  },
  async savePhoto(photoKey, dataUrl) {
    photoCache[photoKey] = dataUrl;
    await this.init();
    if (!this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction("photos", "readwrite");
        tx.objectStore("photos").put(dataUrl, photoKey);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },
  async getPhoto(photoKey) {
    if (photoCache[photoKey]) return photoCache[photoKey];
    await this.init();
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction("photos", "readonly");
        const req = tx.objectStore("photos").get(photoKey);
        req.onsuccess = () => {
          if (req.result) photoCache[photoKey] = req.result;
          resolve(req.result || null);
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },
  async saveVotersToIDB(partNo, votersList) {
    await this.init();
    if (!this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction("voters", "readwrite");
        tx.objectStore("voters").put(votersList, `voters_${partNo}`);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },
  async getVotersFromIDB(partNo) {
    await this.init();
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction("voters", "readonly");
        const req = tx.objectStore("voters").get(`voters_${partNo}`);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }
};

// ─── SESSION MANAGEMENT & AUTH SECURITY GUARD ──────────────────────────────
function checkAuthGuard() {
  const currentFile = (window.location.pathname.split("/").pop() || "login.html").toLowerCase();
  const isLoginPage = currentFile === "login.html";

  const session = sessionStorage.getItem("blo_session_v5") || localStorage.getItem("blo_profile_v5");
  if (!session && !isLoginPage) {
    console.warn("🔐 Session not found. Redirecting to login.html for authentication...");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function loadSessionData() {
  checkAuthGuard();

  const sessionStr = sessionStorage.getItem("blo_session_v5") || localStorage.getItem("blo_profile_v5");
  if (sessionStr) {
    try {
      const data = JSON.parse(sessionStr);
      currentBloName = data.bloName || "BLO ಅಧಿಕಾರಿ";
      currentPartNo = data.partNo || "87";
      if (typeof trackLiveUserPresence === 'function') {
        setTimeout(() => trackLiveUserPresence(data), 1000);
      }
    } catch (e) {}
  } else {
    currentBloName = "BLO ಅಧಿಕಾರಿ";
    currentPartNo = "87";
  }
  updateHeaderDisplays();
  renderUnifiedSidebar();
}

function renderUnifiedSidebar() {
  const sidebarNav = document.querySelector(".sidebar-nav");
  if (!sidebarNav) return;

  const currentFile = (window.location.pathname.split("/").pop() || "dashboard.html").toLowerCase();

  const menuItems = [
    { href: "dashboard.html", icon: "fa-chart-line", label: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ (Analytics)" },
    { href: "voterlist.html", icon: "fa-users-gear", label: "ಮತದಾರರ ಪಟ್ಟಿ (Voter List)" },
    { href: "admin.html", icon: "fa-user-shield", label: "ಅಡ್ಮಿನ್ (Live Users)", color: "#10b981" },
    { href: "index.html", icon: "fa-cloud-arrow-up", label: "Excel & PDF ಅಪ್‌ಲೋಡ್" },
    { href: "reports.html", icon: "fa-file-contract", label: "ವರದಿಗಳ ಹಬ್ (Report ASDD)" },
    { href: "sir.html", icon: "fa-sitemap", label: "SIR 2002 Progeny" },
    { href: "notes.html", icon: "fa-clipboard-list", label: "BLO ನೋಟ್ಸ್ & To-Do" }
  ];

  sidebarNav.innerHTML = menuItems.map(item => {
    const isActive = currentFile === item.href;
    const styleAttr = item.color ? `style="color:${item.color}; font-weight:800;"` : "";
    return `
      <a href="${item.href}" class="${isActive ? 'active' : ''}">
        <i class="fa-solid ${item.icon}" ${item.color ? `style="color:${item.color};"` : ''}></i>
        <span ${styleAttr}>${item.label}</span>
      </a>
    `;
  }).join('');
}

function updateHeaderDisplays() {
  const bloDisp = document.getElementById("headerBloName");
  if (bloDisp) bloDisp.textContent = currentBloName;

  const dashFull = document.getElementById("dashBloFullName");
  if (dashFull) dashFull.textContent = `${currentBloName} (BLO ಅಧಿಕಾರಿ)`;

  const session = JSON.parse(sessionStorage.getItem("blo_session_v5") || localStorage.getItem("blo_profile_v5") || "{}");
  const schoolDisp = document.getElementById("dashSchoolNameDisp");
  if (schoolDisp && session.stationName) {
    schoolDisp.textContent = session.stationName;
  }

  const partSelect = document.getElementById("headerPartSelect");
  if (partSelect) partSelect.value = currentPartNo;

  const badge = document.getElementById("headerPartBadge");
  if (badge) badge.textContent = `ಭಾಗ ${currentPartNo}`;
}

function updateBloNameInteractive() {
  openBloProfileSettingsModal();
}

function openBloProfileSettingsModal() {
  let modal = document.getElementById("bloProfileSettingsModal");
  if (!modal) {
    const html = `
      <div class="modal-overlay" id="bloProfileSettingsModal">
        <div class="modal-card" style="max-width:520px;">
          <div class="modal-header" style="background:#0f172a; color:#fff;">
            <h3><i class="fa-solid fa-user-gear" style="color:#38bdf8;"></i> BLO ಪ್ರೊಫೈಲ್ & ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ಟಿಂಗ್ಸ್</h3>
            <button class="btn btn-sm btn-outline" style="color:#fff;" onclick="closeBloProfileSettingsModal()">✕</button>
          </div>
          <div class="modal-body" style="background:#fff;">
            <div style="margin-bottom:0.85rem;">
              <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.25rem;">
                <i class="fa-solid fa-user"></i> BLO ಅಧಿಕಾರಿಯ ಹೆಸರು (Username):
              </label>
              <input type="text" id="settingsBloName" class="form-control" style="font-weight:700;" placeholder="ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು...">
            </div>

            <div style="margin-bottom:0.85rem;">
              <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.25rem;">
                <i class="fa-solid fa-school"></i> ಮತಗಟ್ಟೆ ಶಾಲೆಯ ಹೆಸರು (Polling Station / School Name):
              </label>
              <input type="text" id="settingsSchoolName" class="form-control" placeholder="ಉದಾ: ಸರಕಾರಿ ಹಿರಿಯ ಪ್ರಾಥಮಿಕ ಶಾಲೆ, ಮಚೇಡಬೂಲ">
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.85rem;">
              <div>
                <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.25rem;">ರಾಜ್ಯ (State):</label>
                <input type="text" id="settingsState" class="form-control" value="ಕರ್ನಾಟಕ (S10)">
              </div>
              <div>
                <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.25rem;">ಜಿಲ್ಲೆ (District):</label>
                <input type="text" id="settingsDistrict" class="form-control" value="ರಾಯಚೂರು (10)">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.85rem;">
              <div>
                <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.25rem;">ಕ್ಷೇತ್ರ (Taluka/AC):</label>
                <input type="text" id="settingsTaluka" class="form-control" value="53 - ರಾಯಚೂರು ಗ್ರಾಮಾಂತರ">
              </div>
              <div>
                <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.25rem;">ಬೂತ್ ಭಾಗ (Part No):</label>
                <input type="text" id="settingsPartNo" class="form-control" style="font-weight:800; color:#0284c7;">
              </div>
            </div>

            <div style="border-top:1px solid #e2e8f0; padding-top:0.85rem; margin-top:0.85rem;">
              <h4 style="font-size:0.9rem; font-weight:800; color:#0f172a; margin-bottom:0.5rem;"><i class="fa-solid fa-key" style="color:#eab308;"></i> ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ (Reset Password)</h4>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
                <div>
                  <label style="font-size:0.78rem; font-weight:700; color:var(--text-muted); display:block;">ಹೊಸ ಪಾಸ್‌ವರ್ಡ್:</label>
                  <input type="password" id="settingsNewPassword" class="form-control" placeholder="ಹೊಸ ಪಾಸ್‌ವರ್ಡ್...">
                </div>
                <div>
                  <label style="font-size:0.78rem; font-weight:700; color:var(--text-muted); display:block;">ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ:</label>
                  <input type="password" id="settingsConfirmPassword" class="form-control" placeholder="ಖಚಿತಪಡಿಸಿ...">
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="closeBloProfileSettingsModal()">ರದ್ದು ಮಾಡಿ</button>
            <button class="btn btn-primary btn-sm" onclick="saveBloProfileSettings()"><i class="fa-solid fa-floppy-disk"></i> ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
    modal = document.getElementById("bloProfileSettingsModal");
  }

  const session = JSON.parse(sessionStorage.getItem("blo_session_v5") || localStorage.getItem("blo_profile_v5") || "{}");
  document.getElementById("settingsBloName").value = currentBloName || session.bloName || "BLO ಅಧಿಕಾರಿ";
  document.getElementById("settingsSchoolName").value = session.stationName || "ಸರಕಾರಿ ಹಿರಿಯ ಪ್ರಾಥಮಿಕ ಶಾಲೆ, ಮಚೇಡಬೂಲ";
  document.getElementById("settingsState").value = session.state || "ಕರ್ನಾಟಕ (S10)";
  document.getElementById("settingsDistrict").value = session.district || "ರಾಯಚೂರು (10)";
  document.getElementById("settingsTaluka").value = session.taluka || "53 - ರಾಯಚೂರು ಗ್ರಾಮಾಂತರ";
  document.getElementById("settingsPartNo").value = currentPartNo || session.partNo || "87";

  modal.classList.add("active");
}

function closeBloProfileSettingsModal() {
  const modal = document.getElementById("bloProfileSettingsModal");
  if (modal) modal.classList.remove("active");
}

function saveBloProfileSettings() {
  const newName = document.getElementById("settingsBloName").value.trim();
  const newSchool = document.getElementById("settingsSchoolName").value.trim();
  const newState = document.getElementById("settingsState").value.trim();
  const newDist = document.getElementById("settingsDistrict").value.trim();
  const newTaluka = document.getElementById("settingsTaluka").value.trim();
  const newPart = document.getElementById("settingsPartNo").value.trim() || currentPartNo;
  const newPass = document.getElementById("settingsNewPassword").value;
  const confirmPass = document.getElementById("settingsConfirmPassword").value;

  if (newPass) {
    if (newPass !== confirmPass) {
      alert("❌ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಾಣಿಕೆಯಾಗುತ್ತಿಲ್ಲ! (Passwords do not match)");
      return;
    }
  }

  if (newName) currentBloName = newName;
  if (newPart) currentPartNo = newPart;

  const profile = {
    bloName: currentBloName,
    partNo: currentPartNo,
    stationName: newSchool,
    state: newState,
    district: newDist,
    taluka: newTaluka,
    password: newPass || "blo123"
  };

  sessionStorage.setItem("blo_session_v5", JSON.stringify(profile));
  localStorage.setItem("blo_profile_v5", JSON.stringify(profile));

  updateHeaderDisplays();
  closeBloProfileSettingsModal();

  if (typeof showToast === 'function') {
    showToast(`✅ ಪ್ರೊಫೈಲ್ & ಶಾಲೆಯ ಹೆಸರು ಯಶಸ್ವಿಯಾಗಿ ಅಪ್‌ಡೇಟ್ ಆಗಿದೆ!`, "success");
  } else {
    alert("✅ ಪ್ರೊಫೈಲ್ & ಶಾಲೆಯ ಹೆಸರು ಯಶಸ್ವಿಯಾಗಿ ಅಪ್‌ಡೇಟ್ ಆಗಿದೆ!");
  }
}

function switchPartNumber(partNo) {
  currentPartNo = partNo;
  const session = JSON.parse(sessionStorage.getItem("blo_session_v5") || "{}");
  session.partNo = partNo;
  session.bloName = currentBloName;
  sessionStorage.setItem("blo_session_v5", JSON.stringify(session));
  localStorage.setItem("blo_profile_v5", JSON.stringify(session));
  updateHeaderDisplays();
  if (typeof loadPageData === 'function') {
    loadPageData(partNo);
  }
  showToast(`ಬೂತ್ ಭಾಗ ${partNo} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.`, "info");
}

function handleLogout() {
  sessionStorage.removeItem("blo_session_v5");
  window.location.href = "login.html";
}

// ─── UNIFIED MULTI-TIER VOTERS DATA ACCESSORS ───────────────────────────────
async function getVotersForPart(partNo) {
  // Tier 1: In-Memory Cache
  if (windowVoterMemoryCache[partNo] && windowVoterMemoryCache[partNo].length > 0) {
    return windowVoterMemoryCache[partNo];
  }

  // Tier 2: Primary LocalStorage Key
  const primaryKey = `voters_v5_part_${partNo}`;
  const saved = localStorage.getItem(primaryKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        windowVoterMemoryCache[partNo] = parsed;
        return parsed;
      }
    } catch (e) {}
  }

  // Tier 3: Alternative LocalStorage Keys
  const altKeys = [`voters_part_${partNo}`, `blo_voters_part_${partNo}`, `voters`, `current_voters` ];
  for (let k of altKeys) {
    const altSaved = localStorage.getItem(k);
    if (altSaved) {
      try {
        const parsedAlt = JSON.parse(altSaved);
        if (Array.isArray(parsedAlt) && parsedAlt.length > 0) {
          windowVoterMemoryCache[partNo] = parsedAlt;
          try { localStorage.setItem(primaryKey, JSON.stringify(parsedAlt)); } catch (e) {}
          return parsedAlt;
        }
      } catch (e) {}
    }
  }

  // Tier 4: IndexedDB Unlimited Storage
  try {
    const idbVoters = await photoDB.getVotersFromIDB(partNo);
    if (idbVoters && Array.isArray(idbVoters) && idbVoters.length > 0) {
      windowVoterMemoryCache[partNo] = idbVoters;
      try { localStorage.setItem(primaryKey, JSON.stringify(idbVoters)); } catch (e) {}
      return idbVoters;
    }
  } catch (e) {}

  // Tier 5: SessionStorage Backup
  const sess = sessionStorage.getItem(`voters_temp_${partNo}`);
  if (sess) {
    try {
      const parsedSess = JSON.parse(sess);
      if (Array.isArray(parsedSess) && parsedSess.length > 0) {
        windowVoterMemoryCache[partNo] = parsedSess;
        return parsedSess;
      }
    } catch (e) {}
  }

  // Tier 6: Fetch from Firebase Cloud Realtime Database!
  if (typeof fetchVotersFromFirebase === 'function') {
    try {
      const cloudVoters = await fetchVotersFromFirebase(partNo);
      if (cloudVoters && cloudVoters.length > 0) {
        windowVoterMemoryCache[partNo] = cloudVoters;
        try { localStorage.setItem(primaryKey, JSON.stringify(cloudVoters)); } catch (e) {}
        photoDB.saveVotersToIDB(partNo, cloudVoters);
        return cloudVoters;
      }
    } catch (err) {
      console.warn("Cloud fallback fetch failed:", err);
    }
  }

  return [];
}

async function saveVotersForPart(partNo, data) {
  const primaryKey = `voters_v5_part_${partNo}`;

  // Update Memory Cache
  windowVoterMemoryCache[partNo] = data;

  // Process photos to IndexedDB
  const lightData = data.map(v => {
    const vCopy = { ...v };
    if (vCopy.photoUrl && vCopy.photoUrl.startsWith("data:image")) {
      const photoKey = `photo_${partNo}_${vCopy.slNo}`;
      photoDB.savePhoto(photoKey, vCopy.photoUrl);
      vCopy.photoUrl = `idb:${photoKey}`;
    }
    return vCopy;
  });

  // Save to IndexedDB (Unlimited Size)
  photoDB.saveVotersToIDB(partNo, lightData);

  // Save to SessionStorage Backup
  try {
    sessionStorage.setItem(`voters_temp_${partNo}`, JSON.stringify(lightData));
  } catch (e) {}

  // Save to LocalStorage Primary & Secondary
  try {
    localStorage.setItem(primaryKey, JSON.stringify(lightData));
    localStorage.setItem(`voters_part_${partNo}`, JSON.stringify(lightData));
  } catch (e) {
    // If LocalStorage Quota Exceeded, save lightweight summary
    const superLight = lightData.map(v => ({
      id: v.id, slNo: v.slNo, epicNo: v.epicNo, nameKn: v.nameKn, relNameKn: v.relNameKn, relType: v.relType, houseNo: v.houseNo, age: v.age, gender: v.gender, status: v.status, isMapDone: v.isMapDone, isProgenyDone: v.isProgenyDone, ref2002Epic: v.ref2002Epic
    }));
    try {
      localStorage.setItem(primaryKey, JSON.stringify(superLight));
    } catch (err) {}
  }

  // Trigger Firebase Cloud Sync asynchronously
  if (typeof syncVotersToFirebase === 'function') {
    syncVotersToFirebase(partNo, lightData);
  }
}

// ─── 2002 REFERENCE ELECTORAL ROLL ACCESSORS ─────────────────────────────
async function get2002RollForPart(partNo) {
  const key = `blo_2002_roll_part_${partNo}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch(e){}
  }
  if (typeof fetch2002RollFromFirebase === 'function') {
    const cloudRoll = await fetch2002RollFromFirebase(partNo);
    if (cloudRoll) return cloudRoll;
  }
  return [];
}

async function save2002RollForPart(partNo, rollData) {
  const key = `blo_2002_roll_part_${partNo}`;
  try {
    localStorage.setItem(key, JSON.stringify(rollData));
  } catch(e) {
    localStorage.setItem(key, JSON.stringify(rollData.slice(0, 500)));
  }

  // Trigger Firebase Cloud Sync asynchronously
  if (typeof sync2002RollToFirebase === 'function') {
    sync2002RollToFirebase(partNo, rollData);
  }
}

// ─── SMART MERGE & UPSERT LOGIC (NO DUPLICATES) ──────────────────────────
function mergeVoterLists(existingList, newList) {
  if (!existingList || existingList.length === 0) {
    return { mergedList: newList, updatedCount: 0, insertedCount: newList.length };
  }

  const existingMap = new Map();
  existingList.forEach(v => {
    if (v.epicNo && v.epicNo.trim()) {
      existingMap.set(v.epicNo.trim().toUpperCase(), v);
    } else if (v.slNo) {
      existingMap.set(`SL_${v.slNo}`, v);
    }
  });

  let updatedCount = 0;
  let insertedCount = 0;

  const mergedList = newList.map(newV => {
    const key = (newV.epicNo && newV.epicNo.trim()) ? newV.epicNo.trim().toUpperCase() : `SL_${newV.slNo}`;
    const existing = existingMap.get(key);

    if (existing) {
      updatedCount++;
      return {
        ...newV,
        id: existing.id || newV.id,
        status: (newV.status && newV.status !== 'Unverified') ? newV.status : (existing.status || newV.status || 'Unverified'),
        mobile: existing.mobile || newV.mobile,
        remarks: existing.remarks || newV.remarks,
        isMapDone: existing.isMapDone || newV.isMapDone,
        isProgenyDone: existing.isProgenyDone || newV.isProgenyDone,
        ref2002Epic: existing.ref2002Epic || newV.ref2002Epic,
        photoUrl: (existing.photoUrl && existing.photoUrl.startsWith('idb:')) ? existing.photoUrl : (newV.photoUrl || existing.photoUrl)
      };
    } else {
      insertedCount++;
      return newV;
    }
  });

  return { mergedList, updatedCount, insertedCount };
}

// ─── PHONETIC NORMALIZER & TRANSLITERATION ENGINE (ENGLISH <-> KANNADA) ───
function normalizePhoneticEnglish(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ou/g, 'au')
    .replace(/w/g, 'v')
    .replace(/th/g, 't')
    .replace(/sh/g, 's')
    .replace(/z/g, 'j')
    .replace(/e/g, 'a')
    .replace(/(.)\1+/g, '$1') // collapse duplicate consecutive characters: bb -> b, yy -> y, etc.
    .trim();
}

function transliterateKannadaToEnglish(str) {
  if (!str) return '';

  const vowels = {
    'ಅ': 'a', 'ಆ': 'a', 'ಇ': 'i', 'ಈ': 'i', 'ಉ': 'u', 'ಊ': 'u', 'ಋ': 'ru',
    'ಎ': 'e', 'ಏ': 'e', 'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'o', 'ಔ': 'au', 'ಅಂ': 'am', 'ಅಃ': 'ah'
  };

  const consonants = {
    'ಕ': 'k', 'ಖ': 'kh', 'ಗ': 'g', 'ಘ': 'gh', 'ಙ': 'ng',
    'ಚ': 'ch', 'ಛ': 'chh', 'ಜ': 'j', 'ಝ': 'jh', 'ಞ': 'ny',
    'ಟ': 't', 'ಠ': 'th', 'ಡ': 'd', 'ಢ': 'dh', 'ಣ': 'n',
    'ತ': 't', 'ಥ': 'th', 'ದ': 'd', 'ಧ': 'dh', 'ನ': 'n',
    'ಪ': 'p', 'ಫ': 'ph', 'ಬ': 'b', 'ಭ': 'bh', 'ಮ': 'm',
    'ಯ': 'y', 'ರ': 'r', 'ಲ': 'l', 'ವ': 'v', 'ಶ': 'sh', 'ಷ': 'sh', 'ಸ': 's', 'ಹ': 'h', 'ಳ': 'l'
  };

  const matras = {
    'ಾ': 'a', 'ಿ': 'i', 'ೀ': 'i', 'ು': 'u', 'ೂ': 'u', 'ೃ': 'ru',
    'ೆ': 'e', 'ೇ': 'e', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'o', 'ೌ': 'au',
    'ಂ': 'am', 'ಃ': 'ah'
  };

  let res = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const next = str[i + 1];

    if (consonants[ch]) {
      const cSound = consonants[ch];
      if (next && matras[next]) {
        if (next === 'ಂ') {
          res += cSound + 'am'; // e.g. ಜ + ಂ = jam, ರ + ಂ = ram
        } else {
          res += cSound + matras[next];
        }
        i++; // skip matra
      } else if (next === '್') {
        res += cSound;
        i++; // skip virama
      } else {
        res += cSound + 'a'; // inherent vowel 'a'
      }
    } else if (vowels[ch]) {
      res += vowels[ch];
    } else if (matras[ch]) {
      if (ch === 'ಂ') {
        res += 'am';
      } else {
        res += matras[ch];
      }
    } else if (ch !== '್') {
      res += ch;
    }
  }

  const base = res.toLowerCase();

  // Generate phonetic spelling variations (e.g. v -> w, th -> t, sh -> s, am -> an)
  const var1 = base.replace(/v/g, 'w').replace(/th/g, 't');
  const var2 = base.replace(/w/g, 'v').replace(/t/g, 'th');
  const var3 = base.replace(/sh/g, 's');
  const var4 = base.replace(/am/g, 'an').replace(/am/g, 'ang');
  const normalized = normalizePhoneticEnglish(base);

  return (base + ' ' + var1 + ' ' + var2 + ' ' + var3 + ' ' + var4 + ' ' + normalized).toLowerCase();
}

function matchNameSmart(targetKn, targetEn, searchQuery) {
  if (!searchQuery) return true;
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;

  const kn = (targetKn || '').toLowerCase();
  const en = (targetEn || '').toLowerCase();

  if (kn.includes(q) || en.includes(q)) return true;

  const translitStr = typeof transliterateKannadaToEnglish === 'function' ? transliterateKannadaToEnglish(targetKn) : '';
  if (translitStr.includes(q)) return true;

  const normQ = normalizePhoneticEnglish(q);
  if (!normQ) return false;

  const normTranslit = normalizePhoneticEnglish(translitStr);
  const normEn = normalizePhoneticEnglish(en);

  if (normTranslit.includes(normQ) || normEn.includes(normQ)) return true;

  return false;
}

// ─── ENGLISH TO KANNADA ACCURATE LIVE TRANSLITERATION ENGINE ─────────
function transliterateEnglishToKannada(str) {
  if (!str) return '';

  const dictionary = {
    'uday': 'ಉದಯ',
    'udaya': 'ಉದಯ',
    'udaykumar': 'ಉದಯ ಕುಮಾರ್',
    'kumar': 'ಕುಮಾರ್',
    'kumara': 'ಕುಮಾರ್',
    'yallappa': 'ಯಲ್ಲಪ್ಪ',
    'yellappa': 'ಯಲ್ಲಪ್ಪ',
    'yallavva': 'ಯಲ್ಲವ್ವ',
    'manoj': 'ಮನೋಜ್',
    'basava': 'ಬಸವ',
    'basavaraj': 'ಬಸವರಾಜ್',
    'basavaraja': 'ಬಸವರಾಜ',
    'mallikarjun': 'ಮಲ್ಲಿಕಾರ್ಜುನ',
    'mallikarjuna': 'ಮಲ್ಲಿಕಾರ್ಜುನ',
    'pujari': 'ಪೂಜಾರಿ',
    'poojari': 'ಪೂಜಾರಿ',
    'lakshmi': 'ಲಕ್ಷ್ಮಿ',
    'laxmi': 'ಲಕ್ಷ್ಮಿ',
    'savitri': 'ಸಾವಿತ್ರಿ',
    'sawitri': 'ಸಾವಿತ್ರಿ',
    'tayappa': 'ತಾಯಪ್ಪ',
    'thayappa': 'ತಾಯಪ್ಪ',
    'monayya': 'ಮೋನಯ್ಯ',
    'mona': 'ಮೋನಯ್ಯ',
    'ramesh': 'ರಮೇಶ್',
    'suresh': 'ಸುರೇಶ್',
    'mahesh': 'ಮಹೇಶ್',
    'maheshwari': 'ಮಹೇಶ್ವರಿ',
    'anjaneyya': 'ಅಂಜನೇಯ್ಯ',
    'rajesh': 'ರಾಜೇಶ್',
    'venkatesh': 'ವೆಂಕಟೇಶ್',
    'shiva': 'ಶಿವ',
    'shivakumar': 'ಶಿವಕುಮಾರ್',
    'prabhu': 'ಪ್ರಭು',
    'prajwal': 'ಪ್ರಜ್ವಲ್',
    'merilin': 'ಮೆರ್ಲಿನ್',
    'hanumanth': 'ಹನುಮಂತ',
    'hanumantha': 'ಹನುಮಂತ',
    'amar': 'ಅಮರ್',
    'amaregowda': 'ಅಮರೇಗೌಡ',
    'ningappa': 'ನಿಂಗಪ್ಪ',
    'durgappa': 'ದುರ್ಗಪ್ಪ',
    'huligappa': 'ಹುಲಿಗಪ್ಪ',
    'shankara': 'ಶಂಕರ',
    'shankar': 'ಶಂಕರ್',
    'rajashekar': 'ರಾಜಶೇಖರ್'
  };

  const initVowels = {
    'aa': 'ಆ', 'a': 'ಅ', 'i': 'ಇ', 'ee': 'ಈ', 'ea': 'ಈ', 'u': 'ಉ', 'oo': 'ಊ',
    'e': 'ಎ', 'ai': 'ಐ', 'o': 'ಒ', 'au': 'ಔ', 'ou': 'ಔ'
  };

  const consMap = {
    'ksh': 'ಕ್ಷ', 'kh': 'ಖ', 'gh': 'ಘ', 'chh': 'ಛ', 'ch': 'ಚ', 'jh': 'ಝ',
    'th': 'ತ', 'dh': 'ಧ', 'ph': 'ಫ', 'bh': 'ಭ', 'sh': 'ಶ', 'ny': 'ಞ',
    'k': 'ಕ', 'g': 'ಗ', 'c': 'ಚ', 'j': 'ಜ', 't': 'ತ', 'd': 'ದ', 'n': 'ನ',
    'p': 'ಪ', 'f': 'ಫ', 'b': 'ಬ', 'm': 'ಮ', 'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ',
    'v': 'ವ', 'w': 'ವ', 's': 'ಸ', 'h': 'ಹ'
  };

  const matraMap = {
    'aa': 'ಾ', 'a': '', 'i': 'ಿ', 'ee': 'ೀ', 'u': 'ು', 'oo': 'ೂ',
    'e': 'ೆ', 'ai': 'ೈ', 'o': 'ೊ', 'au': 'ೌ', 'ou': 'ೌ'
  };

  let clean = str.trim().toLowerCase();
  let words = clean.split(/\s+/);

  let resultWords = words.map(word => {
    if (dictionary[word]) return dictionary[word];

    let res = '';
    let i = 0;
    let isWordStart = true;

    while (i < word.length) {
      // 1. Initial Vowels
      if (isWordStart) {
        let v2 = word.substr(i, 2);
        if (initVowels[v2]) {
          res += initVowels[v2];
          i += 2;
          isWordStart = false;
          continue;
        }
        let v1 = word.substr(i, 1);
        if (initVowels[v1]) {
          res += initVowels[v1];
          i += 1;
          isWordStart = false;
          continue;
        }
      }

      isWordStart = false;

      // 2. Consonant matching (try length 3, 2, then 1)
      let cMatch = '';
      let cLen = 0;

      let sub3 = word.substr(i, 3);
      let sub2 = word.substr(i, 2);
      let sub1 = word.substr(i, 1);

      if (consMap[sub3]) { cMatch = consMap[sub3]; cLen = 3; }
      else if (consMap[sub2]) { cMatch = consMap[sub2]; cLen = 2; }
      else if (consMap[sub1]) { cMatch = consMap[sub1]; cLen = 1; }

      if (cMatch) {
        i += cLen;
        // Check following vowel matra
        let next2 = word.substr(i, 2);
        let next1 = word.substr(i, 1);

        if (matraMap[next2] !== undefined) {
          res += cMatch + matraMap[next2];
          i += 2;
        } else if (matraMap[next1] !== undefined) {
          res += cMatch + matraMap[next1];
          i += 1;
        } else {
          // No vowel following consonant: if at end of word and consonant is r/y/l/m/n/s/t, add virama or halant
          if (i >= word.length) {
            if (['r', 'y', 'l', 'm', 'n', 's', 't', 'd', 'j', 'h'].includes(word.substr(i - cLen, cLen))) {
              if (word.substr(i - cLen, cLen) === 'r') res += cMatch + '್‌';
              else res += cMatch + '್';
            } else {
              res += cMatch;
            }
          } else {
            // Half consonant or virama joiner
            res += cMatch + '್';
          }
        }
        continue;
      }

      // Fallback: character copy
      res += word[i];
      i++;
    }

    return res;
  });

  return resultWords.join(' ');
}

function clearAllPortalData() {
  if (confirm("ನಿಜವಾಗಲೂ ಎಲ್ಲಾ ಮತದಾರರ ಡೇಟಾವನ್ನು ರಿಸೆಟ್ ಮಾಡಬೇಕೆ? (Clear all data?)")) {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("voters_v5_") || key.startsWith("blo_part_")) {
        localStorage.removeItem(key);
      }
    });
    try { indexedDB.deleteDatabase("BLO_Voter_App_DB_V5"); } catch (e) {}
    showToast("ಎಲ್ಲಾ ಡೇಟಾ ತೆರವುಗೊಳಿಸಲಾಗಿದೆ.", "info");
    setTimeout(() => window.location.reload(), 600);
  }
}

// ─── TOAST NOTIFICATION ────────────────────────────────────────────────
function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.style.cssText = `padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; color: #fff; background: ${type==='success'?'#16a34a':(type==='error'?'#dc2626':'#2563eb')}; box-shadow: 0 8px 20px rgba(0,0,0,0.15); transition: all 0.3s ease;`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

document.addEventListener("DOMContentLoaded", () => {
  loadSessionData();
});
