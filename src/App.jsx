import { useEffect, useRef, useState } from 'react'
import './App.css'

const googleSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL || ''
const legacyBuildingDraftKey = 'projectxlc-building-form'
const userBuildingDraftPrefix = `${legacyBuildingDraftKey}:`
const userSubmissionsPrefix = 'projectxlc-submissions:'

const initialForm = {
  buildingName: '', address: '', floors: '', length: '', width: '', landArea: '', buildingArea: '', toilets: '', imb: '', shm: '', tileSize: '', tileColor: 'Krem', buildingCover: '',
  annualRent: '', rentPrice: '', contractType: 'Tahunan', contractPeriod: '', minContractPeriod: '', maxContractPeriod: '', vatIncluded: '',
  electricity: '', waterSource: 'PDAM', parkingLand: 'Tersedia', parkingVehicle: 'Motor dan mobil', parkingSubscription: 'Tidak',
  buildingAreaType: '', roadAccess: '', environment: '', surroundings: '', aiPointDistance: '', operatorNearest: '', operatorDistance: '', bankDistance: '', nearestBank: '', cityCenterNearest: '', cityDistance: '',
  needsRenovation: 'Tidak', renovationType: '', paintInside: 'Tidak', paintOutside: 'Tidak', generalCleaning: 'Tidak', replaceTiles: 'Tidak',
  latitude: '', longitude: '',
  ac: '', fans: '', infocus: '', tv: '', dispenser: '', whiteboard: '', tables: '', chairs: '', gallons: '',
}

const reportSections = [
  { title: 'Data bangunan', fields: [['buildingName', 'Nama bangunan'], ['address', 'Alamat'], ['floors', 'Jumlah lantai'], ['landArea', 'Luas tanah (m²)'], ['buildingArea', 'Luas bangunan (m²)'], ['length', 'Ukuran panjang (m)'], ['width', 'Ukuran lebar (m)'], ['toilets', 'Jumlah toilet'], ['imb', 'Kelengkapan IMB'], ['shm', 'Kelengkapan SHM'], ['tileSize', 'Ukuran keramik lantai (cm)'], ['tileColor', 'Warna keramik lantai'], ['buildingCover', 'Penutup bangunan']] },
  { title: 'Harga sewa', fields: [['rentPrice', 'Harga sewa'], ['annualRent', 'Harga sewa per tahun'], ['contractType', 'Kontrak bulanan / tahunan'], ['contractPeriod', 'Periode kontrak (tahun)'], ['minContractPeriod', 'Min periode kontrak (tahun)'], ['maxContractPeriod', 'Maks periode kontrak (tahun)'], ['vatIncluded', 'Sudah include PPN?']] },
  { title: 'Fasilitas', fields: [['waterSource', 'Sumber air'], ['electricity', 'Daya listrik terpasang (kWh)'], ['parkingLand', 'Ketersediaan lahan parkir'], ['parkingVehicle', 'Parkir motor / mobil'], ['parkingSubscription', 'Parkir kendaraan berlangganan?']] },
  { title: 'Lingkungan', fields: [['buildingAreaType', 'Bangunan berada di area'], ['environment', 'Lingkungan'], ['roadAccess', 'Akses jalan'], ['surroundings', 'Situasi kondisi sekitar'], ['operatorNearest', 'Operator terdekat'], ['operatorDistance', 'Jarak dengan operator terdekat'], ['nearestBank', 'Nama bank terdekat'], ['bankDistance', 'Jarak dengan bank terdekat'], ['cityCenterNearest', 'Pusat kota terdekat'], ['cityDistance', 'Jarak dengan pusat kota terdekat'], ['aiPointDistance', 'Jarak dari titik yang disuggest tim AI']] },
  { title: 'Kondisi dan renovasi', fields: [['needsRenovation', 'Perlu renovasi?'], ['renovationType', 'Jenis renovasi'], ['paintInside', 'Pemilik bersedia mencat dinding dalam'], ['paintOutside', 'Pemilik bersedia mencat dinding luar'], ['generalCleaning', 'Pemilik bersedia general cleaning'], ['replaceTiles', 'Pemilik bersedia mengganti keramik sesuai standard XLC']] },
  { title: 'Inventaris gedung', fields: [['ac', 'Jumlah AC'], ['fans', 'Jumlah kipas angin'], ['infocus', 'Jumlah infocus monitor'], ['tv', 'Jumlah TV'], ['dispenser', 'Jumlah dispenser'], ['whiteboard', 'Jumlah papan tulis'], ['tables', 'Jumlah meja'], ['chairs', 'Jumlah kursi'], ['gallons', 'Jumlah galon']] },
  { title: 'Lokasi bangunan', fields: [['latitude', 'Latitude'], ['longitude', 'Longitude']] },
]

const quantityOptions = Array.from({ length: 11 }, (_, index) => String(index))
const floorOptions = Array.from({ length: 5 }, (_, index) => String(index))
const contractPeriodOptions = Array.from({ length: 10 }, (_, index) => String(index + 1))
const maxContractPeriodOptions = Array.from({ length: 16 }, (_, index) => String(index + 5))
const accounts = {
  ADMINISTRATOR: { password: 'admin123456', role: 'admin', name: 'Administrator', email: 'admin@projectxlc.local', active: true },
  USER: { password: 'user123456', role: 'user', name: 'User ProjectXLC', email: 'user@projectxlc.local', active: true },
}

function getAccounts() {
  const storedAccounts = localStorage.getItem('projectxlc-accounts')
  if (!storedAccounts) return accounts
  try {
    return JSON.parse(storedAccounts)
  } catch {
    return accounts
  }
}

function getUserBuildingDraftKey(username) {
  const normalizedUsername = String(username || 'USER').trim().toUpperCase()
  return `${userBuildingDraftPrefix}${encodeURIComponent(normalizedUsername)}`
}

function getUserBuildingDraft(username) {
  const userKey = getUserBuildingDraftKey(username)
  const userDraft = localStorage.getItem(userKey)
  if (userDraft) {
    try {
      return JSON.parse(userDraft)
    } catch {
      return null
    }
  }

  const legacyDraft = localStorage.getItem(legacyBuildingDraftKey)
  if (!legacyDraft) return null
  try {
    const parsedDraft = JSON.parse(legacyDraft)
    const owner = String(parsedDraft.submittedBy || '').trim().toUpperCase()
    if (owner && owner !== String(username || 'USER').trim().toUpperCase()) return null
    localStorage.setItem(userKey, legacyDraft)
    localStorage.removeItem(legacyBuildingDraftKey)
    return parsedDraft
  } catch {
    return null
  }
}

function getSavedBuildingDrafts() {
  const draftKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key) => key?.startsWith(userBuildingDraftPrefix))
  const drafts = draftKeys.flatMap((key) => {
    try {
      return [JSON.parse(localStorage.getItem(key))]
    } catch {
      return []
    }
  })
  const legacyDraft = localStorage.getItem(legacyBuildingDraftKey)
  if (legacyDraft) {
    try {
      drafts.push(JSON.parse(legacyDraft))
    } catch {
      // Ignore malformed legacy draft data.
    }
  }
  return drafts.sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0))
}

function removeUserBuildingDraft(username) {
  localStorage.removeItem(getUserBuildingDraftKey(username))
  const legacyDraft = localStorage.getItem(legacyBuildingDraftKey)
  if (!legacyDraft) return
  try {
    const owner = String(JSON.parse(legacyDraft).submittedBy || '').trim().toUpperCase()
    if (!owner || owner === String(username || 'USER').trim().toUpperCase()) localStorage.removeItem(legacyBuildingDraftKey)
  } catch {
    localStorage.removeItem(legacyBuildingDraftKey)
  }
}

function getUserSubmissionsKey(username) {
  const normalizedUsername = String(username || 'USER').trim().toUpperCase()
  return `${userSubmissionsPrefix}${encodeURIComponent(normalizedUsername)}`
}

function getUserSubmissions(username) {
  try {
    const submissions = JSON.parse(localStorage.getItem(getUserSubmissionsKey(username)) || '[]')
    return Array.isArray(submissions) ? submissions : []
  } catch {
    return []
  }
}

function saveUserSubmission(username, submission) {
  const submissions = getUserSubmissions(username)
  const nextSubmissions = [submission, ...submissions.filter((entry) => entry.submittedAt !== submission.submittedAt)].slice(0, 50)
  localStorage.setItem(getUserSubmissionsKey(username), JSON.stringify(nextSubmissions))
  return nextSubmissions
}

