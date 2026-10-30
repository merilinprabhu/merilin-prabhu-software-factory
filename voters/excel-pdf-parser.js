// ══════════════════════════════════════════════════════════════════════════
//  BLO SMART PORTAL V5.0 - ZERO-FAIL EXCEL (.xlsm, .xlsx, .csv) & PDF PARSER
// ══════════════════════════════════════════════════════════════════════════

function readFileBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('ಫೈಲ್ ಓದಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಬ್ರೌಸರ್ ರಿಫ್ರೆಶ್ ಮಾಡಿ ಯತ್ನಿಸಿ.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── EXCEL & MACRO (.xlsm, .xlsx, .xls, .csv) PARSER ENGINE ──────────────
async function processExcelFileEngine(file, partNo, onProgress, onLog) {
  if (onLog) onLog(`Excel / Macro ಬಫರ್ ಓದುತ್ತಿದೆ: ${file.name}...`, 'info');
  const arrayBuffer = await readFileBuffer(file);

  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS (XLSX) ಲೈಬ್ರರಿ ಲೋಡ್ ಆಗಿಲ್ಲ!');
  }

  if (onLog) onLog('Excel ಶೀಟ್ ವರ್ಕ್‌ಬುಕ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ...', 'info');
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel ಫೈಲ್‌ನಲ್ಲಿ ಯಾವುದೇ ಶೀಟ್‌ಗಳು ಸಿಗಲಿಲ್ಲ.');
  }

  const sheetName = workbook.SheetNames[0];
  if (onLog) onLog(`ಮೊದಲ ಶೀಟ್ ಓದಲಾಗುತ್ತಿದೆ: "${sheetName}"`, 'info');

  const worksheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!grid || grid.length === 0) {
    throw new Error('Excel ಶೀಟ್‌ನಲ್ಲಿ ಯಾವುದೇ ಸಾಲುಗಳಿಲ್ಲ.');
  }

  if (onLog) onLog(`ಒಟ್ಟು ${grid.length} ಸಾಲುಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...`, 'info');

  // Auto-detect header row
  let headerIdx = 0;
  const keywords = ['epic', 'name', 'sl', 'serial', 'ಹೆಸರು', 'ವಯಸ್ಸು', 'ಮನೆ', 'house', 'age', 'gender', 'ಲಿಂಗ', 'ಅನುಕ್ರಮ', 'ವಿವರ', 'ವೋಟರ್', 'relative', 'relation', 'ಸಂಬಂಧಿ'];

  for (let r = 0; r < Math.min(20, grid.length); r++) {
    const rowCells = (grid[r] || []).map(c => c ? c.toString().trim().toLowerCase() : '');
    const matchCount = rowCells.filter(cell => keywords.some(k => cell.includes(k))).length;
    if (matchCount >= 2) {
      headerIdx = r;
      break;
    }
  }

  const headers = (grid[headerIdx] || []).map(c => c ? c.toString().trim() : '');
  if (onLog) onLog(`ಹೆಡರ್ ಸಾಲು #${headerIdx + 1} ಪತ್ತೆಯಾಗಿದೆ: [${headers.filter(Boolean).join(', ')}]`, 'info');

  function getCellVal(rowObj, rowArr, possibleKeys, colIdxFallback) {
    for (const k of Object.keys(rowObj)) {
      const cleanK = k.toString().trim().toLowerCase();
      for (const target of possibleKeys) {
        if (cleanK === target.toLowerCase() || cleanK.includes(target.toLowerCase())) {
          if (rowObj[k] !== undefined && rowObj[k] !== null && rowObj[k] !== '') {
            return rowObj[k];
          }
        }
      }
    }
    if (colIdxFallback !== undefined && rowArr && rowArr[colIdxFallback] !== undefined && rowArr[colIdxFallback] !== null && rowArr[colIdxFallback] !== '') {
      return rowArr[colIdxFallback];
    }
    return '';
  }

  const voterList = [];
  let photoCount = 0;

  for (let r = headerIdx + 1; r < grid.length; r++) {
    const rowArr = grid[r];
    if (!rowArr || rowArr.every(c => c === '' || c === null || c === undefined)) continue;

    const rowObj = {};
    headers.forEach((h, cIdx) => {
      rowObj[h || `col_${cIdx}`] = rowArr[cIdx] !== undefined ? rowArr[cIdx] : '';
    });

    const epicRegex = /^[A-Z]{3}\d{7}$/i;

    let sl = getCellVal(rowObj, rowArr, ['sl.no', 'slno', 'sl_no', 'sl', 'serial', 'ಅನುಕ್ರಮ ಸಂಖ್ಯೆ', 'ಅನು.ಸಂ', 'ಕ್ರಮ ಸಂಖ್ಯೆ'], 0);
    if (!sl) sl = (voterList.length + 1).toString();

    let psNoExtracted = getCellVal(rowObj, rowArr, ['ps. no.', 'ps.no.', 'ps no', 'ps_no', 'part no', 'part_no', 'ಭಾಗ ಸಂಖ್ಯೆ', 'ಬೂತ್ ನಂ']);
    const rowPartNo = psNoExtracted ? psNoExtracted.toString().trim() : partNo;

    let epic = getCellVal(rowObj, rowArr, ['epic number', 'epicnumber', 'epicno', 'epic_no', 'epic', 'ಎಪಿಕ್', 'ಎಪಿಕ್ ಸಂಖ್ಯೆ'], 2);
    let nameKn = getCellVal(rowObj, rowArr, ['name (kannada)', 'name(kannada)', 'name_kannada', 'namekn', 'name_kn', 'kannada_name', 'ಮತದಾರರ ಹೆಸರು', 'ಹೆಸರು', 'name', 'voter_name'], 3);
    
    // Guard against EPIC string leaking into voter name
    if (nameKn && epicRegex.test(nameKn.toString().trim())) {
      if (!epic || !epicRegex.test(epic.toString().trim())) {
        epic = nameKn.toString().trim();
      }
      nameKn = (rowArr[3] && !epicRegex.test(rowArr[3])) ? rowArr[3] : ((rowArr[4] && !epicRegex.test(rowArr[4])) ? rowArr[4] : `ಮತದಾರ #${sl}`);
    }

    if (!epic || epic === '') {
      epic = `XL${rowPartNo}${sl}`;
    }
    if (!nameKn || nameKn === '') {
      nameKn = `ಮತದಾರ #${sl}`;
    }

    const nameEn = getCellVal(rowObj, rowArr, ['nameen', 'name_en', 'english_name', 'englishname']);

    let relTypeStr = getCellVal(rowObj, rowArr, ['relation type', 'relationtype', 'reltype', 'rel_type', 'relation', 'ಸಂಬಂಧ', 'ಸಂಬಂಧದ ಮಾದರಿ', 'ಸಂಬಂಧದ ಪ್ರಕಾರ'], 4);
    let relType = 'Father';
    if (relTypeStr) {
      const str = relTypeStr.toString().toLowerCase();
      if (str.includes('husband') || str.includes('ಗಂಡ')) relType = 'Husband';
      else if (str.includes('mother') || str.includes('ತಾಯಿ')) relType = 'Mother';
      else if (str.includes('other') || str.includes('ಇತರ')) relType = 'Other';
      else relType = 'Father';
    }

    let relName = getCellVal(rowObj, rowArr, ['relation name (kannada)', 'relation name(kannada)', 'relation_name_kannada', 'relnamekn', 'rel_name', 'relative_name', 'father_name', 'husband_name', 'mother_name', 'ತಂದೆ/ಗಂಡನ ಹೆಸರು', 'ಸಂಬಂಧಿಯ ಹೆಸರು', 'ತಂದೆಯ ಹೆಸರು', 'ಗಂಡನ ಹೆಸರು', 'relative'], 5);
    if (relName && epicRegex.test(relName.toString().trim())) {
      relName = (rowArr[5] && !epicRegex.test(rowArr[5])) ? rowArr[5] : '';
    }

    function isGenderValue(val) {
      if (val === undefined || val === null) return false;
      const s = val.toString().trim().toUpperCase();
      if (!s) return false;
      return ['M', 'F', 'W', 'MALE', 'FEMALE', 'MAN', 'WOMAN', 'ಗಂಡು', 'ಸ್ತ್ರೀ', 'ಮಹಿಳೆ', 'ಹೆಣ್ಣು', 'ಪುರುಷ', 'ಗಂ', 'ಹೆಂ'].includes(s) ||
             s.startsWith('ಗಂ') || s.startsWith('ಹೆಂ') || s.startsWith('ಸ್ತ್ರೀ') || s.startsWith('ಗಂಡು');
    }

    function isAgeValue(val) {
      if (val === undefined || val === null) return false;
      const s = val.toString().trim();
      const num = parseInt(s, 10);
      return !isNaN(num) && num >= 18 && num <= 120 && s.length <= 3 && /^\d+$/.test(s);
    }

    let relNameEn = getCellVal(rowObj, rowArr, ['relnameen', 'rel_name_en', 'relative_name_en']);

    // Smart Content-based Parsing for Unlabeled/Misaligned Columns
    let rawGender = getCellVal(rowObj, rowArr, ['gender', 'ಲಿಂಗ', 'sex']);
    if (!rawGender) {
      for (let c = 0; c < rowArr.length; c++) {
        if (isGenderValue(rowArr[c])) {
          rawGender = rowArr[c];
          break;
        }
      }
    }

    let gender = '';
    if (rawGender !== undefined && rawGender !== null && rawGender !== '') {
      const gStr = rawGender.toString().trim();
      const gUpper = gStr.toUpperCase();

      if (
        gStr === 'ಹೆಂ' || gStr.startsWith('ಹೆಂ') ||
        gStr.includes('ಹೆಣ್ಣು') || gStr.includes('ಸ್ತ್ರೀ') || gStr.includes('ಮಹಿಳೆ') ||
        gUpper === 'F' || gUpper === 'W' || gUpper.startsWith('FEMALE') || gUpper.startsWith('WOMAN')
      ) {
        gender = 'F';
      } else if (
        gStr === 'ಗಂ' || gStr.startsWith('ಗಂ') ||
        gStr.includes('ಗಂಡು') || gStr.includes('ಪುರುಷ') ||
        gUpper === 'M' || gUpper.startsWith('MALE') || gUpper.startsWith('MAN')
      ) {
        gender = 'M';
      } else {
        gender = gStr;
      }
    }

    let rawAge = getCellVal(rowObj, rowArr, ['age', 'ವಯಸ್ಸು']);
    if (!rawAge) {
      for (let c = 0; c < rowArr.length; c++) {
        if (isAgeValue(rowArr[c]) && rowArr[c] !== rawGender) {
          rawAge = rowArr[c];
          break;
        }
      }
    }
    const age = (rawAge !== undefined && rawAge !== null && rawAge !== '') ? rawAge.toString().trim() : '';

    let houseNoVal = getCellVal(rowObj, rowArr, ['house no', 'house no2', 'houseno', 'houseno2', 'house_no', 'house_no2', 'house', 'ಮನೆ ಸಂಖ್ಯೆ', 'ಮನೆ ನಂ', 'ಮನೆ']);
    if (!houseNoVal) {
      const fallbackHouse = rowArr[6];
      if (fallbackHouse && !isGenderValue(fallbackHouse) && !isAgeValue(fallbackHouse) && !epicRegex.test(fallbackHouse.toString().trim())) {
        houseNoVal = fallbackHouse.toString().trim();
      } else {
        houseNoVal = '-';
      }
    }
    const houseNo = houseNoVal || '-';

    const mobile = getCellVal(rowObj, rowArr, ['mobile', 'phone', 'contact', 'ಮೊಬೈಲ್']) || '';

    const rawStatus = getCellVal(rowObj, rowArr, ['status', 'voter status', 'voter_status', 'ಸ್ಥಿತಿ', 'ಮತದಾರರ ಸ್ಥಿತಿ']) || 'Unverified';
    let status = 'Unverified';
    if (rawStatus) {
      const s = rawStatus.toString().trim().toLowerCase();
      if (s.includes('death') || s.includes('dead') || s.includes('ಸಾವು') || s.includes('ಮರಣ')) {
        status = 'Death';
      } else if (s.includes('shift') || s.includes('ಸ್ಥಳಾಂತರ')) {
        status = 'Shifted';
      } else if (s.includes('double') || s.includes('dup') || s.includes('ಡೂಪ್ಲಿಕೇಟ್')) {
        status = 'Double';
      } else if (s.includes('absent') || s.includes('ಗೈರುಹಾಜರಿ')) {
        status = 'Absent';
      } else if (s.includes('verifi') || s.includes('ಪರಿಶೀಲಿಸಲಾಗಿದೆ') || s.includes('ಸರಿ')) {
        status = 'Verified';
      } else {
        status = 'Unverified';
      }
    }
    let photoUrl = getCellVal(rowObj, rowArr, ['photourl', 'photo_url', 'photo', 'ಫೋಟೋ']);

    if (photoUrl && photoUrl.toString().startsWith('data:image')) {
      const photoKey = `photo_${partNo}_${sl}`;
      if (window.photoDB) {
        await window.photoDB.savePhoto(photoKey, photoUrl.toString());
        photoUrl = `idb:${photoKey}`;
        photoCount++;
      }
    } else if (photoUrl) {
      photoCount++;
    }

    voterList.push({
      id: `${rowPartNo}_xl_${sl}`,
      partNo: rowPartNo || partNo,
      psNo: psNoExtracted ? psNoExtracted.toString().trim() : (rowPartNo || partNo),
      slNo: sl.toString(),
      epicNo: epic.toString().trim(),
      nameKn: nameKn.toString().trim(),
      nameEn: nameEn ? nameEn.toString().trim() : '',
      relNameKn: relName ? relName.toString().trim() : '',
      relType: relType,
      houseNo: houseNo.toString().trim(),
      age: age.toString().trim(),
      gender: gender,
      mobile: mobile ? mobile.toString().trim() : '',
      photoUrl: photoUrl ? photoUrl.toString() : '',
      status: status,
      isMapDone: false,
      isProgenyDone: false,
      ref2002Epic: '',
      remarks: getCellVal(rowObj, rowArr, ['remarks', 'ರಿಮಾರ್ಕ್ಸ್']) || 'Excel/Macro ಫೈಲ್‌ನಿಂದ ಅಪ್‌ಲೋಡ್ ಮಾಡಲಾಗಿದೆ'
    });
  }

  // Build Detected Useful Headers Map
  const detectedHeaders = {
    slNo: headers.find(h => ['sl.no', 'slno', 'sl_no', 'sl', 'serial', 'ಅನುಕ್ರಮ'].some(k => h.toLowerCase().includes(k))) || 'SL.NO',
    psNo: headers.find(h => ['ps. no.', 'ps.no.', 'ps no', 'ps_no', 'part no', 'ಭಾಗ'].some(k => h.toLowerCase().includes(k))) || 'PS. NO.',
    epicNo: headers.find(h => ['epic number', 'epicnumber', 'epicno', 'epic', 'ಎಪಿಕ್'].some(k => h.toLowerCase().includes(k))) || 'EPIC NUMBER',
    nameKn: headers.find(h => ['name (kannada)', 'name(kannada)', 'name_kannada', 'ಮತದಾರರ ಹೆಸರು', 'ಹೆಸರು'].some(k => h.toLowerCase().includes(k))) || 'NAME (KANNADA)',
    relType: headers.find(h => ['relation type', 'relationtype', 'reltype', 'ಸಂಬಂಧ'].some(k => h.toLowerCase().includes(k))) || 'RELATION TYPE',
    relNameKn: headers.find(h => ['relation name (kannada)', 'relation name(kannada)', 'relative_name', 'ಸಂಬಂಧಿಯ ಹೆಸರು'].some(k => h.toLowerCase().includes(k))) || 'RELATION NAME (KANNADA)',
    houseNo: headers.find(h => ['house no', 'houseno', 'house', 'ಮನೆ'].some(k => h.toLowerCase().includes(k))) || 'HOUSE NO',
    age: headers.find(h => ['age', 'ವಯಸ್ಸು'].some(k => h.toLowerCase().includes(k))) || 'AGE',
    gender: headers.find(h => ['gender', 'ಲಿಂಗ', 'sex'].some(k => h.toLowerCase().includes(k))) || 'GENDER'
  };

  if (onLog) onLog(`✅ ಉಪಯುಕ್ತ ಅಂಕಣ ಶೀರ್ಷಿಕೆಗಳನ್ನು ಆಟೋ ಪತ್ತೆ ಮಾಡಲಾಗಿದೆ!`, 'success');

  if (voterList.length === 0) {
    throw new Error('ಶೀಟ್‌ನಲ್ಲಿ ಯಾವುದೇ ಸಿಂಧು ಮತದಾರರ ಸಾಲುಗಳು ಸಿಗಲಿಲ್ಲ.');
  }

  return { voters: voterList, photoCount, detectedHeaders, rawHeaders: headers };
}

