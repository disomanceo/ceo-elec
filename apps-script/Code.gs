const SHEET_ID = '1QDB3MXcFX4bsD5XqJQKJL0Zzpfuiz3k2VIe43xa8V04';
const FOLDER_ID = '1UH5cLAKd0IGlcusQOxbTpwK9g0Cc9oyM';
const SHEET_NAME = 'electricity_log';
const HEADERS = ['id', 'date', 'startUnit', 'endUnit', 'usedUnit', 'rate', 'totalCost', 'updatedAt'];

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'list';
    if (action === 'list') return json_({ ok: true, entries: listEntries_() });
    return json_({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = payload.action;

    if (action === 'upsert') {
      const entry = normalizeEntry_(payload.entry);
      upsertEntry_(entry);
      return json_({ ok: true, entry: entry });
    }

    if (action === 'delete') {
      deleteEntry_(String(payload.id || ''));
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function listEntries_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return rows
    .filter(function (row) { return String(row[0] || '').trim() !== ''; })
    .map(function (row) {
      const dateValue = row[1];
      const date = dateValue instanceof Date
        ? Utilities.formatDate(dateValue, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd')
        : String(dateValue || '');

      return {
        id: String(row[0]),
        date: date,
        startUnit: Number(row[2]) || 0,
        endUnit: Number(row[3]) || 0,
        rate: Number(row[5]) || 0
      };
    })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });
}

function upsertEntry_(entry) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  let rowNumber = -1;

  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i += 1) {
      if (String(ids[i][0]) === entry.id) {
        rowNumber = i + 2;
        break;
      }
    }
  }

  const usedUnit = entry.endUnit - entry.startUnit;
  const totalCost = usedUnit * entry.rate;
  const row = [
    entry.id,
    entry.date,
    entry.startUnit,
    entry.endUnit,
    usedUnit,
    entry.rate,
    totalCost,
    new Date()
  ];

  if (rowNumber === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([row]);
  }
}

function deleteEntry_(id) {
  if (!id) throw new Error('MISSING_ID');
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i -= 1) {
    if (String(ids[i][0]) === id) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
}

function normalizeEntry_(raw) {
  if (!raw) throw new Error('MISSING_ENTRY');

  const entry = {
    id: String(raw.id || '').trim(),
    date: String(raw.date || '').trim(),
    startUnit: Number(raw.startUnit),
    endUnit: Number(raw.endUnit),
    rate: Number(raw.rate)
  };

  if (!entry.id) throw new Error('MISSING_ID');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error('INVALID_DATE');
  if (!Number.isFinite(entry.startUnit) || !Number.isFinite(entry.endUnit) || !Number.isFinite(entry.rate)) {
    throw new Error('INVALID_NUMBER');
  }
  if (entry.endUnit < entry.startUnit) throw new Error('END_BEFORE_START');
  if (entry.rate < 0) throw new Error('NEGATIVE_RATE');

  return entry;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupElectricityDatabase() {
  const sheet = getSheet_();
  sheet.autoResizeColumns(1, HEADERS.length);
  sheet.getRange('A1:H1').setFontWeight('bold').setBackground('#4b3f8f').setFontColor('#ffffff');
  Logger.log('Database ready: ' + SHEET_ID);
  Logger.log('Folder reference: ' + FOLDER_ID);
}
