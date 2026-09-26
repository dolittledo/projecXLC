import { useEffect, useState } from 'react'
import './App.css'

const googleSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL || ''

const initialForm = {
  buildingName: '', address: '', floors: '', length: '', width: '', landArea: '', buildingArea: '', toilets: '', imb: '', shm: '', tileSize: '', tileColor: 'Krem', buildingCover: '',
  annualRent: '', rentPrice: '', contractType: 'Tahunan', contractPeriod: '', minContractPeriod: '', maxContractPeriod: '', vatIncluded: '',
  electricity: '', waterSource: 'PDAM', parkingLand: 'Tersedia', parkingVehicle: 'Motor dan mobil', parkingSubscription: 'Tidak',
  buildingAreaType: '', roadAccess: '', environment: '', surroundings: '', aiPointDistance: '', operatorNearest: '', operatorDistance: '', bankDistance: '', nearestBank: '', cityCenterNearest: '', cityDistance: '',
  needsRenovation: 'Tidak', renovationType: '', paintInside: 'Tidak', paintOutside: 'Tidak', generalCleaning: 'Tidak', replaceTiles: 'Tidak',
  latitude: '', longitude: '',
  ac: '', fans: '', infocus: '', tv: '', dispenser: '', whiteboard: '', tables: '', chairs: '', gallons: '',
}

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

function Field({ label, name, value, onChange, type = 'text', options, placeholder, required = true }) {
  const visibleOptions = options?.filter((option) => !option.toLowerCase().includes('diketahui'))
  const quantityFields = ['ac', 'fans', 'infocus', 'tv', 'dispenser', 'whiteboard', 'tables', 'chairs', 'gallons']
  const fieldOptions = visibleOptions || (quantityFields.includes(name) ? quantityOptions : name === 'floors' ? floorOptions : ['contractPeriod', 'minContractPeriod'].includes(name) ? contractPeriodOptions : name === 'maxContractPeriod' ? maxContractPeriodOptions : null)

  return (
    <label className="field">
      <span>{label}{required ? <b aria-label="wajib"> *</b> : null}</span>
      {fieldOptions ? (
        <select name={name} value={value} onChange={onChange} required={required}>{fieldOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      ) : type === 'textarea' ? (
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} rows="3" />
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} inputMode={type === 'number' ? 'decimal' : undefined} />
      )}
    </label>
  )
}