function formatPriceValue(value, locale = 'id-ID', currency = 'IDR') {
  const digits = String(value ?? '').replace(/[^\d]/g, '')
  if (!digits) return ''
  const numericValue = Number(digits)
  if (!Number.isFinite(numericValue)) return ''
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericValue)
}

function countFilledFormFields(form) {
  return Object.keys(initialForm).filter((key) => {
    const value = form[key]
    if (value == null || String(value).trim() === '') return false
    if (initialForm[key] === '') return String(value).trim() !== '0'
    return String(value) !== String(initialForm[key])
  }).length
}

function Field({ label, name, value, onChange, type = 'text', options, placeholder, required }) {
  const buildingFields = ['buildingName', 'address', 'floors', 'length', 'width', 'landArea', 'buildingArea', 'toilets', 'imb', 'shm', 'tileSize', 'tileColor', 'buildingCover']
  const optionalFields = ['rentPrice', 'annualRent']
  const isRequired = !optionalFields.includes(name) && (required ?? buildingFields.includes(name))
  const visibleOptions = options?.filter((option) => !option.toLowerCase().includes('diketahui'))
  const quantityFields = ['ac', 'fans', 'infocus', 'tv', 'dispenser', 'whiteboard', 'tables', 'chairs', 'gallons']
  const fieldOptions = visibleOptions || (quantityFields.includes(name) ? quantityOptions : name === 'floors' ? floorOptions : ['contractPeriod', 'minContractPeriod'].includes(name) ? contractPeriodOptions : name === 'maxContractPeriod' ? maxContractPeriodOptions : null)

  return (
    <label className="field">
      <span>{label}{isRequired ? <b aria-label="wajib"> *</b> : null}</span>
      {fieldOptions ? (
        <select name={name} value={value} onChange={onChange} required={isRequired}>{fieldOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      ) : type === 'textarea' ? (
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} required={isRequired} rows="3" />
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={isRequired} inputMode={type === 'number' ? 'decimal' : undefined} />
      )}
    </label>
  )
}

function CurrencyField({ label, name, value, onChange, required }) {
  const displayValue = formatPriceValue(value)

  return (
    <label className="field">
      <span>{label}{required ? <b aria-label="wajib"> *</b> : null}</span>
      <input
        name={name}
        type="text"
        value={displayValue}
        onChange={(event) => {
          const nextValue = event.target.value.replace(/[^\d]/g, '')
          onChange({ target: { name, value: nextValue } })
        }}
        placeholder="Rp 0"
        required={required}
        inputMode="numeric"
      />
    </label>
  )
}

function PhotoUpload({ label, photo, onChange }) {
  return (
    <label className="photo-upload">
      <span className="photo-label">{label}</span>
      {photo ? <img src={photo.url} alt={label} /> : <span className="photo-placeholder"><strong>+</strong><small>Pilih foto</small></span>}
      <input type="file" accept="image/*" onChange={onChange} />
      {photo ? <small className="photo-name">{photo.name}</small> : null}
    </label>
  )
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.78), type: 'image/jpeg' })
      }
      image.onerror = reject
      image.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function LoginScreen({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!credentials.username.trim() || !credentials.password) {
      setError('Username dan password wajib diisi.')
      return
    }
    const username = credentials.username.trim().toUpperCase()
    const account = getAccounts()[username]
    if (!account || !account.active || credentials.password !== account.password) {
      setError('Username atau password tidak sesuai.')
      return
    }
    onLogin(username, account.role)
  }

  return <main className="login-shell"><div className="login-orbit" /><section className="login-card"><div className="brand-mark">XLC<span>•</span></div><p className="kicker">PROJECT XLC / SECURE ACCESS</p><h1>Selamat datang<br /><em>di PROJECTXLC.</em></h1><p className="login-copy">Masuk untuk mengisi dan meninjau proposal bangunan.</p><form onSubmit={handleSubmit} className="login-form"><label className="field"><span>USERNAME</span><input autoFocus name="username" value={credentials.username} onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))} placeholder="Masukkan username" autoComplete="username" /></label><label className="field"><span>PASSWORD</span><input name="password" type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} placeholder="Masukkan password" autoComplete="current-password" /></label>{error ? <p className="login-error" role="alert">{error}</p> : null}<button type="submit" className="login-button">PROJECTXLC <span>→</span></button></form></section></main>
}

