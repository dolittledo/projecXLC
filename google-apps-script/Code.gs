const SHEET_NAME = 'Proposal'

function doPost(event) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME)
  const payload = JSON.parse(event.postData.contents)
  const keys = Object.keys(payload)

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(keys)
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  const values = headers.map((header) => payload[header] ?? '')
  sheet.appendRow(values)

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
}