// ─── ECI PDF PARSER ENGINE ────────────────────────────────────────────────
async function processPDFFileEngine(file, partNo, onProgress, onLog) {
  if (onLog) onLog(`PDF ಬಫರ್ ಓದುತ್ತಿದೆ: ${file.name}...`, 'info');
  const arrayBuffer = await readFileBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  const totalPages = pdf.numPages;

  if (onLog) onLog(`PDF ನಲ್ಲಿ ಒಟ್ಟು ${totalPages} ಪುಟಗಳಿವೆ...`, 'info');

  let allVoters = [];
  let totalPhotos = 0;

  const startPage = totalPages > 2 ? 3 : 1;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  for (let pageNum = startPage; pageNum <= totalPages; pageNum++) {
    if (onLog) onLog(`ಪುಟ ${pageNum}/${totalPages} ಪ್ರಕ್ರಿಯೆಗೊಳ್ಳುತ್ತಿದೆ...`, 'info');
    const page = await pdf.getPage(pageNum);

    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const textContent = await page.getTextContent();

    const pageVoters = parsePdfTextItems(textContent.items, pageNum, partNo);

    for (let i = 0; i < pageVoters.length; i++) {
      const voter = pageVoters[i];
      try {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const boxWidth = 373;
        const boxHeight = 143;
        const startX = 30 * scale;
        const startY = 210 * scale;
        const photoX = startX + (col * boxWidth) + (260 * scale);
        const photoY = startY + (row * boxHeight) + (10 * scale);
        const photoW = 100 * scale;
        const photoH = 120 * scale;

        if (photoX + photoW <= canvas.width && photoY + photoH <= canvas.height) {
          const pCanvas = document.createElement('canvas');
          pCanvas.width = photoW;
          pCanvas.height = photoH;
          const pCtx = pCanvas.getContext('2d');
          pCtx.drawImage(canvas, photoX, photoY, photoW, photoH, 0, 0, photoW, photoH);
          const dataUrl = pCanvas.toDataURL('image/jpeg', 0.85);
          const photoKey = `photo_${voter.id}`;
          if (window.photoDB) {
            await window.photoDB.savePhoto(photoKey, dataUrl);
            voter.photoUrl = `idb:${photoKey}`;
            totalPhotos++;
          }
        }
      } catch (e) {}
    }
    allVoters = allVoters.concat(pageVoters);
  }

  return { voters: allVoters, photoCount: totalPhotos };
}