function PhotoUpload({ label, photo, onChange }) {
  return (
    <label className="photo-upload">
      <span className="photo-label">{label}</span>
      {photo ? <img src={photo.url} alt={label} /> : <span className="photo-placeholder"><strong>+</strong><small>Pilih foto</small></span>}
      <input type="file" accept="image/*" onChange={onChange} required={!photo} />
      {photo ? <small className="photo-name">{photo.name}</small> : null}
    </label>
  )
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
  const [savedData] = useState(() => {
    const draft = localStorage.getItem('projectxlc-building-form')
    return draft ? JSON.parse(draft) : null
  })

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
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('projectxlc-authenticated') === 'true')
  const username = sessionStorage.getItem('projectxlc-username') || 'USER'
  const role = sessionStorage.getItem('projectxlc-role') || 'user'
  const [form, setForm] = useState(initialForm)
  const [photos, setPhotos] = useState({ front: null, groundFloor: null, upperFloor: null })
  const [saved, setSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [locationError, setLocationError] = useState('')

  function handleLogin(username, role) {
    sessionStorage.setItem('projectxlc-authenticated', 'true')
    sessionStorage.setItem('projectxlc-username', username)
    sessionStorage.setItem('projectxlc-role', role)
    setAuthenticated(true)
  }

  function handleLogout() {
    sessionStorage.removeItem('projectxlc-authenticated')
    sessionStorage.removeItem('projectxlc-username')
    sessionStorage.removeItem('projectxlc-role')
    setAuthenticated(false)
  }

  useEffect(() => {
    const draft = localStorage.getItem('projectxlc-building-form')
    if (draft) setForm({ ...initialForm, ...JSON.parse(draft) })
  }, [])

  if (!authenticated) return <LoginScreen onLogin={handleLogin} />
  if (role === 'admin') return <AdminDashboard username={username} onLogout={handleLogout} />

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setSaved(false)
  }

  function handlePhotoChange(name, event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotos((current) => ({ ...current, [name]: { name: file.name, url: URL.createObjectURL(file) } }))
    setSaved(false)
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
    const submittedAt = new Date().toISOString()
    const photoNames = Object.fromEntries(Object.entries(photos).map(([name, photo]) => [name, photo?.name || '']))
    const payload = { ...form, photoNames, submittedAt, submittedBy: username }
    localStorage.setItem('projectxlc-building-form', JSON.stringify(payload))
    setLastSaved(submittedAt)
    setSaved(true)
    setSaveMessage(googleSheetsUrl ? 'Mengirim data ke Google Sheets...' : 'Draft tersimpan di perangkat. Hubungkan Google Sheets untuk sinkronisasi.')
    if (googleSheetsUrl) {
      try {
        await fetch(googleSheetsUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
        setSaveMessage('Data tersimpan di perangkat dan dikirim ke Google Sheets.')
      } catch {
        setSaveMessage('Draft tersimpan di perangkat, tetapi pengiriman ke Google Sheets gagal.')
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearForm() {
    if (window.confirm('Hapus semua isian formulir?')) {
      setForm(initialForm)
      setPhotos({ front: null, groundFloor: null, upperFloor: null })
      setLastSaved(null)
      setSaved(false)
      localStorage.removeItem('projectxlc-building-form')
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand-mark">XLC<span>•</span></div><div className="header-meta"><span className="live-dot" /> Form proposal gedung / {role}</div></header>
      <section className="intro"><div className="welcome-row"><p className="welcome-message">Selamat Datang, {username}</p><div className="welcome-actions"><button type="button" className="logout-button" onClick={handleLogout}>Keluar</button><button type="button" className="preview-button welcome-preview-button" onClick={() => setShowPreview((current) => !current)}>{showPreview ? 'Tutup Preview' : 'Preview Data'}</button></div></div><p className="kicker">PROJECT XLC / PROPERTY INTAKE</p><h1>Proposal bangunan<br /><em>siap ditinjau.</em></h1><p className="intro-copy">Lengkapi detail properti untuk membantu tim menilai lokasi, biaya, dan kesiapan gedung.</p><div className="progress-line"><span /><span /><span /><span /><span /></div></section>
      {saved ? <div className="success-banner" role="status"><strong>Data tersimpan.</strong> {saveMessage}</div> : null}
      <form onSubmit={handleSubmit}>
        <section className="form-section coordinates-section" id="coordinates"><div className="section-title"><span>GPS</span><div><p className="kicker">Location capture</p><h2>Lokasi bangunan</h2><p>Ambil koordinat perangkat dan buka titiknya di Google Maps.</p></div></div><div className="location-actions"><button type="button" className="preview-button" onClick={captureLocation}>Ambil lokasi saya</button>{locationError ? <span className="location-message">{locationError}</span> : null}</div><div className="field-grid"><Field label="Latitude" name="latitude" value={form.latitude} onChange={handleChange} placeholder="Contoh: -6.207450" required={false} /><Field label="Longitude" name="longitude" value={form.longitude} onChange={handleChange} placeholder="Contoh: 106.714135" required={false} /></div>{form.latitude && form.longitude ? <a className="map-link" href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`} target="_blank" rel="noreferrer">Buka lokasi di Google Maps →</a> : null}</section>
        <section className="form-section" id="building"><div className="section-title"><span>01</span><div><p className="kicker">Property profile</p><h2>Data bangunan</h2><p>Identitas dasar dan kondisi fisik properti.</p></div></div><div className="field-grid">
          <Field label="Nama Bangunan" name="buildingName" value={form.buildingName} onChange={handleChange} placeholder="Contoh: Gedung Cilandak" required /><Field label="Alamat" name="address" value={form.address} onChange={handleChange} type="textarea" placeholder="Alamat lengkap bangunan" required /><Field label="Jumlah lantai" name="floors" value={form.floors} onChange={handleChange} type="number" placeholder="0" /><Field label="Ukuran panjang (m)" name="length" value={form.length} onChange={handleChange} type="number" placeholder="0" /><Field label="Ukuran lebar (m)" name="width" value={form.width} onChange={handleChange} type="number" placeholder="0" /><Field label="Luas tanah (m²)" name="landArea" value={form.landArea} onChange={handleChange} type="number" placeholder="0" /><Field label="Luas bangunan (m²)" name="buildingArea" value={form.buildingArea} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah toilet" name="toilets" value={form.toilets} onChange={handleChange} type="number" placeholder="0" /><Field label="Kelengkapan IMB" name="imb" value={form.imb} onChange={handleChange} options={['Lengkap', 'Tidak lengkap', 'Belum diketahui']} /><Field label="Kelengkapan SHM" name="shm" value={form.shm} onChange={handleChange} options={['Lengkap', 'Tidak lengkap', 'Belum diketahui']} /><Field label="Ukuran keramik lantai (cm)" name="tileSize" value={form.tileSize} onChange={handleChange} placeholder="Contoh: 60 x 60" /><Field label="Warna keramik lantai" name="tileColor" value={form.tileColor} onChange={handleChange} options={['Krem', 'Putih', 'Lainnya']} /><Field label="Penutup Bangunan" name="buildingCover" value={form.buildingCover} onChange={handleChange} options={['GENTENG', 'BETON', 'ASBES', 'SENG']} />
        </div></section>
        <section className="form-section photo-section" id="photos"><div className="section-title"><span>06</span><div><p className="kicker">Visual documentation</p><h2>Upload Foto</h2><p>Tambahkan foto kondisi aktual bangunan.</p></div></div><div className="photo-grid"><PhotoUpload label="Tampak Depan Bangunan" photo={photos.front} onChange={(event) => handlePhotoChange('front', event)} /><PhotoUpload label="Tampak Dalam Lantai Dasar" photo={photos.groundFloor} onChange={(event) => handlePhotoChange('groundFloor', event)} /><PhotoUpload label="Tampak Dalam Lantai Atas" photo={photos.upperFloor} onChange={(event) => handlePhotoChange('upperFloor', event)} /></div></section>
        <section className="form-section" id="rent"><div className="section-title"><span>02</span><div><p className="kicker">Commercial terms</p><h2>Harga sewa</h2><p>Biaya, pajak, dan komitmen kontrak.</p></div></div><div className="field-grid"><Field label="Harga sewa" name="rentPrice" value={form.rentPrice} onChange={handleChange} type="number" placeholder="Rp" required /><Field label="Harga sewa per tahun" name="annualRent" value={form.annualRent} onChange={handleChange} type="number" placeholder="Rp" required /><Field label="Kontrak bulanan / tahunan" name="contractType" value={form.contractType} onChange={handleChange} options={['Bulanan', 'Tahunan', 'Fleksibel']} /><Field label="Periode kontrak (tahun)" name="contractPeriod" value={form.contractPeriod} onChange={handleChange} type="number" placeholder="0" /><Field label="Min Periode kontrak (tahun)" name="minContractPeriod" value={form.minContractPeriod} onChange={handleChange} type="number" placeholder="0" /><Field label="Maks Periode kontrak (tahun)" name="maxContractPeriod" value={form.maxContractPeriod} onChange={handleChange} options={maxContractPeriodOptions} /><Field label="Sudah include PPN?" name="vatIncluded" value={form.vatIncluded} onChange={handleChange} options={['Sudah', 'Belum', 'Belum diketahui']} /></div></section>
        <section className="form-section" id="facility"><div className="section-title"><span>03</span><div><p className="kicker">On-site readiness</p><h2>Fasilitas</h2><p>Utilitas, parkir, dan akses kendaraan.</p></div></div><div className="field-grid"><Field label="Daya listrik terpasang (kWh)" name="electricity" value={form.electricity} onChange={handleChange} type="number" placeholder="0" /><Field label="Sumber air" name="waterSource" value={form.waterSource} onChange={handleChange} options={['PDAM', 'Non PDAM', 'PDAM dan Non PDAM', 'Belum diketahui']} /><Field label="Ketersediaan lahan parkir" name="parkingLand" value={form.parkingLand} onChange={handleChange} options={['Tersedia', 'Tidak tersedia', 'Terbatas']} /><Field label="Parkir motor / mobil" name="parkingVehicle" value={form.parkingVehicle} onChange={handleChange} options={['Motor dan mobil', 'Motor saja', 'Mobil saja', 'Tidak tersedia']} /><Field label="Parkir kendaraan berlangganan?" name="parkingSubscription" value={form.parkingSubscription} onChange={handleChange} options={['Ya', 'Tidak', 'Belum diketahui']} /></div></section>
        <section className="form-section" id="location"><div className="section-title"><span>04</span><div><p className="kicker">Context & access</p><h2>Lokasi & lingkungan</h2><p>Gambaran area dan jarak ke titik penting.</p></div></div><div className="field-grid"><Field label="Bangunan berada di area" name="buildingAreaType" value={form.buildingAreaType} onChange={handleChange} options={['BISNIS', 'RUKO', 'KANTOR', 'PEMUKIMAN']} /><Field label="Akses jalan" name="roadAccess" value={form.roadAccess} onChange={handleChange} options={['NASIONAL', 'PROPINSI', 'DAERAH']} /><Field label="Lingkungan" name="environment" value={form.environment} onChange={handleChange} options={['DALAM CLUSTER', 'TERBUKA']} /><Field label="Situasi kondisi sekitar" name="surroundings" value={form.surroundings} onChange={handleChange} type="textarea" placeholder="Ramai, tenang, rawan banjir, dll." /><Field label="Jarak dari titik yang disuggest tim AI" name="aiPointDistance" value={form.aiPointDistance} onChange={handleChange} placeholder="Contoh: 1.2 km" /><Field label="Operator Terdekat" name="operatorNearest" value={form.operatorNearest} onChange={handleChange} placeholder="Nama operator" /><Field label="Jarak dengan operator terdekat" name="operatorDistance" value={form.operatorDistance} onChange={handleChange} placeholder="Contoh: 800 m" /><Field label="Nama bank terdekat" name="nearestBank" value={form.nearestBank} onChange={handleChange} placeholder="Contoh: BCA" /><Field label="Jarak dengan bank terdekat" name="bankDistance" value={form.bankDistance} onChange={handleChange} placeholder="Contoh: 500 m" /><Field label="Pusat Kota Terdekat" name="cityCenterNearest" value={form.cityCenterNearest} onChange={handleChange} options={['ALUN - ALUN', 'CFD KOTA', 'TUGU KOTA', 'KANTOR WALIKOTA', 'KANTOR BUPATI']} /><Field label="Jarak dengan pusat kota terdekat" name="cityDistance" value={form.cityDistance} onChange={handleChange} placeholder="Contoh: 4 km" /></div></section>
        <section className="form-section" id="other"><div className="section-title"><span>05</span><div><p className="kicker">Finishing & inventory</p><h2>Lain-lain</h2><p>Renovasi dan inventaris yang sudah tersedia.</p></div></div><div className="field-grid"><Field label="Perlu renovasi?" name="needsRenovation" value={form.needsRenovation} onChange={handleChange} options={['Tidak', 'Ya', 'Belum diketahui']} />{form.needsRenovation === 'Ya' ? <Field label="Jenis renovasi" name="renovationType" value={form.renovationType} onChange={handleChange} type="textarea" placeholder="Jelaskan kebutuhan renovasi" /> : null}<Field label="Pemilik bersedia mencat dinding dalam" name="paintInside" value={form.paintInside} onChange={handleChange} options={['Ya', 'Tidak', 'Tidak diketahui']} /><Field label="Pemilik bersedia mencat dinding luar" name="paintOutside" value={form.paintOutside} onChange={handleChange} options={['Ya', 'Tidak', 'Tidak diketahui']} /><Field label="Pemilik bersedia general cleaning" name="generalCleaning" value={form.generalCleaning} onChange={handleChange} options={['Ya', 'Tidak', 'Tidak diketahui']} /><Field label="Pemilik bersedia mengganti keramik sesuai standard XLC" name="replaceTiles" value={form.replaceTiles} onChange={handleChange} options={['Ya', 'Tidak', 'Tidak diketahui']} /></div><div className="inventory-heading"><p className="kicker">Jika sudah tersedia di gedung yang dipropose</p><h3>Inventaris gedung</h3></div><div className="field-grid inventory-grid"><Field label="Jumlah AC" name="ac" value={form.ac} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah kipas angin" name="fans" value={form.fans} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah infocus monitor" name="infocus" value={form.infocus} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah TV" name="tv" value={form.tv} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah dispenser" name="dispenser" value={form.dispenser} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah papan tulis" name="whiteboard" value={form.whiteboard} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah meja" name="tables" value={form.tables} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah kursi" name="chairs" value={form.chairs} onChange={handleChange} type="number" placeholder="0" /><Field label="Jumlah galon" name="gallons" value={form.gallons} onChange={handleChange} type="number" placeholder="0" /></div></section>
        <div className="preview-menu"><button type="button" className="preview-button" onClick={() => setShowPreview((current) => !current)}>{showPreview ? 'Tutup Preview' : 'Preview Data'}</button></div>
        {showPreview ? <section className="preview-panel" aria-label="Preview data"><div className="preview-heading"><div><p className="kicker">Review sebelum simpan</p><h3>Preview Data</h3></div><span>{form.buildingName || 'Nama belum diisi'}</span></div><div className="preview-grid"><div><small>Alamat</small><strong>{form.address || '-'}</strong></div><div><small>Area</small><strong>{form.buildingAreaType || '-'}</strong></div><div><small>Harga sewa</small><strong>{form.rentPrice || '-'}</strong></div><div><small>Kontrak</small><strong>{form.contractType || '-'} / {form.contractPeriod || '-'} tahun</strong></div><div><small>Lingkungan</small><strong>{form.environment || '-'}</strong></div><div><small>Foto terunggah</small><strong>{Object.values(photos).filter(Boolean).length} / 3</strong></div></div></section> : null}
        <div className="form-actions"><button type="button" className="text-button" onClick={clearForm}>Hapus isian</button><button type="submit" className="submit-button">Simpan Data <span>→</span></button></div>
      </form>
      <footer className="app-footer"><span>PROJECTXLC</span><span>{lastSaved ? `Terakhir disimpan ${new Date(lastSaved).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Draft belum disimpan'}</span></footer>
    </main>
  )
}

export default App
