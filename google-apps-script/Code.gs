const SHEET_NAME = 'Proposal'
const PHOTO_FOLDER_PREFIX = 'ProjectXLC - '
const PHOTO_LABELS = {
  front: 'Tampak Depan Bangunan',
  groundFloor: 'Tampak Dalam Lantai Dasar',
  upperFloor: 'Tampak Dalam Lantai Atas',
}

function doPost(event) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME)
  const payload = JSON.parse(event.postData.contents)
  const folder = getOrCreatePhotoFolder(payload.buildingName)
  const photoUrls = {}
  const photoFiles = payload.photoFiles || {}

  Object.keys(PHOTO_LABELS).forEach((photoKey) => {
    const photo = photoFiles[photoKey]
    if (!photo || !photo.dataUrl) return
    photoUrls[photoKey] = savePhoto(folder, photo, PHOTO_LABELS[photoKey]).getUrl()
  })

  const rowPayload = { ...payload, googleMapsLink: buildMapsLink(payload), photoFolderUrl: folder.getUrl() }
  Object.keys(PHOTO_LABELS).forEach((photoKey) => {
    rowPayload[`${photoKey}PhotoUrl`] = photoUrls[photoKey] || ''
  })
  delete rowPayload.photoFiles

  const keys = Object.keys(rowPayload)
  let headers = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : []
  if (!headers.length) {
    sheet.getRange(1, 1, 1, keys.length).setValues([keys])
    headers = keys
  } else {
    const missingHeaders = keys.filter((key) => !headers.includes(key))
    if (missingHeaders.length) {
      sheet.getRange(1, headers.length + 1, 1, missingHeaders.length).setValues([missingHeaders])
      headers = headers.concat(missingHeaders)
    }
  }

  sheet.appendRow(headers.map((header) => rowPayload[header] ?? ''))
  return jsonResponse({ ok: true, photoUrls, photoFolderUrl: folder.getUrl(), googleMapsLink: rowPayload.googleMapsLink })
}

function getOrCreatePhotoFolder(buildingName) {
  const safeName = String(buildingName || 'Tanpa nama bangunan').replace(/[\\/:*?"<>|]/g, '-').trim()
  const folderName = PHOTO_FOLDER_PREFIX + (safeName || 'Tanpa nama bangunan')
  const folders = DriveApp.getFoldersByName(folderName)
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName)
}

function savePhoto(folder, photo, label) {
  const parts = String(photo.dataUrl).split(',')
  const bytes = Utilities.base64Decode(parts[1])
  const fileName = `${label}${getExtension(photo.type)}`
  const oldFiles = folder.getFilesByName(fileName)
  while (oldFiles.hasNext()) oldFiles.next().setTrashed(true)
  const blob = Utilities.newBlob(bytes, photo.type || 'image/jpeg', fileName)
  const file = folder.createFile(blob)
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  } catch (error) {
    console.log(`Sharing tidak diubah: ${error.message}`)
  }
  return file
}

function getExtension(mimeType) {
  const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' }
  return extensions[mimeType] || ''
}

function buildMapsLink(payload) {
  return payload.latitude && payload.longitude ? `https://www.google.com/maps?q=${payload.latitude},${payload.longitude}` : 'https://www.google.com/maps'
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
}
