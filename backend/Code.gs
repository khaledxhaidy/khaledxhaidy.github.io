/**
 * Google Apps Script backend for the wedding invitation.
 *
 * It writes every RSVP and every guestbook message into two tabs of a
 * Google Sheet that the couple owns, and serves the guestbook back to
 * the page so wishes are visible to all guests.
 *
 * Setup is in SETUP.md — it takes about five minutes and costs nothing.
 */

var SHEET_ID = ''; // <- paste the Sheet ID from its URL between the quotes

var TABS = {
  rsvp: ['at', 'name', 'attending', 'guests', 'guestNames', 'phone', 'lang'],
  wish: ['at', 'name', 'message', 'lang']
};

function sheetFor_(type) {
  var book = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID)
                      : SpreadsheetApp.getActiveSpreadsheet();
  var name = type === 'rsvp' ? 'RSVP' : 'Wishes';
  var tab = book.getSheetByName(name);
  if (!tab) {
    tab = book.insertSheet(name);
    tab.appendRow(TABS[type]);
    tab.getRange(1, 1, 1, TABS[type].length).setFontWeight('bold');
    tab.setFrozenRows(1);
  }
  return tab;
}

/** Receives a submission from the invitation page. */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type === 'wish' ? 'wish' : 'rsvp';
    var tab = sheetFor_(type);
    var row = TABS[type].map(function (key) {
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
