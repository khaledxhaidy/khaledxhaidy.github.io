/**
 * Google Apps Script backend for the wedding invitation.
 *
 * Both versions of the invitation post here. RSVPs land in the tab
 * «الحضور», guestbook messages in «التهاني», inside the spreadsheet
 * this script is bound to. The guestbook is served back to the page
 * so wishes are visible to every guest; RSVPs are never served.
 */

var SHEET_ID = ''; // empty = the spreadsheet this script is bound to

var COLS = {
  rsvp: ['at', 'name', 'attending', 'guests', 'guestNames', 'phone', 'lang', 'version'],
  wish: ['at', 'name', 'message', 'lang', 'version']
};
var TAB_NAME = { rsvp: 'الحضور', wish: 'التهاني' };
var HEADERS = {
  rsvp: ['الوقت', 'الاسم', 'الحضور', 'عدد المرافقين', 'أسماء المرافقين', 'الموبايل', 'اللغة', 'النسخة'],
  wish: ['الوقت', 'الاسم', 'التهنئة', 'اللغة', 'النسخة']
};

function sheetFor_(type) {
  var book = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID)
                      : SpreadsheetApp.getActiveSpreadsheet();
  var tab = book.getSheetByName(TAB_NAME[type]);
  if (!tab) {
    tab = book.insertSheet(TAB_NAME[type]);
    tab.appendRow(HEADERS[type]);
    tab.getRange(1, 1, 1, HEADERS[type].length).setFontWeight('bold');
    tab.setFrozenRows(1);
    tab.setRightToLeft(true);
  }
  return tab;
}

/** Run me once from the editor to authorize and create both tabs. */
function authorize() {
  sheetFor_('rsvp');
  sheetFor_('wish');
}

/** Receives a submission from the invitation page. */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type === 'wish' ? 'wish' : 'rsvp';

    if (type === 'rsvp') {
      data.attending = data.attending === 'yes' ? 'حاضر ✔' : 'معتذر ✖';
    }

    var tab = sheetFor_(type);
    var row = COLS[type].map(function (key) {
      return data[key] === undefined ? '' : data[key];
    });
    tab.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Serves the guestbook back to the page: ...\/exec?type=wish */
function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) === 'wish' ? 'wish' : 'rsvp';

  // RSVPs are private — only the guestbook is readable from the page.
  if (type !== 'wish') return json_([]);

  var tab = sheetFor_('wish');
  var values = tab.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    out.push({
      at: values[i][0],
      name: values[i][1],
      message: values[i][2],
      lang: values[i][3]
    });
  }
  return json_(out);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
