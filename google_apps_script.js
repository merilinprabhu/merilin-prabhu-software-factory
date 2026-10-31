/**
 * =========================================================================
 * Exam Result Software - Google Apps Script Backend (v2.0 Official OMR)
 * =========================================================================
 * 
 * Google Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1-NAZdSlS8QKTGFMPLwmHfToy07Jh2H5cfewgx7u3CDw/edit
 * 
 * Web App URL (Deployed):
 * https://script.google.com/macros/s/AKfycbx81T4anZcoYRQjMkSOSgtwGOeyWcY0PC2gFGovCIBna1hTRrlYZcQ30W2N25YNxQLl7Q/exec
 * 
 * ಹಂತಗಳು (Setup Instructions):
 * 1. ನಿಮ್ಮ Google Sheet ತೆರೆಯಿರಿ (https://docs.google.com/spreadsheets/d/1-NAZdSlS8QKTGFMPLwmHfToy07Jh2H5cfewgx7u3CDw/edit)
 * 2. Extensions (ವಿಸ್ತರಣೆಗಳು) -> Apps Script ಕ್ಲಿಕ್ ಮಾಡಿ.
 * 3. ಅಲ್ಲಿರುವ ಕೋಡ್ ತೆಗೆದು, ಈ ಸಂಪೂರ್ಣ ಕೋಡ್ ಅನ್ನು ಪೇಸ್ಟ್ (Paste) ಮಾಡಿ.
 * 4. Save (Ctrl+S) ಮಾಡಿ.
 * 5. Deploy -> Manage deployments / New deployment ಕ್ಲಿಕ್ ಮಾಡಿ:
 *    - Select type: Web app
 *    - Description: Exam Result Multi-App API v2.0
 *    - Execute as: Me
 *    - Who has access: Anyone (ಯಾರಾದರೂ)
 * 6. 'Deploy' ಕ್ಲಿಕ್ ಮಾಡಿ.
 * =========================================================================
 */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Exams Sheet
  let examsSheet = ss.getSheetByName('Exams');
  if (!examsSheet) {
    examsSheet = ss.insertSheet('Exams');
    examsSheet.appendRow(['Exam_ID', 'Exam_Name', 'Exam_Date', 'Total_Questions', 'Marks_Per_Q', 'Negative_Marking', 'Negative_Ratio', 'Versions', 'Created_At']);
    formatHeader(examsSheet);
  }

  // 2. Answer Keys Sheet
  let keysSheet = ss.getSheetByName('Key_Answers');
  if (!keysSheet) {
    keysSheet = ss.insertSheet('Key_Answers');
    keysSheet.appendRow(['Exam_ID', 'Version', 'Total_Questions', 'Keys_JSON', 'Updated_At']);
    formatHeader(keysSheet);
  }

  // 3. Candidates OMR Sheet
  let candSheet = ss.getSheetByName('Candidates_OMR');
  if (!candSheet) {
    candSheet = ss.insertSheet('Candidates_OMR');
    candSheet.appendRow(['Candidate_ID', 'Roll_No', 'Candidate_Name', 'Exam_ID', 'Exam_Date', 'Version', 'QP_Serial_No', 'Responses_JSON', 'Submitted_At']);
    formatHeader(candSheet);
  }

  // 4. Results Sheet
  let resSheet = ss.getSheetByName('Results');
  if (!resSheet) {
    resSheet = ss.insertSheet('Results');
    resSheet.appendRow(['Rank', 'Roll_No', 'Candidate_Name', 'Exam_Name', 'Exam_Date', 'Version', 'QP_Serial_No', 'Total_Q', 'Attempted', 'Correct', 'Wrong', 'Not_Response_NR', 'Negative_Marks', 'Total_Score', 'Percentage', 'Calculated_At']);
    formatHeader(resSheet);
  }

  return "Setup completed successfully!";
}

function formatHeader(sheet) {
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  range.setBackground('#1e3a8a');
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// GET Endpoint - Fetch data
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getAll';
    const callback = e && e.parameter && e.parameter.callback;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'getAll') {
      const examsSheet = ss.getSheetByName('Exams');
      let data;

      if (examsSheet && examsSheet.getLastRow() > 1) {
        data = {
          exams: getSheetData(examsSheet),
          keyAnswers: getSheetData(ss.getSheetByName('Key_Answers')),
          candidates: getSheetData(ss.getSheetByName('Candidates_OMR')),
          results: getSheetData(ss.getSheetByName('Results'))
        };
      } else {
        // Fallback: Smart auto-detection from the first/active sheet (e.g. SERIAL NUMBER, PAPER 1 D1, SAVITA, PRABHU)
        data = parseActiveSheetData(ss.getActiveSheet());
      }

      return createJsonResponse({ status: 'success', data: data }, callback);
    }

    return createJsonResponse({ status: 'error', message: 'Unknown action' }, callback);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() }, callback);
  }
}

