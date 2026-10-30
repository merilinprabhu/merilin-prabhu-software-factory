/**
 * =========================================================================
 * Exam Result Software - Google Apps Script Backend
 * =========================================================================
 * 
 * ಹಂತಗಳು (Setup Instructions):
 * 1. ನಿಮ್ಮ Google Sheet ತೆರೆಯಿರಿ (https://docs.google.com/spreadsheets/d/1-NAZdSlS8QKTGFMPLwmHfToy07Jh2H5cfewgx7u3CDw/edit)
 * 2. Extensions (ವಿಸ್ತರಣೆಗಳು) -> Apps Script ಕ್ಲಿಕ್ ಮಾಡಿ.
 * 3. ಅಲ್ಲಿರುವ ಕೋಡ್ ತೆಗೆದು, ಈ ಸಂಪೂರ್ಣ ಕೋಡ್ ಅನ್ನು ಪೇಸ್ಟ್ (Paste) ಮಾಡಿ.
 * 4. Save (Ctrl+S) ಮಾಡಿ.
 * 5. ಮೇಲಿರುವ ಮೆನುವಿನಲ್ಲಿ 'setupSheets' ಫಂಕ್ಷನ್ ಆಯ್ಕೆ ಮಾಡಿ 'Run' ಕ್ಲಿಕ್ ಮಾಡಿ (ಇದು ಶೀಟ್‌ಗಳನ್ನು ಆಟೋಮ್ಯಾಟಿಕ್ ಆಗಿ ರಚಿಸುತ್ತದೆ).
 * 6. Deploy -> New deployment ಕ್ಲಿಕ್ ಮಾಡಿ.
 *    - Select type: Web app
 *    - Description: Exam Result API
 *    - Execute as: Me
 *    - Who has access: Anyone (ಯಾರಾದರೂ)
 * 7. 'Deploy' ಕ್ಲಿಕ್ ಮಾಡಿ ಬಂದ Web App URL ಅನ್ನು ಕಾಪಿ ಮಾಡಿ ನಮ್ಮ ಸಾಫ್ಟ್‌ವೇರ್‌ನಲ್ಲಿ ಹಾಕಿ.
 * =========================================================================
 */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Exams Sheet
  let examsSheet = ss.getSheetByName('Exams');
  if (!examsSheet) {
    examsSheet = ss.insertSheet('Exams');
    examsSheet.appendRow(['Exam_ID', 'Exam_Name', 'Total_Questions', 'Negative_Marking', 'Negative_Ratio', 'Created_At']);
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
    candSheet.appendRow(['Candidate_ID', 'Roll_No', 'Candidate_Name', 'Exam_ID', 'Version', 'Responses_JSON', 'Submitted_At']);
    formatHeader(candSheet);
  }

  // 4. Results Sheet
  let resSheet = ss.getSheetByName('Results');
  if (!resSheet) {
    resSheet = ss.insertSheet('Results');
    resSheet.appendRow(['Rank', 'Roll_No', 'Candidate_Name', 'Exam_Name', 'Version', 'Total_Q', 'Attempted', 'Correct', 'Wrong', 'Blank', 'Negative_Marks', 'Total_Score', 'Percentage', 'Calculated_At']);
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
    const action = e.parameter.action || 'getAll';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'getAll') {
      const data = {
        exams: getSheetData(ss.getSheetByName('Exams')),
        keyAnswers: getSheetData(ss.getSheetByName('Key_Answers')),
        candidates: getSheetData(ss.getSheetByName('Candidates_OMR')),
        results: getSheetData(ss.getSheetByName('Results'))
      };
      return createJsonResponse({ status: 'success', data: data });
    }

    return createJsonResponse({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// POST Endpoint - Save / Sync data from the app
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'syncAll') {
      // Setup sheets if they don't exist
      setupSheets();

      const { exam, keyAnswers, candidates, results } = contents.payload;

      // 1. Save or Update Exam
      if (exam) {
        const examsSheet = ss.getSheetByName('Exams');
        examsSheet.appendRow([
          exam.id,
          exam.name,
          exam.totalQuestions,
          exam.hasNegative ? 'YES' : 'NO',
          exam.negativeRatio || 0.25,
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

      // 3. Save Candidates
      if (candidates && Array.isArray(candidates)) {
        const candSheet = ss.getSheetByName('Candidates_OMR');
        candidates.forEach(c => {
          candSheet.appendRow([
            c.id,
            c.rollNo,
            c.name,
            c.examId,
            c.version,
            JSON.stringify(c.responses),
            new Date().toISOString()
          ]);
        });
      }

      // 4. Save Calculated Results
      if (results && Array.isArray(results)) {
        const resSheet = ss.getSheetByName('Results');
        // Clear old results for fresh write or just append
        resSheet.getRange(2, 1, Math.max(resSheet.getLastRow() - 1, 1), resSheet.getLastColumn()).clearContent();
        
        results.forEach(r => {
          resSheet.appendRow([
            r.rank,
            r.rollNo,
            r.name,
            r.examName,
            r.version,
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

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
