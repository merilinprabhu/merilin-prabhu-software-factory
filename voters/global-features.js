// ══════════════════════════════════════════════════════════════════════════
//  BLO SMART PORTAL V5.0 - GLOBAL FEATURES ENGINE
//  Features: 1) Ctrl+K Search Palette  2) Family Grouping  3) Analytics  4) ECI Forms 6/7/8
// ══════════════════════════════════════════════════════════════════════════

// ─── 1. CTRL + K GLOBAL SEARCH COMMAND PALETTE ─────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  injectGlobalSearchModalHTML();

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openGlobalSearchModal();
    }
    if (e.key === "Escape") {
      closeGlobalSearchModal();
    }
  });
});

function injectGlobalSearchModalHTML() {
  if (document.getElementById("globalSearchModal")) return;

  const modalHtml = `
    <div class="global-search-modal" id="globalSearchModal" onclick="if(event.target===this) closeGlobalSearchModal()">
      <div class="global-search-card">
        <div class="global-search-header">
          <i class="fa-solid fa-magnifying-glass" style="font-size:1.2rem; color:#38bdf8;"></i>
          <input type="text" id="globalSearchInput" class="global-search-input" placeholder="ಮತದಾರರ ಹೆಸರು, EPIC, ಮನೆ ನಂ ಅಥವಾ ಅನುಕ್ರಮಾಂಕ (Ctrl+K)..." oninput="performGlobalSearch(this.value)">
          <span style="background:#1e293b; color:#94a3b8; padding:0.2rem 0.5rem; border-radius:6px; font-size:0.75rem; font-weight:700;">ESC</span>
        </div>
        <div class="global-search-results" id="globalSearchResults">
          <div style="text-align:center; padding:2rem; color:#94a3b8; font-size:0.9rem;">
            <i class="fa-solid fa-keyboard" style="font-size:2rem; margin-bottom:0.5rem; display:block;"></i>
            ಶೋಧಿಸಲು ಟೈಪ್ ಮಾಡಲು ಪ್ರಾರಂಭಿಸಿ (ಉದಾ: ಹೆಸರು, EPIC No, ಮನೆ ನಂ)...
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function openGlobalSearchModal() {
  const modal = document.getElementById("globalSearchModal");
  if (!modal) return;
  modal.classList.add("active");
  const input = document.getElementById("globalSearchInput");
  if (input) {
    input.value = "";
    input.focus();
  }
}

function closeGlobalSearchModal() {
  const modal = document.getElementById("globalSearchModal");
  if (modal) modal.classList.remove("active");
}

async function performGlobalSearch(query) {
  const container = document.getElementById("globalSearchResults");
  if (!container) return;

  const q = (query || "").trim().toLowerCase();
  if (!q) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:#94a3b8; font-size:0.9rem;">
        <i class="fa-solid fa-keyboard" style="font-size:2rem; margin-bottom:0.5rem; display:block;"></i>
        ಶೋಧಿಸಲು ಟೈಪ್ ಮಾಡಲು ಪ್ರಾರಂಭಿಸಿ (ಉದಾ: ಹೆಸರು, EPIC No, ಮನೆ ನಂ)...
      </div>
    `;
    return;
  }

  const partNo = typeof currentPartNo !== "undefined" ? currentPartNo : "87";
  const voters = typeof getVotersForPart === "function" ? await getVotersForPart(partNo) : [];

  const matched = voters.filter(v => {
    const matchName = typeof matchNameSmart === 'function' ? matchNameSmart(v.nameKn, v.nameEn, q) : ((v.nameKn || "").toLowerCase().includes(q) || (v.nameEn || "").toLowerCase().includes(q));
    const matchRel = typeof matchNameSmart === 'function' ? matchNameSmart(v.relNameKn, v.relNameEn, q) : ((v.relNameKn || "").toLowerCase().includes(q) || (v.relNameEn || "").toLowerCase().includes(q));
    const matchEpic = (v.epicNo || "").toLowerCase().includes(q);
    const matchHouse = (v.houseNo || "").toLowerCase().includes(q);
    const matchSl = (v.slNo || "").toString().includes(q);
    return matchName || matchRel || matchEpic || matchHouse || matchSl;
  }).slice(0, 15);

  if (matched.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">ಯಾವುದೇ ಮತದಾರರು ಸಿಗಲಿಲ್ಲ: "${query}"</div>`;
    return;
  }

  container.innerHTML = matched.map(v => `
    <div class="global-search-item" onclick="onSelectGlobalSearchResult('${v.id}')">
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <span style="background:#0f172a; color:#fff; padding:0.25rem 0.5rem; border-radius:6px; font-weight:800; font-size:0.8rem;">#${v.slNo}</span>
        <div>
          <div style="font-weight:700; color:#0f172a;">${v.nameKn} <small style="color:#64748b;">(${v.epicNo})</small></div>
          <div style="font-size:0.78rem; color:#64748b;">ಮನೆ ನಂ: ${v.houseNo || '-'} | ಸಂಬಂಧಿ: ${v.relNameKn || '-'}</div>
        </div>
      </div>
      <span class="badge ${v.status==='Verified'?'badge-success':(v.status==='Absent'?'badge-absent':(v.status==='Shifted'?'badge-shifted':(v.status==='Death'?'badge-death':'badge-outline')))}">${v.status || 'Unverified'}</span>
    </div>
  `).join('');
}

