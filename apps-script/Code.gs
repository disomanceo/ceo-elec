const SHEET_ID = '1QDB3MXcFX4bsD5XqJQKJL0Zzpfuiz3k2VIe43xa8V04';
const FOLDER_ID = '1UH5cLAKd0IGlcusQOxbTpwK9g0Cc9oyM';
const SHEET_NAME = 'electricity_intervals';
const LEGACY_SHEET_NAME = 'electricity_log';
const HEADERS = ['id', 'startDate', 'startTime', 'startUnit', 'endDate', 'endTime', 'endUnit', 'usedUnit', 'durationHours', 'rate', 'totalCost', 'updatedAt'];

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
  let isNew = false;

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    isNew = true;
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);

  if (isNew || sheet.getLastRow() < 2) {
    migrateLegacyEntries_(spreadsheet, sheet);
  }

  return sheet;
}

function migrateLegacyEntries_(spreadsheet, targetSheet) {
  const legacy = spreadsheet.getSheetByName(LEGACY_SHEET_NAME);
  if (!legacy || legacy.getLastRow() < 2 || targetSheet.getLastRow() >= 2) return;

  const legacyLastColumn = Math.max(legacy.getLastColumn(), 9);
  const rows = legacy.getRange(2, 1, legacy.getLastRow() - 1, legacyLastColumn).getValues();
  const migrated = [];

  rows.forEach(function (row) {
    const id = String(row[0] || '').trim();
    if (!id) return;

    const date = normalizeDateValue_(row[1]);
    const time = normalizeTimeValue_(row[8]);
    const startUnit = Number(row[2]) || 0;
    const endUnit = Number(row[3]) || 0;
    const rate = Number(row[5]) || 0;
    const usedUnit = endUnit - startUnit;
    const totalCost = usedUnit * rate;

    migrated.push([
      id,
      date,
      time,
      startUnit,
      date,
      time,
      endUnit,
      usedUnit,
      '',
      rate,
      totalCost,
      row[7] || new Date()
    ]);
  });

  if (migrated.length) {
    targetSheet.getRange(2, 1, migrated.length, HEADERS.length).setValues(migrated);
    formatSheet_(targetSheet);
  }
}

function listEntries_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return rows
    .filter(function (row) { return String(row[0] || '').trim() !== ''; })
    .map(function (row) {
      return {
        id: String(row[0]),
        startDate: normalizeDateValue_(row[1]),
        startTime: normalizeTimeValue_(row[2]),
        startUnit: Number(row[3]) || 0,
        endDate: normalizeDateValue_(row[4]),
        endTime: normalizeTimeValue_(row[5]),
        endUnit: Number(row[6]) || 0,
        rate: Number(row[9]) || 0
      };
    })
    .sort(function (a, b) {
      return (a.endDate + ' ' + (a.endTime || '')).localeCompare(b.endDate + ' ' + (b.endTime || ''));
    });
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
  const durationHours = calculateDurationHours_(entry.startDate, entry.startTime, entry.endDate, entry.endTime);
  const totalCost = usedUnit * entry.rate;
  const row = [
    entry.id,
    entry.startDate,
    entry.startTime,
    entry.startUnit,
    entry.endDate,
    entry.endTime,
    entry.endUnit,
    usedUnit,
    durationHours || '',
    entry.rate,
    totalCost,
    new Date()
  ];

  if (rowNumber === -1) rowNumber = sheet.getLastRow() + 1;

  sheet.getRange(rowNumber, 3).setNumberFormat('@');
  sheet.getRange(rowNumber, 6).setNumberFormat('@');
  sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([row]);
  formatSheet_(sheet);
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
    startDate: String(raw.startDate || '').trim(),
    startTime: String(raw.startTime || '').trim(),
    startUnit: Number(raw.startUnit),
    endDate: String(raw.endDate || '').trim(),
    endTime: String(raw.endTime || '').trim(),
    endUnit: Number(raw.endUnit),
    rate: Number(raw.rate)
  };

  if (!entry.id) throw new Error('MISSING_ID');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.startDate)) throw new Error('INVALID_START_DATE');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.endDate)) throw new Error('INVALID_END_DATE');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.startTime)) throw new Error('INVALID_START_TIME');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.endTime)) throw new Error('INVALID_END_TIME');
  if (!Number.isFinite(entry.startUnit) || !Number.isFinite(entry.endUnit) || !Number.isFinite(entry.rate)) throw new Error('INVALID_NUMBER');
  if (entry.endUnit < entry.startUnit) throw new Error('END_BEFORE_START');
  if (entry.rate < 0) throw new Error('NEGATIVE_RATE');

  const durationHours = calculateDurationHours_(entry.startDate, entry.startTime, entry.endDate, entry.endTime);
  if (!(durationHours > 0)) throw new Error('END_TIME_BEFORE_START_TIME');

  return entry;
}

function calculateDurationHours_(startDate, startTime, endDate, endTime) {
  if (!startDate || !startTime || !endDate || !endTime) return 0;
  const start = new Date(startDate + 'T' + startTime + ':00+07:00');
  const end = new Date(endDate + 'T' + endTime + ':00+07:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 3600000);
}

function normalizeDateValue_(value) {
  if (!value) return '';
  const timezone = Session.getScriptTimeZone() || 'Asia/Bangkok';
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, timezone, 'yyyy-MM-dd');
  return text;
}

function normalizeTimeValue_(value) {
  if (!value) return '';
  const timezone = Session.getScriptTimeZone() || 'Asia/Bangkok';
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, timezone, 'HH:mm');
  const text = String(value).trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) return text;
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, timezone, 'HH:mm');
  return text.slice(0, 5);
}

function formatSheet_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#4b3f8f').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  const maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 3, maxRows - 1, 1).setNumberFormat('@');
    sheet.getRange(2, 6, maxRows - 1, 1).setNumberFormat('@');
    sheet.getRange(2, 4, maxRows - 1, 1).setNumberFormat('0.##');
    sheet.getRange(2, 7, maxRows - 1, 3).setNumberFormat('0.##');
    sheet.getRange(2, 10, maxRows - 1, 2).setNumberFormat('0.00');
  }
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function setupElectricityDatabase() {
  const sheet = getSheet_();
  formatSheet_(sheet);
  sheet.autoResizeColumns(1, HEADERS.length);
  Logger.log('Database ready: ' + SHEET_ID + ' / ' + SHEET_NAME);
  Logger.log('Folder reference: ' + FOLDER_ID);
}