// Smart parser for single sheet (Vertical Q-by-Q format)
function parseActiveSheetData(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) {
    return { exams: [], keyAnswers: [], candidates: [], results: [] };
  }

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const totalQ = rows.length - 1;

  let keyCol = 1;
  const keyHeader = String(headers[1] || 'PAPER 1 D1');
  const vMatch = keyHeader.match(/\b([A-D]\d*|[A-D])\b/i);
  const version = vMatch ? vMatch[1].toUpperCase() : 'D1';
  const examName = keyHeader.replace(/\b([A-D]\d*|[A-D])\b/i, '').replace(/[-_:]/g, ' ').trim() || 'Paper 1';

  const keys = {};
  for (let r = 1; r < rows.length; r++) {
    const qNum = parseInt(rows[r][0]) || r;
    const opt = normalizeOptionVal(rows[r][keyCol]);
    if (opt) keys[qNum] = opt;
  }

  const candidates = [];
  for (let c = 2; c < headers.length; c++) {
    const candName = String(headers[c] || '').trim();
    if (!candName) continue;
    const resp = {};
    for (let r = 1; r < rows.length; r++) {
      const qNum = parseInt(rows[r][0]) || r;
      const opt = normalizeOptionVal(rows[r][c]);
      if (opt) resp[qNum] = opt;
    }
    candidates.push({
      Candidate_ID: 'cand_' + c,
      Roll_No: candName.toUpperCase(),
      Candidate_Name: candName,
      Exam_ID: 'exam_gsheet_1',
      Exam_Date: new Date().toISOString().slice(0, 10),
      Version: version,
      QP_Serial_No: 'QP-' + candName.toUpperCase(),
      Responses_JSON: JSON.stringify(resp),
      Submitted_At: new Date().toISOString()
    });
  }

  const exams = [{
    Exam_ID: 'exam_gsheet_1',
    Exam_Name: `${examName} (Set ${version})`,
    Exam_Date: new Date().toISOString().slice(0, 10),
    Total_Questions: totalQ,
    Marks_Per_Q: 1.0,
    Negative_Marking: 'YES',
    Negative_Ratio: 0.25,
    Versions: version,
    Created_At: new Date().toISOString()
  }];

  const keyAnswers = [{
    Exam_ID: 'exam_gsheet_1',
    Version: version,
    Total_Questions: totalQ,
    Keys_JSON: JSON.stringify(keys),
    Updated_At: new Date().toISOString()
  }];

  return {
    exams: exams,
    keyAnswers: keyAnswers,
    candidates: candidates,
    results: []
  };
}

function normalizeOptionVal(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim().toUpperCase();
  if (s === '1' || s === 'A') return 'A';
  if (s === '2' || s === 'B') return 'B';
  if (s === '3' || s === 'C') return 'C';
  if (s === '4' || s === 'D') return 'D';
  if (s === '5' || s === 'E' || s === 'NR' || s === 'N') return 'NR';
  if (s === '' || s === '-' || s === 'BLANK') return '';
  return s;
}

// POST Endpoint - Save / Sync data from the app
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'syncAll') {
      setupSheets();

      const { exam, keyAnswers, candidates, results } = contents.payload;

      // 1. Save or Update Exam
      if (exam) {
        const examsSheet = ss.getSheetByName('Exams');
        examsSheet.appendRow([
          exam.id,
          exam.name,
          exam.date || '',
          exam.totalQuestions,
          exam.marksPerCorrect || 1.0,
          exam.hasNegative ? 'YES' : 'NO',
          exam.negativeRatio || 0.25,
          (exam.versions || []).join(', '),
          new Date().toISOString()
        ]);
      }

      // 2. Save Key Answers
      if (keyAnswers && Array.isArray(keyAnswers)) {
        const keysSheet = ss.getSheetByName('Key_Answers');
        keyAnswers.forEach(k => {
          keysSheet.appendRow([
            k.examId,
            k.version,
            k.totalQuestions,
            JSON.stringify(k.keys),
            new Date().toISOString()
          ]);
        });
      }

      // 3. Save Candidates OMR
      if (candidates && Array.isArray(candidates)) {
        const candSheet = ss.getSheetByName('Candidates_OMR');
        candidates.forEach(c => {
          candSheet.appendRow([
            c.id,
            c.rollNo,
            c.name,
            c.examId,
            c.date || '',
            c.version,
            c.qpSerial || '-',
            JSON.stringify(c.responses),
            new Date().toISOString()
          ]);
        });
      }

      // 4. Save Results
      if (results && Array.isArray(results)) {
        const resSheet = ss.getSheetByName('Results');
        if (resSheet.getLastRow() > 1) {
          resSheet.getRange(2, 1, resSheet.getLastRow() - 1, resSheet.getLastColumn()).clearContent();
        }
        
        results.forEach(r => {
          resSheet.appendRow([
            r.rank,
            r.rollNo,
            r.name,
            r.examName,
            r.date || '',
            r.version,
            r.qpSerial || '-',
            r.totalQuestions,
            r.attempted,
            r.correct,
            r.wrong,
            r.blank,
            r.negativeDeduction,
            r.finalScore,
            r.percentage + '%',
            new Date().toISOString()
          ]);
        });
      }

      return createJsonResponse({ status: 'success', message: 'Data synced successfully to Google Sheet!' });
    }

    return createJsonResponse({ status: 'error', message: 'Unsupported action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function getSheetData(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    headers.forEach((header, colIdx) => {
      obj[header] = rows[i][colIdx];
    });
    data.push(obj);
  }
  return data;
}

function createJsonResponse(obj, callback) {
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