function onSelectGlobalSearchResult(voterId) {
  closeGlobalSearchModal();
  if (typeof openVoterModal === 'function') {
    openVoterModal(voterId);
  } else {
    window.location.href = `dashboard.html?voterId=${voterId}`;
  }
}

// ─── 3. HOUSE-WISE FAMILY GROUPING ENGINE ───────────────────────────────
function getHouseWiseFamilies(votersList) {
  const familiesMap = {};

  votersList.forEach(v => {
    const hNo = (v.houseNo || "Unspecified").trim();
    if (!familiesMap[hNo]) {
      familiesMap[hNo] = [];
    }
    familiesMap[hNo].push(v);
  });

  return familiesMap;
}

// ─── 4. VISUAL ANALYTICS & DEMOGRAPHICS ENGINE ──────────────────────────
function calculateDemographics(votersList) {
  const total = votersList.length || 1;
  const male = votersList.filter(v => (v.gender || 'M').toUpperCase() === 'M').length;
  const female = votersList.filter(v => (v.gender || '').toUpperCase() === 'F').length;

  const firstTime = votersList.filter(v => {
    const a = parseInt(v.age) || 0;
    return a >= 18 && a <= 21;
  }).length;

  const youth = votersList.filter(v => {
    const a = parseInt(v.age) || 0;
    return a >= 22 && a <= 35;
  }).length;

  const adults = votersList.filter(v => {
    const a = parseInt(v.age) || 0;
    return a >= 36 && a <= 59;
  }).length;

  const seniors = votersList.filter(v => {
    const a = parseInt(v.age) || 0;
    return a >= 60;
  }).length;

  const verified = votersList.filter(v => v.status && v.status.toLowerCase() === 'verified').length;
  const asddDone = votersList.filter(v => v.status && v.status.toLowerCase() !== 'unverified').length;

  return {
    total: votersList.length,
    male, female,
    malePct: Math.round((male / total) * 100),
    femalePct: Math.round((female / total) * 100),
    firstTime, youth, adults, seniors,
    verified, asddDone,
    asddPct: Math.round((asddDone / total) * 100)
  };
}

