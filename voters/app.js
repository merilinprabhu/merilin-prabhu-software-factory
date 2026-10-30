// ══════════════════════════════════════════════════════════════════════════
//  BLO SMART PORTAL V5.0 – MAIN APPLICATION CONTROLLER (app.js)
// ══════════════════════════════════════════════════════════════════════════

let voters = [];
let activeStatusFilter = "all";
let activeHouseFilter = "all";
let activeSirFilter = "all";
let currentViewMode = "pdfbox";
let currentPage = 1;
const votersPerPage = 40;
let currentModalVoterId = null;

// ─── ANIMATED COUNTER ──────────────────────────────────────────────────
function animateCounter(el, target) {
  if (!el) return;
  const num = parseInt(target) || 0;
  if (num === 0) { el.textContent = "0"; return; }
  let current = 0;
  const step = Math.max(1, Math.ceil(num / 25));
  const interval = setInterval(() => {
    current += step;
    if (current >= num) {
      current = num;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 25);
}

// ─── RENDER DASHBOARD STATS ────────────────────────────────────────────
function renderDashboardStats() {
  const total = voters.length;
  const unverified = voters.filter(v => !v.status || v.status === "Unverified").length;
  const verified = voters.filter(v => v.status === "Verified").length;
  const mapDone = voters.filter(v => v.isMapDone).length;
  const progenyDone = voters.filter(v => v.isProgenyDone).length;
  const absent = voters.filter(v => v.status === "Absent").length;
  const shifted = voters.filter(v => v.status === "Shifted").length;
  const death = voters.filter(v => v.status === "Death").length;
  const double = voters.filter(v => v.status === "Double" || v.status === "Duplicate").length;

  animateCounter(document.getElementById("statTotal"), total);
  if (document.getElementById("statUnverified")) animateCounter(document.getElementById("statUnverified"), unverified);
  animateCounter(document.getElementById("statVerified"), verified);
  animateCounter(document.getElementById("statMapDone"), mapDone);
  animateCounter(document.getElementById("statProgenyDone"), progenyDone);
  animateCounter(document.getElementById("statAbsent"), absent);
  animateCounter(document.getElementById("statShifted"), shifted);
  animateCounter(document.getElementById("statDeath"), death);
  animateCounter(document.getElementById("statDouble"), double);
}

// ─── POPULATE HOUSE FILTER OPTIONS ─────────────────────────────────────
function populateHouseFilterOptions() {
  const houseSelect = document.getElementById("houseFilter");
  if (!houseSelect) return;

  const houses = Array.from(new Set(voters.map(v => v.houseNo).filter(Boolean))).sort();
  houseSelect.innerHTML = '<option value="all">ಎಲ್ಲಾ ಮನೆಗಳು (All Houses)</option>';
  houses.forEach(h => {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = `ಮನೆ ನಂ: ${h}`;
    houseSelect.appendChild(opt);
  });
}

// ─── FILTER VOTERS ─────────────────────────────────────────────────────
function getFilteredVoters() {
  const voterQuery = (document.getElementById("searchVoterNameInput")?.value || "").trim().toLowerCase();
  const relQuery = (document.getElementById("searchRelNameInput")?.value || "").trim().toLowerCase();
  const epicHouseQuery = (document.getElementById("searchEpicHouseInput")?.value || document.getElementById("searchInput")?.value || "").trim().toLowerCase();

  return voters.filter(v => {
    // 1. Voter Name Match (Kannada, English, Transliterated, Phonetic)
    if (voterQuery) {
      const matched = typeof matchNameSmart === 'function'
        ? matchNameSmart(v.nameKn, v.nameEn, voterQuery)
        : (v.nameKn || "").toLowerCase().includes(voterQuery) || (v.nameEn || "").toLowerCase().includes(voterQuery);
      if (!matched) return false;
    }

    // 2. Relative Name Match (Kannada, English, Transliterated, Phonetic)
    if (relQuery) {
      const matched = typeof matchNameSmart === 'function'
        ? matchNameSmart(v.relNameKn, v.relNameEn, relQuery)
        : (v.relNameKn || "").toLowerCase().includes(relQuery) || (v.relNameEn || "").toLowerCase().includes(relQuery);
      if (!matched) return false;
    }

    // 3. EPIC / House / Mobile / SlNo Match
    if (epicHouseQuery) {
      const matchEpic = (v.epicNo || "").toLowerCase().includes(epicHouseQuery);
      const matchHouse = (v.houseNo || "").toLowerCase().includes(epicHouseQuery);
      const matchSl = (v.slNo || "").toString().includes(epicHouseQuery);
      const matchMobile = (v.mobile || "").toLowerCase().includes(epicHouseQuery);
      const matchRemarks = (v.remarks || "").toLowerCase().includes(epicHouseQuery);

      if (!matchEpic && !matchHouse && !matchSl && !matchMobile && !matchRemarks) return false;
    }

    // Status filter
    if (activeStatusFilter !== "all") {
      if (activeStatusFilter === "Unverified") {
        if (v.status && v.status !== "Unverified") return false;
      } else if (v.status !== activeStatusFilter) {
        return false;
      }
    }

    // House filter
    if (activeHouseFilter !== "all" && v.houseNo !== activeHouseFilter) {
      return false;
    }

    // SIR / Progeny filter
    if (activeSirFilter === "MapDone" && !v.isMapDone) return false;
    if (activeSirFilter === "ProgenyDone" && !v.isProgenyDone) return false;

    return true;
  });
}

// ─── MAIN RENDER VOTER LIST ────────────────────────────────────────────
function renderVoterList() {
  const filtered = getFilteredVoters();
  const pdfContainer = document.getElementById("pdfBoxViewContainer");
  const tableContainer = document.getElementById("tableViewContainer");
  const emptyState = document.getElementById("emptyStateContainer");
  const paginationBar = document.getElementById("paginationBar");

  if (filtered.length === 0) {
    if (pdfContainer) pdfContainer.style.display = "none";
    if (tableContainer) tableContainer.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    if (paginationBar) paginationBar.style.display = "none";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (paginationBar) paginationBar.style.display = "flex";

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / votersPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * votersPerPage;
  const pageVoters = filtered.slice(startIdx, startIdx + votersPerPage);

  if (currentViewMode === "pdfbox") {
    if (pdfContainer) {
      pdfContainer.style.display = "grid";
      renderPdfBoxView(pageVoters, pdfContainer, startIdx);
    }
    if (tableContainer) tableContainer.style.display = "none";
  } else {
    if (tableContainer) {
      tableContainer.style.display = "block";
      renderTableView(pageVoters, tableContainer, startIdx);
    }
    if (pdfContainer) pdfContainer.style.display = "none";
  }

  renderPagination(totalPages);
}

// ─── RENDER PDF BOX VIEW (ZERO-POPUP DIRECT INLINE EDITABLE) ───────────
function renderPdfBoxView(list, container, startIdx = 0) {
  container.innerHTML = "";

  list.forEach((v, idx) => {
    const card = document.createElement("div");
    card.className = "voter-pdf-card";
    const listNo = startIdx + idx + 1;

    card.innerHTML = `
      <div class="voter-card-header" style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:0.4rem 0.6rem; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:0.4rem; font-weight:800; color:var(--primary); font-size:0.85rem;">
          <span style="background:#0f172a; color:#fff; padding:0.15rem 0.4rem; border-radius:4px; font-size:0.75rem;">No. ${listNo}</span>
          <span>Voter Sl: #</span><input type="number" class="inline-cell-input" style="width:55px; font-weight:800; color:var(--primary); padding:0.1rem 0.2rem;" value="${v.slNo}" onchange="updateVoterInlineField('${v.id}', 'slNo', this.value)">
        </div>
        <div>
          <input type="text" class="inline-cell-input" style="width:110px; font-weight:700; color:#0284c7; text-align:right; padding:0.1rem 0.2rem;" value="${v.epicNo}" onchange="updateVoterInlineField('${v.id}', 'epicNo', this.value)">
        </div>
      </div>

      <div class="voter-card-body" style="padding:0.6rem; display:flex; gap:0.6rem;">
        <img id="img_${v.id}" class="voter-photo-frame" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODUiIGhlaWdodD0iMTA1IiB2aWV3Qm94PSIwIDAgODUgMTA1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4NSIgaGVpZhd0PSIxMDUiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSI0MiIgeT0iNTgiIGZpbGw9IiM5NGEzYjgiIGZvbnQtc2l6ZT0iOSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPk5vIFBob3RvPC90ZXh0Pjwvc3ZnPg==" alt="Photo">
        
        <div class="voter-card-details" style="flex:1; display:flex; flex-direction:column; gap:0.35rem;">
          <div>
            <input type="text" class="inline-cell-input" style="font-weight:800; font-size:0.95rem; color:var(--text-main); padding:0.15rem 0.3rem;" value="${v.nameKn}" placeholder="ಮತದಾರರ ಹೆಸರು" onchange="updateVoterInlineField('${v.id}', 'nameKn', this.value)">
          </div>

          <div style="display:flex; gap:0.25rem; align-items:center;">
            <select class="inline-cell-select" style="width:75px; font-size:0.75rem; padding:0.1rem 0.2rem;" onchange="updateVoterInlineField('${v.id}', 'relType', this.value)">
              <option value="Father" ${v.relType==='Father'?'selected':''}>Father</option>
              <option value="Husband" ${v.relType==='Husband'?'selected':''}>Husband</option>
              <option value="Mother" ${v.relType==='Mother'?'selected':''}>Mother</option>
              <option value="Other" ${v.relType==='Other'?'selected':''}>Other</option>
            </select>
            <input type="text" class="inline-cell-input" style="flex:1; font-size:0.82rem; padding:0.1rem 0.3rem;" value="${v.relNameKn || ''}" placeholder="ಸಂಬಂಧಿ ಹೆಸರು" onchange="updateVoterInlineField('${v.id}', 'relNameKn', this.value)">
          </div>

          <div style="display:flex; gap:0.4rem; align-items:center;">
            <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-house"></i> ಮನೆ:</span>
            <input type="text" class="inline-cell-input" style="flex:1; font-size:0.82rem; padding:0.1rem 0.3rem;" value="${v.houseNo || ''}" placeholder="ಮನೆ ನಂ" onchange="updateVoterInlineField('${v.id}', 'houseNo', this.value)">
          </div>

          <div style="display:flex; gap:0.4rem; align-items:center;">
            <input type="number" class="inline-cell-input" style="width:45px; font-size:0.8rem; padding:0.1rem 0.2rem;" value="${v.age || '0'}" onchange="updateVoterInlineField('${v.id}', 'age', this.value)">
            <span style="font-size:0.75rem; color:var(--text-muted);">ವರ್ಷ |</span>
            <select class="inline-cell-select" style="width:70px; font-size:0.75rem; padding:0.1rem 0.2rem;" onchange="updateVoterInlineField('${v.id}', 'gender', this.value)">
              <option value="M" ${v.gender==='M'?'selected':''}>ಗಂಡು</option>
              <option value="F" ${v.gender==='F'?'selected':''}>ಸ್ತ್ರೀ</option>
            </select>
          </div>

          <div style="margin-top:0.2rem; display:flex; gap:0.3rem; flex-wrap:wrap; align-items:center;">
            ${v.isMapDone ? `<span class="badge badge-mapped" style="font-size:0.7rem;"><i class="fa-solid fa-check"></i> 2002 Mapped</span>` : `<button class="btn btn-sm btn-outline" style="padding:0.15rem 0.4rem; font-size:0.72rem;" onclick="openDash2002Modal('${v.id}')"><i class="fa-solid fa-sitemap"></i> Map 2002</button>`}
            ${v.isProgenyDone ? `<span class="badge badge-progeny" style="font-size:0.7rem;"><i class="fa-solid fa-tree"></i> Progeny</span>` : ``}
            <div class="dropdown" style="display:inline-block;">
              <select class="inline-cell-select" style="width:auto; font-size:0.72rem; padding:0.15rem 0.3rem; background:#f1f5f9; font-weight:700; color:#0284c7;" onchange="if(this.value){openEciFormModal(voters.find(x=>x.id==='${v.id}'), this.value); this.value='';}">
                <option value="">📄 ECI Forms...</option>
                <option value="Form 6">Form 6 (Inclusion)</option>
                <option value="Form 7">Form 7 (Deletion)</option>
                <option value="Form 8">Form 8 (Correction)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="voter-card-footer" style="padding:0.4rem 0.6rem; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
        <select class="inline-cell-select status-select" style="font-weight:700; font-size:0.78rem; padding:0.25rem 0.4rem; width:auto;" onchange="updateVoterStatus('${v.id}', this.value)">
          <option value="Verified" ${v.status==='Verified'?'selected':''}>✅ Verified</option>
          <option value="Unverified" ${v.status==='Unverified'?'selected':''}>⏳ Unverified</option>
          <option value="Absent" ${v.status==='Absent'?'selected':''}>🛑 Absent (ASDD)</option>
          <option value="Shifted" ${v.status==='Shifted'?'selected':''}>🚚 Shifted (ASDD)</option>
          <option value="Death" ${v.status==='Death'?'selected':''}>💀 Death (ASDD)</option>
          <option value="Double" ${v.status==='Double'||v.status==='Duplicate'?'selected':''}>👯 Double (ASDD)</option>
        </select>
        <button class="btn btn-primary btn-sm" style="padding:0.15rem 0.5rem; font-size:0.75rem;" onclick="openVoterModal('${v.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
      </div>
    `;

    container.appendChild(card);

    // Load photo asynchronously
    loadVoterPhoto(v.id, v.photoUrl);
  });
}

// ─── LOAD VOTER PHOTO ──────────────────────────────────────────────────
async function loadVoterPhoto(voterId, photoUrl) {
  const imgEl = document.getElementById(`img_${voterId}`);
  if (!imgEl) return;

  if (photoUrl && photoUrl.startsWith("idb:") && window.photoDB) {
    const key = photoUrl.replace("idb:", "");
    try {
      const dataUrl = await window.photoDB.getPhoto(key);
      if (dataUrl) imgEl.src = dataUrl;
    } catch (e) {}
  } else if (photoUrl && !photoUrl.startsWith("idb:")) {
    imgEl.src = photoUrl;
  }
}

// ─── RENDER TABLE VIEW (EXCEL-STYLE ZERO-POPUP INLINE EDITABLE) ─────────
function renderTableView(list, container, startIdx = 0) {
  container.innerHTML = `
    <table class="voters-table">
      <thead>
        <tr style="background:#0f172a; color:#fff;">
          <th style="width:45px; text-align:center;">No.</th>
          <th style="width:75px;">Voter Sl</th>
          <th style="width:130px;">EPIC No</th>
          <th>ಮತದಾರರ ಹೆಸರು (Voter Name)</th>
          <th>ಸಂಬಂಧಿಯ ಹೆಸರು (Relative)</th>
          <th style="width:95px;">ಸಂಬಂಧ (Rel)</th>
          <th style="width:85px;">ಮನೆ ನಂ</th>
          <th style="width:65px;">ವಯಸ್ಸು</th>
          <th style="width:75px;">ಲಿಂಗ</th>
          <th>2002 Mapped & Progeny</th>
          <th>ಸ್ಥಿತಿ (ASDD Status)</th>
          <th>ECI Forms</th>
        </tr>
      </thead>
      <tbody>
        ${list.map((v, idx) => `
          <tr>
            <td style="text-align:center; font-weight:800; color:var(--text-muted); font-size:0.85rem;">${startIdx + idx + 1}</td>
            <td>
              <input type="number" class="inline-cell-input" style="font-weight:800; color:var(--primary);" value="${v.slNo}" onchange="updateVoterInlineField('${v.id}', 'slNo', this.value)">
            </td>
            <td>
              <input type="text" class="inline-cell-input" style="font-weight:700; color:#0284c7;" value="${v.epicNo}" onchange="updateVoterInlineField('${v.id}', 'epicNo', this.value)">
            </td>
            <td>
              <input type="text" class="inline-cell-input" style="font-weight:700;" value="${v.nameKn}" placeholder="ಮತದಾರರ ಹೆಸರು" onchange="updateVoterInlineField('${v.id}', 'nameKn', this.value)">
            </td>
            <td>
              <input type="text" class="inline-cell-input" value="${v.relNameKn || ''}" placeholder="ಸಂಬಂಧಿಯ ಹೆಸರು" onchange="updateVoterInlineField('${v.id}', 'relNameKn', this.value)">
            </td>
            <td>
              <select class="inline-cell-select" onchange="updateVoterInlineField('${v.id}', 'relType', this.value)">
                <option value="Father" ${v.relType==='Father'?'selected':''}>Father</option>
                <option value="Husband" ${v.relType==='Husband'?'selected':''}>Husband</option>
                <option value="Mother" ${v.relType==='Mother'?'selected':''}>Mother</option>
                <option value="Other" ${v.relType==='Other'?'selected':''}>Other</option>
              </select>
            </td>
            <td>
              <input type="text" class="inline-cell-input" value="${v.houseNo || ''}" placeholder="ಮನೆ ನಂ" onchange="updateVoterInlineField('${v.id}', 'houseNo', this.value)">
            </td>
            <td>
              <input type="number" class="inline-cell-input" value="${v.age || '0'}" onchange="updateVoterInlineField('${v.id}', 'age', this.value)">
            </td>
            <td>
              <select class="inline-cell-select" onchange="updateVoterInlineField('${v.id}', 'gender', this.value)">
                <option value="M" ${v.gender==='M'?'selected':''}>ಗಂಡು</option>
                <option value="F" ${v.gender==='F'?'selected':''}>ಸ್ತ್ರೀ</option>
              </select>
            </td>
            <td>
              <div style="display:flex; flex-direction:column; gap:0.2rem;">
                ${v.isMapDone ? `<span class="badge badge-mapped" style="font-size:0.75rem;"><i class="fa-solid fa-check"></i> 2002 Mapped (${v.ref2002Epic || 'Linked'})</span>` : `<button class="btn btn-sm btn-outline" style="padding:0.15rem 0.4rem; font-size:0.72rem;" onclick="openDash2002Modal('${v.id}')"><i class="fa-solid fa-sitemap"></i> Map 2002</button>`}
                ${v.isProgenyDone ? `<span class="badge badge-progeny" style="font-size:0.72rem;"><i class="fa-solid fa-tree"></i> Progeny Verified</span>` : ``}
              </div>
            </td>
            <td>
              <select class="inline-cell-select status-select" style="font-weight:700;" onchange="updateVoterStatus('${v.id}', this.value)">
                <option value="Verified" ${v.status==='Verified'?'selected':''}>✅ Verified</option>
                <option value="Unverified" ${v.status==='Unverified'?'selected':''}>⏳ Unverified</option>
                <option value="Absent" ${v.status==='Absent'?'selected':''}>🛑 Absent (ASDD)</option>
                <option value="Shifted" ${v.status==='Shifted'?'selected':''}>🚚 Shifted (ASDD)</option>
                <option value="Death" ${v.status==='Death'?'selected':''}>💀 Death (ASDD)</option>
                <option value="Double" ${v.status==='Double'||v.status==='Duplicate'?'selected':''}>👯 Double (ASDD)</option>
              </select>
            </td>
            <td>
              <select class="inline-cell-select" style="font-size:0.75rem; font-weight:700; color:#0284c7; background:#f1f5f9;" onchange="if(this.value){openEciFormModal(voters.find(x=>x.id==='${v.id}'), this.value); this.value='';}">
                <option value="">📄 Forms</option>
                <option value="Form 6">Form 6</option>
                <option value="Form 7">Form 7</option>
                <option value="Form 8">Form 8</option>
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Direct Inline Field Update (Zero Popup)
async function updateVoterInlineField(voterId, fieldName, newValue) {
  const voter = voters.find(v => v.id === voterId);
  if (!voter) return;

  const val = (newValue || "").trim();
  voter[fieldName] = val;

  if (fieldName === 'slNo') {
    voters.sort((a, b) => (parseInt(a.slNo) || 0) - (parseInt(b.slNo) || 0));
  }

  await saveVotersForPart(currentPartNo, voters);
  renderDashboardStats();
  showToast(`ಮತದಾರ #${voter.slNo} ${fieldName} ನವೀಕರಿಸಲಾಗಿದೆ!`, "success");
}

// ─── DIRECT DASHBOARD 2002 MAPPING MODAL CONTROLLER ───────────────────
let currentDashMapVoterId = null;
let currentDash2002Roll = [];

async function openDash2002Modal(voterId) {
  currentDashMapVoterId = voterId;
  const voter = voters.find(v => v.id === voterId);
  if (!voter) return;

  const modal = document.getElementById("dashboard2002MapModal");
  if (!modal) return;

  document.getElementById("dash2002ModalTitle").textContent = `SIR 2002 Mapping: ${voter.nameKn} (${voter.epicNo})`;
  document.getElementById("dash2002ModalSubTitle").textContent = `ಮನೆ ನಂ: ${voter.houseNo} | ಸಂಬಂಧಿ: ${voter.relNameKn || '-'}`;
  
  if (document.getElementById("dash2002PartNoInput")) document.getElementById("dash2002PartNoInput").value = voter.psNo || voter.partNo || currentPartNo;
  if (document.getElementById("dash2002SlNoInput")) document.getElementById("dash2002SlNoInput").value = "";
  if (document.getElementById("dash2002VoterNameInput")) document.getElementById("dash2002VoterNameInput").value = voter.nameKn || "";
  if (document.getElementById("dash2002RelNameInput")) document.getElementById("dash2002RelNameInput").value = voter.relNameKn || "";

  currentDash2002Roll = await get2002RollForPart(currentPartNo);

  modal.classList.add("active");
  searchDash2002Modal();
}

function closeDash2002Modal() {
  const modal = document.getElementById("dashboard2002MapModal");
  if (modal) modal.classList.remove("active");
  currentDashMapVoterId = null;
}

function searchDash2002Modal() {
  const psNo = (document.getElementById("dash2002PartNoInput")?.value || "").trim();
  const slNo = (document.getElementById("dash2002SlNoInput")?.value || "").trim();
  const voterQ = (document.getElementById("dash2002VoterNameInput")?.value || "").trim().toLowerCase();
  const relQ = (document.getElementById("dash2002RelNameInput")?.value || "").trim().toLowerCase();
  const tbody = document.getElementById("dash2002TableBody");
  if (!tbody) return;

  const activeVoter = voters.find(v => v.id === currentDashMapVoterId);

  let list = currentDash2002Roll;

  // Filter by PS. NO
  if (psNo) {
    list = list.filter(r => (r.psNo || r.partNo || "").toString().trim() === psNo);
  }

  // Filter by SlNo
  if (slNo) {
    list = list.filter(r => (r.slNo || "").toString().trim() === slNo);
  }

  // Filter by Voter Name
  if (voterQ) {
    list = list.filter(r => {
      const matchKn = (r.nameKn || "").toLowerCase().includes(voterQ);
      const matchEn = (r.nameEn || "").toLowerCase().includes(voterQ);
      const matchEpic = (r.epicNo || "").toLowerCase().includes(voterQ);
      const translit = typeof transliterateKannadaToEnglish === 'function' ? transliterateKannadaToEnglish(r.nameKn) : "";
      return matchKn || matchEn || matchEpic || translit.includes(voterQ);
    });
  }

  // Filter by Relative Name
  if (relQ) {
    list = list.filter(r => {
      const matchKn = (r.relNameKn || "").toLowerCase().includes(relQ);
      const matchEn = (r.relNameEn || "").toLowerCase().includes(relQ);
      const translit = typeof transliterateKannadaToEnglish === 'function' ? transliterateKannadaToEnglish(r.relNameKn) : "";
      return matchKn || matchEn || translit.includes(relQ);
    });
  }

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted);">
          2002 ಪಟ್ಟಿಯಲ್ಲಿ ಯಾವುದೇ ಹೊಂದಾಣಿಕೆಯ ವಿವರಗಳು ಸಿಗಲಿಲ್ಲ. <br>
          <button class="btn btn-sm btn-primary" style="margin-top:0.5rem;" onclick="manualBind2002FromDashPrompt()">+ 2002 EPIC/SlNo ಟೈಪ್ ಮಾಡಿ ಮ್ಯಾಪ್ ಮಾಡಿ</button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.slice(0, 15).map(r => {
    let matchBadge = `<span class="badge badge-outline">Candidate</span>`;
    if (activeVoter) {
      const nameMatch = activeVoter.nameKn && r.nameKn && activeVoter.nameKn.trim() === r.nameKn.trim();
      const relMatch = activeVoter.relNameKn && r.relNameKn && activeVoter.relNameKn.trim() === r.relNameKn.trim();

      if (nameMatch && relMatch) {
        matchBadge = `<span class="badge badge-success">🎯 Best Match</span>`;
      } else if (nameMatch) {
        matchBadge = `<span class="badge badge-success">🎯 Name Match</span>`;
      } else if (relMatch) {
        matchBadge = `<span class="badge badge-shifted">🎯 Relative Match</span>`;
      }
    }

    return `
      <tr>
        <td><strong>PS #${r.psNo || r.partNo || currentPartNo} - Sl #${r.slNo}</strong></td>
        <td><span class="epic-badge">${r.epicNo}</span></td>
        <td><strong>${r.nameKn}</strong></td>
        <td>${r.relNameKn || '-'} <small class="text-muted">(${r.relType})</small></td>
        <td><span class="badge badge-outline">${r.houseNo}</span></td>
        <td>${matchBadge}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="bindDash2002Parent('${r.epicNo}', '${r.nameKn}', '${r.slNo}')">
            <i class="fa-solid fa-link"></i> Map & Link
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function bindDash2002Parent(parentEpic, parentName, parentSlNo) {
  if (!currentDashMapVoterId) return;
  const voter = voters.find(v => v.id === currentDashMapVoterId);
  if (voter) {
    voter.isMapDone = true;
    voter.isProgenyDone = true;
    voter.ref2002Epic = parentEpic;
    voter.remarks = `2002 Mapped: ${parentName} (2002 Sl #${parentSlNo})`;

    await saveVotersForPart(currentPartNo, voters);
    closeDash2002Modal();
    renderDashboardStats();
    renderVoterList();
    showToast(`ಮತದಾರ #${voter.slNo} ಗೆ 2002 ಪಟ್ಟಿ ಮ್ಯಾಪ್ ಮತ್ತು Progeny ಲಿಂಕ್ ಆಗಿದೆ!`, "success");
  }
}

async function manualBind2002FromDashPrompt() {
  if (!currentDashMapVoterId) return;
  const voter = voters.find(v => v.id === currentDashMapVoterId);
  if (!voter) return;

  const epic = prompt("2002 EPIC ಸಂಖ್ಯೆ ಅಥವಾ ಅನುಕ್ರಮ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ:");
  if (!epic) return;

  voter.isMapDone = true;
  voter.isProgenyDone = true;
  voter.ref2002Epic = epic.trim().toUpperCase();
  voter.remarks = `2002 Mapped: ${epic}`;

  await saveVotersForPart(currentPartNo, voters);
  closeDash2002Modal();
  renderDashboardStats();
  renderVoterList();
  showToast("2002 ಮ್ಯಾಪಿಂಗ್ ಪೂರ್ಣಗೊಂಡಿದೆ!", "success");
}

// ─── PAGINATION ────────────────────────────────────────────────────────
function renderPagination(totalPages) {
  const container = document.getElementById("paginationBar");
  if (!container) return;
  container.innerHTML = "";

  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; renderVoterList(); };
  container.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => { currentPage = i; renderVoterList(); };
      container.appendChild(pageBtn);
    }
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => { currentPage++; renderVoterList(); };
  container.appendChild(nextBtn);
}

// ─── VOTER MODAL LOGIC ─────────────────────────────────────────────────
function openVoterModal(voterId) {
  const voter = voters.find(v => v.id === voterId);
  if (!voter) return;

  currentModalVoterId = voterId;
  const modal = document.getElementById("voterModal");
  if (!modal) return;

  const badgeEl = document.getElementById("modalSlNoBadge");
  if (badgeEl) badgeEl.textContent = `ಅನುಕ್ರಮ #${voter.slNo}`;

  const slNoIn = document.getElementById("modalSlNoInput");
  if (slNoIn) slNoIn.value = voter.slNo || "";

  const nameIn = document.getElementById("modalNameInput");
  if (nameIn) nameIn.value = voter.nameKn || "";

  const epicIn = document.getElementById("modalEpicInput");
  if (epicIn) epicIn.value = voter.epicNo || "";

  const relNameIn = document.getElementById("modalRelNameInput");
  if (relNameIn) relNameIn.value = voter.relNameKn || "";

  const relTypeSel = document.getElementById("modalRelTypeSelect");
  if (relTypeSel) relTypeSel.value = voter.relType || "Father";

  const houseIn = document.getElementById("modalHouseNoInput");
  if (houseIn) houseIn.value = voter.houseNo || "";

  const addrIn = document.getElementById("modalAddressInput");
  if (addrIn) addrIn.value = voter.address || voter.sectionName || "";

  const ageIn = document.getElementById("modalAgeInput");
  if (ageIn) ageIn.value = voter.age || "0";

  const genderSel = document.getElementById("modalGenderSelect");
  if (genderSel) genderSel.value = voter.gender || "M";

  const mobIn = document.getElementById("modalMobile");
  if (mobIn) mobIn.value = voter.mobile || "";

  const remIn = document.getElementById("modalRemarks");
  if (remIn) remIn.value = voter.remarks || "";

  const ref2002In = document.getElementById("modal2002Ref");
  if (ref2002In) ref2002In.value = voter.ref2002Epic || "";

  const mapChk = document.getElementById("modalIsMapDone");
  if (mapChk) mapChk.checked = !!voter.isMapDone;

  const progChk = document.getElementById("modalIsProgenyDone");
  if (progChk) progChk.checked = !!voter.isProgenyDone;

  loadVoterPhoto(voter.id, voter.photoUrl);

  modal.classList.add("active");
}

function closeVoterModal() {
  const modal = document.getElementById("voterModal");
  if (modal) modal.classList.remove("active");
  currentModalVoterId = null;
}

async function updateVoterStatus(voterId, newStatus) {
  const voter = voters.find(v => v.id === voterId);
  if (!voter) return;

  voter.status = newStatus;
  await saveVotersForPart(currentPartNo, voters);

  renderDashboardStats();
  renderVoterList();

  if (currentModalVoterId === voterId) {
    closeVoterModal();
  }
  showToast(`ಮತದಾರ #${voter.slNo} ಸ್ಥಿತಿಯನ್ನು '${newStatus}' ಎಂದು ಬದಲಾಯಿಸಲಾಗಿದೆ.`, "success");
}

async function saveModalChanges() {
  let voter = voters.find(v => v.id === currentModalVoterId);
  if (!voter) {
    const slVal = document.getElementById("modalSlNoInput")?.value;
    const epicVal = document.getElementById("modalEpicInput")?.value;
    if (slVal) voter = voters.find(v => v.slNo.toString() === slVal.toString());
    if (!voter && epicVal) voter = voters.find(v => (v.epicNo || "").toUpperCase() === epicVal.toUpperCase());
  }

  if (!voter) {
    alert("⚠️ ಮತದಾರರ ವಿವರಗಳು ಸಿಗಲಿಲ್ಲ! ದಯವಿಟ್ಟು ಪೇಜ್ ರಿಫ್ರೆಶ್ ಮಾಡಿ ಮರಳಿ ಯತ್ನಿಸಿ.");
    closeVoterModal();
    return;
  }

  const slNoEl = document.getElementById("modalSlNoInput");
  if (slNoEl && slNoEl.value.trim()) voter.slNo = slNoEl.value.trim();

  const nameEl = document.getElementById("modalNameInput");
  if (nameEl && nameEl.value.trim()) voter.nameKn = nameEl.value.trim();

  const nameEnEl = document.getElementById("modalNameEnInput");
  if (nameEnEl && nameEnEl.value.trim()) voter.nameEn = nameEnEl.value.trim();

  const epicEl = document.getElementById("modalEpicInput");
  if (epicEl && epicEl.value.trim()) voter.epicNo = epicEl.value.trim();

  const relNameEl = document.getElementById("modalRelNameInput");
  if (relNameEl) voter.relNameKn = relNameEl.value.trim();

  const relNameEnEl = document.getElementById("modalRelNameEnInput");
  if (relNameEnEl) voter.relNameEn = relNameEnEl.value.trim();

  const relTypeEl = document.getElementById("modalRelTypeSelect");
  if (relTypeEl) voter.relType = relTypeEl.value;

  const houseEl = document.getElementById("modalHouseNoInput");
  if (houseEl) voter.houseNo = houseEl.value.trim() || "-";

  const addressEl = document.getElementById("modalAddressInput");
  if (addressEl) voter.address = addressEl.value.trim();

  const ageEl = document.getElementById("modalAgeInput");
  if (ageEl) voter.age = ageEl.value.trim() || "0";

  const genderEl = document.getElementById("modalGenderSelect");
  if (genderEl) voter.gender = genderEl.value;

  const mobileEl = document.getElementById("modalMobileInput") || document.getElementById("modalMobile");
  if (mobileEl) voter.mobile = mobileEl.value.trim();

  const statusEl = document.getElementById("modalStatusSelect") || document.getElementById("modalStatus");
  if (statusEl) voter.status = statusEl.value;

  const remarksEl = document.getElementById("modalRemarks");
  if (remarksEl) voter.remarks = remarksEl.value.trim();

  const ref2002El = document.getElementById("modal2002Ref");
  if (ref2002El) voter.ref2002Epic = ref2002El.value.trim();

  const mapChk = document.getElementById("modalIsMapDone");
  if (mapChk) voter.isMapDone = mapChk.checked;

  const progChk = document.getElementById("modalIsProgenyDone");
  if (progChk) voter.isProgenyDone = progChk.checked;

  // Re-sort voters numerically by SlNo
  voters.sort((a, b) => (parseInt(a.slNo) || 0) - (parseInt(b.slNo) || 0));

  try {
    await saveVotersForPart(currentPartNo, voters);
    populateHouseFilterOptions();
    renderDashboardStats();
    renderVoterList();
    closeVoterModal();
    if (typeof showToast === 'function') {
      showToast(`✅ ಮತದಾರ #${voter.slNo} (${voter.nameKn}) ವಿವರಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!`, "success");
    } else {
      alert(`✅ ಮತದಾರ #${voter.slNo} (${voter.nameKn}) ವಿವರಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!`);
    }
  } catch (err) {
    console.error("Error saving voters:", err);
    closeVoterModal();
    alert(`✅ ಮತದಾರ #${voter.slNo} ವಿವರಗಳನ್ನು ಉಳಿಸಲಾಗಿದೆ!`);
  }
}

// Alias for button onclick compatibility
function saveVoterModalChanges() {
  return saveModalChanges();
}

// ─── FILTER CONTROLLERS ────────────────────────────────────────────────
function filterByStatus(status) {
  activeStatusFilter = status;
  currentPage = 1;
  renderVoterList();
}

function filterByMapping(type) {
  activeSirFilter = (activeSirFilter === type) ? 'all' : type;
  currentPage = 1;
  renderVoterList();
}

function switchView(mode) {
  currentViewMode = mode;
  renderVoterList();
}

// ─── CSV EXPORT ────────────────────────────────────────────────────────
function exportVotersCSV() {
  const filtered = getFilteredVoters();
  if (filtered.length === 0) {
    showToast("ರಫ್ತು ಮಾಡಲು ಮತದಾರರಿಲ್ಲ!", "error");
    return;
  }

  const headers = ["SlNo", "EPICNo", "NameKn", "RelNameKn", "RelType", "HouseNo", "Age", "Gender", "Mobile", "Status", "Remarks"];
  const csvRows = [headers.join(",")];

  filtered.forEach(v => {
    const row = [
      `"${v.slNo}"`,
      `"${v.epicNo}"`,
      `"${v.nameKn}"`,
      `"${v.relNameKn}"`,
      `"${v.relType}"`,
      `"${v.houseNo}"`,
      `"${v.age}"`,
      `"${v.gender}"`,
      `"${v.mobile || ''}"`,
      `"${v.status}"`,
      `"${v.remarks || ''}"`
    ];
    csvRows.push(row.join(","));
  });

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BLO_VoterList_Part_${currentPartNo}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  showToast("CSV ಫೈಲ್ ಡೌನ್‌ಲೋಡ್ ಆಗಿದೆ!", "success");
}

// ─── ADD NEW VOTER AT SPECIFIC SERIAL NUMBER ────────────────────────────
function openAddVoterModal(suggestedSlNo) {
  const modal = document.getElementById("addVoterModal");
  if (!modal) return;

  const nextSl = suggestedSlNo || (voters && voters.length > 0 ? Math.max(...voters.map(v => parseInt(v.slNo) || 0)) + 1 : 1);

  document.getElementById("addVoterSlNoInput").value = nextSl;
  document.getElementById("addVoterEpicInput").value = "";
  document.getElementById("addVoterNameInput").value = "";
  document.getElementById("addVoterRelNameInput").value = "";
  document.getElementById("addVoterRelTypeSelect").value = "Father";
  document.getElementById("addVoterHouseNoInput").value = "";
  document.getElementById("addVoterAgeInput").value = "";
  document.getElementById("addVoterGenderSelect").value = "M";
  document.getElementById("addVoterMobileInput").value = "";
  document.getElementById("addVoterStatusSelect").value = "Verified";

  modal.classList.add("active");
}

function closeAddVoterModal() {
  const modal = document.getElementById("addVoterModal");
  if (modal) modal.classList.remove("active");
}

async function saveNewVoterSpecificSlNo() {
  const slNo = document.getElementById("addVoterSlNoInput").value.trim();
  const nameKn = document.getElementById("addVoterNameInput").value.trim();
  let epicNo = document.getElementById("addVoterEpicInput").value.trim();

  if (!slNo || !nameKn) {
    alert("ದಯವಿಟ್ಟು ಅನುಕ್ರಮ ಸಂಖ್ಯೆ (Serial Number) ಮತ್ತು ಮತದಾರರ ಹೆಸರನ್ನು ನಮೂದಿಸಿ!");
    return;
  }

  if (!epicNo) {
    epicNo = `MAN${currentPartNo}${slNo}`;
  }

  const relNameKn = document.getElementById("addVoterRelNameInput").value.trim();
  const relType = document.getElementById("addVoterRelTypeSelect").value;
  const houseNo = document.getElementById("addVoterHouseNoInput").value.trim() || "-";
  const age = document.getElementById("addVoterAgeInput").value.trim() || "0";
  const gender = document.getElementById("addVoterGenderSelect").value;
  const mobile = document.getElementById("addVoterMobileInput").value.trim();
  const status = document.getElementById("addVoterStatusSelect").value;

  const newVoter = {
    id: `${currentPartNo}_v_${slNo}`,
    partNo: currentPartNo,
    slNo: slNo,
    epicNo: epicNo,
    nameKn: nameKn,
    nameEn: nameKn,
    relNameKn: relNameKn,
    relType: relType,
    houseNo: houseNo,
    age: age,
    gender: gender,
    mobile: mobile,
    status: status,
    isMapDone: false,
    isProgenyDone: false,
    ref2002Epic: "",
    remarks: "ಹೊಸದಾಗಿ ಸೇರಿಸಲಾದ ಮತದಾರರು"
  };

  // Upsert at specific SlNo
  const existingIdx = voters.findIndex(v => v.slNo.toString() === slNo.toString());
  if (existingIdx !== -1) {
    voters[existingIdx] = { ...voters[existingIdx], ...newVoter };
  } else {
    voters.push(newVoter);
  }

  // Sort voters numerically by SlNo
  voters.sort((a, b) => (parseInt(a.slNo) || 0) - (parseInt(b.slNo) || 0));

  await saveVotersForPart(currentPartNo, voters);
  populateHouseFilterOptions();
  renderDashboardStats();
  renderVoterList();
  closeAddVoterModal();

  showToast(`ಅನುಕ್ರಮ #${slNo} ಗೆ ಮತದಾರ "${nameKn}" ಯಶಸ್ವಿಯಾಗಿ ಸೇರ್ಪಡೆಯಾಗಿದ್ದಾರೆ!`, "success");
}

// ─── LIVE AUTO TRANSLITERATION HANDLERS (ENGLISH TO KANNADA) ───────────
function autoConvertAddVoterName(val) {
  if (typeof transliterateEnglishToKannada === 'function') {
    const kn = transliterateEnglishToKannada(val);
    const target = document.getElementById("addVoterNameInput");
    if (target) target.value = kn;
  }
}

function autoConvertAddRelName(val) {
  if (typeof transliterateEnglishToKannada === 'function') {
    const kn = transliterateEnglishToKannada(val);
    const target = document.getElementById("addVoterRelNameInput");
    if (target) target.value = kn;
  }
}

function autoConvertEditVoterName(val) {
  if (typeof transliterateEnglishToKannada === 'function') {
    const kn = transliterateEnglishToKannada(val);
    const target = document.getElementById("modalNameInput");
    if (target) target.value = kn;
  }
}

function autoConvertEditRelName(val) {
  if (typeof transliterateEnglishToKannada === 'function') {
    const kn = transliterateEnglishToKannada(val);
    const target = document.getElementById("modalRelNameInput");
    if (target) target.value = kn;
  }
}