function parsePdfTextItems(items, pageNum, partNo) {
  const voters = [];
  if (!items || items.length === 0) return voters;
  items.sort((a, b) => {
    const yA = a.transform[5];
    const yB = b.transform[5];
    if (Math.abs(yA - yB) > 5) return yB - yA;
    return a.transform[4] - b.transform[4];
  });

  const epicRegex = /[A-Z]{3}\d{7}/;
  let curr = [];
  const blocks = [];

  items.forEach(item => {
    const txt = item.str.trim();
    if (!txt) return;
    if (epicRegex.test(txt)) {
      if (curr.length > 0) blocks.push([...curr]);
      curr = [txt];
    } else {
      if (curr.length > 0) curr.push(txt);
    }
  });
  if (curr.length > 0) blocks.push(curr);

  blocks.forEach((block, idx) => {
    const joined = block.join(' | ');
    const epicM = joined.match(/[A-Z]{3}\d{7}/);
    const epic = epicM ? epicM[0] : `PDF${Date.now()}${idx}`;
    let sl = (idx + 1).toString();
    const slM = block.find(t => /^\d+$/.test(t));
    if (slM) sl = slM;

    let nameKn = '';
    const nIdx = block.findIndex(t => t.includes('ಹೆಸರು') && !t.includes('ತಂದೆ') && !t.includes('ಗಂಡ'));
    if (nIdx !== -1 && block[nIdx + 1]) nameKn = block[nIdx + 1];
    else if (block.length > 1) nameKn = block[1];

    let relName = '';
    let relType = 'Father';
    const rIdx = block.findIndex(t => t.includes('ತಂದೆ') || t.includes('ಗಂಡ'));
    if (rIdx !== -1) {
      if (block[rIdx].includes('ಗಂಡ')) relType = 'Husband';
      if (block[rIdx + 1]) relName = block[rIdx + 1];
    }

    let houseNo = '';
    const hIdx = block.findIndex(t => t.includes('ಮನೆ') || t.includes('ಸಂಖ್ಯೆ'));
    if (hIdx !== -1 && block[hIdx + 1]) houseNo = block[hIdx + 1];

    let age = '0';
    let gender = 'M';
    const ageStr = block.find(t => t.includes('ವಯಸ್ಸು') || t.includes('ಲಿಂಗ'));
    if (ageStr) {
      const aM = ageStr.match(/\d+/);
      if (aM) age = aM[0];
      if (ageStr.includes('ಸ್ತ್ರೀ') || ageStr.includes('Female')) gender = 'F';
    }

    voters.push({
      id: `${partNo}_pdf_${sl}`,
      partNo: partNo,
      slNo: sl,
      epicNo: epic,
      nameKn: nameKn || 'Unknown',
      nameEn: '',
      relNameKn: relName,
      relType: relType,
      houseNo: houseNo,
      age: age,
      gender: gender,
      mobile: '',
      photoUrl: '',
      status: 'Unverified',
      isMapDone: false,
      isProgenyDone: false,
      ref2002Epic: '',
      remarks: `PDF Page ${pageNum} ನಿಂದ extract ಆಗಿದೆ`
    });
  });
  return voters;
}