// ─── 5. ECI FORM 6, FORM 7, FORM 8 QUICK GENERATOR ─────────────────────
function openEciFormModal(voter, formType) {
  let modal = document.getElementById("eciFormModal");
  if (!modal) {
    const html = `
      <div class="modal-overlay" id="eciFormModal">
        <div class="modal-card" style="max-width:720px;">
          <div class="modal-header" style="background:#0f172a;">
            <h3 id="eciFormModalTitle" style="color:#fff;"><i class="fa-solid fa-file-pen"></i> ECI Form Application</h3>
            <button class="btn btn-sm btn-outline" style="color:#fff;" onclick="closeEciFormModal()">✕</button>
          </div>
          <div class="modal-body" id="eciFormModalBody" style="background:#fff; font-family:'Noto Sans Kannada', sans-serif;">
            <!-- Form HTML -->
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="closeEciFormModal()">ಮುಚ್ಚಿ (Close)</button>
            <button class="btn btn-primary btn-sm" onclick="printEciForm()"><i class="fa-solid fa-print"></i> ಫಾರ್ಮ್ ಪ್ರಿಂಟ್ ಮಾಡಿ (Print Form)</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
    modal = document.getElementById("eciFormModal");
  }

  const body = document.getElementById("eciFormModalBody");
  const title = document.getElementById("eciFormModalTitle");

  let formName = "Form 6 (ನೂತನ ಮತದಾರರ ಸೇರ್ಪಡೆ)";
  if (formType === 'Form 7') formName = "Form 7 (ಮತದಾರರ ಹೆಸರು ತೆಗೆಯುವುದು / ಆಕ್ಷೇಪಣೆ)";
  if (formType === 'Form 8') formName = "Form 8 (ವಿವರಗಳ ತಿದ್ದುಪಡಿ / ಸ್ಥಳಾಂತರ)";

  title.innerHTML = `<i class="fa-solid fa-file-pdf" style="color:#38bdf8;"></i> ${formName}`;

  body.innerHTML = `
    <div id="printableFormArea" style="border:2px solid #000; padding:15px; background:#fff; font-size:9.5pt;">
      <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:12px;">
        <h3 style="margin:0; font-size:14pt; font-weight:800;">ELECTION COMMISSION OF INDIA</h3>
        <h4 style="margin:4px 0 0 0; font-size:11pt; font-weight:700; color:#0284c7;">${formName}</h4>
        <p style="margin:2px 0 0 0; font-size:8.5pt;">ರಾಜ್ಯ: ಕರ್ನಾಟಕ | ವಿಧಾನಸಭೆ ಕ್ಷೇತ್ರ: 53 - ರಾಯಚೂರು ಗ್ರಾಮಾಂತರ (SC) | ಮತಗಟ್ಟೆ ಭಾಗ: ${voter.partNo || currentPartNo}</p>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <tr>
          <td style="padding:6px; border:1px solid #000; font-weight:bold; width:35%;">ಮತದಾರರ ಅನುಕ್ರಮ ಸಂಖ್ಯೆ (Sl.No):</td>
          <td style="padding:6px; border:1px solid #000; font-weight:bold; color:#0284c7;">#${voter.slNo}</td>
        </tr>
        <tr>
          <td style="padding:6px; border:1px solid #000; font-weight:bold;">EPIC ಕಾರ್ಡ್ ನಂಬರ್:</td>
          <td style="padding:6px; border:1px solid #000; font-weight:bold;">${voter.epicNo}</td>
        </tr>
        <tr>
          <td style="padding:6px; border:1px solid #000; font-weight:bold;">ಮತದಾರರ ಪೂರ್ಣ ಹೆಸರು:</td>
          <td style="padding:6px; border:1px solid #000; font-weight:bold;">${voter.nameKn}</td>
        </tr>
        <tr>
          <td style="padding:6px; border:1px solid #000; font-weight:bold;">ಸಂಬಂಧಿಯ ಹೆಸರು & ಪ್ರಕಾರ:</td>
          <td style="padding:6px; border:1px solid #000;">${voter.relNameKn || '-'} (${voter.relType || 'Father'})</td>
        </tr>
        <tr>
          <td style="padding:6px; border:1px solid #000; font-weight:bold;">ಮನೆ ಸಂಖ್ಯೆ (House No):</td>
          <td style="padding:6px; border:1px solid #000;">${voter.houseNo || '-'}</td>
        </tr>
        <tr>
          <td style="padding:6px; border:1px solid #000; font-weight:bold;">ವಯಸ್ಸು ಹಾಗೂ ಲಿಂಗ:</td>
          <td style="padding:6px; border:1px solid #000;">${voter.age} ವರ್ಷ | ${voter.gender==='F'?'ಸ್ತ್ರೀ':'ಗಂಡು'}</td>
        </tr>
        <tr>
          <td style="padding:6px; border:1px solid #000; font-weight:bold;">ಪ್ರಸ್ತುತ ಸ್ಥಳೀಯ ಸ್ಥಿತಿ:</td>
          <td style="padding:6px; border:1px solid #000; font-weight:bold; color:#ef4444;">${voter.status || 'Unverified'}</td>
        </tr>
      </table>

      <div style="border:1px dashed #000; padding:8px; margin-bottom:12px; background:#f8fafc; font-size:8.5pt;">
        <strong>ಅರ್ಜಿಯ ವಿವರಣೆ (Application Reason):</strong><br>
        ${formType==='Form 7' ? 'ಸದರಿ ಮತದಾರರು ಮೃತರಾಗಿದ್ದಾರೆ / ಸ್ಥಳಾಂತರಗೊಂಡಿದ್ದಾರೆ. ಈ ಹೆಸರು ರದ್ದುಗೊಳಿಸಲು ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ.' : (formType==='Form 8' ? 'ಸದರಿ ಮತದಾರರ ಹೆಸರು, ವಿಳಾಸ ಅಥವಾ ವಯಸ್ಸಿನಲ್ಲಿ ತಿದ್ದುಪಡಿಗಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ.' : 'ನೂತನವಾಗಿ ಮತದಾರರ ಪಟ್ಟಿಗೆ ಸೇರ್ಪಡೆಗೊಳ್ಳಲು ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ.')}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:25px; font-size:8.5pt;">
        <div>
          ದಿನಾಂಕ: ${new Date().toLocaleDateString()}<br>
          ಸ್ಥಳ: ಮಚೇಡಬೂಲ, ರಾಯಚೂರು
        </div>
        <div style="text-align:center; border-top:1px solid #000; padding-top:4px; width:200px;">
          <strong>ಅರ್ಜಿದಾರರು / BLO ಸಹಿ</strong>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("active");
}

function closeEciFormModal() {
  const modal = document.getElementById("eciFormModal");
  if (modal) modal.classList.remove("active");
}

function printEciForm() {
  window.print();
}
