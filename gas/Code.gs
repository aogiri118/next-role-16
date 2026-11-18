/**
 * NEXT ROLE 16 — みんなの結果 集計用 Google Apps Script
 * スプレッドシートに貼り付けて「ウェブアプリ」としてデプロイします（手順は README.md）。
 * 保存するのは「日時・タイプ・各軸の割合」だけで、個人を特定する情報は扱いません。
 */
const SHEET_NAME = 'results';
const TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(['time', 'code', 'EI(E%)', 'SN(S%)', 'TF(T%)', 'JP(J%)']); }
  return sh;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (TYPES.indexOf(d.code) < 0) return out_({ ok: false });
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    sheet_().appendRow([new Date(), d.code, Number(d.ei) || 0, Number(d.sn) || 0, Number(d.tf) || 0, Number(d.jp) || 0]);
    lock.releaseLock();
    return out_({ ok: true });
  } catch (err) { return out_({ ok: false }); }
}

function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const counts = {}; const axes = { ei: 0, sn: 0, tf: 0, jp: 0 };
  rows.forEach(r => {
    const c = String(r[1]); if (TYPES.indexOf(c) < 0) return;
    counts[c] = (counts[c] || 0) + 1;
    if (c[0] === 'E') axes.ei++; if (c[1] === 'S') axes.sn++; if (c[2] === 'T') axes.tf++; if (c[3] === 'J') axes.jp++;
  });
  return out_({ total: Object.values(counts).reduce((a, b) => a + b, 0), counts, axes });
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