function ReportPage({ data }) {
  const [submitStatus, setSubmitStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pdfStatus, setPdfStatus] = useState('')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  if (!data?.form) {
    return <main className="preview-page"><header className="app-header"><div className="brand-mark">XLC<span>•</span></div></header><section className="preview-intro"><p className="kicker">PROJECT XLC / REPORT</p><h1>Data laporan<br /><em>tidak tersedia.</em></h1><p className="intro-copy">Buka laporan dari tombol PREVIEW pada formulir.</p></section></main>
  }

  const dateTime = new Date(data.dateTimeData)
  const formattedDate = Number.isNaN(dateTime.getTime()) ? '-' : dateTime.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })

  async function downloadReportPdf() {
    setIsGeneratingPdf(true)
    setPdfStatus('')
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 17
      const contentWidth = pageWidth - margin * 2
      let cursorY = margin

      function ensureSpace(height) {
        if (cursorY + height > pageHeight - margin) {
          pdf.addPage()
          cursorY = margin
        }
      }

      function addEntry(label, value) {
        const labelLines = pdf.splitTextToSize(label.toUpperCase(), contentWidth)
        const valueLines = pdf.splitTextToSize(String(value || '-'), contentWidth)
        const entryHeight = 3.5 + labelLines.length * 3.5 + valueLines.length * 4.5 + 3
        ensureSpace(entryHeight)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7.5)
        pdf.setTextColor(94, 114, 105)
        pdf.text(labelLines, margin, cursorY)
        cursorY += labelLines.length * 3.5 + 1
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(23, 43, 37)
        pdf.text(valueLines, margin, cursorY)
        cursorY += valueLines.length * 4.5 + 3
        pdf.setDrawColor(224, 232, 225)
        pdf.line(margin, cursorY, pageWidth - margin, cursorY)
        cursorY += 4
      }

      function addSection(title) {
        ensureSpace(14)
        cursorY += 4
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(35, 74, 61)
        pdf.text(title.toUpperCase(), margin, cursorY)
        cursorY += 3
        pdf.setDrawColor(35, 74, 61)
        pdf.setLineWidth(0.5)
        pdf.line(margin, cursorY, pageWidth - margin, cursorY)
        cursorY += 5
      }

      function addPhoto(label, photo) {
        addEntry(label, photo?.name)
        if (!photo?.dataUrl) return
        try {
          const imageProperties = pdf.getImageProperties(photo.dataUrl)
          const scale = Math.min(contentWidth / imageProperties.width, 80 / imageProperties.height)
          const imageWidth = imageProperties.width * scale
          const imageHeight = imageProperties.height * scale
          ensureSpace(imageHeight + 8)
          pdf.addImage(photo.dataUrl, photo.type === 'image/png' ? 'PNG' : 'JPEG', margin, cursorY, imageWidth, imageHeight)
          cursorY += imageHeight + 8
        } catch {
          addEntry('Foto', 'Tidak dapat dimasukkan ke PDF')
        }
      }

      pdf.setProperties({ title: `Laporan ${data.form.buildingName || 'proposal bangunan'}`, subject: 'PROJECT XLC property report' })
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(35, 74, 61)
      pdf.text('PROJECT XLC / PROPERTY REPORT', margin, cursorY)
      cursorY += 10
      const titleLines = pdf.splitTextToSize(data.form.buildingName || 'Proposal bangunan', contentWidth)
      pdf.setFontSize(22)
      pdf.setTextColor(23, 43, 37)
      pdf.text(titleLines, margin, cursorY)
      cursorY += titleLines.length * 9 + 4
      addEntry('User', data.user)
      addEntry('Date Time Data', formattedDate)

      reportSections.forEach((section) => {
        addSection(section.title)
        section.fields.forEach(([key, label]) => {
          const value = ['rentPrice', 'annualRent'].includes(key) && data.form[key] !== '' && data.form[key] != null
            ? formatPriceValue(data.form[key])
            : data.form[key]
          addEntry(label, value)
        })
      })

      addSection('Upload foto')
      ;[['front', 'Tampak depan bangunan'], ['groundFloor', 'Tampak dalam lantai dasar'], ['upperFloor', 'Tampak dalam lantai atas']].forEach(([key, label]) => addPhoto(label, data.photoFiles?.[key]))
      addSection('Peta lokasi')
      addEntry('Google Maps', data.googleMapsLink)

      const pageCount = pdf.getNumberOfPages()
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        pdf.setPage(pageNumber)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(94, 114, 105)
        pdf.text(`PROJECT XLC | ${pageNumber} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
      }

      const fileName = String(data.form.buildingName || 'laporan-proposal').trim().replace(/[\\/:*?"<>|]/g, '-')
      pdf.save(`${fileName || 'laporan-proposal'}.pdf`)
      setPdfStatus('PDF laporan berhasil diunduh.')
    } catch {
      setPdfStatus('PDF gagal dibuat. Silakan coba lagi.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  function returnToMainMenu() {
    sessionStorage.setItem('projectxlc-authenticated', 'true')
    sessionStorage.setItem('projectxlc-username', data.user || 'USER')
    sessionStorage.setItem('projectxlc-role', sessionStorage.getItem('projectxlc-role') || 'user')
    sessionStorage.removeItem('projectxlc-report-preview')
    window.location.assign(window.location.pathname)
  }

  function closeReportAndClear() {
    if (!window.confirm('Kembali ke menu utama dan hapus semua isian?')) return

    if (!window.opener || window.opener.closed) {
      removeUserBuildingDraft(data.user)
      returnToMainMenu()
      return
    }

    setIsClosing(true)
    setSubmitStatus('Menghapus isian dan kembali ke menu utama...')
    removeUserBuildingDraft(data.user)
    sessionStorage.removeItem('projectxlc-report-preview')
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', handleClearResult)
      returnToMainMenu()
    }, 2000)

    function handleClearResult(event) {
      if (event.origin !== window.location.origin || event.data?.type !== 'projectxl:report-close-clear-result') return
      window.clearTimeout(timeoutId)
      window.removeEventListener('message', handleClearResult)
      if (event.data.ok) {
        window.close()
        return
      }
      setIsClosing(false)
      setSubmitStatus('Data tidak dapat dihapus. Silakan coba lagi.')
    }

    window.addEventListener('message', handleClearResult)
    window.opener.postMessage({ type: 'projectxlc:report-close-clear' }, window.location.origin)
  }

  function submitReport() {
    if (!window.opener || window.opener.closed) {
      setSubmitStatus('Form utama tidak tersedia. Buka laporan dari halaman formulir untuk mengirim data.')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('Mengirim data ke Google Sheets...')
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', handleSubmitResult)
      setIsSubmitting(false)
      setSubmitStatus('Pengiriman tidak mendapat respons. Periksa koneksi dan status Google Sheets.')
    }, 30000)

    function handleSubmitResult(event) {
      if (event.origin !== window.location.origin || event.source !== window.opener || event.data?.type !== 'projectxlc:report-submit-result') return
      window.clearTimeout(timeoutId)
      window.removeEventListener('message', handleSubmitResult)
      setIsSubmitting(false)
      setSubmitted(event.data.ok)
      setSubmitStatus(event.data.message)
    }

    window.addEventListener('message', handleSubmitResult)
    window.opener.postMessage({ type: 'projectxlc:report-submit' }, window.location.origin)
  }

  return (
    <main className="preview-page report-page">
      <header className="app-header report-header"><div><div className="brand-mark">XLC<span>•</span></div><p className="kicker">PROJECT XLC / PROPERTY REPORT</p></div><div className="report-actions"><button type="button" className="preview-button" onClick={downloadReportPdf} disabled={isGeneratingPdf}>{isGeneratingPdf ? 'CREATING PDF...' : 'PRINT'}</button><button type="button" className="preview-button" onClick={submitReport} disabled={isSubmitting || submitted}>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}</button><button type="button" className="preview-button" onClick={closeReportAndClear} disabled={isClosing}>{isClosing ? 'CLOSING...' : 'CLOSED'}</button></div></header>
      {pdfStatus ? <p className="report-submit-status" role="status">{pdfStatus}</p> : null}
      {submitStatus ? <p className="report-submit-status" role="status">{submitStatus}</p> : null}
      <section className="preview-intro report-intro"><p className="kicker">Laporan proposal bangunan</p><h1>{data.form.buildingName || 'Proposal bangunan'}</h1></section>
      <section className="report-meta" aria-label="Informasi laporan"><div><small>User</small><strong>{data.user || '-'}</strong></div><div><small>Date Time Data</small><strong>{formattedDate}</strong></div></section>
      <div className="report-sections">
        {reportSections.map((section) => (
          <section className="report-section" key={section.title}>
            <div className="report-section-heading"><p className="kicker">Property details</p><h2>{section.title}</h2></div>
            <dl className="report-grid">
              {section.fields.map(([key, label]) => {
                const value = data.form[key]
                const displayValue = ['rentPrice', 'annualRent'].includes(key) && value !== '' && value != null ? formatPriceValue(value) : value || '-'
                return <div key={key}><dt>{label}</dt><dd>{displayValue}</dd></div>
              })}
            </dl>
          </section>
        ))}
        <section className="report-section">
          <div className="report-section-heading"><p className="kicker">Visual documentation</p><h2>Upload foto</h2></div>
          <div className="report-photo-grid">
            {[
              ['front', 'Tampak depan bangunan'],
              ['groundFloor', 'Tampak dalam lantai dasar'],
              ['upperFloor', 'Tampak dalam lantai atas'],
            ].map(([key, label]) => {
              const photo = data.photoFiles?.[key]
              return <figure className="report-photo-card" key={key}><div className="report-photo-frame">{photo?.dataUrl ? <img src={photo.dataUrl} alt={label} /> : <span>{data.photoNames?.[key] || 'Foto belum diunggah'}</span>}</div><figcaption><strong>{label}</strong><span>{photo?.name || data.photoNames?.[key] || '-'}</span></figcaption></figure>
            })}
          </div>
        </section>
        <section className="report-section report-map-section">
          <div className="report-section-heading"><p className="kicker">Location reference</p><h2>Peta lokasi</h2></div>
          <a className="map-link" href={data.googleMapsLink} target="_blank" rel="noreferrer">Buka lokasi di Google Maps <span aria-hidden="true">↗</span></a>
        </section>
      </div>
    </main>
  )
}

function MainMenu({ username, form, draftCount, submittedCount, previewCount, onOpenForm, onOpenDraft, onOpenSubmitted, onPreview, onLogout }) {
  const filledFieldCount = countFilledFormFields(form)
  const totalFieldCount = Object.keys(initialForm).length
  const hasDraft = draftCount > 0

  return (
    <main className="app-shell main-menu-shell">
      <header className="app-header"><div className="brand-mark">XLC<span>•</span></div><div className="main-menu-header-actions"><span className="header-meta">Main Menu / {username}</span></div></header>
      <section className="main-menu-intro"><p className="kicker">PROJECT XLC / WORKSPACE</p><h1>Selamat datang,<br /><em>{username}.</em></h1>{form.buildingName ? <p className="intro-copy">Lanjutkan proposal {form.buildingName}.</p> : null}</section>
      <section className="main-menu-content" aria-label="Menu utama">
        <div className="main-menu-heading"><div><p className="kicker">Pilih aktivitas</p><h2>PROPERTY INTAKE</h2></div><button type="button" className="logout-button" onClick={onLogout}>SIGNOUT</button></div>
        <div className="main-menu-actions">
          <button type="button" className="main-menu-action secondary form-action-card" onClick={onOpenForm}><span className="main-menu-index">01 / FORM</span><strong>FORM</strong><span className="main-menu-count" aria-label={`${filledFieldCount} dari ${totalFieldCount} field terisi`}>{filledFieldCount}/{totalFieldCount}</span></button>
          <button type="button" className="main-menu-action secondary draft-action-card" onClick={onOpenDraft}><span className="main-menu-index">02 / DRAFT</span><strong>DRAFT</strong><span className="main-menu-count" aria-label={`${draftCount} draft tersimpan`}>{draftCount}</span></button>
          <button type="button" className="main-menu-action secondary submitted-action-card" onClick={onOpenSubmitted}><span className="main-menu-index">03 / HISTORY</span><strong>SUBMITTED</strong><span className="main-menu-count" aria-label={`${submittedCount} data disubmit`}>{submittedCount}</span></button>
          <button type="button" className="main-menu-action secondary preview-action-card" onClick={onPreview}><span className="main-menu-index">04 / REPORT</span><strong>PREVIEW</strong><span className="main-menu-count" aria-label={`${previewCount} report tersedia`}>{previewCount}</span></button>
        </div>
        {hasDraft ? <div className="main-menu-draft"><span>Proposal terakhir</span><strong>{form.buildingName || 'Nama bangunan belum diisi'}</strong><span>{form.address || 'Alamat belum diisi'}</span></div> : null}
      </section>
      <footer className="app-footer"><span>PROJECTXLC</span><span>Property Intake</span></footer>
    </main>
  )
}

function DraftPage({ username, draft, onBack, onEdit, onPreview }) {
  if (!draft) {
    return <main className="app-shell main-menu-shell"><header className="app-header"><div className="brand-mark">XLC<span>•</span></div><button type="button" className="preview-button" onClick={onBack}>Main Menu</button></header><section className="main-menu-intro"><p className="kicker">PROJECT XLC / DRAFT</p><h1>Belum ada draft</h1><button type="button" className="preview-button" onClick={onEdit}>FORM</button></section></main>
  }

  return (
    <main className="app-shell main-menu-shell">
      <header className="app-header"><div><div className="brand-mark">XLC<span>•</span></div><p className="kicker">PROJECT XLC / DRAFT DATA</p></div><button type="button" className="preview-button" onClick={onBack}>Main Menu</button></header>
      <section className="main-menu-intro"><p className="kicker">DRAFT / {username}</p><h1>{draft.buildingName || 'Tanpa nama bangunan'}</h1></section>
      <section className="report-meta" aria-label="Informasi draft"><div><small>User</small><strong>{draft.submittedBy || username}</strong></div><div><small>Terakhir disimpan</small><strong>{draft.submittedAt ? new Date(draft.submittedAt).toLocaleString('id-ID') : '-'}</strong></div></section>
      <div className="report-sections">
        {reportSections.map((section) => <section className="report-section" key={section.title}><div className="report-section-heading"><p className="kicker">Draft data</p><h2>{section.title}</h2></div><dl className="report-grid">{section.fields.map(([key, label]) => { const value = draft[key]; const displayValue = ['rentPrice', 'annualRent'].includes(key) && value !== '' && value != null ? formatPriceValue(value) : value || '-'; return <div key={key}><dt>{label}</dt><dd>{displayValue}</dd></div> })}</dl></section>)}
        <section className="report-section"><div className="report-section-heading"><p className="kicker">Visual documentation</p><h2>Upload foto</h2></div><div className="report-photo-grid">{[['front', 'Tampak depan bangunan'], ['groundFloor', 'Tampak dalam lantai dasar'], ['upperFloor', 'Tampak dalam lantai atas']].map(([key, label]) => { const photo = draft.photoFiles?.[key]; return <figure className="report-photo-card" key={key}><div className="report-photo-frame">{photo?.dataUrl ? <img src={photo.dataUrl} alt={label} /> : <span>{draft.photoNames?.[key] || 'Foto belum diunggah'}</span>}</div><figcaption><strong>{label}</strong><span>{photo?.name || draft.photoNames?.[key] || '-'}</span></figcaption></figure> })}</div></section>
      </div>
      <div className="submitted-page-actions"><button type="button" className="preview-button" onClick={onEdit}>EDIT DRAFT</button><button type="button" className="preview-button" onClick={() => onPreview(draft)}>PREVIEW</button></div>
    </main>
  )
}

function PreviewPage({ username, currentReport, submissions, onBack, onPreview }) {
  const reports = [
    ...(currentReport ? [{ ...currentReport, reportType: 'DRAFT' }] : []),
    ...submissions.map((submission) => ({ ...submission, reportType: 'SUBMITTED' })),
  ]

  return (
    <main className="app-shell main-menu-shell">
      <header className="app-header"><div><div className="brand-mark">XLC<span>•</span></div><p className="kicker">PROJECT XLC / REPORT PREVIEW</p></div><button type="button" className="preview-button" onClick={onBack}>Main Menu</button></header>
      <section className="main-menu-intro"><p className="kicker">PREVIEW / {username}</p><h1>REPORTS</h1><p className="intro-copy">{reports.length} report tersedia</p></section>
      <section className="submitted-list" aria-label="Reports available to preview">
        {reports.length ? reports.map((report) => <article className="admin-data-panel submitted-item" key={`${report.reportType}-${report.submittedAt}`}><div className="admin-panel-heading"><div><p className="kicker">{report.reportType} / {report.submittedAt ? new Date(report.submittedAt).toLocaleString('id-ID') : 'Belum disimpan'}</p><h2>{report.form?.buildingName || 'Tanpa nama bangunan'}</h2></div><span>{report.reportType}</span></div><div className="admin-data-grid"><div><small>Alamat</small><strong>{report.form?.address || '-'}</strong></div><div><small>Harga sewa</small><strong>{report.form?.rentPrice ? formatPriceValue(report.form.rentPrice) : '-'}</strong></div></div><button type="button" className="preview-button submitted-preview-button" onClick={() => onPreview(report)}>PREVIEW</button></article>) : <div className="admin-empty"><strong>Belum ada report</strong><span>Simpan draft atau submit formulir untuk membuat report.</span></div>}
      </section>
    </main>
  )
}

function SubmittedPage({ username, submissions, onBack, onPreview }) {
  return (
    <main className="app-shell main-menu-shell">
      <header className="app-header"><div className="brand-mark">XLC<span>•</span></div><div className="main-menu-header-actions"><span className="header-meta">SUBMITTED / {username}</span><button type="button" className="preview-button" onClick={onBack}>Main Menu</button></div></header>
      <section className="main-menu-intro"><p className="kicker">PROJECT XLC / SUBMISSION HISTORY</p><h1>SUBMITTED</h1><p className="intro-copy">{submissions.length} data terkirim</p></section>
      <section className="submitted-list" aria-label="Submitted data">
        {submissions.length ? submissions.map((submission) => (
          <article className="admin-data-panel submitted-item" key={submission.submittedAt}>
            <div className="admin-panel-heading"><div><p className="kicker">{new Date(submission.submittedAt).toLocaleString('id-ID')}</p><h2>{submission.form?.buildingName || 'Tanpa nama bangunan'}</h2></div><span>SUBMITTED</span></div>
            <div className="admin-data-grid"><div><small>Alamat</small><strong>{submission.form?.address || '-'}</strong></div><div><small>Harga sewa</small><strong>{submission.form?.rentPrice ? formatPriceValue(submission.form.rentPrice) : '-'}</strong></div></div>
            <button type="button" className="preview-button submitted-preview-button" onClick={() => onPreview(submission)}>PREVIEW</button>
          </article>
        )) : <div className="admin-empty"><strong>Belum ada data terkirim</strong><span>Data akan muncul di sini setelah formulir disubmit.</span></div>}
      </section>
    </main>
  )
}

function AdminUserControls({ action, accountsList, form, setForm, error, onSubmit, onEdit, onDelete, onToggleStatus }) {
  if (action === 'list') return <div className="admin-data-panel user-panel inline-status-panel"><div className="admin-panel-heading"><div><p className="kicker">Account directory</p><h2>User & role</h2></div></div><div className="user-list">{accountsList.map((account) => <div className="user-row" key={account.username}><div className="user-avatar">{account.username.charAt(0)}</div><div><strong>{account.name || account.username}</strong><span>{account.email || account.username}</span></div><b className={account.role === 'admin' ? 'role-badge admin' : 'role-badge'}>{account.role}</b><b className={account.active ? 'status-badge active' : 'status-badge inactive'}>{account.active ? 'ACTIVE' : 'INACTIVE'}</b><div className="status-actions"><button type="button" className="activate-button" disabled={account.active} onClick={() => onToggleStatus(account.username, true)}>Activate</button><button type="button" className="delete-button" disabled={!account.active} onClick={() => onToggleStatus(account.username, false)}>Deactivate</button></div></div>)}</div></div>
  if (action === 'activate' || action === 'deactivate') return <div className="admin-user-controls"><p className="kicker">{action === 'activate' ? 'Activate account' : 'Deactivate account'}</p><h2>{action === 'activate' ? 'Aktifkan user' : 'Nonaktifkan user'}</h2><div className="admin-delete-list">{accountsList.filter((account) => action === 'activate' ? !account.active : account.active).map((account) => <div className="admin-delete-row" key={account.username}><span>{account.name || account.username} <small>{account.username} / {account.role}</small></span><button type="button" className={action === 'activate' ? 'activate-button' : 'delete-button'} onClick={() => onToggleStatus(account.username, action === 'activate')}>{action === 'activate' ? 'Activate' : 'Deactivate'}</button></div>)}</div>{error ? <p className="login-error">{error}</p> : null}</div>
  if (action === 'delete') return <div className="admin-user-controls"><p className="kicker">Delete account</p><h2>Hapus user</h2><div className="admin-delete-list">{accountsList.map((account) => <div className="admin-delete-row" key={account.username}><span>{account.username} <small>{account.role}</small></span><button type="button" className="delete-button" onClick={() => onDelete(account.username)}>Delete</button></div>)}</div>{error ? <p className="login-error">{error}</p> : null}</div>

  return <div className="admin-user-controls"><p className="kicker">{action === 'edit' ? 'Edit account' : 'New account'}</p><h2>{action === 'edit' ? 'Edit user' : 'Tambah user'}</h2><form className="admin-user-form" onSubmit={onSubmit}><label className="field"><span>NAMA</span><input required={action === 'add'} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nama lengkap" /></label><label className="field"><span>EMAIL</span><input required={action === 'add'} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="nama@email.com" /></label><label className="field"><span>USERNAME</span><input required value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="Contoh: MARKETING" /></label><label className="field"><span>PASSWORD {action === 'edit' ? '(opsional)' : ''}</span><input required={action === 'add'} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={action === 'edit' ? 'Kosongkan jika tidak berubah' : 'Masukkan password'} /></label><label className="field"><span>ROLE</span><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="user">User</option><option value="admin">Admin</option></select></label><label className="field"><span>E-KTP {action === 'edit' ? '(opsional)' : ''}</span><input required={action === 'add'} type="file" accept="image/*,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, ktpName: file.name, ktpData: reader.result })); reader.readAsDataURL(file) }} /></label>{form.ktpName ? <small className="file-selected">File: {form.ktpName}</small> : null}{error ? <p className="login-error">{error}</p> : null}<button type="submit" className="submit-button">{action === 'edit' ? 'Simpan perubahan' : 'Tambah user'} <span>→</span></button></form>{action === 'edit' ? <div className="admin-edit-list"><small>Pilih akun dari daftar:</small>{accountsList.map((account) => <button type="button" key={account.username} onClick={() => onEdit(account)}>{account.username}</button>)}</div> : null}</div>
}

function AdminRolePanel() {
  const roles = [
    { name: 'admin', label: 'Administrator', description: 'Mengelola user, role, dan melihat data proposal.', permissions: ['Data proposal', 'Kelola user', 'Kelola role'] },
    { name: 'user', label: 'User', description: 'Mengisi dan menyimpan data proposal bangunan.', permissions: ['Form proposal', 'Upload foto', 'Simpan data'] },
  ]

  return <><div className="admin-title-row"><div><p className="kicker">Access control</p><h1>Kelola<br /><em>role.</em></h1></div><span className="admin-status">{roles.length} role aktif</span></div><div className="role-list">{roles.map((role) => <article className="role-panel" key={role.name}><div className="role-panel-heading"><div><p className="kicker">Role access</p><h2>{role.label}</h2></div><span className="role-badge admin">{role.name}</span></div><p>{role.description}</p><div className="permission-list">{role.permissions.map((permission) => <span key={permission}>✓ {permission}</span>)}</div></article>)}</div></>
}

function AdminDashboard({ username, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('data')
  const [userAction, setUserAction] = useState('list')
  const [savedDrafts] = useState(getSavedBuildingDrafts)
  const savedData = savedDrafts[0] || null

  const [userAccounts, setUserAccounts] = useState(() => Object.entries(getAccounts()).map(([accountUsername, account]) => ({ username: accountUsername, ...account, active: account.active !== false })))
    const [userForm, setUserForm] = useState({ name: '', email: '', ktpName: '', ktpData: '', username: '', password: '', role: 'user' })
  const [userError, setUserError] = useState('')

  function saveAccounts(nextUsers) {
    localStorage.setItem('projectxlc-accounts', JSON.stringify(Object.fromEntries(nextUsers.map((account) => [account.username, { password: account.password, role: account.role, name: account.name, email: account.email, ktpName: account.ktpName, ktpData: account.ktpData, active: account.active !== false }]))))
    setUserAccounts(nextUsers)
  }

  function handleUserSubmit(event) {
    event.preventDefault()
    const normalizedUsername = userForm.username.trim().toUpperCase()
    if (!normalizedUsername || (userAction === 'add' && !userForm.password)) {
      setUserError('Username dan password wajib diisi.')
      return
    }
    if (userAction === 'add' && userAccounts.some((account) => account.username === normalizedUsername)) {
      setUserError('Username sudah digunakan.')
      return
    }
    if (userAction === 'edit') {
      saveAccounts(userAccounts.map((account) => account.username === normalizedUsername ? { ...account, name: userForm.name.trim() || account.name || account.username, email: userForm.email.trim() || account.email || '', password: userForm.password || account.password, ktpName: userForm.ktpName || account.ktpName, ktpData: userForm.ktpData || account.ktpData, role: userForm.role } : account))
    } else {
      saveAccounts([...userAccounts, { name: userForm.name.trim(), email: userForm.email.trim(), ktpName: userForm.ktpName, ktpData: userForm.ktpData, username: normalizedUsername, password: userForm.password, role: userForm.role, active: false }])
    }
    setUserForm({ name: '', email: '', ktpName: '', ktpData: '', username: '', password: '', role: 'user' })
    setUserError('')
  }

  function handleEditUser(account) {
    setUserAction('edit')
    setUserForm({ name: account.name || '', email: account.email || '', ktpName: account.ktpName || '', ktpData: account.ktpData || '', username: account.username, password: '', role: account.role })
    setUserError('')
  }

  function handleDeleteUser(accountUsername) {
    if (accountUsername === username) {
      setUserError('Akun administrator yang sedang digunakan tidak dapat dihapus.')
      return
    }
    saveAccounts(userAccounts.filter((account) => account.username !== accountUsername))
    setUserError('')
  }

  function handleToggleStatus(accountUsername, active) {
    if (accountUsername === username && !active) {
      setUserError('Akun administrator yang sedang digunakan tidak dapat dinonaktifkan.')
      return
    }
    saveAccounts(userAccounts.map((account) => account.username === accountUsername ? { ...account, active } : account))
    setUserError('')
  }

  return (
    <main className="admin-shell">
      <header className="admin-header"><div><div className="brand-mark">XLC<span>•</span></div><p className="kicker">PROJECT XLC / ADMIN CONSOLE</p></div><div className="admin-header-actions"><span>Administrator, {username}</span><button type="button" className="logout-button" onClick={onLogout}>Keluar</button></div></header>
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Menu administrator"><p className="sidebar-label">Workspace</p><button type="button" className={activeMenu === 'data' ? 'admin-menu active' : 'admin-menu'} onClick={() => setActiveMenu('data')}><span>01</span>Data</button><button type="button" className={activeMenu === 'users' ? 'admin-menu active' : 'admin-menu'} onClick={() => { setActiveMenu('users'); setUserAction('list') }}><span>02</span>User</button>{activeMenu === 'users' ? <div className="admin-submenu"><button type="button" className={userAction === 'add' ? 'active' : ''} onClick={() => { setUserAction('add'); setUserForm({ name: '', email: '', username: '', password: '', role: 'user' }); setUserError('') }}>Add</button><button type="button" className={userAction === 'edit' ? 'active' : ''} onClick={() => { setUserAction('edit'); setUserError('') }}>Edit</button><button type="button" className={userAction === 'delete' ? 'active' : ''} onClick={() => { setUserAction('delete'); setUserError('') }}>Delete</button><button type="button" className={userAction === 'list' ? 'active' : ''} onClick={() => { setUserAction('list'); setUserError('') }}>User List</button></div> : null}<button type="button" className={activeMenu === 'roles' ? 'admin-menu active' : 'admin-menu'} onClick={() => setActiveMenu('roles')}><span>03</span>Role</button></aside>
        <section className={`${activeMenu === 'roles' ? 'admin-content role-mode' : 'admin-content'} user-action-${userAction}`}>
          {activeMenu === 'roles' ? <div className="admin-role-panel"><AdminRolePanel /></div> : null}
          {activeMenu === 'users' ? <AdminUserControls action={userAction} accountsList={userAccounts} form={userForm} setForm={setUserForm} error={userError} onSubmit={handleUserSubmit} onEdit={handleEditUser} onDelete={handleDeleteUser} onToggleStatus={handleToggleStatus} /> : null}
          {activeMenu === 'data' ? <><div className="admin-title-row"><div><p className="kicker">Overview</p><h1>Data proposal<br /><em>siap ditinjau.</em></h1></div><span className="admin-status">{savedData ? '1 data tersimpan' : 'Belum ada data'}</span></div><div className="admin-stats"><article><small>Status data</small><strong>{savedData ? 'Tersedia' : 'Kosong'}</strong><span>{savedData ? 'Draft proposal terakhir' : 'Menunggu input user'}</span></article><article><small>Nama bangunan</small><strong>{savedData?.buildingName || '-'}</strong><span>{savedData?.address || 'Belum diisi'}</span></article><article><small>Terakhir disimpan</small><strong>{savedData?.submittedAt ? new Date(savedData.submittedAt).toLocaleDateString('id-ID') : '-'}</strong><span>Data lokal perangkat</span></article></div>{savedData ? <article className="admin-data-panel"><div className="admin-panel-heading"><div><p className="kicker">Proposal terakhir</p><h2>{savedData.buildingName || 'Tanpa nama bangunan'}</h2></div><span>Draft</span></div><div className="admin-data-grid"><div><small>Alamat</small><strong>{savedData.address || '-'}</strong></div><div><small>Harga sewa</small><strong>{savedData.rentPrice || '-'}</strong></div><div><small>Area bangunan</small><strong>{savedData.buildingArea || '-'} m²</strong></div><div><small>Kontrak</small><strong>{savedData.contractType || '-'} / {savedData.contractPeriod || '-'} tahun</strong></div></div></article> : <div className="admin-empty"><strong>Belum ada proposal</strong><span>User perlu menyimpan data proposal terlebih dahulu.</span></div>}</> : <><div className="admin-title-row"><div><p className="kicker">Access control</p><h1>Daftar<br /><em>user.</em></h1></div><span className="admin-status">{userAccounts.length} akun aktif</span></div><article className="admin-data-panel user-panel"><div className="admin-panel-heading"><div><p className="kicker">Account directory</p><h2>User & role</h2></div></div><div className="user-list">{userAccounts.map((account) => <div className="user-row" key={account.username}><div className="user-avatar">{account.username.charAt(0)}</div><div><strong>{account.username}</strong><span>Login lokal ProjectXLC</span></div><b className={account.role === 'admin' ? 'role-badge admin' : 'role-badge'}>{account.role}</b></div>)}</div></article></>}
        </section>
      </div>
    </main>
  )
}

function App() {
  const reportMode = new URLSearchParams(window.location.search).get('report') === '1'
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('projectxlc-authenticated') === 'true')
  const username = sessionStorage.getItem('projectxlc-username') || 'USER'
  const role = sessionStorage.getItem('projectxlc-role') || 'user'
  const [reportData] = useState(() => {
    if (!reportMode) return null
    try {
      return JSON.parse(sessionStorage.getItem('projectxlc-report-preview') || 'null')
    } catch {
      return null
    }
  })
  const [form, setForm] = useState(initialForm)
  const [activePage, setActivePage] = useState(() => new URLSearchParams(window.location.search).get('form') === '1' ? 'form' : 'mainmenu')
  const [draftExists, setDraftExists] = useState(false)
  const [draftData, setDraftData] = useState(null)
  const [submittedRecords, setSubmittedRecords] = useState(() => getUserSubmissions(username))
  const [photos, setPhotos] = useState({ front: null, groundFloor: null, upperFloor: null })
  const [saved, setSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const [locationError, setLocationError] = useState('')
  const formRef = useRef(null)
  const reportSubmitSource = useRef(null)

  function openReportPage(submission = null) {
    const reportForm = submission?.form || (submission?.buildingName || submission?.address ? submission : form)
    const dateTimeData = submission?.submittedAt || new Date().toISOString()
    const googleMapsLink = submission?.googleMapsLink || (reportForm.latitude && reportForm.longitude ? `https://www.google.com/maps?q=${reportForm.latitude},${reportForm.longitude}` : 'https://www.google.com/maps')
    const photoNames = submission?.photoNames || Object.fromEntries(Object.entries(photos).map(([name, photo]) => [name, photo?.name || '']))
    const photoFiles = submission?.photoFiles || Object.fromEntries(Object.entries(photos).map(([name, photo]) => [name, photo ? { name: photo.name, type: photo.type, dataUrl: photo.dataUrl } : null]))
    sessionStorage.setItem('projectxlc-report-preview', JSON.stringify({ form: reportForm, user: submission?.submittedBy || username, dateTimeData, photoNames, photoFiles, googleMapsLink }))
    const reportWindow = window.open(`${window.location.pathname}?report=1`, '_blank')
    if (!reportWindow) setLocationError('Tab laporan diblokir oleh browser. Izinkan pop-up lalu coba lagi.')
  }

  function handleLogin(username, role) {
    sessionStorage.setItem('projectxlc-authenticated', 'true')
    sessionStorage.setItem('projectxlc-username', username)
    sessionStorage.setItem('projectxlc-role', role)
    setActivePage('mainmenu')
    setAuthenticated(true)
  }

  function handleLogout() {
    sessionStorage.removeItem('projectxlc-authenticated')
    sessionStorage.removeItem('projectxlc-username')
    sessionStorage.removeItem('projectxlc-role')
    setActivePage('mainmenu')
    setAuthenticated(false)
  }

  function openFormPage() {
    setActivePage('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openDraftPage() {
    setActivePage('draft')
  }

  function openSubmittedPage() {
    setActivePage('submitted')
  }

  function previewFromMenu() {
    setActivePage('preview')
  }

  useEffect(() => {
    const draft = getUserBuildingDraft(username)
    setDraftExists(Boolean(draft))
    setDraftData(draft)
    setForm({ ...initialForm, ...(draft || {}) })
    setPhotos(Object.fromEntries(['front', 'groundFloor', 'upperFloor'].map((name) => {
      const photo = draft?.photoFiles?.[name]
      return [name, photo ? { ...photo, url: photo.dataUrl } : null]
    })))
    setLastSaved(draft?.submittedAt || null)
    setSaved(false)
    setSaveMessage('')
    setSubmittedRecords(getUserSubmissions(username))
  }, [username])

  useEffect(() => {
    function handleReportSubmit(event) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'projectxl:report-close-clear') {
        setForm(initialForm)
        setActivePage('mainmenu')
        setDraftExists(false)
        setPhotos({ front: null, groundFloor: null, upperFloor: null })
        setLastSaved(null)
        setSaved(false)
        setSaveMessage('')
        setLocationError('')
        removeUserBuildingDraft(username)
        sessionStorage.removeItem('projectxlc-report-preview')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        event.source?.postMessage({ type: 'projectxl:report-close-clear-result', ok: true }, event.origin)
        return
      }
      if (event.data?.type !== 'projectxlc:report-submit') return
      const formElement = formRef.current
      if (!formElement) return
      if (!formElement.reportValidity()) {
        event.source?.postMessage({ type: 'projectxlc:report-submit-result', ok: false, message: 'Lengkapi semua field wajib pada formulir terlebih dahulu.' }, event.origin)
        return
      }
      reportSubmitSource.current = event.source
      formElement.requestSubmit()
    }

    window.addEventListener('message', handleReportSubmit)
    return () => window.removeEventListener('message', handleReportSubmit)
  }, [username])

  const currentReport = draftData || countFilledFormFields(form) > 0 ? {
    form,
    photoNames: Object.fromEntries(Object.entries(photos).map(([name, photo]) => [name, photo?.name || ''])),
    photoFiles: Object.fromEntries(Object.entries(photos).map(([name, photo]) => [name, photo ? { name: photo.name, type: photo.type, dataUrl: photo.dataUrl } : null])),
    googleMapsLink: form.latitude && form.longitude ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}` : 'https://www.google.com/maps',
    submittedAt: draftData?.submittedAt || lastSaved || new Date().toISOString(),
    submittedBy: username,
  } : null

  if (reportMode) return <ReportPage data={reportData} />
  if (!authenticated) return <LoginScreen onLogin={handleLogin} />
  if (role === 'admin') return <AdminDashboard username={username} onLogout={handleLogout} />
  if (activePage === 'draft') return <DraftPage username={username} draft={draftData} onBack={() => setActivePage('mainmenu')} onEdit={openFormPage} onPreview={openReportPage} />
  if (activePage === 'preview') return <PreviewPage username={username} currentReport={currentReport} submissions={submittedRecords} onBack={() => setActivePage('mainmenu')} onPreview={openReportPage} />
  if (activePage === 'submitted') return <SubmittedPage username={username} submissions={submittedRecords} onBack={() => setActivePage('mainmenu')} onPreview={openReportPage} />
  if (activePage === 'mainmenu') return <MainMenu username={username} form={form} draftCount={draftExists ? 1 : 0} submittedCount={submittedRecords.length} previewCount={submittedRecords.length + (draftExists || countFilledFormFields(form) > 0 ? 1 : 0)} onOpenForm={openFormPage} onOpenDraft={openDraftPage} onOpenSubmitted={openSubmittedPage} onPreview={previewFromMenu} onLogout={handleLogout} />

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setSaved(false)
  }

  async function handlePhotoChange(name, event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setPhotos((current) => ({ ...current, [name]: { name: file.name, type: compressed.type, dataUrl: compressed.dataUrl, url: URL.createObjectURL(file) } }))
      setSaved(false)
    } catch {
      setLocationError('Foto tidak dapat diproses.')
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationError('Browser tidak mendukung pengambilan lokasi.')
      return
    }
    setLocationError('Mengambil lokasi...')
    navigator.geolocation.getCurrentPosition((position) => {
      const latitude = position.coords.latitude.toFixed(6)
      const longitude = position.coords.longitude.toFixed(6)
      setForm((current) => ({ ...current, latitude, longitude }))
      setLocationError('Lokasi berhasil diambil.')
      setSaved(false)
    }, () => setLocationError('Izin lokasi ditolak atau lokasi tidak tersedia.'), { enableHighAccuracy: true, timeout: 10000 })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    let submitResult = { ok: false, message: googleSheetsUrl ? 'Draft tersimpan di perangkat, tetapi pengiriman ke Google Sheets gagal.' : 'Draft tersimpan di perangkat. Google Sheets belum terhubung.' }
    const submittedAt = new Date().toISOString()
    const normalizedForm = {
      ...form,
      rentPrice: Number(form.rentPrice || 0),
      annualRent: Number(form.annualRent || 0),
      contractPeriod: Number(form.contractPeriod || 0),
      minContractPeriod: Number(form.minContractPeriod || 0),
      maxContractPeriod: Number(form.maxContractPeriod || 0),
    }
    const photoNames = Object.fromEntries(Object.entries(photos).map(([name, photo]) => [name, photo?.name || '']))
    const photoFiles = Object.fromEntries(Object.entries(photos).map(([name, photo]) => [name, photo ? { name: photo.name, type: photo.type, dataUrl: photo.dataUrl } : null]))
    const googleMapsLink = form.latitude && form.longitude ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}` : 'https://www.google.com/maps'
    const payload = {
      user: username,
      dateTimeData: submittedAt,
      ...normalizedForm,
      photoNames,
      photoFiles,
      googleMapsLink,
    }
    const submittedRecord = { form: normalizedForm, photoNames, googleMapsLink, submittedAt, submittedBy: username }
    setSubmittedRecords(saveUserSubmission(username, submittedRecord))
    localStorage.setItem(getUserBuildingDraftKey(username), JSON.stringify({ ...normalizedForm, photoNames, googleMapsLink, submittedAt, submittedBy: username }))
    setDraftExists(true)
    setLastSaved(submittedAt)
    setSaved(true)
    setSaveMessage(googleSheetsUrl ? 'Mengirim data ke Google Sheets...' : 'Draft tersimpan di perangkat. Hubungkan Google Sheets untuk sinkronisasi.')
    if (googleSheetsUrl) {
      try {
        await fetch(googleSheetsUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
        setSaveMessage('Data tersimpan di perangkat dan dikirim ke Google Sheets.')
        submitResult = { ok: true, message: 'Data berhasil dikirim ke Google Sheets.' }
      } catch {
        setSaveMessage('Draft tersimpan di perangkat, tetapi pengiriman ke Google Sheets gagal.')
      }
    }
    if (reportSubmitSource.current && !reportSubmitSource.current.closed) {
      reportSubmitSource.current.postMessage({ type: 'projectxlc:report-submit-result', ...submitResult }, window.location.origin)
      reportSubmitSource.current = null
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function saveDraft() {
    const savedAt = new Date().toISOString()
    const photoNames = Object.fromEntries(Object.entries(photos).map(([name, photo]) => [name, photo?.name || '']))
    const googleMapsLink = form.latitude && form.longitude ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}` : 'https://www.google.com/maps'
    localStorage.setItem(getUserBuildingDraftKey(username), JSON.stringify({ ...form, photoNames, googleMapsLink, submittedAt: savedAt, submittedBy: username }))
    setDraftExists(true)
    setLastSaved(savedAt)
    setSaved(true)
    setSaveMessage('Draft tersimpan di perangkat.')
  }

  function clearForm() {
    if (window.confirm('Hapus semua isian formulir?')) {
      setForm(initialForm)
      setPhotos({ front: null, groundFloor: null, upperFloor: null })
      setLastSaved(null)
      setSaved(false)
      setSaveMessage('')
      setDraftExists(false)
      removeUserBuildingDraft(username)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand-mark">XLC<span>•</span></div><div className="header-meta"><span className="live-dot" /> Form proposal gedung / {role}</div></header>
      <section className="intro"><div className="welcome-row"><p className="welcome-message">Selamat Datang, {username}</p><div className="welcome-actions"><button type="button" className="preview-button" onClick={() => setActivePage('mainmenu')}>Main Menu</button><button type="button" className="logout-button" onClick={handleLogout}>Keluar</button><button type="button" className="preview-button welcome-preview-button" onClick={openReportPage}>PREVIEW</button></div></div><p className="kicker">PROJECT XLC / PROPERTY INTAKE</p><h1>Proposal bangunan<br /><em>siap ditinjau.</em></h1><p className="intro-copy">Lengkapi detail properti untuk membantu tim menilai lokasi, biaya, dan kesiapan gedung.</p><div className="progress-line"><span /><span /><span /><span /><span /></div></section>
      {saved ? <div className="success-banner" role="status"><strong>Data tersimpan.</strong> {saveMessage}</div> : null}
      <form ref={formRef} onSubmit={handleSubmit}>
        <section className="form-section" id="building"><div className="section-title"><span>01</span><div><p className="kicker">Property profile</p><h2>Data bangunan</h2><p>Identitas dasar dan kondisi fisik properti.</p></div></div><div className="field-grid">
          <Field label="Nama Bangunan" name="buildingName" value={form.buildingName} onChange={handleChange} placeholder="Contoh: Gedung Cilandak" required /><Field label="Alamat" name="address" value={form.address} onChange={handleChange} type="textarea" placeholder="Alamat lengkap bangunan" required /><Field label="Jumlah lantai" name="floors" value={form.floors} onChange={handleChange} type="number" placeholder="0" /><Field label="Luas tanah (m²)" name="landArea" value={form.landArea} onChange={handleChange} type="number" placeholder="0" /><Field label="Luas bangunan (m²)" name="buildingArea" value={form.buildingArea} onChange={handleChange} type="number" placeholder="0" /><Field label="Ukuran panjang (m)" name="length" value={form.length} onChange={handleChange} type="number" placeholder="0" /><Field label="Ukuran lebar (m)" name="width" value={form.width} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah toilet" name="toilets" value={form.toilets} onChange={handleChange} type="number" placeholder="0" /><Field label="Kelengkapan IMB" name="imb" value={form.imb} onChange={handleChange} options={['Lengkap', 'Tidak lengkap', 'Belum diketahui']} /><Field label="Kelengkapan SHM" name="shm" value={form.shm} onChange={handleChange} options={['Lengkap', 'Tidak lengkap', 'Belum diketahui']} /><Field label="Ukuran keramik lantai (cm)" name="tileSize" value={form.tileSize} onChange={handleChange} placeholder="Contoh: 60 x 60" /><Field label="Warna keramik lantai" name="tileColor" value={form.tileColor} onChange={handleChange} options={['Krem', 'Putih', 'Lainnya']} /><Field label="Penutup Bangunan" name="buildingCover" value={form.buildingCover} onChange={handleChange} options={['GENTENG', 'BETON', 'ASBES', 'SENG']} />
        </div></section>
        <section className="form-section" id="rent"><div className="section-title"><span>02</span><div><p className="kicker">Commercial terms</p><h2>Harga sewa</h2><p>Biaya, pajak, dan komitmen kontrak.</p></div></div><div className="field-grid"><CurrencyField label="Harga sewa" name="rentPrice" value={form.rentPrice} onChange={handleChange} required /><CurrencyField label="Harga sewa per tahun" name="annualRent" value={form.annualRent} onChange={handleChange} required /><Field label="Kontrak bulanan / tahunan" name="contractType" value={form.contractType} onChange={handleChange} options={['Bulanan', 'Tahunan', 'Fleksibel']} /><Field label="Periode kontrak (tahun)" name="contractPeriod" value={form.contractPeriod} onChange={handleChange} type="number" placeholder="0" /><Field label="Min Periode kontrak (tahun)" name="minContractPeriod" value={form.minContractPeriod} onChange={handleChange} type="number" placeholder="0" /><Field label="Maks Periode kontrak (tahun)" name="maxContractPeriod" value={form.maxContractPeriod} onChange={handleChange} options={maxContractPeriodOptions} /><Field label="Sudah include PPN?" name="vatIncluded" value={form.vatIncluded} onChange={handleChange} options={['Sudah', 'Belum', 'Belum diketahui']} /></div></section>
        <section className="form-section" id="facility"><div className="section-title"><span>03</span><div><p className="kicker">On-site readiness</p><h2>Fasilitas</h2><p>Utilitas, parkir, dan akses kendaraan.</p></div></div><div className="field-grid"><Field label="Sumber air" name="waterSource" value={form.waterSource} onChange={handleChange} options={['PDAM', 'Non PDAM', 'PDAM dan Non PDAM', 'Belum diketahui']} /><Field label="Daya listrik terpasang (kWh)" name="electricity" value={form.electricity} onChange={handleChange} type="number" placeholder="0" /><Field label="Ketersediaan lahan parkir" name="parkingLand" value={form.parkingLand} onChange={handleChange} options={['Tersedia', 'Tidak tersedia', 'Terbatas']} /><Field label="Parkir motor / mobil" name="parkingVehicle" value={form.parkingVehicle} onChange={handleChange} options={['Motor dan mobil', 'Motor saja', 'Mobil saja', 'Tidak tersedia']} /><Field label="Parkir kendaraan berlangganan?" name="parkingSubscription" value={form.parkingSubscription} onChange={handleChange} options={['Ya', 'Tidak', 'Belum diketahui']} /></div></section>
        <section className="form-section" id="location"><div className="section-title"><span>04</span><div><p className="kicker">Context & access</p><h2>Lingkungan</h2><p>Gambaran area dan jarak ke titik penting.</p></div></div><div className="field-grid"><Field label="Bangunan berada di area" name="buildingAreaType" value={form.buildingAreaType} onChange={handleChange} options={['BISNIS', 'RUKO', 'KANTOR', 'PEMUKIMAN']} /><Field label="Lingkungan" name="environment" value={form.environment} onChange={handleChange} options={['DALAM CLUSTER', 'TERBUKA']} /><Field label="Akses jalan" name="roadAccess" value={form.roadAccess} onChange={handleChange} options={['NASIONAL', 'PROPINSI', 'DAERAH']} /><Field label="Situasi kondisi sekitar" name="surroundings" value={form.surroundings} onChange={handleChange} type="textarea" placeholder="Ramai, tenang, rawan banjir, dll." /><Field label="Operator Terdekat" name="operatorNearest" value={form.operatorNearest} onChange={handleChange} placeholder="Nama operator" /><Field label="Jarak dengan operator terdekat" name="operatorDistance" value={form.operatorDistance} onChange={handleChange} placeholder="Contoh: 800 m" /><Field label="Nama bank terdekat" name="nearestBank" value={form.nearestBank} onChange={handleChange} placeholder="Contoh: BCA" /><Field label="Jarak dengan bank terdekat" name="bankDistance" value={form.bankDistance} onChange={handleChange} placeholder="Contoh: 500 m" /><Field label="Pusat Kota Terdekat" name="cityCenterNearest" value={form.cityCenterNearest} onChange={handleChange} options={['ALUN - ALUN', 'CFD KOTA', 'TUGU KOTA', 'KANTOR WALIKOTA', 'KANTOR BUPATI']} /><Field label="Jarak dengan pusat kota terdekat" name="cityDistance" value={form.cityDistance} onChange={handleChange} placeholder="Contoh: 4 km" /><Field label="Jarak dari titik yang disuggest tim AI" name="aiPointDistance" value={form.aiPointDistance} onChange={handleChange} placeholder="Contoh: 1.2 km" /></div></section>
        <section className="form-section" id="other"><div className="section-title"><span>05</span><div><p className="kicker">Finishing & inventory</p><h2>Lain-lain</h2><p>Renovasi dan inventaris yang sudah tersedia.</p></div></div><div className="field-grid"><Field label="Perlu renovasi?" name="needsRenovation" value={form.needsRenovation} onChange={handleChange} options={['Tidak', 'Ya', 'Belum diketahui']} />{form.needsRenovation === 'Ya' ? <Field label="Jenis renovasi" name="renovationType" value={form.renovationType} onChange={handleChange} type="textarea" placeholder="Jelaskan kebutuhan renovasi" /> : null}<Field label="Pemilik bersedia mencat dinding dalam" name="paintInside" value={form.paintInside} onChange={handleChange} options={['Ya', 'Tidak', 'Tidak diketahui']} /><Field label="Pemilik bersedia mencat dinding luar" name="paintOutside" value={form.paintOutside} onChange={handleChange} options={['Ya', 'Tidak', 'Tidak diketahui']} /><Field label="Pemilik bersedia general cleaning" name="generalCleaning" value={form.generalCleaning} onChange={handleChange} options={['Ya', 'Tidak', 'Tidak diketahui']} /><Field label="Pemilik bersedia mengganti keramik sesuai standard XLC" name="replaceTiles" value={form.replaceTiles} onChange={handleChange} options={['Ya', 'Tidak', 'Tidak diketahui']} /></div><div className="inventory-heading"><p className="kicker">Jika sudah tersedia di gedung yang dipropose</p><h3>Inventaris gedung</h3></div><div className="field-grid inventory-grid"><Field label="Jumlah AC" name="ac" value={form.ac} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah kipas angin" name="fans" value={form.fans} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah infocus monitor" name="infocus" value={form.infocus} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah TV" name="tv" value={form.tv} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah dispenser" name="dispenser" value={form.dispenser} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah papan tulis" name="whiteboard" value={form.whiteboard} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah meja" name="tables" value={form.tables} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah kursi" name="chairs" value={form.chairs} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah galon" name="gallons" value={form.gallons} onChange={handleChange} type="number" placeholder="0" /></div></section>
        <section className="form-section photo-section" id="photos"><div className="section-title"><span>06</span><div><p className="kicker">Visual documentation</p><h2>Upload Foto</h2><p>Tambahkan foto kondisi aktual bangunan.</p></div></div><div className="photo-grid"><PhotoUpload label="Tampak Depan Bangunan" photo={photos.front} onChange={(event) => handlePhotoChange('front', event)} /><PhotoUpload label="Tampak Dalam Lantai Dasar" photo={photos.groundFloor} onChange={(event) => handlePhotoChange('groundFloor', event)} /><PhotoUpload label="Tampak Dalam Lantai Atas" photo={photos.upperFloor} onChange={(event) => handlePhotoChange('upperFloor', event)} /></div></section>
        <section className="form-section coordinates-section" id="coordinates"><div className="section-title"><span>07</span><div><p className="kicker">Location capture</p><h2>Lokasi bangunan</h2><p>Ambil koordinat perangkat dan buka titiknya di Google Maps.</p></div></div><div className="location-actions"><button type="button" className="preview-button" onClick={captureLocation}>Ambil lokasi saya</button>{locationError ? <span className="location-message">{locationError}</span> : null}</div><div className="field-grid"><Field label="Latitude" name="latitude" value={form.latitude} onChange={handleChange} placeholder="Contoh: -6.207450" required={false} /><Field label="Longitude" name="longitude" value={form.longitude} onChange={handleChange} placeholder="Contoh: 106.714135" required={false} /></div><iframe className="map-frame" title="Google Maps lokasi bangunan" src={form.latitude && form.longitude ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}&output=embed` : 'https://www.google.com/maps?q=Indonesia&output=embed'} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></section>
        <div className="form-actions"><button type="button" className="preview-button" onClick={openReportPage}>PREVIEW</button><button type="button" className="preview-button" onClick={saveDraft}>SAVE</button><button type="button" className="preview-button" onClick={clearForm}>CLEAR</button></div>
      </form>
      <footer className="app-footer"><span>PROJECTXLC</span><span>{lastSaved ? `Terakhir disimpan ${new Date(lastSaved).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Draft belum disimpan'}</span></footer>
    </main>
  )
}

export default App
