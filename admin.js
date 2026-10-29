/**
 * SUKHAKARTA BRICKS - PRODUCTION & WORKER TRACKING DASHBOARD ENGINE
 * Manages daily brick manufacturing counts, worker logs, piece-rates, and WhatsApp dispatch reports
 */

// ==========================================
// WORKERS ROSTER (EMPTY INITIAL STATE)
// ==========================================
const DEFAULT_WORKERS = [];

// Today's date helper string YYYY-MM-DD
function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Default Production Logs (Empty initial state)
function generateDefaultLogs() {
  return [];
}

// ==========================================
// STATE MANAGEMENT & STORAGE (DEMO DATA PURGED)
// ==========================================
const DEMO_PURGE_VERSION = 'sukhakarta_demo_clean_v50';
if (!localStorage.getItem(DEMO_PURGE_VERSION)) {
  localStorage.removeItem('sukhakarta_workers');
  localStorage.removeItem('sukhakarta_production_logs');
  localStorage.removeItem('sukhakarta_worker_leaves');
  localStorage.removeItem('sukhakarta_delivery_logs');
  localStorage.removeItem('sukhakarta_transporters');
  localStorage.removeItem('sukhakarta_inquiries');
  localStorage.removeItem('sukhakarta_raw_materials');
  localStorage.removeItem('sukhakarta_raw_travelers_workers');
  localStorage.removeItem('sukhakarta_raw_travelers_logs');
  localStorage.setItem(DEMO_PURGE_VERSION, 'true');
}

function enrichWorkerProfile(w) {
  if (!w || !w.id) return null;
  return {
    id: String(w.id),
    name: w.name || '',
    role: w.role || 'Hand Molder',
    workerType: w.workerType || 'Brick Manufacturing Worker (विट बनवणारा कामगार)',
    phone: w.phone || '',
    address: w.address || '',
    status: w.status || 'Active',
    joinDate: w.joinDate || getTodayDateStr(),
    ratePer1000: Number(w.ratePer1000) || 1000,
    dailyTarget: Number(w.dailyTarget) || 1500,
    dailyLimit: Number(w.dailyTarget || w.dailyLimit) || 1500,
    notes: w.notes || '',
    emergencyContact: w.emergencyContact || w.phone || ''
  };
}

let workers = (JSON.parse(localStorage.getItem('sukhakarta_workers')) || []).map(enrichWorkerProfile).filter(Boolean);
let productionLogs = JSON.parse(localStorage.getItem('sukhakarta_production_logs')) || [];
let workerLeaves = JSON.parse(localStorage.getItem('sukhakarta_worker_leaves')) || [];
let deliveryLogs = JSON.parse(localStorage.getItem('sukhakarta_delivery_logs')) || [];
let storedTransporters = (JSON.parse(localStorage.getItem('sukhakarta_transporters')) || []).map((t, idx) => ({
  id: t.id || ('TRP-' + (Date.now() - idx * 1000) + '-' + Math.random().toString(36).substr(2, 5)),
  name: t.name || '',
  vehicleType: t.vehicleType || 'Trolley',
  vehicleNo: t.vehicleNo || '',
  phone: t.phone || ''
}));
let websiteInquiries = JSON.parse(localStorage.getItem('sukhakarta_inquiries')) || [];
let rawMaterials = JSON.parse(localStorage.getItem('sukhakarta_raw_materials')) || [];
// Clean initialization for Raw Brick Travelers (No hardcoded demo seed)
let rawTravelersWorkers = JSON.parse(localStorage.getItem('sukhakarta_raw_travelers_workers')) || [];
let rawTravelersLogs = JSON.parse(localStorage.getItem('sukhakarta_raw_travelers_logs')) || [];

// One-time automatic purge of legacy demo records if still present in storage
const DEMO_CLEANUP_VERSION = 'sukhakarta_demo_purged_final_v16';
if (!localStorage.getItem(DEMO_CLEANUP_VERSION)) {
  const demoRTWIds = ['RTW-101', 'RTW-102', 'RTW-103', 'RTW-104'];
  const demoRTLLogIds = ['RTL-LOG-001', 'RTL-LOG-002', 'RTL-LOG-003', 'RTL-LOG-004'];

  rawTravelersWorkers = (rawTravelersWorkers || []).filter(w => !demoRTWIds.includes(w.id));
  rawTravelersLogs = (rawTravelersLogs || []).filter(l => !demoRTLLogIds.includes(l.id));

  localStorage.setItem('sukhakarta_raw_travelers_workers', JSON.stringify(rawTravelersWorkers));
  localStorage.setItem('sukhakarta_raw_travelers_logs', JSON.stringify(rawTravelersLogs));
  localStorage.setItem(DEMO_CLEANUP_VERSION, 'true');
}

let selectedDate = getTodayDateStr();
let activeTableView = 'directory'; // 'directory' or 'logs'

function saveToLocalStorage() {
  localStorage.setItem('sukhakarta_workers', JSON.stringify(workers));
  localStorage.setItem('sukhakarta_production_logs', JSON.stringify(productionLogs));
  localStorage.setItem('sukhakarta_worker_leaves', JSON.stringify(workerLeaves));
  localStorage.setItem('sukhakarta_delivery_logs', JSON.stringify(deliveryLogs));
  localStorage.setItem('sukhakarta_transporters', JSON.stringify(storedTransporters));
  localStorage.setItem('sukhakarta_inquiries', JSON.stringify(websiteInquiries));
  localStorage.setItem('sukhakarta_raw_materials', JSON.stringify(rawMaterials));
  localStorage.setItem('sukhakarta_raw_travelers_workers', JSON.stringify(rawTravelersWorkers));
  localStorage.setItem('sukhakarta_raw_travelers_logs', JSON.stringify(rawTravelersLogs));

  // Sync state to Google Cloud Firestore
  if (typeof queueCloudSync === 'function') {
    queueCloudSync();
  }
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
const ADMIN_PASSWORD = 'jeevan@1234';
const AUTH_STORAGE_KEY = 'sukhakarta_admin_authenticated';

function initAdminAuth() {
  const loginView = document.getElementById('admin-login-view');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password-input');
  const toggleBtn = document.getElementById('btn-toggle-password');
  const errorBox = document.getElementById('login-error');
  const rememberCheckbox = document.getElementById('remember-me-checkbox');
  const logoutBtn = document.getElementById('btn-admin-logout');

  // Check if session is already active
  const isAuth = sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true' || localStorage.getItem(AUTH_STORAGE_KEY) === 'true';

  if (isAuth) {
    showDashboard();
  } else {
    showLogin();
  }

  function showDashboard() {
    if (loginView) loginView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');
    refreshDashboard();
  }

  function showLogin() {
    if (loginView) loginView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (passwordInput) {
      passwordInput.value = '';
      setTimeout(() => passwordInput.focus(), 100);
    }
  }

  // Handle Login submission
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPwd = passwordInput ? passwordInput.value : '';

      if (enteredPwd === ADMIN_PASSWORD) {
        if (errorBox) errorBox.classList.remove('visible');
        
        if (rememberCheckbox && rememberCheckbox.checked) {
          localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        } else {
          sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
        }

        showDashboard();
        showAdminToast('🔓 Logged in successfully. Welcome, Kiln Manager!');
      } else {
        if (errorBox) {
          errorBox.classList.add('visible');
          errorBox.textContent = '❌ Incorrect password. Please try again.';
        }
        if (passwordInput) {
          passwordInput.value = '';
          passwordInput.focus();
        }
      }
    });
  }

  // Toggle Password Visibility
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = passwordInput.type === 'password';
      passwordInput.type = isPwd ? 'text' : 'password';
      toggleBtn.innerHTML = isPwd
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
  }

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Sign out of Kiln Admin Portal?')) {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        showLogin();
        showAdminToast('🔒 Signed out successfully.');
      }
    });
  }
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initAdminAuth();
  initAdminLanguage();
  if (window.initAdminTheme) window.initAdminTheme();

  const dateInput = document.getElementById('filter-date');
  if (dateInput) {
    dateInput.value = selectedDate;
    dateInput.addEventListener('change', (e) => {
      selectedDate = e.target.value;
      const logDate = document.getElementById('log-date');
      if (logDate) logDate.value = selectedDate;
      const delDate = document.getElementById('delivery-date-input');
      if (delDate) delDate.value = selectedDate;
      refreshDashboard();
    });
  }

  initWorkerSelect();
  initLogForm();
  initSearch();
  initModals();
  initDeliveryModule();
  initWebsiteSettingsForm();
  initRawMaterialsModule();
  initRawTravelersModule();

  const viewSelect = document.getElementById('table-view-select');
  if (viewSelect) {
    viewSelect.value = activeTableView;
  }

  // Initialize page routing from URL hash
  const initialHash = (location.hash || '').replace('#', '').trim();
  const validPages = ['overview', 'record', 'chart', 'workers', 'logs', 'deliveries', 'raw-travelers', 'raw-materials', 'inquiries', 'website-data', 'all'];
  const startPage = validPages.includes(initialHash) ? initialHash : 'overview';
  switchAdminPage(startPage, null);

  window.addEventListener('hashchange', () => {
    const newHash = (location.hash || '').replace('#', '').trim();
    if (validPages.includes(newHash) && newHash !== currentAdminPage) {
      switchAdminPage(newHash, null);
    }
  });

  if (typeof applyLanguage === 'function') {
    applyLanguage(typeof currentLang !== 'undefined' ? currentLang : 'en');
  }

  // Connect & sync with Google Cloud Firestore
  initFirestoreSync();
});

function initAdminLanguage() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lang = e.currentTarget.dataset.lang;
      if (lang && typeof applyLanguage === 'function') {
        applyLanguage(lang);
        if (typeof updatePageHeader === 'function' && typeof currentAdminPage !== 'undefined') {
          updatePageHeader(currentAdminPage);
        }
        showAdminToast(lang === 'mr' ? '🌐 भाषा बदलली: मराठी' : '🌐 Language switched: English');
        refreshDashboard();
      }
    });
  });
}

// ==========================================
// FIREBASE CLOUD FIRESTORE REAL-TIME SYNC
// ==========================================
let isInitialCloudLoadComplete = false;
let cloudSyncDebounceTimer = null;

function updateCloudSyncBadge(state, text) {
  const badge = document.getElementById('firestore-sync-badge');
  const label = document.getElementById('sync-status-label');
  if (!badge) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const dict = typeof TRANSLATIONS !== 'undefined' ? (isMarathi ? TRANSLATIONS.mr : TRANSLATIONS.en) : null;

  badge.classList.remove('syncing', 'offline');
  if (state === 'syncing') {
    badge.classList.add('syncing');
    if (label) label.textContent = text || (dict?.admin_cloud_syncing || (isMarathi ? 'क्लाउडवर सेव्ह होत आहे 🔄' : 'Saving to Cloud 🔄'));
  } else if (state === 'offline' || state === 'error') {
    badge.classList.add('offline');
    if (label) label.textContent = text || (dict?.admin_cloud_offline || (isMarathi ? 'ऑफलाईन कॅशे' : 'Offline (Local)'));
  } else {
    // Synced
    if (label) label.textContent = text || (dict?.admin_cloud_synced || (isMarathi ? 'लाईव्ह सिंक 🟢' : 'Live Synced 🟢'));
  }
}

window.checkCloudSyncStatus = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const ready = typeof isFirebaseReady !== 'undefined' && isFirebaseReady;
  
  if (!ready) {
    alert(isMarathi
      ? '⚠️ क्लाउड डेटाबेसशी थेट संपर्क होत नाही. तुमचा सर्व डेटा स्थानिक कॅशेमध्ये सुरक्षित आहे.'
      : '⚠️ Cloud database is currently unreachable. Your records are safely saved in local offline cache.');
    return;
  }

  const statusMsg = isMarathi 
    ? `☁️ गुगल क्लाउड डेटाबेस (Firestore) कनेक्टेड आहे!\n\n• डेटाबेस: sukhakarta-bricks\n• कामगार: ${workers.length}\n• उत्पादन नोंदी: ${productionLogs.length}\n• विट डिलिव्हरी (Dispatches): ${deliveryLogs.length}\n• ट्रान्सपोर्टर्स (Transporters): ${storedTransporters.length}\n• माती व कोळसा आवक (Soil & Coal Inward): ${rawMaterials.length}\n• कच्ची विट वाहतूक कामगार: ${rawTravelersWorkers.length}\n• कच्ची विट आवक नोंदी: ${rawTravelersLogs.length}\n• सुट्ट्या: ${workerLeaves.length}\n• वेबसाइट चौकशी: ${websiteInquiries.length}\n\nसर्व स्थानिक नोंदी क्लाउडवर फोर्स सिंक (Upload) करायच्या का?`
    : `☁️ Google Cloud Firestore is CONNECTED!\n\n• Database: sukhakarta-bricks\n• Workers: ${workers.length}\n• Production Logs: ${productionLogs.length}\n• Brick Deliveries: ${deliveryLogs.length}\n• Transporters: ${storedTransporters.length}\n• Soil & Coal Inward Deliveries: ${rawMaterials.length}\n• Raw Brick Travelers: ${rawTravelersWorkers.length}\n• Kiln Inward Logs: ${rawTravelersLogs.length}\n• Leaves: ${workerLeaves.length}\n• Website Inquiries: ${websiteInquiries.length}\n\nForce upload/re-sync all local records to Cloud Firestore now?`;

  if (confirm(statusMsg)) {
    forceCloudSync();
  }
};

// ==========================================
// WORKER CLOUD ENRICHMENT & SYNC ENGINE
// ==========================================
window.buildFirestoreWorkerDoc = function(w) {
  if (!w) return {};
  const workerLogs = (productionLogs || []).filter(l => l.workerId === w.id);
  const totalNet = workerLogs.reduce((acc, l) => acc + (Number(l.netCount) || 0), 0);
  const totalGross = workerLogs.reduce((acc, l) => acc + (Number(l.grossCount) || 0), 0);
  const totalRejected = workerLogs.reduce((acc, l) => acc + (Number(l.rejected) || 0), 0);
  const totalWages = workerLogs.reduce((acc, l) => acc + (Number(l.wage) || 0), 0);
  const workingDays = new Set(workerLogs.map(l => l.date)).size;

  const wLeaves = (workerLeaves || []).filter(lv => lv.workerId === w.id);
  const totalLeaves = wLeaves.length;

  const curDate = (typeof selectedDate !== 'undefined' && selectedDate) ? selectedDate : getTodayDateStr();
  const todayLogs = workerLogs.filter(l => l.date === curDate);
  const todayNet = todayLogs.reduce((acc, l) => acc + (Number(l.netCount) || 0), 0);
  const todayGross = todayLogs.reduce((acc, l) => acc + (Number(l.grossCount) || 0), 0);
  const todayWages = todayLogs.reduce((acc, l) => acc + (Number(l.wage) || 0), 0);
  const isOnLeaveToday = wLeaves.some(lv => lv.date === curDate);

  let todayStatus = 'Pending (नोंद नाही)';
  if (isOnLeaveToday) {
    todayStatus = 'On Leave (सुट्टीवर)';
  } else if (todayNet > 0) {
    todayStatus = `Present (${todayNet.toLocaleString('en-IN')} विटा)`;
  }

  let lastActiveDate = null;
  if (workerLogs.length > 0) {
    const dates = workerLogs.map(l => l.date).filter(Boolean).sort().reverse();
    lastActiveDate = dates[0] || null;
  }

  return {
    id: String(w.id),
    name: w.name || '',
    role: w.role || 'Hand Molder',
    workerType: 'Brick Manufacturing Worker (विट बनवणारा कामगार)',
    phone: w.phone || '9823456710',
    address: w.address || 'Chikhali / Kolhapur, Maharashtra',
    status: w.status || (isOnLeaveToday ? 'On Leave' : 'Active'),
    joinDate: w.joinDate || '2026-10-01',
    ratePer1000: Number(w.ratePer1000) || 1000,
    dailyTarget: Number(w.dailyTarget) || 1500,
    dailyLimit: Number(w.dailyTarget || w.dailyLimit) || 1500,
    notes: w.notes || 'Hand Molder Specialist (उत्कृष्ट हात साचा कामगार)',
    emergencyContact: w.emergencyContact || w.phone || '9823456710',
    // Live calculated production & attendance statistics for Firebase
    totalManufacturedBricks: totalNet,
    totalGrossBricks: totalGross,
    totalBreakage: totalRejected,
    totalWagesEarned: Math.round(totalWages),
    totalWorkingDays: workingDays,
    totalLeavesTaken: totalLeaves,
    todayProduction: todayNet,
    todayGrossBricks: todayGross,
    todayWages: Math.round(todayWages),
    todayStatus: todayStatus,
    targetAchievementRate: w.dailyTarget ? `${Math.round((todayNet / w.dailyTarget) * 100)}%` : '0%',
    lastActiveDate: lastActiveDate || curDate,
    lastUpdatedDate: getTodayDateStr(),
    lastUpdated: new Date().toISOString()
  };
};

window.syncWorkerToCloud = function(worker) {
  if (!worker || typeof fbSaveDoc !== 'function' || typeof FB_COLLECTIONS === 'undefined') return;
  const fullDoc = buildFirestoreWorkerDoc(worker);
  return fbSaveDoc(FB_COLLECTIONS.WORKERS, worker.id, fullDoc);
};

window.syncAllWorkersToCloud = function() {
  if (!Array.isArray(workers) || workers.length === 0 || typeof fbSaveDoc !== 'function' || typeof FB_COLLECTIONS === 'undefined') return;
  workers.forEach(w => {
    syncWorkerToCloud(w);
  });
};

window.buildFirestoreTravelerDoc = function(tw) {
  if (!tw) return {};
  const twLogs = (rawTravelersLogs || []).filter(l => l.workerId === tw.id);
  const totalTrips = twLogs.length;
  const totalBricks = twLogs.reduce((acc, l) => acc + (Number(l.brickCount) || 0), 0);
  const totalEarnings = twLogs.reduce((acc, l) => acc + (Number(l.tripEarnings) || 0), 0);

  const curDate = (typeof selectedDate !== 'undefined' && selectedDate) ? selectedDate : getTodayDateStr();
  const todayLogs = twLogs.filter(l => l.date === curDate);
  const todayTrips = todayLogs.length;
  const todayBricks = todayLogs.reduce((acc, l) => acc + (Number(l.brickCount) || 0), 0);
  const todayEarnings = todayLogs.reduce((acc, l) => acc + (Number(l.tripEarnings) || 0), 0);

  let lastActiveDate = null;
  if (twLogs.length > 0) {
    const dates = twLogs.map(l => l.date).filter(Boolean).sort().reverse();
    lastActiveDate = dates[0] || null;
  }

  return {
    ...tw,
    workerType: 'Raw Brick Traveler Worker (कच्ची विट वाहतूक कामगार)',
    totalTrips: totalTrips,
    totalBricksTransported: totalBricks,
    totalEarnings: Math.round(totalEarnings),
    todayTrips: todayTrips,
    todayBricksTransported: todayBricks,
    todayEarnings: Math.round(todayEarnings),
    lastActiveDate: lastActiveDate || curDate,
    lastUpdated: new Date().toISOString()
  };
};

// ==========================================
// BRICK DELIVERIES & TRANSPORTER CLOUD ENRICHMENT ENGINE
// ==========================================
window.buildFirestoreTransporterDoc = function(t) {
  if (!t) return {};
  const tId = String(t.id || ('TRP-' + Date.now()));
  const tName = t.name || 'Transporter';
  const vNo = t.vehicleNo || '';
  const vType = t.vehicleType || 'Tractor Trolley';

  // Match deliveries for this transporter
  const matchingDeliveries = (deliveryLogs || []).filter(d => {
    const nameMatch = (d.transporterName || '').toLowerCase().trim() === tName.toLowerCase().trim();
    const vMatch = !vNo || d.vehicleNo === vNo || d.vehicleNo === '--';
    return nameMatch && (vMatch || !d.vehicleNo);
  });

  const totalDeliveries = matchingDeliveries.length;
  const totalBricksDelivered = matchingDeliveries.reduce((acc, d) => acc + (Number(d.brickCount) || 0), 0);

  const curDate = (typeof selectedDate !== 'undefined' && selectedDate) ? selectedDate : getTodayDateStr();
  const todayDeliveries = matchingDeliveries.filter(d => d.date === curDate);
  const todayTrips = todayDeliveries.length;
  const todayBricks = todayDeliveries.reduce((acc, d) => acc + (Number(d.brickCount) || 0), 0);

  const customerList = Array.from(new Set(matchingDeliveries.map(d => d.customerName).filter(Boolean)));
  const dates = matchingDeliveries.map(d => d.date).filter(Boolean).sort().reverse();
  const lastDeliveryDate = dates[0] || null;

  return {
    id: tId,
    name: tName,
    transporterType: 'Fired Brick Transport & Logistics (पक्क्या विटा वाहतूकदार)',
    vehicleType: vType,
    vehicleNo: vNo || '--',
    phone: t.phone || '--',
    status: 'Active',
    totalDeliveries: totalDeliveries,
    totalBricksDelivered: totalBricksDelivered,
    todayDeliveries: todayTrips,
    todayBricksDelivered: todayBricks,
    recentCustomers: customerList.slice(0, 5),
    lastDeliveryDate: lastDeliveryDate || curDate,
    lastUpdatedDate: getTodayDateStr(),
    lastUpdated: new Date().toISOString()
  };
};

window.buildFirestoreDeliveryDoc = function(d) {
  if (!d) return {};
  const dId = String(d.id || ('DEL-' + Date.now()));
  const dateStr = d.date || getTodayDateStr();
  const timeStr = d.time || (d.timestamp ? new Date(d.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '');

  return {
    id: dId,
    date: dateStr,
    time: timeStr,
    customerName: d.customerName || 'Direct Customer (थेट ग्राहक)',
    destination: d.customerName || 'Construction Site (बांधकाम साईट)',
    transporterName: d.transporterName || 'Transporter',
    vehicleType: d.vehicleType || 'Tractor Trolley',
    vehicleNo: d.vehicleNo || '--',
    phone: d.phone || '--',
    brickCount: Number(d.brickCount) || 0,
    brickType: 'Red Clay Fired Bricks (लाल पक्क्या विटा)',
    status: 'Delivered / Dispatched (पोहोचवले)',
    estimatedTrips: 1,
    timestamp: d.timestamp || new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
};

window.syncDeliveryToCloud = function(delivery) {
  if (!delivery || typeof fbSaveDoc !== 'function' || typeof FB_COLLECTIONS === 'undefined') return;
  const fullDoc = buildFirestoreDeliveryDoc(delivery);
  return fbSaveDoc(FB_COLLECTIONS.DELIVERY_LOGS, delivery.id, fullDoc);
};

window.syncTransporterToCloud = function(transporter) {
  if (!transporter || typeof fbSaveDoc !== 'function' || typeof FB_COLLECTIONS === 'undefined') return;
  const fullDoc = buildFirestoreTransporterDoc(transporter);
  return fbSaveDoc(FB_COLLECTIONS.TRANSPORTERS, transporter.id, fullDoc);
};

window.syncAllDeliveriesToCloud = function() {
  if (!Array.isArray(deliveryLogs) || deliveryLogs.length === 0 || typeof fbSaveDoc !== 'function' || typeof FB_COLLECTIONS === 'undefined') return;
  deliveryLogs.forEach(d => {
    syncDeliveryToCloud(d);
  });
};

window.syncAllTransportersToCloud = function() {
  if (!Array.isArray(storedTransporters) || storedTransporters.length === 0 || typeof fbSaveDoc !== 'function' || typeof FB_COLLECTIONS === 'undefined') return;
  storedTransporters.forEach(t => {
    syncTransporterToCloud(t);
  });
};

window.buildFirestoreRawMaterialDoc = function(item) {
  if (!item) return {};
  const rId = String(item.id || ('RAW-' + Date.now()));
  const dateStr = item.date || getTodayDateStr();
  const matType = item.materialType || 'Soil';
  const trucks = Math.max(1, Number(item.trucksCount) || 1);
  const totalVal = Math.max(0, Number(item.totalValue) || 0);
  const paidVal = Math.max(0, Number(item.amountPaid) || 0);
  const remVal = Math.max(0, totalVal - paidVal);

  const isSoil = matType === 'Soil';
  const matLabel = isSoil 
    ? '🚜 Red Brick Manufacturing Soil (लाल विट माती)' 
    : '⛏️ High-Calorie Kiln Firing Coal (दगडी कोळसा)';

  let statusKey = 'unpaid';
  let statusText = 'Unpaid (बाकी ❌)';
  if (remVal <= 0 || paidVal >= totalVal) {
    statusKey = 'paid';
    statusText = 'Fully Paid (पूर्ण भरले ✅)';
  } else if (paidVal > 0) {
    statusKey = 'partial';
    statusText = 'Partial Due (शिल्लक बाकी ⚠️)';
  }

  return {
    id: rId,
    date: dateStr,
    materialType: matType, // 'Soil' or 'Coal'
    materialLabel: matLabel,
    category: 'Raw Material Inward (कच्चा माल आवक)',
    trucksCount: trucks,
    vehicleNo: item.vehicleNo || '--',
    importerName: item.importerName || 'Supplier / Importer',
    importerPhone: item.importerPhone || '--',
    totalValue: totalVal,
    amountPaid: paidVal,
    remainingAmount: remVal,
    paymentStatus: statusKey,
    paymentStatusLabel: statusText,
    notes: item.notes || '--',
    createdAt: item.createdAt || new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
};

window.syncRawMaterialToCloud = function(item) {
  if (!item || typeof fbSaveDoc !== 'function' || typeof FB_COLLECTIONS === 'undefined') return;
  const fullDoc = buildFirestoreRawMaterialDoc(item);
  return fbSaveDoc(FB_COLLECTIONS.RAW_MATERIALS, item.id, fullDoc);
};

window.syncAllRawMaterialsToCloud = function() {
  if (!Array.isArray(rawMaterials) || rawMaterials.length === 0 || typeof fbSaveDoc !== 'function' || typeof FB_COLLECTIONS === 'undefined') return;
  rawMaterials.forEach(item => {
    syncRawMaterialToCloud(item);
  });
};

window.forceCloudSync = async function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  updateCloudSyncBadge('syncing', isMarathi ? 'सिंक होत आहे...' : 'Syncing...');
  showAdminToast(isMarathi ? '☁️ क्लाउड डेटा सिंक सुरू आहे...' : '☁️ Synchronizing with Cloud Firestore...');
  
  if (typeof fbSyncAllToCloud === 'function') {
    const success = await fbSyncAllToCloud({
      workers: (workers || []).map(w => buildFirestoreWorkerDoc(w)),
      productionLogs,
      workerLeaves,
      deliveryLogs: (deliveryLogs || []).map(d => buildFirestoreDeliveryDoc(d)),
      storedTransporters: (storedTransporters || []).map(t => buildFirestoreTransporterDoc(t)),
      websiteInquiries,
      rawMaterials: (rawMaterials || []).map(m => buildFirestoreRawMaterialDoc(m)),
      rawTravelersWorkers: (rawTravelersWorkers || []).map(tw => buildFirestoreTravelerDoc(tw)),
      rawTravelersLogs
    });
    if (success) {
      updateCloudSyncBadge('synced', isMarathi ? 'क्लाउड कनेक्टेड' : 'Cloud Synced');
      showAdminToast(isMarathi ? '✅ सर्व कामगार, डिलिव्हरी, कच्चा माल व उत्पादन डेटा क्लाउडवर सुरक्षित सेव्ह झाला!' : '✅ All worker, delivery, raw material & production records safely synced to Cloud Firestore!');
    } else {
      updateCloudSyncBadge('offline');
      showAdminToast('⚠️ Sync error, saved in local cache.');
    }
  }
};

window.pullAllFromCloud = async function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  updateCloudSyncBadge('syncing', isMarathi ? 'डाउनलोड होत आहे...' : 'Pulling from Cloud...');
  showAdminToast(isMarathi ? '📥 क्लाउडवरून डेटा आणत आहे...' : '📥 Pulling latest data from Cloud Firestore...');
  try {
    const [remoteWorkers, remoteLogs, remoteLeaves, remoteDeliveries, remoteTransporters, remoteInquiries, remoteRawMaterials, remoteTravelersWorkers, remoteTravelersLogs] = await Promise.all([
      fbFetchCollection(FB_COLLECTIONS.WORKERS),
      fbFetchCollection(FB_COLLECTIONS.PRODUCTION_LOGS),
      fbFetchCollection(FB_COLLECTIONS.WORKER_LEAVES),
      fbFetchCollection(FB_COLLECTIONS.DELIVERY_LOGS),
      fbFetchCollection(FB_COLLECTIONS.TRANSPORTERS),
      fbFetchCollection(FB_COLLECTIONS.INQUIRIES),
      fbFetchCollection(FB_COLLECTIONS.RAW_MATERIALS),
      fbFetchCollection(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS),
      fbFetchCollection(FB_COLLECTIONS.RAW_TRAVELERS_LOGS)
    ]);
    if (Array.isArray(remoteWorkers) && remoteWorkers.length > 0) workers = remoteWorkers.map(enrichWorkerProfile).filter(Boolean);
    if (Array.isArray(remoteLogs) && remoteLogs.length > 0) productionLogs = remoteLogs;
    if (Array.isArray(remoteLeaves) && remoteLeaves.length > 0) workerLeaves = remoteLeaves;
    if (Array.isArray(remoteDeliveries) && remoteDeliveries.length > 0) deliveryLogs = remoteDeliveries;
    if (Array.isArray(remoteTransporters) && remoteTransporters.length > 0) storedTransporters = remoteTransporters;
    if (Array.isArray(remoteInquiries) && remoteInquiries.length > 0) websiteInquiries = remoteInquiries;
    if (Array.isArray(remoteRawMaterials) && remoteRawMaterials.length > 0) rawMaterials = remoteRawMaterials;
    if (Array.isArray(remoteTravelersWorkers) && remoteTravelersWorkers.length > 0) {
      rawTravelersWorkers = remoteTravelersWorkers.filter(w => !['RTW-101', 'RTW-102', 'RTW-103', 'RTW-104'].includes(w.id));
    }
    if (Array.isArray(remoteTravelersLogs) && remoteTravelersLogs.length > 0) {
      rawTravelersLogs = remoteTravelersLogs.filter(l => !['RTL-LOG-001', 'RTL-LOG-002', 'RTL-LOG-003', 'RTL-LOG-004'].includes(l.id));
    }
    
    saveToLocalStorage();
    initWorkerSelect();
    refreshDashboard();
    if (typeof renderInquiriesTable === 'function') renderInquiriesTable();
    if (typeof renderRawMaterialsTable === 'function') renderRawMaterialsTable();
    if (typeof updateRawMaterialsKPIs === 'function') updateRawMaterialsKPIs();
    if (typeof updateRawTravelersKPIs === 'function') updateRawTravelersKPIs();
    if (typeof renderRawTravelersWorkers === 'function') renderRawTravelersWorkers();
    if (typeof renderRawTravelersLogsTable === 'function') renderRawTravelersLogsTable();
    updateCloudSyncBadge('synced', isMarathi ? 'क्लाउड कनेक्टेड' : 'Cloud Synced');
    showAdminToast(isMarathi ? '✅ क्लाउडवरून नवीन डेटा अपडेट झाला!' : '✅ Dashboard updated with latest Cloud data!');
  } catch (err) {
    console.error('Pull from cloud error:', err);
    updateCloudSyncBadge('offline');
    showAdminToast('⚠️ Could not pull from cloud.');
  }
};

function initFirestoreSync() {
  if (typeof onSyncStatusChange === 'function') {
    onSyncStatusChange((status, details) => {
      if (status === 'syncing') updateCloudSyncBadge('syncing');
      else if (status === 'synced') updateCloudSyncBadge('synced');
      else if (status === 'error') updateCloudSyncBadge('offline');
    });
  }

  if (typeof isFirebaseReady === 'undefined' || !isFirebaseReady || typeof fbFetchCollection !== 'function') {
    updateCloudSyncBadge('offline');
    console.info('Firebase Firestore not ready at boot, running in local cache mode.');
    return;
  }

  updateCloudSyncBadge('syncing');

  // Load latest records from Cloud Firestore
  Promise.all([
    fbFetchCollection(FB_COLLECTIONS.WORKERS),
    fbFetchCollection(FB_COLLECTIONS.PRODUCTION_LOGS),
    fbFetchCollection(FB_COLLECTIONS.WORKER_LEAVES),
    fbFetchCollection(FB_COLLECTIONS.DELIVERY_LOGS),
    fbFetchCollection(FB_COLLECTIONS.TRANSPORTERS),
    fbFetchCollection(FB_COLLECTIONS.INQUIRIES),
    fbFetchCollection(FB_COLLECTIONS.RAW_MATERIALS),
    fbFetchCollection(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS),
    fbFetchCollection(FB_COLLECTIONS.RAW_TRAVELERS_LOGS)
  ]).then(([remoteWorkers, remoteLogs, remoteLeaves, remoteDeliveries, remoteTransporters, remoteInquiries, remoteRawMaterials, remoteTravelersWorkers, remoteTravelersLogs]) => {
    // Delete legacy demo docs from Firestore if they were previously uploaded
    if (typeof fbDeleteDoc === 'function') {
      ['RTW-101', 'RTW-102', 'RTW-103', 'RTW-104'].forEach(id => fbDeleteDoc(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS, id));
      ['RTL-LOG-001', 'RTL-LOG-002', 'RTL-LOG-003', 'RTL-LOG-004'].forEach(id => fbDeleteDoc(FB_COLLECTIONS.RAW_TRAVELERS_LOGS, id));
    }

    // Remote Firestore is the single source of truth when connected with data
    if (Array.isArray(remoteWorkers) && remoteWorkers.length > 0) {
      workers = remoteWorkers.map(enrichWorkerProfile).filter(Boolean);
    } else if (workers && workers.length > 0) {
      syncAllWorkersToCloud();
    }

    if (Array.isArray(remoteLogs) && remoteLogs.length > 0) {
      productionLogs = remoteLogs;
    }

    if (Array.isArray(remoteLeaves) && remoteLeaves.length > 0) {
      workerLeaves = remoteLeaves;
    }

    if (Array.isArray(remoteDeliveries) && remoteDeliveries.length > 0) {
      deliveryLogs = remoteDeliveries;
    } else if (deliveryLogs && deliveryLogs.length > 0) {
      syncAllDeliveriesToCloud();
    }

    if (Array.isArray(remoteTransporters) && remoteTransporters.length > 0) {
      storedTransporters = remoteTransporters;
    } else if (storedTransporters && storedTransporters.length > 0) {
      syncAllTransportersToCloud();
    }

    if (Array.isArray(remoteInquiries) && remoteInquiries.length > 0) {
      websiteInquiries = remoteInquiries;
    }

    if (Array.isArray(remoteRawMaterials) && remoteRawMaterials.length > 0) {
      rawMaterials = remoteRawMaterials;
      if (typeof normalizeRawMaterialsData === 'function') normalizeRawMaterialsData();
    } else if (rawMaterials && rawMaterials.length > 0) {
      syncAllRawMaterialsToCloud();
    }

    if (Array.isArray(remoteTravelersWorkers) && remoteTravelersWorkers.length > 0) {
      rawTravelersWorkers = remoteTravelersWorkers.filter(w => !['RTW-101', 'RTW-102', 'RTW-103', 'RTW-104'].includes(w.id));
    }

    if (Array.isArray(remoteTravelersLogs) && remoteTravelersLogs.length > 0) {
      rawTravelersLogs = remoteTravelersLogs.filter(l => !['RTL-LOG-001', 'RTL-LOG-002', 'RTL-LOG-003', 'RTL-LOG-004'].includes(l.id));
    }

    // Persist unified state to local storage
    localStorage.setItem('sukhakarta_workers', JSON.stringify(workers));
    localStorage.setItem('sukhakarta_production_logs', JSON.stringify(productionLogs));
    localStorage.setItem('sukhakarta_worker_leaves', JSON.stringify(workerLeaves));
    localStorage.setItem('sukhakarta_delivery_logs', JSON.stringify(deliveryLogs));
    localStorage.setItem('sukhakarta_transporters', JSON.stringify(storedTransporters));
    localStorage.setItem('sukhakarta_inquiries', JSON.stringify(websiteInquiries));
    localStorage.setItem('sukhakarta_raw_materials', JSON.stringify(rawMaterials));
    localStorage.setItem('sukhakarta_raw_travelers_workers', JSON.stringify(rawTravelersWorkers));
    localStorage.setItem('sukhakarta_raw_travelers_logs', JSON.stringify(rawTravelersLogs));

    initWorkerSelect();
    refreshDashboard();
    if (typeof renderInquiriesTable === 'function') renderInquiriesTable();
    if (typeof renderRawMaterialsTable === 'function') renderRawMaterialsTable();
    if (typeof updateRawMaterialsKPIs === 'function') updateRawMaterialsKPIs();
    if (typeof updateRawTravelersKPIs === 'function') updateRawTravelersKPIs();
    if (typeof renderRawTravelersWorkers === 'function') renderRawTravelersWorkers();
    if (typeof renderRawTravelersLogsTable === 'function') renderRawTravelersLogsTable();
    updateCloudSyncBadge('synced');

    isInitialCloudLoadComplete = true;

    // Immediately upload enriched details for workers, deliveries, and transporters
    if (workers.length > 0) {
      syncAllWorkersToCloud();
    }
    if (deliveryLogs.length > 0) {
      syncAllDeliveriesToCloud();
    }
    if (storedTransporters.length > 0) {
      syncAllTransportersToCloud();
    }
    if (rawMaterials.length > 0) {
      syncAllRawMaterialsToCloud();
    }

    // Listen to real-time updates for changes from other devices or tabs
    setupRealtimeListeners();
  }).catch((err) => {
    console.warn('Initial Firestore fetch warning:', err);
    updateCloudSyncBadge('offline');
  });
}

function setupRealtimeListeners() {
  if (typeof fbSubscribeCollection !== 'function') return;

  fbSubscribeCollection(FB_COLLECTIONS.WORKERS, (items) => {
    if (!isInitialCloudLoadComplete || !items) return;
    workers = items.map(enrichWorkerProfile);
    localStorage.setItem('sukhakarta_workers', JSON.stringify(workers));
    initWorkerSelect();
    refreshDashboard();
  });

  fbSubscribeCollection(FB_COLLECTIONS.PRODUCTION_LOGS, (items) => {
    if (!isInitialCloudLoadComplete || !items) return;
    productionLogs = items;
    localStorage.setItem('sukhakarta_production_logs', JSON.stringify(productionLogs));
    refreshDashboard();
  });

  fbSubscribeCollection(FB_COLLECTIONS.WORKER_LEAVES, (items) => {
    if (!isInitialCloudLoadComplete || !items) return;
    workerLeaves = items;
    localStorage.setItem('sukhakarta_worker_leaves', JSON.stringify(workerLeaves));
    refreshDashboard();
  });

  fbSubscribeCollection(FB_COLLECTIONS.DELIVERY_LOGS, (items) => {
    if (!isInitialCloudLoadComplete || !items) return;
    deliveryLogs = items;
    localStorage.setItem('sukhakarta_delivery_logs', JSON.stringify(deliveryLogs));
    refreshDashboard();
  });

  fbSubscribeCollection(FB_COLLECTIONS.TRANSPORTERS, (items) => {
    if (!isInitialCloudLoadComplete || !items) return;
    storedTransporters = items;
    localStorage.setItem('sukhakarta_transporters', JSON.stringify(storedTransporters));
    renderTransporterChips();
  });

  fbSubscribeCollection(FB_COLLECTIONS.INQUIRIES, (items) => {
    websiteInquiries = items || [];
    renderInquiriesTable();
  });

  fbSubscribeCollection(FB_COLLECTIONS.RAW_MATERIALS, (items) => {
    if (!isInitialCloudLoadComplete || !items) return;
    rawMaterials = items;
    if (typeof normalizeRawMaterialsData === 'function') normalizeRawMaterialsData();
    localStorage.setItem('sukhakarta_raw_materials', JSON.stringify(rawMaterials));
    if (typeof renderRawMaterialsTable === 'function') renderRawMaterialsTable();
    if (typeof updateRawMaterialsKPIs === 'function') updateRawMaterialsKPIs();
  });

  fbSubscribeCollection(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS, (items) => {
    if (!isInitialCloudLoadComplete || !Array.isArray(items)) return;
    rawTravelersWorkers = items.filter(w => !['RTW-101', 'RTW-102', 'RTW-103', 'RTW-104'].includes(w.id));
    localStorage.setItem('sukhakarta_raw_travelers_workers', JSON.stringify(rawTravelersWorkers));
    if (typeof renderRawTravelersWorkers === 'function') renderRawTravelersWorkers();
    if (typeof updateRawTravelersKPIs === 'function') updateRawTravelersKPIs();
  });

  fbSubscribeCollection(FB_COLLECTIONS.RAW_TRAVELERS_LOGS, (items) => {
    if (!isInitialCloudLoadComplete || !Array.isArray(items)) return;
    rawTravelersLogs = items.filter(l => !['RTL-LOG-001', 'RTL-LOG-002', 'RTL-LOG-003', 'RTL-LOG-004'].includes(l.id));
    localStorage.setItem('sukhakarta_raw_travelers_logs', JSON.stringify(rawTravelersLogs));
    if (typeof updateRawTravelersKPIs === 'function') updateRawTravelersKPIs();
    if (typeof renderRawTravelersLogsTable === 'function') renderRawTravelersLogsTable();
  });
}

function queueCloudSync() {
  if (typeof isFirebaseReady === 'undefined' || !isFirebaseReady) return;
  if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
  updateCloudSyncBadge('syncing');
  cloudSyncDebounceTimer = setTimeout(() => {
    if (typeof fbSyncAllToCloud === 'function') {
      fbSyncAllToCloud({
        workers: (workers || []).map(w => buildFirestoreWorkerDoc(w)),
        productionLogs,
        workerLeaves,
        deliveryLogs: (deliveryLogs || []).map(d => buildFirestoreDeliveryDoc(d)),
        storedTransporters: (storedTransporters || []).map(t => buildFirestoreTransporterDoc(t)),
        websiteInquiries,
        rawMaterials: (rawMaterials || []).map(m => buildFirestoreRawMaterialDoc(m)),
        rawTravelersWorkers: (rawTravelersWorkers || []).map(tw => buildFirestoreTravelerDoc(tw)),
        rawTravelersLogs
      }).then(() => {
        updateCloudSyncBadge('synced');
      }).catch(() => {
        updateCloudSyncBadge('offline');
      });
    }
  }, 150);
}

// ==========================================
// WORKER SELECT DROPDOWN
// ==========================================
// ==========================================
// WORKER SELECT DROPDOWN
// ==========================================
function initWorkerSelect() {
  const select = document.getElementById('log-worker-select');
  if (!select) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const currentSelected = select.value;
  select.innerHTML = '';

  if (workers.length === 0) {
    select.innerHTML = `<option value="">${isMarathi ? '-- अद्याप कामगार जोडलेले नाहीत (+ नवीन जोडा) --' : '-- No Workers Added Yet (Click + Add New) --'}</option>`;
    select.disabled = false;
  } else {
    select.disabled = false;
    select.innerHTML = `<option value="">${isMarathi ? '-- कामगार निवडा --' : '-- Choose Worker --'}</option>`;
    workers.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} (${w.id}) — ₹${w.ratePer1000}/1000`;
      select.appendChild(opt);
    });

    if (currentSelected && workers.some(w => w.id === currentSelected)) {
      select.value = currentSelected;
    } else if (workers.length > 0) {
      select.value = workers[0].id;
    }
  }

  select.addEventListener('change', () => {
    updateAutoWage();
  });

  updateAutoWage();
}

// ==========================================
// LOG FORM LOGIC & AUTO WAGE CALCULATION
// ==========================================
function initLogForm() {
  const form = document.getElementById('daily-log-form');
  const countInput = document.getElementById('log-gross-count');
  const rejectInput = document.getElementById('log-rejected-count');
  const logDateInput = document.getElementById('log-date');
  const editLimitBtn = document.getElementById('btn-edit-current-limit');

  if (logDateInput && !logDateInput.value) {
    logDateInput.value = selectedDate || getTodayDateStr();
  }

  if (countInput) countInput.addEventListener('input', updateAutoWage);
  if (rejectInput) rejectInput.addEventListener('input', updateAutoWage);

  // Inline limit editor button next to the badge
  if (editLimitBtn) {
    editLimitBtn.addEventListener('click', () => {
      const workerId = document.getElementById('log-worker-select')?.value;
      const worker = workers.find(w => w.id === workerId);
      if (!worker) {
        alert(typeof currentLang !== 'undefined' && currentLang === 'mr' 
          ? 'कृपया प्रथम कामगार निवडा किंवा नवीन कामगार जोडा.' 
          : 'Please select a worker first or add a new worker.');
        return;
      }
      editWorkerLimitPrompt(worker);
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProductionEntry(e);
    });
  }
}

// Global flag to prevent multiple rapid clicks / double fires
let isSavingProduction = false;

// Global function to save production entry — supports ANY count including extra above daily limit
window.saveProductionEntry = function(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  if (isSavingProduction) {
    return;
  }
  isSavingProduction = true;
  setTimeout(() => {
    isSavingProduction = false;
  }, 500);

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

  if (!workers || workers.length === 0) {
    alert(isMarathi
      ? 'उत्पादन नोंदवण्यापूर्वी कृपया "+ नवीन जोडा" वर क्लिक करून कामगार जोडा.'
      : 'Please add at least one worker by clicking "+ Add New" before saving production.');
    return;
  }

  const workerSelect = document.getElementById('log-worker-select');
  const workerId = workerSelect ? workerSelect.value : '';
  const worker = workers.find(w => w.id === workerId);
  if (!worker) {
    alert(isMarathi ? 'कृपया यादीतून कामगार निवडा.' : 'Please choose a valid worker from the list.');
    return;
  }

  const countInput = document.getElementById('log-gross-count');
  const rawCount = countInput ? countInput.value.toString().replace(/,/g, '').trim() : '';
  const gross = parseInt(rawCount, 10);
  if (isNaN(gross) || gross <= 0) {
    alert(isMarathi ? 'कृपया विटांची संख्या टाका (उदा. 1500).' : 'Please enter a count of bricks (e.g. 1500).');
    if (countInput) countInput.focus();
    return;
  }

  const logDateInput = document.getElementById('log-date');
  const entryDate = (logDateInput && logDateInput.value) ? logDateInput.value : (selectedDate || getTodayDateStr());
  
  const taskEl = document.getElementById('log-task-stage');
  const task = taskEl ? taskEl.value : 'Hand Molding';

  const shiftEl = document.getElementById('log-shift');
  const shift = shiftEl ? shiftEl.value : 'Morning';

  const rejected = parseInt(document.getElementById('log-rejected-count')?.value, 10) || 0;
  const net = Math.max(0, gross - rejected);
  const rate = Number(worker.ratePer1000) || 850;
  const wage = Math.round((net / 1000) * rate * 100) / 100;

  const target = worker.dailyTarget || 1500;
  const extraDiff = net > target ? net - target : 0;

  const newLog = {
    id: 'LOG-' + Date.now(),
    date: entryDate,
    workerId: worker.id,
    workerName: worker.name,
    task: task,
    shift: shift,
    grossCount: gross,
    rejected: rejected,
    netCount: net,
    wage: wage,
    isExtra: extraDiff > 0,
    extraCount: extraDiff
  };

  if (!Array.isArray(productionLogs)) {
    productionLogs = [];
  }

  // Check if this worker already has a log for this date and task
  const existingIdx = productionLogs.findIndex(l => l.date === entryDate && l.workerId === worker.id && l.task === task);
  if (existingIdx !== -1) {
    const confirmMsg = isMarathi
      ? `${worker.name} ची ${entryDate} रोजी ${task} साठी नोंद आधीच उपलब्ध आहे. ती बदलून नवीन करायची का?\n\n(नवीन करण्यासाठी 'OK' दाबा, वेगळी नोंद जोडण्यासाठी 'Cancel' दाबा)`
      : `${worker.name} already has an entry for ${task} on ${entryDate}. Replace it?\n\n(Click OK to replace, Cancel to add as separate entry)`;
    if (confirm(confirmMsg)) {
      productionLogs[existingIdx] = newLog;
    } else {
      productionLogs.push(newLog);
    }
  } else {
    productionLogs.push(newLog);
  }

  // Automatic immediate live sync to Firestore
  if (typeof fbSaveDoc === 'function') {
    fbSaveDoc(FB_COLLECTIONS.PRODUCTION_LOGS, newLog.id, newLog);
  }
  if (typeof syncWorkerToCloud === 'function') {
    syncWorkerToCloud(worker);
  }

  saveToLocalStorage();

  // Reset inputs
  if (countInput) countInput.value = '';
  if (document.getElementById('log-rejected-count')) {
    document.getElementById('log-rejected-count').value = '0';
  }
  if (logDateInput) {
    logDateInput.value = entryDate;
  }

  // Re-select worker if reset cleared it
  if (workerSelect && !workerSelect.value && workers.length > 0) {
    workerSelect.value = worker.id;
  }

  // Sync dashboard date
  if (entryDate !== selectedDate) {
    selectedDate = entryDate;
    const navDate = document.getElementById('filter-date');
    if (navDate) navDate.value = selectedDate;
  }

  updateAutoWage();
  refreshDashboard();

  const extraToastText = extraDiff > 0 
    ? (isMarathi ? ` (+${extraDiff.toLocaleString('en-IN')} जादा विटा नोंदवल्या)` : ` (+${extraDiff.toLocaleString('en-IN')} extra bricks saved)`)
    : '';

  showAdminToast(isMarathi
    ? `✅ उत्पादन यशस्वीरीत्या नोंदवले: ${worker.name} — ${net.toLocaleString('en-IN')} विटा${extraToastText} (मजुरी: ₹${wage.toLocaleString('en-IN')})`
    : `✅ Production saved: ${worker.name} — ${net.toLocaleString('en-IN')} Bricks${extraToastText} (Wage: ₹${wage.toLocaleString('en-IN')})`);
};

function updateAutoWage() {
  const select = document.getElementById('log-worker-select');
  const workerId = select ? select.value : '';
  const worker = workers.find(w => w.id === workerId);
  const gross = parseInt(document.getElementById('log-gross-count')?.value, 10) || 0;
  const rejected = parseInt(document.getElementById('log-rejected-count')?.value, 10) || 0;
  const net = Math.max(0, gross - rejected);

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const netEl = document.getElementById('preview-net-count');
  const wageEl = document.getElementById('preview-calculated-wage');
  const limitEl = document.getElementById('current-worker-limit');
  const statusPill = document.getElementById('limit-status-pill');

  if (netEl) {
    netEl.textContent = `${net.toLocaleString('en-IN')} ${isMarathi ? 'विटा' : 'Bricks'}`;
  }

  if (worker && wageEl) {
    const rate = worker.ratePer1000;
    const wage = ((net / 1000) * rate).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    wageEl.textContent = `₹${wage}`;
  } else if (wageEl) {
    wageEl.textContent = '₹0.00';
  }

  // Update Daily Manufacturing Limit and Status Badge
  if (worker && limitEl && statusPill) {
    const target = worker.dailyTarget || 1500;
    limitEl.textContent = `${target.toLocaleString('en-IN')} ${isMarathi ? 'विटा' : 'Bricks'}`;

    if (gross === 0) {
      statusPill.innerHTML = `<span class="limit-status-tag limit-tag-ok">${isMarathi ? 'मर्यादेत' : 'Within Limit'} (0%)</span>`;
      return;
    }

    const diff = net - target;
    const pct = Math.round((net / target) * 100);

    if (net > target) {
      statusPill.innerHTML = `
        <span class="limit-status-tag limit-tag-over" title="Worker produced extra bricks above daily limit — all count and wages will be saved!">
          ${isMarathi ? '⚡ जादा उत्पादन' : '⚡ Extra Production'} (+${diff.toLocaleString('en-IN')})
        </span>
      `;
    } else if (pct >= 90) {
      statusPill.innerHTML = `
        <span class="limit-status-tag limit-tag-warn">
          ${isMarathi ? 'मर्यादेजवळ' : 'Near Limit'} (${pct}%)
        </span>
      `;
    } else {
      statusPill.innerHTML = `
        <span class="limit-status-tag limit-tag-ok">
          ${isMarathi ? 'मर्यादेत उत्पादन' : 'Within Limit'} (${pct}%)
        </span>
      `;
    }
  } else if (limitEl && statusPill) {
    limitEl.textContent = '--';
    statusPill.innerHTML = `<span class="limit-status-tag limit-tag-ok">--</span>`;
  }
}

// Helper prompt to set/edit worker daily manufacturing limit
function editWorkerLimitPrompt(worker) {
  if (!worker) return;
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const defaultPrompt = isMarathi 
    ? 'या कामगारासाठी नवीन दैनिक उत्पादन मर्यादा (विटांची संख्या) टाका:'
    : 'Enter new Daily Manufacturing Limit (Bricks) for';
  const promptKey = isMarathi ? (TRANSLATIONS?.mr?.admin_prompt_set_limit || defaultPrompt) : (TRANSLATIONS?.en?.admin_prompt_set_limit || defaultPrompt);
  const promptText = `${promptKey} ${worker.name}:`;

  const currentLimit = worker.dailyTarget || 1500;
  const input = prompt(promptText, currentLimit);

  if (input !== null) {
    const newLimit = parseInt(input.trim(), 10);
    if (!isNaN(newLimit) && newLimit > 0) {
      worker.dailyTarget = newLimit;
      worker.dailyLimit = newLimit;
      if (typeof syncWorkerToCloud === 'function') {
        syncWorkerToCloud(worker);
      } else if (typeof fbSaveDoc === 'function') {
        fbSaveDoc(FB_COLLECTIONS.WORKERS, worker.id, worker);
      }
      saveToLocalStorage();
      updateAutoWage();
      refreshDashboard();
      showAdminToast(isMarathi 
        ? `🎯 ${worker.name} ची दैनिक मर्यादा ${newLimit.toLocaleString('en-IN')} विटा ठरवली.` 
        : `🎯 ${worker.name}'s daily limit set to ${newLimit.toLocaleString('en-IN')} bricks.`);
    } else {
      alert(isMarathi 
        ? 'कृपया वैध संख्या टाका (उदा. 1500).' 
        : 'Please enter a valid positive number for the daily limit.');
    }
  }
}

window.editWorkerLimitById = function(workerId) {
  const worker = workers.find(w => w.id === workerId);
  if (worker) {
    editWorkerLimitPrompt(worker);
  }
};

// ==========================================
// REFRESH DASHBOARD METRICS, CHARTS & TABLE
// ==========================================
function refreshDashboard() {
  const dayLogs = productionLogs.filter(l => l.date === selectedDate);

  // 1. Calculate Today's & Lifetime KPI Metrics
  const todayManufactured = dayLogs.reduce((acc, curr) => acc + (Number(curr.netCount) || 0), 0);
  const totalRejected = dayLogs.reduce((acc, curr) => acc + (Number(curr.rejected) || 0), 0);
  const totalGross = dayLogs.reduce((acc, curr) => acc + (Number(curr.grossCount) || 0), 0);
  const totalWages = dayLogs.reduce((acc, curr) => acc + (Number(curr.wage) || 0), 0);

  // All-Time Cumulative Totals
  const allTimeManufactured = (productionLogs || []).reduce((acc, curr) => acc + (Number(curr.netCount) || 0), 0);
  const allTimeDelivered = (deliveryLogs || []).reduce((acc, curr) => acc + (Number(curr.brickCount) || 0), 0);
  const stockBalance = Math.max(0, allTimeManufactured - allTimeDelivered);

  const uniqueWorkerIds = new Set(dayLogs.map(l => l.workerId));
  const activeWorkersCount = uniqueWorkerIds.size;
  const avgPerWorker = activeWorkersCount > 0 ? Math.round(todayManufactured / activeWorkersCount) : 0;

  // Update KPI Cards in UI
  const kpiLifeMfg = document.getElementById('kpi-lifetime-manufactured');
  if (kpiLifeMfg) kpiLifeMfg.textContent = allTimeManufactured.toLocaleString('en-IN');

  const kpiTodayMfg = document.getElementById('kpi-total-bricks');
  if (kpiTodayMfg) kpiTodayMfg.textContent = todayManufactured.toLocaleString('en-IN');

  const kpiStock = document.getElementById('kpi-stock-balance');
  if (kpiStock) kpiStock.textContent = stockBalance.toLocaleString('en-IN');

  document.getElementById('kpi-active-workers').textContent = `${activeWorkersCount} / ${workers.length}`;
  document.getElementById('kpi-avg-per-worker').textContent = avgPerWorker.toLocaleString('en-IN');
  document.getElementById('kpi-total-wages').textContent = `₹${Math.round(totalWages).toLocaleString('en-IN')}`;

  // Stage summary metrics
  const moldingTotal = dayLogs.filter(l => l.task === 'Hand Molding').reduce((a, c) => a + c.netCount, 0);
  const pressTotal = dayLogs.filter(l => l.task === 'Pug Press').reduce((a, c) => a + c.netCount, 0);
  const stackTotal = dayLogs.filter(l => l.task === 'Stacking').reduce((a, c) => a + c.netCount, 0);
  const kilnTotal = dayLogs.filter(l => l.task === 'Kiln Loading').reduce((a, c) => a + c.netCount, 0);

  if (document.getElementById('stage-molding-count')) document.getElementById('stage-molding-count').textContent = moldingTotal.toLocaleString('en-IN');
  if (document.getElementById('stage-press-count')) document.getElementById('stage-press-count').textContent = pressTotal.toLocaleString('en-IN');
  if (document.getElementById('stage-stack-count')) document.getElementById('stage-stack-count').textContent = stackTotal.toLocaleString('en-IN');
  if (document.getElementById('stage-kiln-count')) document.getElementById('stage-kiln-count').textContent = kilnTotal.toLocaleString('en-IN');

  // 2. Render Visual Production Chart
  renderProductionChart(dayLogs);

  // 3. Render Worker Breakdown / Directory Table
  renderWorkerTable();

  // 4. Render Brick Deliveries & Transport Dispatches
  if (typeof renderDeliveryMetrics === 'function') renderDeliveryMetrics();
  if (typeof renderTransporterChips === 'function') renderTransporterChips();
  if (typeof renderDeliveryTable === 'function') renderDeliveryTable();

  // 5. Render Website Inquiries & Leads
  if (typeof renderInquiriesTable === 'function') renderInquiriesTable();

  // 6. Update Raw Brick Travelers (Land to Kiln transfer) KPIs & Tables
  const todayRawBricks = (typeof rawTravelersLogs !== 'undefined' ? rawTravelersLogs : [])
    .filter(l => l.date === selectedDate)
    .reduce((acc, curr) => acc + (Number(curr.bricksCount) || 0), 0);
  const allTimeRawBricks = (typeof rawTravelersLogs !== 'undefined' ? rawTravelersLogs : [])
    .reduce((acc, curr) => acc + (Number(curr.bricksCount) || 0), 0);

  const kpiRawTotal = document.getElementById('kpi-raw-reach-total');
  if (kpiRawTotal) kpiRawTotal.textContent = allTimeRawBricks.toLocaleString('en-IN');
  const kpiRawToday = document.getElementById('kpi-raw-reach-today');
  if (kpiRawToday) kpiRawToday.textContent = todayRawBricks.toLocaleString('en-IN');

  const badgeRaw = document.getElementById('badge-raw-travelers-today');
  if (badgeRaw) {
    if (todayRawBricks > 0) {
      badgeRaw.style.display = 'inline-block';
      badgeRaw.textContent = todayRawBricks.toLocaleString('en-IN');
    } else {
      badgeRaw.style.display = 'none';
    }
  }

  if (typeof updateRawTravelersKPIs === 'function') updateRawTravelersKPIs();
  if (typeof renderRawTravelersWorkers === 'function') renderRawTravelersWorkers();
  if (typeof renderRawTravelersLogsTable === 'function') renderRawTravelersLogsTable();

  // 7. Update dynamic page view header if applicable
  if (typeof updatePageHeader === 'function' && typeof currentAdminPage !== 'undefined') {
    updatePageHeader(currentAdminPage);
  }
}

// ==========================================
// RENDER VISUAL CHART (TOP WORKERS)
// ==========================================
function renderProductionChart(dayLogs) {
  const chartWrap = document.getElementById('production-bars-container');
  if (!chartWrap) return;

  if (dayLogs.length === 0) {
    const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
    chartWrap.innerHTML = `
      <div style="width:100%; height:100%; min-height: 180px; display:flex; flex-direction:column; align-items:center; justify-content:center; color: var(--color-text-dim); text-align:center; padding: 20px;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="opacity:0.35; margin-bottom:10px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        <span style="font-size:0.9rem; font-weight:600; color:var(--color-text-dim);">${isMarathi ? 'आजच्या तारखेसाठी कोणतीही उत्पादन नोंद उपलब्ध नाही' : 'No production logs recorded for ' + selectedDate}</span>
        <span style="font-size:0.75rem; color:var(--color-text-muted); margin-top:4px;">${isMarathi ? 'डाव्या बाजूचा फॉर्म वापरून उत्पादन नोंद करा.' : 'Use the form on the left to add your first entry.'}</span>
      </div>
    `;
    return;
  }

  // Aggregate by worker in case worker has multiple stage logs
  const workerTotals = {};
  dayLogs.forEach(l => {
    if (!workerTotals[l.workerName]) {
      workerTotals[l.workerName] = 0;
    }
    workerTotals[l.workerName] += l.netCount;
  });

  const sortedWorkers = Object.entries(workerTotals).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...sortedWorkers.map(w => w[1]), 2000);

  chartWrap.innerHTML = '';
  sortedWorkers.slice(0, 8).forEach(([name, count]) => {
    const pct = Math.min(100, Math.round((count / maxVal) * 100));
    const shortName = name.split(' ')[0];

    const barEl = document.createElement('div');
    barEl.className = 'chart-bar-item';
    barEl.innerHTML = `
      <div class="bar-fill" style="height: ${pct}%;">
        <span class="bar-value-tooltip">${count.toLocaleString('en-IN')}</span>
      </div>
      <span class="bar-label">${shortName}</span>
    `;
    chartWrap.appendChild(barEl);
  });
}

// ==========================================
// SWITCH TABLE VIEW (DIRECTORY vs DAILY LOGS)
// ==========================================
window.switchTableView = function(view) {
  activeTableView = view;
  const select = document.getElementById('table-view-select');
  if (select && select.value !== view) {
    select.value = view;
  }
  const btnDir = document.getElementById('tab-btn-directory');
  const btnLogs = document.getElementById('tab-btn-logs');
  if (btnDir) btnDir.classList.toggle('active', view === 'directory');
  if (btnLogs) btnLogs.classList.toggle('active', view === 'logs');

  if (typeof currentAdminPage !== 'undefined' && currentAdminPage !== 'all') {
    const targetPage = view === 'logs' ? 'logs' : 'workers';
    currentAdminPage = targetPage;
    document.querySelectorAll('.sidebar-nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.getElementById(`nav-item-${targetPage}`);
    if (navItem) navItem.classList.add('active');
    if (typeof updatePageHeader === 'function') updatePageHeader(targetPage);
  }

  renderWorkerTable();
};

function initSearch() {
  const searchInput = document.getElementById('table-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderWorkerTable();
    });
  }

  const inqSearch = document.getElementById('inquiries-search-input');
  if (inqSearch) {
    inqSearch.addEventListener('input', () => {
      renderInquiriesTable();
    });
  }
}

// ==========================================
// RENDER WORKER TABLE (ALL DETAILS, TOTALS, LEAVES & DAILY LOGS)
// ==========================================
function renderWorkerTable() {
  const thead = document.getElementById('worker-table-head');
  const tbody = document.getElementById('worker-table-body');
  if (!tbody || !thead) return;

  const searchQuery = (document.getElementById('table-search-input')?.value || '').toLowerCase().trim();
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

  if (activeTableView === 'directory') {
    // --------------------------------------------------------------------
    // VIEW 1: ALL WORKERS DIRECTORY (Details, Daily, Total Production, Leaves)
    // --------------------------------------------------------------------
    thead.innerHTML = `
      <tr>
        <th>${isMarathi ? 'कामगाराचे नाव व संपर्क' : 'Worker & Contact Details'}</th>
        <th>${isMarathi ? 'पद, दर व स्थिती' : 'Role, Rate & Status'}</th>
        <th>${isMarathi ? 'दैनिक उत्पादन (' + selectedDate + ')' : 'Daily Output (' + selectedDate + ')'}</th>
        <th>${isMarathi ? 'एकूण उत्पादन (आजवरचे)' : 'Total Production (Lifetime)'}</th>
        <th>${isMarathi ? 'घेतलेल्या सुट्ट्या' : 'Taken Leaves'}</th>
        <th style="text-align: right;">${isMarathi ? 'कृती' : 'Actions'}</th>
      </tr>
    `;

    const filteredWorkers = workers.filter(w => 
      (w.name || '').toLowerCase().includes(searchQuery) || 
      (w.id || '').toLowerCase().includes(searchQuery) ||
      (w.role || '').toLowerCase().includes(searchQuery)
    );

    if (filteredWorkers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px 16px; color: var(--color-text-dim);">
            <div style="font-size: 1rem; font-weight: 600; color: #fff; margin-bottom: 6px;">
              ${isMarathi ? 'कोणतेही कामगार आढळले नाहीत' : 'No Workers Found'}
            </div>
            <div style="font-size: 0.8rem; color: var(--color-text-dim);">
              ${isMarathi ? 'नवीन कामगार जोडण्यासाठी वर "+ नवीन जोडा" वर क्लिक करा.' : 'Click "+ Add New" above to add your first worker.'}
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    filteredWorkers.forEach(w => {
      // 1. Leaves
      const wLeaves = workerLeaves.filter(lv => lv.workerId === w.id);
      const leaveCount = wLeaves.length;
      const isOnLeaveToday = wLeaves.some(lv => lv.date === selectedDate);

      // 2. Daily Output for selectedDate
      const dayLogs = productionLogs.filter(l => l.workerId === w.id && l.date === selectedDate);
      const dayNet = dayLogs.reduce((acc, l) => acc + (l.netCount || 0), 0);
      const dayWage = dayLogs.reduce((acc, l) => acc + (l.wage || 0), 0);
      const target = w.dailyTarget || 1500;
      const dayPct = Math.round((dayNet / target) * 100);

      // 3. Lifetime Total Output Across All Dates
      const allLogs = productionLogs.filter(l => l.workerId === w.id);
      const totalNet = allLogs.reduce((acc, l) => acc + (l.netCount || 0), 0);
      const totalWage = allLogs.reduce((acc, l) => acc + (l.wage || 0), 0);
      const totalWorkingDays = new Set(allLogs.map(l => l.date)).size;

      const initials = (w.name || 'W').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const phoneDisplay = w.phone ? `<span style="font-size:0.75rem; color:var(--color-whatsapp); display:block; margin-top:2px;">📞 ${w.phone}</span>` : '';
      const addressDisplay = w.address ? `<span style="font-size:0.72rem; color:var(--color-text-dim); display:block;">📍 ${w.address}</span>` : '';
      const joinDisplay = w.joinDate ? `<span style="font-size:0.7rem; color:var(--color-text-dim); display:block; margin-top:2px;">📅 रुजू: ${w.joinDate}</span>` : '';

      let statusBadge = `<span class="badge-tag badge-molding" style="background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3);">🟢 ${w.status || 'Active'}</span>`;
      if (w.status === 'On Leave' || isOnLeaveToday) {
        statusBadge = `<span class="badge-tag badge-leave">🌴 ${isMarathi ? 'सुट्टीवर' : 'On Leave'}</span>`;
      } else if (w.status === 'Inactive') {
        statusBadge = `<span class="badge-tag badge-pending" style="background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3);">🔴 ${isMarathi ? 'निष्क्रिय' : 'Inactive'}</span>`;
      }

      let dailyStatusHtml = '';
      if (isOnLeaveToday) {
        dailyStatusHtml = `
          <span class="badge-tag badge-leave">🌴 ${isMarathi ? 'सुट्टीवर' : 'On Leave'}</span>
          <span style="display:block; font-size:0.75rem; color:var(--color-text-dim); margin-top:2px;">${isMarathi ? 'आज रजेवर आहेत' : 'Absent today'}</span>
        `;
      } else if (dayNet > 0) {
        const extraBricks = dayNet > target ? dayNet - target : 0;
        dailyStatusHtml = `
          <strong style="color: #fff; font-size: 0.95rem;">${dayNet.toLocaleString('en-IN')} ${isMarathi ? 'विटा' : 'Bricks'}</strong>
          <div style="font-size: 0.78rem; color: var(--color-whatsapp); margin-top: 2px;">
            ₹${Math.round(dayWage).toLocaleString('en-IN')} (${dayPct}% ${isMarathi ? 'मर्यादा' : 'Target'})
            ${extraBricks > 0 ? `<span style="color:#34D399; font-weight:700;"> (+${extraBricks})</span>` : ''}
          </div>
        `;
      } else {
        dailyStatusHtml = `
          <span class="badge-tag badge-pending">⏳ 0 ${isMarathi ? 'विटा (नोंद नाही)' : 'Bricks (Pending)'}</span>
        `;
      }

      let leaveBadgeHtml = '';
      if (leaveCount > 0) {
        leaveBadgeHtml = `
          <button type="button" class="badge-tag badge-leave-count" onclick="openLeaveModal('${w.id}')" title="${isMarathi ? 'सुट्ट्यांची यादी पहा' : 'View past leaves'}">
            🌴 ${leaveCount} ${isMarathi ? 'दिवस सुट्टी' : (leaveCount === 1 ? 'Day Leave' : 'Days Leave')}
          </button>
        `;
      } else {
        leaveBadgeHtml = `
          <span class="badge-tag badge-zero-leave">0 ${isMarathi ? 'सुट्ट्या' : 'Leaves'}</span>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="worker-cell">
            <div class="worker-avatar">${initials}</div>
            <div class="worker-name-block">
              <strong>${w.name}</strong>
              <span style="font-size:0.75rem; color:var(--color-text-dim);">${w.id} • ${w.role || 'Hand Molder'}</span>
              ${phoneDisplay}
              ${addressDisplay}
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 700; color: #fff;">₹${w.ratePer1000 || 1000} <span style="font-size:0.75rem; font-weight:normal; color:var(--color-text-dim);">/ 1000</span></div>
          <span style="font-size: 0.75rem; color: var(--color-text-dim);">${isMarathi ? 'दैनिक मर्यादा:' : 'Target:'} ${target.toLocaleString('en-IN')}</span>
          <div style="margin-top: 5px;">${statusBadge}</div>
          ${joinDisplay}
        </td>
        <td>
          ${dailyStatusHtml}
        </td>
        <td>
          <strong style="color: var(--color-terracotta-light); font-size: 0.98rem; display: block;">${totalNet.toLocaleString('en-IN')} ${isMarathi ? 'विटा' : 'Bricks'}</strong>
          <span style="font-size: 0.76rem; color: var(--color-text-dim);">₹${Math.round(totalWage).toLocaleString('en-IN')} • ${totalWorkingDays} ${isMarathi ? 'दिवस कामावर' : 'working days'}</span>
        </td>
        <td>
          ${leaveBadgeHtml}
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px;">
            <button type="button" class="btn-action-icon" onclick="openWorkerModal('${w.id}')" title="${isMarathi ? 'कामगार माहिती बदला / पहा' : 'Edit Worker Profile'}" style="background: rgba(255,255,255,0.08); border: 1px solid var(--color-charcoal-border); color: #fff; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
              ✏️
            </button>
            <div class="row-action-dropdown-wrap">
              <select class="row-action-select" onchange="handleWorkerRowAction(this, '${w.id}')" title="${isMarathi ? 'कामगारावर कृती निवडा' : 'Select action for worker'}">
                <option value="" selected disabled>⚙️ ${isMarathi ? 'कृती निवडा...' : 'Actions...'}</option>
                <option value="edit">✏️ ${isMarathi ? 'माहिती बदला / पहा' : 'Edit Profile'}</option>
                <option value="record">🧱 ${isMarathi ? '+ उत्पादन नोंदवा' : '+ Record Production'}</option>
                <option value="leave">🌴 ${isMarathi ? '+ सुट्टी नोंदवा' : '+ Record Leave'}</option>
                <option value="limit">⚙️ ${isMarathi ? 'दैनिक मर्यादा बदला' : 'Change Daily Limit'}</option>
                <option value="delete">🗑️ ${isMarathi ? 'कामगार हटवा' : 'Delete Worker'}</option>
              </select>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } else {
    // --------------------------------------------------------------------
    // VIEW 2: DAILY PRODUCTION LOGS (Per Shift / Stage Log Entries)
    // --------------------------------------------------------------------
    thead.innerHTML = `
      <tr>
        <th>${isMarathi ? 'कामगार व शिफ्ट' : 'Worker & Shift'}</th>
        <th>${isMarathi ? 'कामाचा टप्पा' : 'Task Stage'}</th>
        <th>${isMarathi ? 'एकूण विटा' : 'Gross'}</th>
        <th>${isMarathi ? 'तुटफूट' : 'Breakage'}</th>
        <th>${isMarathi ? 'निव्वळ विटा' : 'Net Bricks'}</th>
        <th>${isMarathi ? 'दैनिक मर्यादा व प्रगती' : 'Target Progress'}</th>
        <th>${isMarathi ? 'दैनंदिन मजुरी' : 'Daily Wage'}</th>
        <th style="text-align: right;">${isMarathi ? 'कृती' : 'Action'}</th>
      </tr>
    `;

    const dayLogs = productionLogs.filter(l => l.date === selectedDate);
    const filteredLogs = dayLogs.filter(l => 
      (l.workerName || '').toLowerCase().includes(searchQuery) || 
      (l.workerId || '').toLowerCase().includes(searchQuery)
    );

    if (filteredLogs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px 16px; color: var(--color-text-dim);">
            <div style="font-size: 1rem; font-weight: 600; color: #fff; margin-bottom: 6px;">
              ${isMarathi ? 'कोणतीही उत्पादन नोंद आढळली नाही' : 'No Production Records Found for ' + selectedDate}
            </div>
            <div style="font-size: 0.8rem; color: var(--color-text-dim);">
              ${isMarathi ? 'कामाची नोंद करण्यासाठी डाव्या बाजूला फॉर्म भरा.' : 'Use the form on the left to record production.'}
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    filteredLogs.forEach(log => {
      const worker = workers.find(w => w.id === log.workerId) || { dailyTarget: 1500 };
      const target = worker.dailyTarget || 1500;
      const progressPct = Math.min(100, Math.round((log.netCount / target) * 100));
      const initials = (log.workerName || 'W').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      let stageBadge = 'badge-molding';
      if (log.task === 'Stacking') stageBadge = 'badge-stacking';
      else if (log.task === 'Kiln Loading') stageBadge = 'badge-kiln';
      else if (log.task === 'Pug Press') stageBadge = 'badge-press';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="worker-cell">
            <div class="worker-avatar">${initials}</div>
            <div class="worker-name-block">
              <strong>${log.workerName}</strong>
              <span>${log.workerId} • ${log.shift}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-tag ${stageBadge}">${log.task}</span>
        </td>
        <td style="font-weight: 600;">${log.grossCount.toLocaleString('en-IN')}</td>
        <td style="color: var(--color-danger);">${log.rejected || 0}</td>
        <td>
          <strong style="color: #fff; font-size: 1rem;">${log.netCount.toLocaleString('en-IN')}</strong>
        </td>
        <td>
          <div class="target-progress-cell">
            <div class="progress-track">
              <div class="progress-bar-fill" style="width: ${Math.min(100, progressPct)}%; background-color: ${log.netCount > target ? 'var(--color-success)' : (progressPct >= 100 ? 'var(--color-success)' : 'var(--color-terracotta)')}"></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 3px;">
              <span class="progress-text">${log.netCount.toLocaleString('en-IN')} / ${target.toLocaleString('en-IN')} (${progressPct}%)</span>
              <button type="button" class="btn-table-edit-limit" onclick="editWorkerLimitById('${worker.id}')" title="Change Daily Limit">⚙️</button>
            </div>
          </div>
        </td>
        <td>
          <strong style="color: var(--color-whatsapp);">₹${Number(log.wage).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
        </td>
        <td style="text-align: right;">
          <button class="btn-action-icon" title="Delete Entry" onclick="deleteLogEntry('${log.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Leave modal helper functions
window.openLeaveModal = function(workerId) {
  const modal = document.getElementById('leave-modal-overlay');
  const select = document.getElementById('leave-worker-select');
  const dateInput = document.getElementById('leave-date');
  if (!modal || !select) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  select.innerHTML = '';
  workers.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = `${w.name} (${w.id})`;
    select.appendChild(opt);
  });

  if (workerId && workers.some(w => w.id === workerId)) {
    select.value = workerId;
  } else if (workers.length > 0) {
    select.value = workers[0].id;
  }

  if (dateInput) {
    dateInput.value = selectedDate || getTodayDateStr();
  }

  renderLeaveHistory(select.value);

  select.onchange = () => {
    renderLeaveHistory(select.value);
  };

  modal.classList.add('open');
};

window.closeLeaveModal = function() {
  const modal = document.getElementById('leave-modal-overlay');
  if (modal) modal.classList.remove('open');
};

function renderLeaveHistory(workerId) {
  const list = document.getElementById('worker-leave-history-list');
  if (!list) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const leaves = workerLeaves.filter(lv => lv.workerId === workerId);

  if (leaves.length === 0) {
    list.innerHTML = `<span style="font-size:0.78rem; color:var(--color-text-dim); display:block; padding:4px 0;">${isMarathi ? 'कोणतीही सुट्टी नोंदवलेली नाही (हजेरी नियमित आहे).' : 'No taken leaves recorded for this worker.'}</span>`;
    return;
  }

  list.innerHTML = '';
  leaves.forEach(lv => {
    const div = document.createElement('div');
    div.className = 'leave-history-item';
    div.innerHTML = `
      <div>
        <strong>📅 ${lv.date}</strong>
        <span style="color:var(--color-text-dim); margin-left:6px;">(${lv.reason || 'Personal'})</span>
      </div>
      <button type="button" class="btn-remove-leave" onclick="removeLeave('${lv.id}')" title="Remove Leave">✕ ${isMarathi ? 'हटवा' : 'Remove'}</button>
    `;
    list.appendChild(div);
  });
}

window.removeLeave = function(leaveId) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  if (confirm(isMarathi ? 'ही सुट्टी हटवायची का?' : 'Remove this leave record?')) {
    const targetLeave = workerLeaves.find(lv => lv.id === leaveId);
    workerLeaves = workerLeaves.filter(lv => lv.id !== leaveId);
    if (typeof fbDeleteDoc === 'function') fbDeleteDoc(FB_COLLECTIONS.WORKER_LEAVES, leaveId);
    if (targetLeave) {
      const worker = workers.find(w => w.id === targetLeave.workerId);
      if (worker && typeof syncWorkerToCloud === 'function') syncWorkerToCloud(worker);
    }
    saveToLocalStorage();
    const select = document.getElementById('leave-worker-select');
    if (select) renderLeaveHistory(select.value);
    refreshDashboard();
    showAdminToast(isMarathi ? '🗑️ सुट्टी हटवली.' : '🗑️ Leave record removed.');
  }
};

window.deleteWorker = function(workerId) {
  const worker = workers.find(w => w.id === workerId);
  if (!worker) return;
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const confirmMsg = isMarathi 
    ? `तुम्हाला खात्री आहे का? कामगार "${worker.name}" (${worker.id}) यादीतून हटवले जातील.\n\n(त्यांच्या मागील सर्व नोंदी सुरक्षित राहतील).`
    : `Are you sure you want to remove worker "${worker.name}" (${worker.id}) from the roster?\n\n(Past logs will be retained).`;
  
  if (confirm(confirmMsg)) {
    workers = workers.filter(w => w.id !== workerId);
    if (typeof fbDeleteDoc === 'function') fbDeleteDoc(FB_COLLECTIONS.WORKERS, workerId);
    saveToLocalStorage();
    initWorkerSelect();
    refreshDashboard();
    showAdminToast(isMarathi ? `🗑️ कामगार हटवले: ${worker.name}` : `🗑️ Worker removed: ${worker.name}`);
  }
};

// Global delete function
window.deleteLogEntry = function(id) {
  if (confirm('Are you sure you want to remove this production log?')) {
    const targetLog = productionLogs.find(l => l.id === id);
    productionLogs = productionLogs.filter(l => l.id !== id);
    if (typeof fbDeleteDoc === 'function') fbDeleteDoc(FB_COLLECTIONS.PRODUCTION_LOGS, id);
    if (targetLog) {
      const worker = workers.find(w => w.id === targetLog.workerId);
      if (worker && typeof syncWorkerToCloud === 'function') syncWorkerToCloud(worker);
    }
    saveToLocalStorage();
    refreshDashboard();
    showAdminToast('🗑️ Production log removed.');
  }
};


// ==========================================
// ONE-CLICK WHATSAPP DAILY REPORT
// ==========================================
window.shareDailyReportWhatsApp = function() {
  const dayLogs = productionLogs.filter(l => l.date === selectedDate);
  const totalManufactured = dayLogs.reduce((acc, curr) => acc + curr.netCount, 0);
  const totalRejected = dayLogs.reduce((acc, curr) => acc + curr.rejected, 0);
  const totalWages = dayLogs.reduce((acc, curr) => acc + curr.wage, 0);
  const uniqueWorkerIds = new Set(dayLogs.map(l => l.workerId));

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  let msg = '';

  const dayDeliveries = deliveryLogs.filter(d => d.date === selectedDate);
  const totalDelivered = dayDeliveries.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const trolleyDel = dayDeliveries.filter(d => d.vehicleType === 'Trolley');
  const trolleyBricks = trolleyDel.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const truckDel = dayDeliveries.filter(d => d.vehicleType === 'Truck');
  const truckBricks = truckDel.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);

  if (isMarathi) {
    msg += `*🧱 सुखकर्ता ब्रिक्स - दैनंदिन अहवाल (उत्पादन व वाहतूक)*\n`;
    msg += `📅 *तारीख:* ${selectedDate}\n\n`;
    msg += `*🏭 उत्पादन तपशील:*\n`;
    msg += `• *आजचे एकूण उत्पादन:* *${totalManufactured.toLocaleString('en-IN')} विटा*\n`;
    msg += `• *कामावर उपस्थित कामगार:* ${uniqueWorkerIds.size}\n`;
    msg += `• *एकूण दैनंदिन मजुरी खर्च:* ₹${Math.round(totalWages).toLocaleString('en-IN')}\n`;
    msg += `• *तुटफूट / रिजेक्ट विटा:* ${totalRejected} विटा\n\n`;

    if (dayDeliveries.length > 0) {
      msg += `*🚚 विटांची रवानगी व वाहतूक (डिलिव्हरी):*\n`;
      msg += `• *एकूण पाठवलेल्या विटा:* *${totalDelivered.toLocaleString('en-IN')} विटा*\n`;
      msg += `• 🚜 *ट्रॅक्टर ट्रॉली:* ${trolleyBricks.toLocaleString('en-IN')} विटा (${trolleyDel.length} फेऱ्या)\n`;
      msg += `• 🚚 *ट्रक:* ${truckBricks.toLocaleString('en-IN')} विटा (${truckDel.length} फेऱ्या)\n`;
      msg += `• *वाहतूकदार नोंदी:*\n`;
      dayDeliveries.forEach((d, idx) => {
        msg += `  ${idx + 1}. ${d.transporterName} (${d.vehicleType === 'Truck' ? 'ट्रक' : 'ट्रॉली'}) — ${Number(d.brickCount).toLocaleString('en-IN')} विटा → ${d.customerName}\n`;
      });
      msg += `\n`;
    }

    msg += `*📋 कामगारनिहाय उत्पादन तपशील:*\n`;
    dayLogs.forEach((l, index) => {
      msg += `${index + 1}. *${l.workerName}*: ${l.netCount.toLocaleString('en-IN')} विटा (${l.task}) — ₹${l.wage.toFixed(0)}\n`;
    });

    msg += `\n_सुखकर्ता भट्टी ॲडमिन पोर्टलद्वारे व्युत्पन्न._`;
  } else {
    msg += `*🧱 SUKHAKARTA BRICKS - DAILY REPORT (PRODUCTION & DISPATCH)*\n`;
    msg += `📅 *Date:* ${selectedDate}\n\n`;
    msg += `*🏭 Kiln Production:*\n`;
    msg += `• *Total Bricks Manufactured:* *${totalManufactured.toLocaleString('en-IN')} Bricks*\n`;
    msg += `• *Workers on Duty:* ${uniqueWorkerIds.size}\n`;
    msg += `• *Total Day Labor Wages:* ₹${Math.round(totalWages).toLocaleString('en-IN')}\n`;
    msg += `• *Breakage / Rejected:* ${totalRejected} Bricks\n\n`;

    if (dayDeliveries.length > 0) {
      msg += `*🚚 Outward Brick Deliveries & Transport:*\n`;
      msg += `• *Total Delivered Bricks:* *${totalDelivered.toLocaleString('en-IN')} Bricks*\n`;
      msg += `• 🚜 *Tractor Trolley:* ${trolleyBricks.toLocaleString('en-IN')} Bricks (${trolleyDel.length} trips)\n`;
      msg += `• 🚚 *Heavy Truck:* ${truckBricks.toLocaleString('en-IN')} Bricks (${truckDel.length} trips)\n`;
      msg += `• *Transporter Dispatches:*\n`;
      dayDeliveries.forEach((d, idx) => {
        msg += `  ${idx + 1}. ${d.transporterName} (${d.vehicleType}) — ${Number(d.brickCount).toLocaleString('en-IN')} bricks → ${d.customerName}\n`;
      });
      msg += `\n`;
    }

    msg += `*📋 Individual Worker Breakdown:*\n`;
    dayLogs.forEach((l, index) => {
      msg += `${index + 1}. *${l.workerName}*: ${l.netCount.toLocaleString('en-IN')} bricks (${l.task}) — ₹${l.wage.toFixed(0)}\n`;
    });

    msg += `\n_Generated via Sukhakarta Kiln Admin Portal._`;
  }

  const phone = '917385803641';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
};

// ==========================================
// EXPORT TO CSV
// ==========================================
window.exportProductionCSV = function() {
  const dayLogs = productionLogs.filter(l => l.date === selectedDate);
  if (dayLogs.length === 0) {
    alert('No records available to export for ' + selectedDate);
    return;
  }

  let csv = 'Date,Worker ID,Worker Name,Task Stage,Shift,Gross Count,Rejected,Net Bricks,Daily Wage (INR)\n';
  dayLogs.forEach(l => {
    csv += `"${l.date}","${l.workerId}","${l.workerName}","${l.task}","${l.shift}",${l.grossCount},${l.rejected},${l.netCount},${l.wage}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sukhakarta_Bricks_Production_${selectedDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showAdminToast('📥 Production CSV exported.');
};

// ==========================================
// CLEAR ALL PRODUCTION DATA & WORKERS
// ==========================================
window.clearAllProductionData = async function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const confirmMsg = isMarathi
    ? '⚠️ तुम्हाला खात्री आहे का? डॅशबोर्ड व क्लाउडवरील सर्व डेटा (कामगार, उत्पादन नोंदी, सुट्ट्या, डिलिव्हरी, वाहतूकदार, कच्ची विट कामगार व नोंदी, कच्चा माल) कायमचा हटवला जाईल आणि डॅशबोर्ड पूर्णपणे रिकामा केला जाईल.'
    : '⚠️ Are you sure you want to permanently clear ALL records (Workers, Production Logs, Leaves, Deliveries, Transporters, Traveler Workers & Logs, Raw Materials)?\n\nThis will purge both local cache and Cloud Firestore to a completely clean state.';

  if (!confirm(confirmMsg)) return;

  updateCloudSyncBadge('syncing', isMarathi ? 'डेटा हटवला जात आहे...' : 'Purging all records...');

  // 1. Delete all records from Cloud Firestore
  if (typeof fbClearEntireCollection === 'function') {
    await Promise.all([
      fbClearEntireCollection(FB_COLLECTIONS.WORKERS),
      fbClearEntireCollection(FB_COLLECTIONS.PRODUCTION_LOGS),
      fbClearEntireCollection(FB_COLLECTIONS.WORKER_LEAVES),
      fbClearEntireCollection(FB_COLLECTIONS.DELIVERY_LOGS),
      fbClearEntireCollection(FB_COLLECTIONS.TRANSPORTERS),
      fbClearEntireCollection(FB_COLLECTIONS.RAW_MATERIALS),
      fbClearEntireCollection(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS),
      fbClearEntireCollection(FB_COLLECTIONS.RAW_TRAVELERS_LOGS)
    ]);
  } else if (typeof fbDeleteDoc === 'function') {
    (workers || []).forEach(w => fbDeleteDoc(FB_COLLECTIONS.WORKERS, w.id));
    (productionLogs || []).forEach(l => fbDeleteDoc(FB_COLLECTIONS.PRODUCTION_LOGS, l.id));
    (workerLeaves || []).forEach(lv => fbDeleteDoc(FB_COLLECTIONS.WORKER_LEAVES, lv.id));
    (deliveryLogs || []).forEach(d => fbDeleteDoc(FB_COLLECTIONS.DELIVERY_LOGS, d.id));
    (storedTransporters || []).forEach(t => fbDeleteDoc(FB_COLLECTIONS.TRANSPORTERS, t.id));
    (rawMaterials || []).forEach(m => fbDeleteDoc(FB_COLLECTIONS.RAW_MATERIALS, m.id));
    (rawTravelersWorkers || []).forEach(tw => fbDeleteDoc(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS, tw.id));
    (rawTravelersLogs || []).forEach(tl => fbDeleteDoc(FB_COLLECTIONS.RAW_TRAVELERS_LOGS, tl.id));
  }

  // 2. Reset all in-memory arrays to empty
  workers = [];
  productionLogs = [];
  workerLeaves = [];
  deliveryLogs = [];
  storedTransporters = [];
  rawMaterials = [];
  rawTravelersWorkers = [];
  rawTravelersLogs = [];

  // 3. Clear localStorage items
  localStorage.setItem('sukhakarta_workers', JSON.stringify([]));
  localStorage.setItem('sukhakarta_production_logs', JSON.stringify([]));
  localStorage.setItem('sukhakarta_worker_leaves', JSON.stringify([]));
  localStorage.setItem('sukhakarta_delivery_logs', JSON.stringify([]));
  localStorage.setItem('sukhakarta_transporters', JSON.stringify([]));
  localStorage.setItem('sukhakarta_raw_materials', JSON.stringify([]));
  localStorage.setItem('sukhakarta_raw_travelers_workers', JSON.stringify([]));
  localStorage.setItem('sukhakarta_raw_travelers_logs', JSON.stringify([]));

  // 4. Update UI views
  initWorkerSelect();
  refreshDashboard();
  renderWorkerTable();
  if (typeof renderDeliveryTable === 'function') renderDeliveryTable();
  if (typeof renderTransporterChips === 'function') renderTransporterChips();
  if (typeof renderRawMaterialsTable === 'function') renderRawMaterialsTable();
  if (typeof updateRawMaterialsKPIs === 'function') updateRawMaterialsKPIs();
  if (typeof renderRawTravelersWorkers === 'function') renderRawTravelersWorkers();
  if (typeof renderRawTravelersLogsTable === 'function') renderRawTravelersLogsTable();
  if (typeof updateRawTravelersKPIs === 'function') updateRawTravelersKPIs();

  updateCloudSyncBadge('synced', isMarathi ? 'क्लाउड कनेक्टेड' : 'Cloud Synced');
  showAdminToast(isMarathi ? '🧹 सर्व डेटा कायमचा हटवला. डॅशबोर्ड आता पूर्णपणे रिकामा आहे.' : '🧹 All records purged. Dashboard is completely clean and fresh.');
};

// ==========================================
// SIDEBAR INTERACTIVITY & NAVIGATION
// ==========================================
window.toggleSidebar = function() {
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const layout = document.getElementById('admin-dashboard-view');
  if (!sidebar) return;

  if (window.innerWidth <= 1024) {
    const isOpen = sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('open', isOpen);
  } else {
    if (layout) layout.classList.toggle('sidebar-collapsed');
  }
};

window.closeSidebarMobile = function() {
  if (window.innerWidth <= 1024) {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }
};

// ==========================================
// DEDICATED PAGE VIEWS & SIDEBAR NAVIGATION
// ==========================================
let currentAdminPage = 'overview';

window.updatePageHeader = function(pageKey) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const badgeEl = document.getElementById('page-header-badge');
  const titleEl = document.getElementById('page-header-title');
  const descEl = document.getElementById('page-header-desc');
  const btnPage = document.getElementById('btn-mode-page');
  const btnAll = document.getElementById('btn-mode-all');

  if (btnPage && btnAll) {
    if (pageKey === 'all') {
      btnPage.classList.remove('active');
      btnAll.classList.add('active');
    } else {
      btnPage.classList.add('active');
      btnAll.classList.remove('active');
    }
  }

  const pageMeta = {
    overview: {
      badge: isMarathi ? '📊 मुख्य डॅशबोर्ड' : '📊 MAIN DASHBOARD',
      title: isMarathi ? 'एकूण विहंगावलोकन' : 'Overview & KPIs',
      desc: isMarathi ? 'भट्टीचे आजचे एकूण उत्पादन, उपस्थित कामगार, मजुरी आणि विटा डिलिव्हरीचा संपूर्ण आढावा' : 'Daily manufacturing indicators, wages, active workforce, and delivery totals'
    },
    record: {
      badge: isMarathi ? '✏️ उत्पादन नोंदणी' : '✏️ MANUFACTURING INPUT',
      title: isMarathi ? 'उत्पादन नोंदवा' : 'Record Worker Production',
      desc: isMarathi ? 'कामगाराने आज पाडलेल्या विटांची अचूक नोंद करा व मजुरी आपोआप हिशोब करा' : 'Enter daily bricks molded, shift, stage, and auto-calculate piece-rate wages'
    },
    chart: {
      badge: isMarathi ? '📈 उत्पादन आलेख' : '📈 PERFORMANCE ANALYTICS',
      title: isMarathi ? 'उत्पादन आलेख व विश्लेषण' : 'Production Analytics',
      desc: isMarathi ? 'कामगार निहाय उत्पादन आलेख आणि वेगवेगळ्या टप्प्यांनुसार विटांची आकडेवारी' : 'Top worker outputs today, manufacturing stages, and kiln throughput'
    },
    workers: {
      badge: isMarathi ? '👥 कामगार तपशील' : '👥 WORKFORCE DIRECTORY',
      title: isMarathi ? 'कामगार तपशील' : 'Workers Directory',
      desc: isMarathi ? 'कामगारांचे रेकॉर्ड, विटांचे दर, आजचे उत्पादन, एकूण उत्पादन आणि घेतलेल्या सुट्ट्या' : 'Worker roster profiles, piece-rates, daily output, total production, and leaves'
    },
    logs: {
      badge: isMarathi ? '📋 दैनिक नोंदी' : '📋 PRODUCTION AUDIT LOGS',
      title: isMarathi ? 'दैनिक कामाच्या नोंदी' : 'Daily Work Logs',
      desc: isMarathi ? 'दररोजच्या कामाच्या नोंदी, विटांचे प्रमाण, मजुरी आणि एक्सेल/CSV डाऊनलोड' : 'Detailed audit trail of all recorded brick production batches with filters and export'
    },
    deliveries: {
      badge: isMarathi ? '🚚 वाहतूक व डिलिव्हरी' : '🚚 LOGISTICS & DISPATCH',
      title: isMarathi ? 'विटा वाहतूक व डिलिव्हरी' : 'Brick Deliveries & Transport',
      desc: isMarathi ? 'ट्रॅक्टर ट्रॉली किंवा ट्रकने पाठवलेल्या विटा आणि वाहतूकदारांची सविस्तर नोंद' : 'Log outward brick dispatches by Tractor Trolley or Truck with stored transporters'
    },
    'raw-travelers': {
      badge: isMarathi ? '🚜 कच्ची विट वाहतूक' : '🚜 RAW BRICK TRAVELERS',
      title: isMarathi ? 'कच्ची विट वाहतूक कामगार व भट्टी आवक नोंद' : 'Raw Brick Traveler Workers & Kiln Inward',
      desc: isMarathi ? 'विट बनवण्याच्या जमिनीवरून भट्टीपर्यंत कच्च्या विटा वाहून आणणाऱ्या कामगारांची नोंद, आजच्या व एकूण भट्टीवर पोहोचलेल्या विटांची मोजणी' : 'Track green/raw brick transfer from manufacturing land to kiln, monitor workers, today\'s reached bricks, and all-time total reached bricks'
    },
    'raw-materials': {
      badge: isMarathi ? '🚚 कच्चा माल आवक' : '🚚 RAW MATERIALS INWARD',
      title: isMarathi ? 'माती व कोळसा आवक (कच्चा माल)' : 'Soil & Coal Inward Deliveries',
      desc: isMarathi ? 'माती व कोळशाचे एकूण ट्रक, पुरवठादार नाव, एकूण बिल, दिलेली रक्कम व उर्वरित बाकी हिशोब' : 'Track incoming trucks of soil and coal, importer names, total bill value, amount paid, and balance due'
    },
    inquiries: {
      badge: isMarathi ? '💬 ग्राहकांची चौकशी' : '💬 CUSTOMER LEADS & QUOTES',
      title: isMarathi ? 'वेबसाइट ग्राहकांची चौकशी' : 'Website Customer Inquiries',
      desc: isMarathi ? 'सुखकर्ता वेबसाइटवरून ग्राहकांनी थेट पाठवलेली विटांची मागणी व कोटेशन' : 'Direct customer quote requests and order inquiries from website'
    },
    'website-data': {
      badge: isMarathi ? '🌐 वेबसाइट लाईव्ह सेटिंग्ज' : '🌐 WEBSITE LIVE CONFIG',
      title: isMarathi ? 'वेबसाइट लाईव्ह डेटा व भट्टी सेटिंग्ज' : 'Website Live Data & Kiln Status',
      desc: isMarathi ? 'वेबसाईटवर दिसणारा विटांचा चालू दर, उपलब्ध स्टॉक आणि भट्टीची चालू स्थिती थेट अपडेट करा' : 'Manage live stock availability, wholesale brick rate, and operational status shown on the website'
    },
    all: {
      badge: isMarathi ? '📑 सर्व विभाग' : '📑 COMPLETE OVERVIEW',
      title: isMarathi ? 'सर्व विभाग एकत्र' : 'All Sections View',
      desc: isMarathi ? 'भट्टी व्यवस्थापनाचे सर्व विभाग व नोंदी एकाच स्क्रीनवर' : 'All kiln production, worker, and logistics modules displayed together on a single screen'
    }
  };

  const current = pageMeta[pageKey] || pageMeta.overview;
  if (badgeEl) badgeEl.textContent = current.badge;
  if (titleEl) {
    titleEl.textContent = current.title;
    titleEl.removeAttribute('data-i18n');
  }
  if (descEl) {
    descEl.textContent = current.desc;
    descEl.removeAttribute('data-i18n');
  }
};

window.switchAdminPage = function(pageKey, event) {
  if (event) event.preventDefault();

  const validPages = ['overview', 'record', 'chart', 'workers', 'logs', 'deliveries', 'raw-travelers', 'raw-materials', 'inquiries', 'website-data', 'all'];
  if (!validPages.includes(pageKey)) {
    pageKey = 'overview';
  }

  currentAdminPage = pageKey;

  // 1. Highlight active sidebar item
  document.querySelectorAll('.sidebar-nav-item').forEach(item => item.classList.remove('active'));
  const activeNavItem = document.getElementById(`nav-item-${pageKey}`);
  if (activeNavItem) activeNavItem.classList.add('active');

  // 2. Control section visibilities
  const kpisSection = document.getElementById('section-kpis');
  const recordSection = document.getElementById('section-record-production');
  const chartSection = document.getElementById('section-chart');
  const tableSection = document.getElementById('section-workers-table');
  const deliveriesSection = document.getElementById('section-deliveries');
  const rawTravelersSection = document.getElementById('section-raw-travelers');
  const rawMaterialsSection = document.getElementById('section-raw-materials');
  const inquiriesSection = document.getElementById('section-inquiries');
  const websiteDataSection = document.getElementById('section-website-data');
  const gridWrap = document.getElementById('dashboard-forms-grid');

  const allSections = [kpisSection, recordSection, chartSection, tableSection, deliveriesSection, rawTravelersSection, rawMaterialsSection, inquiriesSection, websiteDataSection];

  if (pageKey === 'all') {
    allSections.forEach(s => { if (s) s.style.display = ''; });
    if (gridWrap) {
      gridWrap.className = 'dashboard-grid-2';
      gridWrap.style.display = '';
    }
  } else if (pageKey === 'overview') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (kpisSection) kpisSection.style.display = 'grid';
    if (chartSection) chartSection.style.display = 'block';
    if (gridWrap) {
      gridWrap.className = 'dashboard-grid-2 dashboard-single-col';
      gridWrap.style.display = 'block';
    }
  } else if (pageKey === 'record') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (recordSection) recordSection.style.display = 'block';
    if (gridWrap) {
      gridWrap.className = 'dashboard-grid-2 dashboard-single-col center-col';
      gridWrap.style.display = 'block';
    }
  } else if (pageKey === 'chart') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (chartSection) chartSection.style.display = 'block';
    if (gridWrap) {
      gridWrap.className = 'dashboard-grid-2 dashboard-single-col';
      gridWrap.style.display = 'block';
    }
  } else if (pageKey === 'workers') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (gridWrap) gridWrap.style.display = 'none';
    if (tableSection) tableSection.style.display = 'block';
    if (typeof switchTableView === 'function') switchTableView('directory');
  } else if (pageKey === 'logs') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (gridWrap) gridWrap.style.display = 'none';
    if (tableSection) tableSection.style.display = 'block';
    if (typeof switchTableView === 'function') switchTableView('logs');
  } else if (pageKey === 'deliveries') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (gridWrap) gridWrap.style.display = 'none';
    if (deliveriesSection) deliveriesSection.style.display = 'block';
  } else if (pageKey === 'raw-travelers') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (gridWrap) gridWrap.style.display = 'none';
    if (rawTravelersSection) {
      rawTravelersSection.style.display = 'block';
    }
    if (typeof updateRawTravelersKPIs === 'function') updateRawTravelersKPIs();
    if (typeof renderRawTravelersWorkers === 'function') renderRawTravelersWorkers();
    if (typeof renderRawTravelersLogsTable === 'function') renderRawTravelersLogsTable();
  } else if (pageKey === 'raw-materials') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (gridWrap) gridWrap.style.display = 'none';
    if (rawMaterialsSection) rawMaterialsSection.style.display = 'block';
    if (typeof renderRawMaterialsTable === 'function') renderRawMaterialsTable();
    if (typeof updateRawMaterialsKPIs === 'function') updateRawMaterialsKPIs();
  } else if (pageKey === 'inquiries') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (gridWrap) gridWrap.style.display = 'none';
    if (inquiriesSection) inquiriesSection.style.display = 'block';
  } else if (pageKey === 'website-data') {
    allSections.forEach(s => { if (s) s.style.display = 'none'; });
    if (gridWrap) gridWrap.style.display = 'none';
    if (websiteDataSection) websiteDataSection.style.display = 'block';
    if (typeof loadWebsiteSettingsIntoAdmin === 'function') loadWebsiteSettingsIntoAdmin();
  }

  // 3. Update top page title banner
  updatePageHeader(pageKey);

  // 4. Update browser URL hash
  if (history.replaceState) {
    history.replaceState(null, null, `#${pageKey}`);
  }

  // 5. Scroll smoothly to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const mainWrap = document.querySelector('.admin-main-wrapper');
  if (mainWrap) {
    mainWrap.scrollTop = 0;
  }

  // 6. Autofocus on gross input if recording page
  if (pageKey === 'record') {
    setTimeout(() => {
      const grossInput = document.getElementById('log-gross-count');
      if (grossInput) grossInput.focus();
    }, 150);
  }

  // 7. Re-render chart if visible
  if (pageKey === 'overview' || pageKey === 'chart' || pageKey === 'all') {
    setTimeout(() => {
      const dayLogs = (typeof productionLogs !== 'undefined' ? productionLogs : []).filter(l => l.date === selectedDate);
      if (typeof renderProductionChart === 'function') renderProductionChart(dayLogs);
    }, 40);
  }

  // 8. Close mobile sidebar
  closeSidebarMobile();
};

window.handleNavClick = function(event, sectionId) {
  if (event) event.preventDefault();
  const map = {
    'section-kpis': 'overview',
    'section-record-production': 'record',
    'section-chart': 'chart',
    'section-workers-table': 'workers',
    'section-deliveries': 'deliveries',
    'section-raw-travelers': 'raw-travelers',
    'section-raw-materials': 'raw-materials',
    'section-inquiries': 'inquiries',
    'section-website-data': 'website-data'
  };
  const targetPage = map[sectionId] || 'overview';
  switchAdminPage(targetPage, event);
};

window.navigateToTableView = function(event, view) {
  if (event) event.preventDefault();
  switchAdminPage(view === 'logs' ? 'logs' : 'workers', event);
};

window.openWorkerModal = function(workerId = null) {
  const modal = document.getElementById('worker-modal-overlay');
  if (!modal) return;
  modal.classList.add('open');

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const title = document.getElementById('worker-modal-title');
  const editIdInput = document.getElementById('edit-worker-id');
  const btnText = document.getElementById('btn-save-worker-text');

  if (workerId) {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      if (title) title.textContent = isMarathi ? '✏️ कामगाराची संपूर्ण माहिती बदला' : '✏️ Edit Worker Profile & Details';
      if (btnText) btnText.textContent = isMarathi ? '💾 माहिती अपडेट करा व Firebase वर सेव्ह करा' : '💾 Update Details & Sync to Firebase';
      if (editIdInput) editIdInput.value = worker.id;
      if (document.getElementById('new-worker-name')) document.getElementById('new-worker-name').value = worker.name || '';
      if (document.getElementById('new-worker-phone')) document.getElementById('new-worker-phone').value = worker.phone || '';
      if (document.getElementById('new-worker-role')) document.getElementById('new-worker-role').value = worker.role || 'Hand Molder';
      if (document.getElementById('new-worker-status')) document.getElementById('new-worker-status').value = worker.status || 'Active';
      if (document.getElementById('new-worker-rate')) document.getElementById('new-worker-rate').value = worker.ratePer1000 || 1000;
      if (document.getElementById('new-worker-target')) document.getElementById('new-worker-target').value = worker.dailyTarget || 1500;
      if (document.getElementById('new-worker-join-date')) document.getElementById('new-worker-join-date').value = worker.joinDate || getTodayDateStr();
      if (document.getElementById('new-worker-address')) document.getElementById('new-worker-address').value = worker.address || '';
      if (document.getElementById('new-worker-notes')) document.getElementById('new-worker-notes').value = worker.notes || '';
    }
  } else {
    if (title) title.textContent = isMarathi ? '👷 नवीन कामगार जोडा' : '👷 Add Worker to Roster';
    if (btnText) btnText.textContent = isMarathi ? '💾 नवीन कामगार जोडा व Firebase वर सेव्ह करा' : '💾 Save Worker & Sync to Firebase';
    if (editIdInput) editIdInput.value = '';
    const form = document.getElementById('add-worker-form');
    if (form) form.reset();
    if (document.getElementById('new-worker-join-date')) document.getElementById('new-worker-join-date').value = getTodayDateStr();
    if (document.getElementById('new-worker-rate')) document.getElementById('new-worker-rate').value = '1000';
    if (document.getElementById('new-worker-target')) document.getElementById('new-worker-target').value = '1500';
    if (document.getElementById('new-worker-status')) document.getElementById('new-worker-status').value = 'Active';
  }

  const nameInput = document.getElementById('new-worker-name');
  if (nameInput) setTimeout(() => nameInput.focus(), 150);
};

window.closeWorkerModal = function() {
  const modal = document.getElementById('worker-modal-overlay');
  if (modal) modal.classList.remove('open');
};

window.handleWorkerRowAction = function(selectEl, workerId) {
  if (!selectEl) return;
  const action = selectEl.value;
  selectEl.value = ""; // Reset dropdown to placeholder so options can be selected again
  if (action === 'edit') {
    openWorkerModal(workerId);
  } else if (action === 'record') {
    recordProductionForWorker(workerId);
  } else if (action === 'leave') {
    openLeaveModal(workerId);
  } else if (action === 'limit') {
    editWorkerLimitById(workerId);
  } else if (action === 'delete') {
    deleteWorker(workerId);
  }
};

window.recordProductionForWorker = function(workerId) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const worker = workers.find(w => w.id === workerId);
  if (!worker) return;

  // 1. Switch to 'record' view if we are on a page-isolated view (like 'workers' or 'overview')
  if (typeof switchAdminPage === 'function' && typeof currentAdminPage !== 'undefined') {
    if (currentAdminPage !== 'record' && currentAdminPage !== 'all') {
      switchAdminPage('record');
    }
  }

  // 2. Select this worker in the production log dropdown
  const workerSelect = document.getElementById('log-worker-select');
  if (workerSelect) {
    workerSelect.value = workerId;
    // Trigger change handler so wage preview and limit badges update for this worker
    workerSelect.dispatchEvent(new Event('change'));
  }

  // 3. Set the date to the currently selected dashboard date or today
  const dateInput = document.getElementById('log-date');
  if (dateInput) {
    dateInput.value = selectedDate || getTodayDateStr();
  }

  // 4. Smooth scroll into view & flash highlight the section
  const section = document.getElementById('section-record-production');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    section.classList.remove('highlight-pulse');
    void section.offsetWidth; // trigger reflow
    section.classList.add('highlight-pulse');
    setTimeout(() => {
      section.classList.remove('highlight-pulse');
    }, 2400);
  }

  // 5. Focus the gross molded count field ready for input
  const grossInput = document.getElementById('log-gross-count');
  if (grossInput) {
    setTimeout(() => {
      grossInput.focus();
      grossInput.select();
    }, 350);
  }

  showAdminToast(isMarathi ? `🧱 ${worker.name} ची उत्पादन नोंद करण्यासाठी फॉर्म उघडला` : `🧱 Opened production entry form for ${worker.name}`);
};

// ==========================================
// MODALS LOGIC (ADD WORKER & MARK LEAVE)
// ==========================================
function initModals() {
  const openBtn = document.getElementById('btn-open-worker-modal');
  const closeBtn = document.getElementById('btn-close-worker-modal');
  const modal = document.getElementById('worker-modal-overlay');
  const form = document.getElementById('add-worker-form');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.add('open'));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('edit-worker-id') ? document.getElementById('edit-worker-id').value.trim() : '';
      const name = document.getElementById('new-worker-name').value.trim();
      const phone = document.getElementById('new-worker-phone') ? document.getElementById('new-worker-phone').value.trim() : '';
      const role = document.getElementById('new-worker-role').value;
      const status = document.getElementById('new-worker-status') ? document.getElementById('new-worker-status').value : 'Active';
      const rate = parseFloat(document.getElementById('new-worker-rate').value) || 1000;
      const target = parseInt(document.getElementById('new-worker-target').value, 10) || 1500;
      const joinDate = (document.getElementById('new-worker-join-date') && document.getElementById('new-worker-join-date').value) || getTodayDateStr();
      const address = document.getElementById('new-worker-address') ? document.getElementById('new-worker-address').value.trim() : '';
      const notes = document.getElementById('new-worker-notes') ? document.getElementById('new-worker-notes').value.trim() : '';

      let targetWorker;
      if (editId) {
        targetWorker = workers.find(w => w.id === editId);
        if (targetWorker) {
          targetWorker.name = name;
          targetWorker.phone = phone;
          targetWorker.role = role;
          targetWorker.status = status;
          targetWorker.ratePer1000 = rate;
          targetWorker.dailyTarget = target;
          targetWorker.dailyLimit = target;
          targetWorker.joinDate = joinDate;
          targetWorker.address = address;
          targetWorker.notes = notes;
        }
      } else {
        const newId = 'W-' + (100 + workers.length + 1);
        targetWorker = {
          id: newId,
          name: name,
          phone: phone,
          role: role,
          status: status,
          ratePer1000: rate,
          dailyTarget: target,
          dailyLimit: target,
          joinDate: joinDate,
          address: address,
          notes: notes
        };
        workers.push(targetWorker);
      }

      saveToLocalStorage();
      if (typeof syncWorkerToCloud === 'function') {
        syncWorkerToCloud(targetWorker);
      }
      initWorkerSelect();
      closeWorkerModal();
      form.reset();
      refreshDashboard();
      showAdminToast(`👷 ${targetWorker.name} (${targetWorker.id}) चे सर्व तपशील Firebase वर अपडेट झाले!`);
    });
  }

  // Leave Modal
  const closeLeaveBtn = document.getElementById('btn-close-leave-modal');
  const leaveModal = document.getElementById('leave-modal-overlay');
  const leaveForm = document.getElementById('mark-leave-form');

  if (closeLeaveBtn && leaveModal) {
    closeLeaveBtn.addEventListener('click', closeLeaveModal);
  }

  if (leaveForm) {
    leaveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
      const select = document.getElementById('leave-worker-select');
      const workerId = select ? select.value : '';
      const worker = workers.find(w => w.id === workerId);
      if (!worker) {
        alert(isMarathi ? 'कृपया कामगार निवडा.' : 'Please select a worker.');
        return;
      }
      const leaveDate = document.getElementById('leave-date').value;
      const reason = document.getElementById('leave-reason').value;

      const exists = workerLeaves.some(lv => lv.workerId === workerId && lv.date === leaveDate);
      if (exists) {
        alert(isMarathi
          ? `या कामगाराची ${leaveDate} रोजी आधीच सुट्टी नोंदवलेली आहे.`
          : `A leave is already recorded for this worker on ${leaveDate}.`);
        return;
      }

      const newLeave = {
        id: 'LV-' + Date.now(),
        workerId: worker.id,
        workerName: worker.name,
        date: leaveDate,
        reason: reason
      };

      workerLeaves.push(newLeave);

      // Automatic immediate live sync to Firestore
      if (typeof fbSaveDoc === 'function') {
        fbSaveDoc(FB_COLLECTIONS.WORKER_LEAVES, newLeave.id, newLeave);
      }

      saveToLocalStorage();
      closeLeaveModal();
      refreshDashboard();
      showAdminToast(isMarathi
        ? `🌴 सुट्टी नोंदवली: ${worker.name} (${leaveDate})`
        : `🌴 Leave recorded: ${worker.name} (${leaveDate})`);
    });
  }
}

// Toast notification
function showAdminToast(msg) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; background: #222; color: #fff;
      padding: 12px 20px; border-radius: 8px; border: 1px solid #444; font-size: 0.9rem;
      font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.5); z-index: 99999;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
}

// ==========================================
// BRICK DELIVERY & TRANSPORT LOGISTICS MODULE
// ==========================================
function initDeliveryModule() {
  const form = document.getElementById('delivery-dispatch-form');
  const dateInput = document.getElementById('delivery-date-input');
  if (dateInput) {
    dateInput.value = selectedDate;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const transporterInput = document.getElementById('delivery-transporter-input');
      const vehicleTypeSelect = document.getElementById('delivery-vehicle-type');
      const vehicleNoInput = document.getElementById('delivery-vehicle-no');
      const countInput = document.getElementById('delivery-brick-count');
      const customerInput = document.getElementById('delivery-customer-name');
      const dateEl = document.getElementById('delivery-date-input');
      const phoneInput = document.getElementById('delivery-driver-phone');

      const transporterName = (transporterInput?.value || '').trim();
      const vehicleType = vehicleTypeSelect?.value || 'Trolley';
      const vehicleNo = (vehicleNoInput?.value || '').trim();
      const brickCount = parseInt(countInput?.value, 10);
      const customerName = (customerInput?.value || '').trim();
      const dispatchDate = dateEl?.value || selectedDate;
      const phone = (phoneInput?.value || '').trim();

      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

      if (!transporterName) {
        alert(isMarathi ? 'कृपया वाहतूकदाराचे किंवा चालकाचे नाव टाका.' : 'Please enter transporter/driver name.');
        return;
      }
      if (isNaN(brickCount) || brickCount <= 0) {
        alert(isMarathi ? 'कृपया पाठवलेल्या विटांची वैध संख्या टाका.' : 'Please enter valid brick quantity.');
        return;
      }

      // Normalize helpers
      const normPlate = str => (str || '').replace(/[\s\-_]/g, '').toLowerCase();
      const normName = str => (str || '').trim().toLowerCase();

      // Find existing transporters with the SAME name
      const nameMatches = storedTransporters.filter(t => normName(t.name) === normName(transporterName));

      let matchedVehicle = null;

      if (vehicleNo) {
        // If vehicle number is given, match exact plate number
        matchedVehicle = nameMatches.find(t => normPlate(t.vehicleNo) === normPlate(vehicleNo));
        // If not found by plate, but there was an existing record for this name without any plate, attach it
        if (!matchedVehicle && nameMatches.length === 1 && !nameMatches[0].vehicleNo) {
          matchedVehicle = nameMatches[0];
          matchedVehicle.vehicleNo = vehicleNo;
          matchedVehicle.vehicleType = vehicleType;
          if (phone) matchedVehicle.phone = phone;
        }
      } else {
        // No vehicle number given -> match vehicle by type if plate is empty
        matchedVehicle = nameMatches.find(t => !t.vehicleNo && t.vehicleType === vehicleType);
      }

      let isNewVehicleAdded = false;

      if (matchedVehicle) {
        // Same transporter and same vehicle -> update details
        if (phone) matchedVehicle.phone = phone;
        if (vehicleType) matchedVehicle.vehicleType = vehicleType;
        if (vehicleNo) matchedVehicle.vehicleNo = vehicleNo;
      } else {
        // Same name with DIFFERENT vehicle number or vehicle type, OR completely new transporter!
        // Automatically save as a new vehicle record under this transporter name
        const existingTransporter = nameMatches[0];
        storedTransporters.push({
          id: 'TRP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: transporterName,
          vehicleType: vehicleType,
          vehicleNo: vehicleNo,
          phone: phone || (existingTransporter ? existingTransporter.phone : '')
        });
        isNewVehicleAdded = true;
      }

      // Add delivery dispatch record
      const newDelivery = {
        id: 'DEL-' + Date.now(),
        date: dispatchDate,
        transporterName: transporterName,
        vehicleType: vehicleType, // 'Trolley' or 'Truck'
        vehicleNo: vehicleNo || '--',
        brickCount: brickCount,
        customerName: customerName || (isMarathi ? 'थेट ग्राहक' : 'Direct Customer'),
        phone: phone || '--',
        timestamp: new Date().toISOString()
      };

      deliveryLogs.unshift(newDelivery);

      // Automatic immediate live sync of enriched delivery & transporter to Firestore
      if (typeof syncDeliveryToCloud === 'function') {
        syncDeliveryToCloud(newDelivery);
      }
      const activeTransporter = matchedVehicle || storedTransporters[storedTransporters.length - 1];
      if (activeTransporter && typeof syncTransporterToCloud === 'function') {
        syncTransporterToCloud(activeTransporter);
      }

      saveToLocalStorage();

      // Reset form fields
      countInput.value = '';
      if (customerInput) customerInput.value = '';
      if (phoneInput) phoneInput.value = '';

      refreshDashboard();

      const typeLabel = vehicleType === 'Trolley' ? (isMarathi ? 'ट्रॅक्टर ट्रॉली' : 'Trolley') : (isMarathi ? 'ट्रक' : 'Truck');
      let toastMsg = isMarathi 
        ? `🚚 डिलिव्हरी नोंदवली: ${transporterName} — ${brickCount.toLocaleString('en-IN')} विटा (${typeLabel})`
        : `🚚 Dispatch recorded: ${transporterName} — ${brickCount.toLocaleString('en-IN')} bricks (${typeLabel})`;
      
      if (isNewVehicleAdded && nameMatches.length > 0) {
        toastMsg += isMarathi 
          ? ` • नवीन वाहन (${vehicleNo || typeLabel}) आपोआप सेव्ह झाले!`
          : ` • New vehicle (${vehicleNo || typeLabel}) auto-saved!`;
      }
      showAdminToast(toastMsg);
    });
  }

  // Auto-fill vehicle details when transporter name is selected
  const transporterInput = document.getElementById('delivery-transporter-input');
  if (transporterInput) {
    transporterInput.addEventListener('change', () => {
      const val = (transporterInput.value || '').trim().toLowerCase();
      if (!val) return;
      const matches = storedTransporters.filter(t => (t.name || '').trim().toLowerCase() === val);
      if (matches.length === 1) {
        const t = matches[0];
        const typeSelect = document.getElementById('delivery-vehicle-type');
        const noInput = document.getElementById('delivery-vehicle-no');
        const phoneInput = document.getElementById('delivery-driver-phone');
        if (typeSelect && t.vehicleType) typeSelect.value = t.vehicleType;
        if (noInput && !noInput.value && t.vehicleNo) noInput.value = t.vehicleNo;
        if (phoneInput && !phoneInput.value && t.phone) phoneInput.value = t.phone;
      }
    });
  }

  // Delivery table search
  const searchInput = document.getElementById('delivery-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderDeliveryTable();
    });
  }
}

function renderDeliveryMetrics() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

  // 1. All-Time Cumulative Deliveries
  const allTimeDeliveries = deliveryLogs || [];
  const allTimeDelivered = allTimeDeliveries.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const allTimeTrips = allTimeDeliveries.length;

  const allTimeTrolley = allTimeDeliveries.filter(d => d.vehicleType === 'Trolley');
  const allTimeTrolleyBricks = allTimeTrolley.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const allTimeTrolleyTrips = allTimeTrolley.length;

  const allTimeTruck = allTimeDeliveries.filter(d => d.vehicleType === 'Truck');
  const allTimeTruckBricks = allTimeTruck.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const allTimeTruckTrips = allTimeTruck.length;

  // 2. Today's Deliveries on Selected Date
  const dayDeliveries = allTimeDeliveries.filter(d => d.date === selectedDate);
  const todayDelivered = dayDeliveries.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const todayTrips = dayDeliveries.length;

  const todayTrolley = dayDeliveries.filter(d => d.vehicleType === 'Trolley');
  const todayTrolleyBricks = todayTrolley.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const todayTrolleyTrips = todayTrolley.length;

  const todayTruck = dayDeliveries.filter(d => d.vehicleType === 'Truck');
  const todayTruckBricks = todayTruck.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const todayTruckTrips = todayTruck.length;

  // 3. Top KPI Card (Card #2: Total Delivered Bricks)
  const kpiLifeDel = document.getElementById('kpi-lifetime-delivered');
  const kpiTodayDel = document.getElementById('kpi-total-delivered');
  const kpiBreakdown = document.getElementById('kpi-delivered-breakdown');

  if (kpiLifeDel) {
    kpiLifeDel.textContent = allTimeDelivered.toLocaleString('en-IN');
  }
  if (kpiTodayDel) {
    kpiTodayDel.textContent = todayDelivered.toLocaleString('en-IN');
  }
  if (kpiBreakdown) {
    kpiBreakdown.textContent = isMarathi
      ? `• 🚜 ${allTimeTrolleyBricks.toLocaleString('en-IN')} (ट्रॉली) • 🚚 ${allTimeTruckBricks.toLocaleString('en-IN')} (ट्रक)`
      : `• 🚜 ${allTimeTrolleyBricks.toLocaleString('en-IN')} Trolley • 🚚 ${allTimeTruckBricks.toLocaleString('en-IN')} Truck`;
  }

  // 4. Update Stock Balance in KPI Card
  const allTimeManufactured = (productionLogs || []).reduce((acc, curr) => acc + (Number(curr.netCount) || 0), 0);
  const stockBalance = Math.max(0, allTimeManufactured - allTimeDelivered);
  const kpiStock = document.getElementById('kpi-stock-balance');
  if (kpiStock) {
    kpiStock.textContent = stockBalance.toLocaleString('en-IN');
  }

  // 5. Section Header Date Indicator
  const formDateIndicator = document.getElementById('delivery-form-date-indicator');
  const dateLabel = document.getElementById('delivery-date-label');
  if (formDateIndicator) formDateIndicator.textContent = `📅 ${selectedDate}`;
  if (dateLabel) dateLabel.textContent = `📅 ${selectedDate}`;

  // 6. Deliveries Overview Summary Cards
  const allTimeBricksEl = document.getElementById('deliveries-alltime-bricks');
  const allTimeTripsEl = document.getElementById('deliveries-alltime-trips');
  const todayBricksEl = document.getElementById('deliveries-today-bricks');
  const todayTripsEl = document.getElementById('deliveries-today-trips');

  if (allTimeBricksEl) allTimeBricksEl.textContent = allTimeDelivered.toLocaleString('en-IN') + (isMarathi ? ' विटा' : ' Bricks');
  if (allTimeTripsEl) allTimeTripsEl.textContent = `${allTimeTrips} ${isMarathi ? 'एकूण फेऱ्या (Trips)' : 'Total Trips'}`;
  if (todayBricksEl) todayBricksEl.textContent = todayDelivered.toLocaleString('en-IN') + (isMarathi ? ' विटा' : ' Bricks');
  if (todayTripsEl) todayTripsEl.textContent = `${todayTrips} ${isMarathi ? 'आजच्या फेऱ्या (Today)' : 'Trips Today'}`;

  // 7. Trolley Stat Card
  const trolleyBricksEl = document.getElementById('trolley-total-bricks');
  const trolleyTripsEl = document.getElementById('trolley-total-trips');
  if (trolleyBricksEl) trolleyBricksEl.textContent = allTimeTrolleyBricks.toLocaleString('en-IN');
  if (trolleyTripsEl) {
    trolleyTripsEl.textContent = isMarathi
      ? `${allTimeTrolleyTrips} फेऱ्या (आज: ${todayTrolleyTrips} फेऱ्या / ${todayTrolleyBricks.toLocaleString('en-IN')} विटा)`
      : `${allTimeTrolleyTrips} Trips (Today: ${todayTrolleyTrips} trips / ${todayTrolleyBricks.toLocaleString('en-IN')} bricks)`;
  }

  // 8. Truck Stat Card
  const truckBricksEl = document.getElementById('truck-total-bricks');
  const truckTripsEl = document.getElementById('truck-total-trips');
  if (truckBricksEl) truckBricksEl.textContent = allTimeTruckBricks.toLocaleString('en-IN');
  if (truckTripsEl) {
    truckTripsEl.textContent = isMarathi
      ? `${allTimeTruckTrips} फेऱ्या (आज: ${todayTruckTrips} फेऱ्या / ${todayTruckBricks.toLocaleString('en-IN')} विटा)`
      : `${allTimeTruckTrips} Trips (Today: ${todayTruckTrips} trips / ${todayTruckBricks.toLocaleString('en-IN')} bricks)`;
  }
}

function renderTransporterChips() {
  const datalist = document.getElementById('transporter-datalist');
  const chipsWrap = document.getElementById('transporters-chips-container');
  const countEl = document.getElementById('transporters-count');

  if (countEl) countEl.textContent = storedTransporters.length;

  if (datalist) {
    // Generate helpful datalist options with vehicle info
    datalist.innerHTML = storedTransporters
      .map(t => {
        const vIcon = t.vehicleType === 'Truck' ? '🚚' : '🚜';
        const vTypeLabel = t.vehicleType === 'Truck' ? 'Truck' : 'Trolley';
        const detail = [vIcon + ' ' + vTypeLabel, t.vehicleNo].filter(Boolean).join(' • ');
        return `<option value="${t.name}">${detail ? '(' + detail + ')' : ''}</option>`;
      })
      .join('');
  }

  if (chipsWrap) {
    if (storedTransporters.length === 0) {
      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
      chipsWrap.innerHTML = `<span style="font-size:0.75rem; color:var(--color-text-dim);">${isMarathi ? 'कोणतेही वाहतूकदार सेव्ह केलेले नाहीत.' : 'No transporters stored yet. Enter a name above to auto-save.'}</span>`;
      return;
    }

    chipsWrap.innerHTML = storedTransporters.map(t => {
      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
      const icon = t.vehicleType === 'Truck' ? '🚚' : '🚜';
      const typeTag = t.vehicleType === 'Truck' ? (isMarathi ? 'ट्रक' : 'Truck') : (isMarathi ? 'ट्रॉली' : 'Trolley');
      const safeId = (t.id || '').replace(/'/g, "\\'");
      const safeName = (t.name || '').replace(/'/g, "\\'");
      const safeVType = (t.vehicleType || 'Trolley').replace(/'/g, "\\'");
      const safeVNo = (t.vehicleNo || '').replace(/'/g, "\\'");
      const safePhone = (t.phone || '').replace(/'/g, "\\'");
      return `
        <div class="transporter-chip" onclick="selectTransporterChip('${safeId}', '${safeName}', '${safeVType}', '${safeVNo}', '${safePhone}')" title="${t.name} • ${typeTag} ${t.vehicleNo || ''} (Click to fill form)">
          <span>${icon}</span>
          <span class="chip-name">${t.name}</span>
          <span class="chip-type">${t.vehicleNo ? t.vehicleNo : typeTag}</span>
          <button type="button" class="chip-del-btn" onclick="deleteStoredTransporter(event, '${safeId}')" title="${isMarathi ? 'हे वाहन हटवा' : 'Remove this vehicle'}">✕</button>
        </div>
      `;
    }).join('');
  }
}

window.selectTransporterChip = function(idOrName, name, vehicleType, vehicleNo, phone) {
  let target = storedTransporters.find(t => t.id === idOrName);
  if (!target && name) {
    target = storedTransporters.find(t => t.name === name && t.vehicleNo === vehicleNo);
  }

  const finalName = target ? target.name : (name || idOrName || '');
  const finalType = target ? target.vehicleType : (vehicleType || 'Trolley');
  const finalNo = target ? target.vehicleNo : (vehicleNo || '');
  const finalPhone = target ? target.phone : (phone || '');

  const nameInput = document.getElementById('delivery-transporter-input');
  const typeSelect = document.getElementById('delivery-vehicle-type');
  const noInput = document.getElementById('delivery-vehicle-no');
  const phoneInput = document.getElementById('delivery-driver-phone');

  if (nameInput) nameInput.value = finalName;
  if (typeSelect && finalType) typeSelect.value = finalType;
  if (noInput) noInput.value = finalNo;
  if (phoneInput && finalPhone) phoneInput.value = finalPhone;

  const countInput = document.getElementById('delivery-brick-count');
  if (countInput) countInput.focus();
};

window.deleteStoredTransporter = function(event, idOrName) {
  if (event) event.stopPropagation();
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const target = storedTransporters.find(t => t.id === idOrName) || storedTransporters.find(t => t.name === idOrName);
  const displayName = target ? `${target.name} ${target.vehicleNo ? '(' + target.vehicleNo + ')' : ''}` : idOrName;

  if (confirm(isMarathi ? `वाहन/वाहतूकदार "${displayName}" यादीतून हटवायचा का?` : `Remove vehicle "${displayName}" from stored transporters?`)) {
    const deletedId = target ? target.id : idOrName;
    if (target && target.id) {
      storedTransporters = storedTransporters.filter(t => t.id !== target.id);
    } else {
      storedTransporters = storedTransporters.filter(t => t.name !== idOrName);
    }
    if (deletedId && typeof fbDeleteDoc === 'function') {
      fbDeleteDoc(FB_COLLECTIONS.TRANSPORTERS, deletedId);
    }
    saveToLocalStorage();
    renderTransporterChips();
    showAdminToast(isMarathi ? 'वाहतूकदार वाहन नोंद हटवली.' : 'Transporter vehicle removed.');
  }
};

function renderDeliveryTable() {
  const tbody = document.getElementById('delivery-table-body');
  if (!tbody) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const searchQuery = (document.getElementById('delivery-search-input')?.value || '').toLowerCase().trim();

  const dayDeliveries = deliveryLogs.filter(d => d.date === selectedDate);
  const filtered = dayDeliveries.filter(d => 
    (d.transporterName || '').toLowerCase().includes(searchQuery) ||
    (d.customerName || '').toLowerCase().includes(searchQuery) ||
    (d.vehicleNo || '').toLowerCase().includes(searchQuery)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 36px 16px; color: var(--color-text-dim);">
          <div style="font-size: 0.95rem; font-weight: 600; color: #fff; margin-bottom: 4px;">
            ${isMarathi ? 'आजच्या तारखेसाठी कोणतीही डिलिव्हरी नोंद नाही' : 'No Delivery Dispatches on ' + selectedDate}
          </div>
          <div style="font-size: 0.8rem;">
            ${isMarathi ? 'नवीन रवानगी नोंदवण्यासाठी वरील फॉर्म भरा.' : 'Use the dispatch form above to record delivery by Trolley or Truck.'}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(d => {
    const isTrolley = d.vehicleType === 'Trolley';
    const badgeHtml = isTrolley
      ? `<span class="badge-vehicle-trolley">🚜 ${isMarathi ? 'ट्रॉली' : 'Trolley'}</span>`
      : `<span class="badge-vehicle-truck">🚚 ${isMarathi ? 'ट्रक' : 'Truck'}</span>`;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-weight: 700; color: #fff;">${d.transporterName}</div>
            <span style="font-size: 0.72rem; color: #34D399; opacity: 0.85;" title="Live synced in Firebase Cloud Firestore">☁️</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--color-text-dim);">
            ${d.vehicleNo !== '--' ? d.vehicleNo : ''} ${d.phone && d.phone !== '--' ? '• 📞 ' + d.phone : ''}
          </div>
        </td>
        <td>${badgeHtml}</td>
        <td>
          <strong style="color: #fff; font-size: 0.95rem;">${Number(d.brickCount).toLocaleString('en-IN')}</strong>
          <span style="font-size: 0.75rem; color: var(--color-text-dim); margin-left: 2px;">${isMarathi ? 'विटा' : 'Bricks'}</span>
        </td>
        <td>
          <div style="font-weight: 600;">${d.customerName}</div>
        </td>
        <td style="color: var(--color-text-dim); font-size: 0.82rem;">${d.date}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-table-action btn-del" onclick="deleteDeliveryEntry('${d.id}')" title="Delete Delivery Record">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteDeliveryEntry = function(id) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  if (confirm(isMarathi ? 'ही डिलिव्हरी नोंद हटवायची का?' : 'Delete this delivery record?')) {
    const targetDel = deliveryLogs.find(d => d.id === id);
    deliveryLogs = deliveryLogs.filter(d => d.id !== id);
    if (typeof fbDeleteDoc === 'function') fbDeleteDoc(FB_COLLECTIONS.DELIVERY_LOGS, id);
    saveToLocalStorage();
    if (targetDel) {
      const trp = storedTransporters.find(t => t.name === targetDel.transporterName);
      if (trp && typeof syncTransporterToCloud === 'function') syncTransporterToCloud(trp);
    }
    refreshDashboard();
    showAdminToast(isMarathi ? 'डिलिव्हरी नोंद हटवली.' : 'Delivery record removed.');
  }
};

window.exportDeliveryCSV = function() {
  const dayDeliveries = deliveryLogs.filter(d => d.date === selectedDate);
  if (dayDeliveries.length === 0) {
    alert('No delivery records available to export for ' + selectedDate);
    return;
  }

  let csv = 'Date,Transporter Name,Vehicle Type,Vehicle Number,Bricks Delivered,Customer Destination,Driver Phone\n';
  dayDeliveries.forEach(d => {
    csv += `"${d.date}","${d.transporterName}","${d.vehicleType}","${d.vehicleNo}",${d.brickCount},"${d.customerName}","${d.phone || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sukhakarta_Bricks_Deliveries_${selectedDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showAdminToast('📥 Delivery CSV exported.');
};

window.scrollToDeliveryForm = function() {
  const sec = document.getElementById('section-deliveries');
  if (sec) {
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const input = document.getElementById('delivery-transporter-input');
      if (input) input.focus();
    }, 450);
  }
};

// ==========================================
// ESCAPE HTML HELPER
// ==========================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==========================================
// RENDER WEBSITE CUSTOMER INQUIRIES & LEADS
// ==========================================
function renderInquiriesTable() {
  const tbody = document.getElementById('inquiries-table-body');
  const countBadge = document.getElementById('badge-inquiries-count');
  if (!tbody) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const searchTerm = (document.getElementById('inquiries-search-input')?.value || '').trim().toLowerCase();

  let filtered = (websiteInquiries || []).slice().reverse(); // newest first
  if (searchTerm) {
    filtered = filtered.filter(item => {
      const name = (item.name || '').toLowerCase();
      const phone = (item.phone || '').toLowerCase();
      const location = (item.location || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      return name.includes(searchTerm) || phone.includes(searchTerm) || location.includes(searchTerm) || type.includes(searchTerm) || notes.includes(searchTerm);
    });
  }

  if (countBadge) {
    if (websiteInquiries.length > 0) {
      countBadge.textContent = websiteInquiries.length;
      countBadge.style.display = 'inline-block';
    } else {
      countBadge.style.display = 'none';
    }
  }

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px 20px; color: var(--color-text-dim);">
          <div style="font-size: 2rem; margin-bottom: 8px;">📬</div>
          <div style="font-weight: 700; font-size: 1rem; color: var(--color-text-main); margin-bottom: 4px;">
            ${isMarathi ? 'अद्याप कोणत्याही वेबसाइट चौकशा नाहीत' : 'No Website Inquiries Found'}
          </div>
          <div style="font-size: 0.85rem;">
            ${isMarathi ? 'वेबसाईटवरून येणाऱ्या सर्व कोटेशन्स व चौकशा येथे आपोआप लाईव्ह दिसतील.' : 'Customer quote inquiries submitted on the main website will sync here automatically in real time.'}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(inq => {
    const tr = document.createElement('tr');
    
    // Format timestamp nicely
    let formattedDate = 'Recent';
    if (inq.timestampStr) {
      try {
        const d = new Date(inq.timestampStr);
        formattedDate = d.toLocaleDateString(isMarathi ? 'mr-IN' : 'en-IN', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch (e) {}
    } else if (inq.receivedAt && typeof inq.receivedAt.toDate === 'function') {
      try {
        formattedDate = inq.receivedAt.toDate().toLocaleDateString(isMarathi ? 'mr-IN' : 'en-IN', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch (e) {}
    }

    const cleanPhone = (inq.phone || '').replace(/\D/g, '');
    const validPhone = cleanPhone.length >= 10 ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : '';
    const waReplyMsg = encodeURIComponent(
      `Hello ${inq.name || 'Sir/Madam'}, thank you for inquiring with Sukhakarta Bricks regarding ${inq.quantity || 'bricks'} for ${inq.location || 'your site'}. We can dispatch fresh kiln-burnt red bricks at competitive rates. When would you like delivery?`
    );
    const waLink = validPhone ? `https://wa.me/${validPhone}?text=${waReplyMsg}` : '#';

    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(184, 51, 42, 0.12); color: var(--color-terracotta); font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; justify-content: center;">
            ${escapeHtml((inq.name || 'C').charAt(0).toUpperCase())}
          </div>
          <div>
            <strong>${escapeHtml(inq.name || 'Customer')}</strong>
            <div style="font-size: 0.72rem; color: var(--color-text-dim);">
              ${inq.source === 'calculator_estimate' ? '🧮 Calculator Quote' : '📝 Direct Web Form'}
            </div>
          </div>
        </div>
      </td>
      <td>
        ${validPhone ? `
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" style="color: #10B981; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
            <span>💬 ${escapeHtml(inq.phone)}</span>
          </a>
        ` : `<span>${escapeHtml(inq.phone || '-')}</span>`}
      </td>
      <td>
        <span style="font-weight: 600;">📍 ${escapeHtml(inq.location || 'Pune')}</span>
      </td>
      <td>
        <span class="badge-status" style="background: rgba(184, 51, 42, 0.12); color: var(--color-terracotta); font-weight: 800;">
          ${escapeHtml(inq.quantity || '-')}
        </span>
      </td>
      <td>
        <span style="font-size: 0.85rem;">${escapeHtml(inq.type || 'Standard Clay Bricks')}</span>
      </td>
      <td>
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-main);">${escapeHtml(formattedDate)}</div>
        ${inq.notes ? `<div style="font-size: 0.75rem; color: var(--color-text-dim); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(inq.notes)}">${escapeHtml(inq.notes)}</div>` : ''}
        ${inq.preferredDate ? `<div style="font-size: 0.72rem; color: var(--color-terracotta);">🗓 Delivery: ${escapeHtml(inq.preferredDate)}</div>` : ''}
      </td>
      <td style="text-align: right;">
        <div style="display: inline-flex; align-items: center; gap: 6px;">
          ${validPhone ? `
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn-admin btn-outline" style="padding: 4px 10px; font-size: 0.75rem; text-decoration: none; border-color: #10B981; color: #10B981;" title="Chat with customer on WhatsApp">
              💬 ${isMarathi ? 'व्हॉट्सॲप' : 'Reply'}
            </a>
          ` : ''}
          <button type="button" class="btn-action-icon" onclick="deleteInquiry('${escapeHtml(inq.id)}')" title="Delete Inquiry">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteInquiry = async function(id) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  if (confirm(isMarathi ? 'ही ग्राहक चौकशी हटवायची का?' : 'Delete this customer inquiry?')) {
    websiteInquiries = websiteInquiries.filter(inq => inq.id !== id);
    localStorage.setItem('sukhakarta_inquiries', JSON.stringify(websiteInquiries));
    if (typeof fbDeleteDoc === 'function') {
      await fbDeleteDoc(FB_COLLECTIONS.INQUIRIES, id);
    }
    renderInquiriesTable();
    showAdminToast(isMarathi ? 'चौकशी नोंद हटवली.' : 'Inquiry removed.');
  }
};

window.refreshInquiriesFromCloud = async function() {
  if (typeof fbFetchCollection !== 'function') return;
  showAdminToast('🔄 Fetching inquiries from Cloud Firestore...');
  try {
    const list = await fbFetchCollection(FB_COLLECTIONS.INQUIRIES);
    if (Array.isArray(list)) {
      websiteInquiries = list;
      localStorage.setItem('sukhakarta_inquiries', JSON.stringify(websiteInquiries));
      renderInquiriesTable();
      showAdminToast(`✅ Refreshed ${websiteInquiries.length} inquiries from Cloud.`);
    }
  } catch (e) {
    console.error('Failed to refresh inquiries:', e);
    showAdminToast('⚠️ Could not refresh inquiries from Cloud.');
  }
};

// ==========================================
// EXPORT ALL DATA IN PDF FORM (COMPLETE DATABASE)
// ==========================================
window.exportCompleteDataPDF = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

  // 1. Metric Calculations
  const dayLogs = (productionLogs || []).filter(l => l.date === selectedDate);
  const todayManufactured = dayLogs.reduce((acc, curr) => acc + (Number(curr.netCount) || 0), 0);
  const totalWagesToday = dayLogs.reduce((acc, curr) => acc + (Number(curr.wage) || 0), 0);
  const allTimeManufactured = (productionLogs || []).reduce((acc, curr) => acc + (Number(curr.netCount) || 0), 0);
  const allTimeDelivered = (deliveryLogs || []).reduce((acc, curr) => acc + (Number(curr.brickCount) || 0), 0);
  const dayDeliveries = (deliveryLogs || []).filter(d => d.date === selectedDate);
  const todayDelivered = dayDeliveries.reduce((acc, curr) => acc + (Number(curr.brickCount) || 0), 0);
  const stockBalance = Math.max(0, allTimeManufactured - allTimeDelivered);

  const activeWorkerIds = new Set(dayLogs.map(l => l.workerId));
  const activeWorkersToday = activeWorkerIds.size;

  const trolleyAll = (deliveryLogs || []).filter(d => d.vehicleType === 'Trolley');
  const trolleyBricks = trolleyAll.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);
  const truckAll = (deliveryLogs || []).filter(d => d.vehicleType === 'Truck');
  const truckBricks = truckAll.reduce((a, c) => a + (Number(c.brickCount) || 0), 0);

  // Formatted date stamp
  const now = new Date();
  const timestampStr = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // 2. Build HTML Tables
  // Workers Table
  let workersTableHtml = '';
  if (!workers || workers.length === 0) {
    workersTableHtml = `<tr><td colspan="8" style="text-align:center; padding:12px; color:#666;">No worker records found.</td></tr>`;
  } else {
    workers.forEach((w, index) => {
      const wLeaves = (workerLeaves || []).filter(lv => lv.workerId === w.id);
      const leaveCount = wLeaves.length;
      const wDayLogs = dayLogs.filter(l => l.workerId === w.id);
      const dayNet = wDayLogs.reduce((a, l) => a + (Number(l.netCount) || 0), 0);
      const dayWage = wDayLogs.reduce((a, l) => a + (Number(l.wage) || 0), 0);
      const allLogs = (productionLogs || []).filter(l => l.workerId === w.id);
      const totalNet = allLogs.reduce((a, l) => a + (Number(l.netCount) || 0), 0);
      const totalWage = allLogs.reduce((a, l) => a + (Number(l.wage) || 0), 0);
      const target = w.dailyTarget || 1500;
      const extraBricks = dayNet > target ? dayNet - target : 0;

      workersTableHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 7px 8px; font-weight: 600; color: #1e293b; word-break: break-word;">${index + 1}. ${w.name}</td>
          <td style="padding: 7px 8px; color: #475569; font-size: 11px; word-break: break-word;">${w.role || 'Molder'}</td>
          <td style="padding: 7px 8px; text-align: center; color: #475569;">₹${w.pieceRate || 850}</td>
          <td style="padding: 7px 8px; text-align: center; color: #475569;">${target.toLocaleString('en-IN')}</td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #0f172a;">
            ${dayNet.toLocaleString('en-IN')}
            ${extraBricks > 0 ? `<span style="color:#059669; font-size:10px;">(+${extraBricks})</span>` : ''}
          </td>
          <td style="padding: 7px 8px; text-align: right; color: #059669; font-weight: 600;">₹${Math.round(dayWage).toLocaleString('en-IN')}</td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #b84528;">${totalNet.toLocaleString('en-IN')}</td>
          <td style="padding: 7px 8px; text-align: center; color: ${leaveCount > 0 ? '#dc2626' : '#64748b'}; font-weight: ${leaveCount > 0 ? '700' : 'normal'};">
            ${leaveCount} ${isMarathi ? 'दिवस' : 'days'}
          </td>
        </tr>
      `;
    });
  }

  // Production Logs Table (All logs)
  let prodLogsHtml = '';
  const allLogsList = productionLogs || [];
  if (allLogsList.length === 0) {
    prodLogsHtml = `<tr><td colspan="7" style="text-align:center; padding:12px; color:#666;">No production logs recorded yet.</td></tr>`;
  } else {
    // Show up to latest 60 logs sorted by date descending
    const sortedLogs = [...allLogsList].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    sortedLogs.slice(0, 60).forEach((l, index) => {
      prodLogsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${l.date}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #1e293b; word-break: break-word;">${l.workerName}</td>
          <td style="padding: 6px 8px; color: #475569; font-size: 11px; word-break: break-word;">${l.task}</td>
          <td style="padding: 6px 8px; text-align: center; color: #64748b; font-size: 11px;">${l.shift || 'General'}</td>
          <td style="padding: 6px 8px; text-align: right; color: #475569;">${Number(l.grossCount || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #0f172a;">${Number(l.netCount || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 600; color: #059669;">₹${Math.round(l.wage || 0).toLocaleString('en-IN')}</td>
        </tr>
      `;
    });
  }

  // Delivery Logs Table (All deliveries)
  let deliveryTableHtml = '';
  const allDeliveries = deliveryLogs || [];
  if (allDeliveries.length === 0) {
    deliveryTableHtml = `<tr><td colspan="7" style="text-align:center; padding:12px; color:#666;">No delivery shipments recorded yet.</td></tr>`;
  } else {
    allDeliveries.forEach((d, index) => {
      const isTrolley = d.vehicleType === 'Trolley';
      const badgeIcon = isTrolley ? '🚜' : '🚚';
      const badgeLabel = isTrolley ? 'Tractor Trolley' : 'Heavy Truck';

      deliveryTableHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${d.date}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #1e293b; word-break: break-word;">${d.transporterName}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${badgeIcon} ${badgeLabel}</td>
          <td style="padding: 6px 8px; font-size: 11px; font-family: monospace; color: #334155;">${d.vehicleNo && d.vehicleNo !== '--' ? d.vehicleNo : '-'}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #b84528;">${Number(d.brickCount || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; color: #1e293b; font-size: 11px; word-break: break-word;">${d.customerName || '-'}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #64748b;">${d.phone && d.phone !== '--' ? d.phone : '-'}</td>
        </tr>
      `;
    });
  }

  // Raw Materials (Soil & Coal Inward) Table
  let rawMaterialsTableHtml = '';
  const allRawMaterials = typeof rawMaterials !== 'undefined' ? (rawMaterials || []) : [];
  if (allRawMaterials.length === 0) {
    rawMaterialsTableHtml = `<tr><td colspan="7" style="text-align:center; padding:12px; color:#666;">No raw material inward records found.</td></tr>`;
  } else {
    allRawMaterials.slice(0, 50).forEach((rm, index) => {
      const isSoil = rm.materialType === 'Soil';
      rawMaterialsTableHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${rm.date || '-'}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #1e293b; word-break: break-word;">${isSoil ? '🌱 Red Soil (माती)' : '⚫ Black Coal (कोळसा)'}</td>
          <td style="padding: 6px 8px; color: #1e293b; font-size: 11px; word-break: break-word;">${rm.supplierName || '-'}</td>
          <td style="padding: 6px 8px; font-size: 11px; font-family: monospace; color: #334155;">${rm.vehicleNo || '-'}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #0f172a;">${rm.quantity || 0} ${rm.unit || 'Brass'}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 600; color: #b84528;">₹${Number(rm.totalCost || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${rm.paidStatus || 'Paid'}</td>
        </tr>
      `;
    });
  }

  // Stored Transporters Table
  let transportersTableHtml = '';
  const trpList = typeof storedTransporters !== 'undefined' ? (storedTransporters || []) : [];
  if (trpList.length === 0) {
    transportersTableHtml = `<tr><td colspan="5" style="text-align:center; padding:12px; color:#666;">No registered transporters found.</td></tr>`;
  } else {
    trpList.forEach((t, index) => {
      const isTrolley = t.vehicleType === 'Trolley';
      transportersTableHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 6px 8px; text-align: center; color: #64748b; font-size: 11px;">${index + 1}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #1e293b; word-break: break-word;">${t.name}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${isTrolley ? '🚜 Tractor Trolley' : '🚚 Heavy Truck'}</td>
          <td style="padding: 6px 8px; font-size: 11px; font-family: monospace; color: #334155;">${t.vehicleNo || '-'}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #64748b;">${t.phone || '-'}</td>
        </tr>
      `;
    });
  }

  // 3. Assemble Complete Printable Document
  const reportHtml = `
    <div style="font-family: 'Noto Sans Devanagari', 'Mukta', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; background: #ffffff; padding: 22px 24px; line-height: 1.4; width: 760px; max-width: 760px; min-width: 760px; margin: 0; box-sizing: border-box; text-align: left; letter-spacing: normal;">
      
      <!-- Top Letterhead -->
      <div style="border-bottom: 3px solid #b84528; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; width: 100%; box-sizing: border-box;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 26px;">🧱</span>
            <div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #b84528; letter-spacing: 0.5px;">SUKHAKARTA BRICKS</h1>
              <div style="font-size: 14px; font-weight: 700; color: #7c2d12; font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; letter-spacing: normal; text-transform: none;">सुखकर्ता ब्रिक्स उत्पादन, रवानगी व आवक अहवाल</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 5px;">
            📍 Premium Quality Red Clay Kiln Bricks • Saswad / Pune, Maharashtra
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <div style="display: inline-block; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase;">
            OFFICIAL DATABASE RECORD
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            <strong>Generated:</strong> ${timestampStr}
          </div>
          <div style="font-size: 11px; color: #475569;">
            <strong>Filtered Date:</strong> ${selectedDate || 'All-Time'}
          </div>
        </div>
      </div>

      <!-- Executive KPI Metric Summary Grid -->
      <div style="margin-bottom: 22px; width: 100%; box-sizing: border-box;">
        <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 8px; border-left: 3px solid #b84528; padding-left: 8px; letter-spacing: normal;">
          <span style="text-transform: uppercase; letter-spacing: 0.5px;">1. Executive KPI Summary</span>
          <span style="color: #64748b; font-weight: 600; letter-spacing: normal;"> / </span>
          <span style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; font-weight: 700; letter-spacing: normal; text-transform: none;">मुख्य सांख्यिकी</span>
        </div>
        <div style="display: flex; gap: 10px; width: 100%; box-sizing: border-box;">
          <!-- Lifetime Manufactured -->
          <div style="flex: 1 1 0; min-width: 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; box-sizing: border-box;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b;">Total Manufactured</div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 2px 0;">${allTimeManufactured.toLocaleString('en-IN')}</div>
            <div style="font-size: 10px; color: #059669; font-weight: 600;">Today: ${todayManufactured.toLocaleString('en-IN')}</div>
          </div>

          <!-- Lifetime Delivered -->
          <div style="flex: 1 1 0; min-width: 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; box-sizing: border-box;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b;">Total Delivered</div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 2px 0;">${allTimeDelivered.toLocaleString('en-IN')}</div>
            <div style="font-size: 10px; color: #2563eb; font-weight: 600;">Today: ${todayDelivered.toLocaleString('en-IN')}</div>
          </div>

          <!-- Current Stock Balance -->
          <div style="flex: 1 1 0; min-width: 0; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px; box-sizing: border-box;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #166534;">Kiln Stock Balance</div>
            <div style="font-size: 18px; font-weight: 900; color: #15803d; margin: 2px 0;">${stockBalance.toLocaleString('en-IN')}</div>
            <div style="font-size: 10px; color: #166534;">Bricks Ready in Yard</div>
          </div>

          <!-- Total Wages & Workforce -->
          <div style="flex: 1 1 0; min-width: 0; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 12px; box-sizing: border-box;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #9a3412;">Wages on ${selectedDate || 'Today'}</div>
            <div style="font-size: 18px; font-weight: 900; color: #c2410c; margin: 2px 0;">₹${Math.round(totalWagesToday).toLocaleString('en-IN')}</div>
            <div style="font-size: 10px; color: #9a3412;">${activeWorkersToday} / ${workers.length} active workers</div>
          </div>
        </div>

        <!-- Vehicle Logistics Summary Bar -->
        <div style="margin-top: 8px; display: flex; gap: 10px; width: 100%; box-sizing: border-box;">
          <div style="flex: 1 1 0; min-width: 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
            <span style="font-size: 11px; font-weight: 600; color: #334155;">🚜 Tractor Trolley Logistics:</span>
            <span style="font-size: 12px; font-weight: 800; color: #0f172a;">${trolleyBricks.toLocaleString('en-IN')} bricks (${trolleyAll.length} trips)</span>
          </div>
          <div style="flex: 1 1 0; min-width: 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
            <span style="font-size: 11px; font-weight: 600; color: #334155;">🚚 Heavy Truck Logistics:</span>
            <span style="font-size: 12px; font-weight: 800; color: #0f172a;">${truckBricks.toLocaleString('en-IN')} bricks (${truckAll.length} trips)</span>
          </div>
        </div>
      </div>

      <!-- Section 1: Workers Directory & Performance -->
      <div style="margin-bottom: 24px; page-break-inside: auto; break-inside: auto; width: 100%; box-sizing: border-box;">
        <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 8px; border-left: 3px solid #b84528; padding-left: 8px; display: flex; justify-content: space-between; align-items: center; page-break-after: avoid; break-after: avoid; letter-spacing: normal;">
          <div>
            <span style="text-transform: uppercase; letter-spacing: 0.5px;">2. Workers Roster & Performance</span>
            <span style="color: #64748b; font-weight: 600; letter-spacing: normal;"> / </span>
            <span style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; font-weight: 700; letter-spacing: normal; text-transform: none;">कामगारांचे विवरण</span>
            <span style="font-size: 12px; color: #64748b; font-weight: 600; letter-spacing: normal;"> (${workers.length} Total Workers)</span>
          </div>
          <span style="font-size: 11px; font-weight: normal; color: #64748b; text-transform: none; letter-spacing: normal;">Rates, Target Limits, Production & Leaves</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1; text-align: left; table-layout: fixed;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; page-break-inside: avoid; break-inside: avoid;">
              <th style="padding: 8px; font-weight: 700; width: 18%;">Worker Name</th>
              <th style="padding: 8px; font-weight: 700; width: 12%;">Role</th>
              <th style="padding: 8px; font-weight: 700; text-align: center; width: 9%;">Rate/1k</th>
              <th style="padding: 8px; font-weight: 700; text-align: center; width: 12%;">Daily Target</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 14%;">Output (${selectedDate || 'Day'})</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 12%;">Wage (${selectedDate || 'Day'})</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 13%;">Total Mfg Bricks</th>
              <th style="padding: 8px; font-weight: 700; text-align: center; width: 10%;">Leaves</th>
            </tr>
          </thead>
          <tbody>
            ${workersTableHtml}
          </tbody>
        </table>
      </div>

      <!-- Section 2: Brick Deliveries & Dispatch Logistics Log -->
      <div style="margin-bottom: 24px; page-break-inside: auto; break-inside: auto; width: 100%; box-sizing: border-box;">
        <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 8px; border-left: 3px solid #2563eb; padding-left: 8px; display: flex; justify-content: space-between; align-items: center; page-break-after: avoid; break-after: avoid; letter-spacing: normal;">
          <div>
            <span style="text-transform: uppercase; letter-spacing: 0.5px;">3. Brick Deliveries & Dispatches</span>
            <span style="color: #64748b; font-weight: 600; letter-spacing: normal;"> / </span>
            <span style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; font-weight: 700; letter-spacing: normal; text-transform: none;">विटांची रवानगी व डिलिव्हरी</span>
            <span style="font-size: 12px; color: #64748b; font-weight: 600; letter-spacing: normal;"> (${allDeliveries.length} Shipments)</span>
          </div>
          <span style="font-size: 11px; font-weight: normal; color: #64748b; text-transform: none; letter-spacing: normal;">Tractor Trolley & Truck dispatches</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1; text-align: left; table-layout: fixed;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; page-break-inside: avoid; break-inside: avoid;">
              <th style="padding: 8px; font-weight: 700; width: 13%;">Dispatch Date</th>
              <th style="padding: 8px; font-weight: 700; width: 20%;">Transporter Name</th>
              <th style="padding: 8px; font-weight: 700; width: 15%;">Vehicle Type</th>
              <th style="padding: 8px; font-weight: 700; width: 14%;">Vehicle No</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 12%;">Delivered Bricks</th>
              <th style="padding: 8px; font-weight: 700; width: 14%;">Customer / Site</th>
              <th style="padding: 8px; font-weight: 700; width: 12%;">Contact Phone</th>
            </tr>
          </thead>
          <tbody>
            ${deliveryTableHtml}
          </tbody>
        </table>
      </div>

      <!-- Section 3: Daily Production Logs -->
      <div style="margin-bottom: 24px; page-break-inside: auto; break-inside: auto; width: 100%; box-sizing: border-box;">
        <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 8px; border-left: 3px solid #059669; padding-left: 8px; display: flex; justify-content: space-between; align-items: center; page-break-after: avoid; break-after: avoid; letter-spacing: normal;">
          <div>
            <span style="text-transform: uppercase; letter-spacing: 0.5px;">4. Daily Manufacturing Logs</span>
            <span style="color: #64748b; font-weight: 600; letter-spacing: normal;"> / </span>
            <span style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; font-weight: 700; letter-spacing: normal; text-transform: none;">दैनिक उत्पादन नोंदी</span>
            <span style="font-size: 12px; color: #64748b; font-weight: 600; letter-spacing: normal;"> (${allLogsList.length} Total Records)</span>
          </div>
          <span style="font-size: 11px; font-weight: normal; color: #64748b; text-transform: none; letter-spacing: normal;">Shift-wise gross, rejection & approved net output</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1; text-align: left; table-layout: fixed;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; page-break-inside: avoid; break-inside: avoid;">
              <th style="padding: 8px; font-weight: 700; width: 13%;">Date</th>
              <th style="padding: 8px; font-weight: 700; width: 22%;">Worker Name</th>
              <th style="padding: 8px; font-weight: 700; width: 17%;">Process / Stage</th>
              <th style="padding: 8px; font-weight: 700; text-align: center; width: 11%;">Shift</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 12%;">Gross Bricks</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 12%;">Net Approved</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 13%;">Earned Wage</th>
            </tr>
          </thead>
          <tbody>
            ${prodLogsHtml}
          </tbody>
        </table>
      </div>

      <!-- Section 4: Raw Materials Inward (Soil & Coal) -->
      <div style="margin-bottom: 24px; page-break-inside: auto; break-inside: auto; width: 100%; box-sizing: border-box;">
        <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 8px; border-left: 3px solid #ea580c; padding-left: 8px; display: flex; justify-content: space-between; align-items: center; page-break-after: avoid; break-after: avoid; letter-spacing: normal;">
          <div>
            <span style="text-transform: uppercase; letter-spacing: 0.5px;">5. Raw Materials Inward</span>
            <span style="color: #64748b; font-weight: 600; letter-spacing: normal;"> / </span>
            <span style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; font-weight: 700; letter-spacing: normal; text-transform: none;">माती व कोळसा आवक नोंद</span>
            <span style="font-size: 12px; color: #64748b; font-weight: 600; letter-spacing: normal;"> (${allRawMaterials.length} Deliveries)</span>
          </div>
          <span style="font-size: 11px; font-weight: normal; color: #64748b; text-transform: none; letter-spacing: normal;">Red Soil & Black Coal procurement</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1; text-align: left; table-layout: fixed;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; page-break-inside: avoid; break-inside: avoid;">
              <th style="padding: 8px; font-weight: 700; width: 13%;">Date</th>
              <th style="padding: 8px; font-weight: 700; width: 20%;">Material</th>
              <th style="padding: 8px; font-weight: 700; width: 19%;">Supplier</th>
              <th style="padding: 8px; font-weight: 700; width: 14%;">Vehicle No</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 12%;">Quantity</th>
              <th style="padding: 8px; font-weight: 700; text-align: right; width: 12%;">Total Amount</th>
              <th style="padding: 8px; font-weight: 700; width: 10%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rawMaterialsTableHtml}
          </tbody>
        </table>
      </div>

      <!-- Section 5: Registered Transporters Fleet Directory -->
      <div style="margin-bottom: 28px; page-break-inside: auto; break-inside: auto; width: 100%; box-sizing: border-box;">
        <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 8px; border-left: 3px solid #7c3aed; padding-left: 8px; page-break-after: avoid; break-after: avoid; letter-spacing: normal;">
          <span style="text-transform: uppercase; letter-spacing: 0.5px;">6. Registered Transporters Directory</span>
          <span style="color: #64748b; font-weight: 600; letter-spacing: normal;"> / </span>
          <span style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; font-weight: 700; letter-spacing: normal; text-transform: none;">नोंदणीकृत ट्रान्सपोर्टर्स</span>
          <span style="font-size: 12px; color: #64748b; font-weight: 600; letter-spacing: normal;"> (${trpList.length} Records)</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1; text-align: left; table-layout: fixed;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; page-break-inside: avoid; break-inside: avoid;">
              <th style="padding: 8px; font-weight: 700; width: 6%; text-align: center;">#</th>
              <th style="padding: 8px; font-weight: 700; width: 34%;">Transporter / Driver Name</th>
              <th style="padding: 8px; font-weight: 700; width: 22%;">Vehicle Type</th>
              <th style="padding: 8px; font-weight: 700; width: 20%;">Vehicle Number</th>
              <th style="padding: 8px; font-weight: 700; width: 18%;">Contact Phone</th>
            </tr>
          </thead>
          <tbody>
            ${transportersTableHtml}
          </tbody>
        </table>
      </div>

      <!-- Signatures & Authorization Block -->
      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #cbd5e1; display: flex; justify-content: space-between; page-break-inside: avoid; break-inside: avoid; width: 100%; box-sizing: border-box;">
        <div style="width: 220px; text-align: center;">
          <div style="height: 45px;"></div>
          <div style="border-top: 1px solid #475569; padding-top: 4px; font-size: 11px; font-weight: 700; color: #1e293b; letter-spacing: normal;">
            Kiln Supervisor / <span style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; letter-spacing: normal; text-transform: none;">मुकादम</span>
          </div>
          <div style="font-size: 10px; color: #64748b;">Signature & Verification</div>
        </div>

        <div style="width: 220px; text-align: center;">
          <div style="height: 45px;"></div>
          <div style="border-top: 1px solid #475569; padding-top: 4px; font-size: 11px; font-weight: 700; color: #1e293b; letter-spacing: normal;">
            Authorized Proprietor / <span style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; letter-spacing: normal; text-transform: none;">संचालक</span>
          </div>
          <div style="font-size: 10px; color: #64748b;">Sukhakarta Bricks Seal & Sign</div>
        </div>
      </div>

      <!-- Document Footer -->
      <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px; width: 100%; box-sizing: border-box;">
        Generated automatically by Sukhakarta Bricks Kiln Management System • Confidential Business Record • Page 1
      </div>

    </div>
  `;

  // 4. Create Element for PDF rendering
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'pdf-export-loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="pdf-export-spinner"></div>
    <h3>${isMarathi ? 'संपूर्ण डेटा PDF तयार होत आहे...' : 'Generating Complete Data PDF...'}</h3>
    <p>${isMarathi ? 'कृपया काही सेकंद प्रतीक्षा करा. अहवाल डाऊनलोड होत आहे.' : 'Compiling workers, production, deliveries, inward & transporter records...'}</p>
    <button type="button" id="btn-quick-print-fallback" style="margin-top: 10px; background: rgba(255,255,255,0.12); color: #ffffff; border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; padding: 7px 16px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
      🖨️ ${isMarathi ? 'थेट प्रिंट / सेव्ह पर्याय उघडा' : 'Direct Print / Save as PDF'}
    </button>
  `;
  document.body.appendChild(loadingOverlay);

  // In-flow content container with fixed 760px width and 0 margin to prevent left-side crop and right whitespace
  const reportContainer = document.createElement('div');
  reportContainer.id = 'sukhakarta-pdf-export-container';
  reportContainer.style.width = '760px';
  reportContainer.style.maxWidth = '760px';
  reportContainer.style.minWidth = '760px';
  reportContainer.style.margin = '0';
  reportContainer.style.padding = '0';
  reportContainer.style.backgroundColor = '#ffffff';
  reportContainer.style.color = '#0f172a';
  reportContainer.style.boxSizing = 'border-box';
  reportContainer.style.position = 'relative';
  reportContainer.style.left = '0';
  reportContainer.style.top = '0';
  reportContainer.style.textAlign = 'left';
  reportContainer.innerHTML = reportHtml;

  const cleanup = () => {
    if (loadingOverlay.parentNode) loadingOverlay.parentNode.removeChild(loadingOverlay);
    if (reportContainer.parentNode) reportContainer.parentNode.removeChild(reportContainer);
  };

  const btnPrintQuick = document.getElementById('btn-quick-print-fallback');
  if (btnPrintQuick) {
    btnPrintQuick.addEventListener('click', () => {
      cleanup();
      openPrintWindowFallback(reportHtml);
    });
  }

  const filename = `Sukhakarta_Bricks_Complete_Database_${selectedDate || 'Report'}.pdf`;

  // Wait for Google Fonts and layout to settle before snapshot
  const triggerPdfCapture = async () => {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn('Font load wait warning:', e);
      }
    }

    setTimeout(() => {
      if (typeof window.html2pdf !== 'undefined') {
        const opt = {
          margin: [8, 8, 8, 8],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            width: 760,
            windowWidth: 760
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        window.html2pdf().set(opt).from(reportContainer).save()
          .then(() => {
            cleanup();
            showAdminToast(isMarathi ? '✅ संपूर्ण डेटा PDF यशस्वीरित्या डाऊनलोड झाला!' : '✅ Complete database PDF downloaded successfully!');
          })
          .catch((err) => {
            console.error('html2pdf generation failed, falling back to print window:', err);
            cleanup();
            openPrintWindowFallback(reportHtml);
          });
      } else {
        cleanup();
        openPrintWindowFallback(reportHtml);
      }
    }, 300);
  };

  triggerPdfCapture();
};

// Robust Fallback Print Function (iframe-first to bypass popup blockers and avoid blank pages)
function openPrintWindowFallback(reportHtml) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

  const fontImports = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  `;

  // 1. Primary: Hidden iframe print (100% immune to popup blockers, renders full document directly)
  try {
    let oldFrame = document.getElementById('sukhakarta-print-frame');
    if (oldFrame && oldFrame.parentNode) oldFrame.parentNode.removeChild(oldFrame);

    const iframe = document.createElement('iframe');
    iframe.id = 'sukhakarta-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="${isMarathi ? 'mr' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <title>Sukhakarta Bricks - Database Report</title>
        ${fontImports}
        <style>
          @page { margin: 8mm; size: A4 portrait; }
          body { font-family: 'Noto Sans Devanagari', 'Mukta', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 16px; color: #0f172a; background: #ffffff; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${reportHtml}
      </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('Iframe print focus error, will fallback to window.open:', e);
      }
    }, 450);
    return;
  } catch (err) {
    console.warn('Iframe print error, falling back to window.open:', err);
  }

  // 2. Secondary: window.open fallback
  const printWin = window.open('', '_blank', 'width=950,height=800');
  if (!printWin) {
    alert(isMarathi ? 'कृपया PDF प्रिंट करण्यासाठी पॉप-अपला परवानगी द्या.' : 'Please allow pop-ups to open the PDF print dialog.');
    return;
  }
  printWin.document.open();
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="${isMarathi ? 'mr' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <title>Sukhakarta Bricks - Complete Data Report</title>
      ${fontImports}
      <style>
        @page { margin: 8mm; size: A4 portrait; }
        body { font-family: 'Noto Sans Devanagari', 'Mukta', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; background: #ffffff; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${reportHtml}
      <script>
        setTimeout(function() {
          window.focus();
          window.print();
        }, 400);
      <\/script>
    </body>
    </html>
  `);
  printWin.document.close();
}

// ==========================================
// WEBSITE LIVE SETTINGS MODULE (FIRESTORE)
// ==========================================
let currentAdminSiteSettings = null;

window.loadWebsiteSettingsIntoAdmin = async function() {
  if (typeof fbGetSiteSettings !== 'function') return;
  const settings = await fbGetSiteSettings();
  currentAdminSiteSettings = settings;

  const statusEl = document.getElementById('web-kiln-status');
  if (statusEl && settings.kilnStatus) statusEl.value = settings.kilnStatus;

  const statusMrEl = document.getElementById('web-kiln-status-mr');
  if (statusMrEl && settings.kilnStatusMr) statusMrEl.value = settings.kilnStatusMr;

  const rateBrickEl = document.getElementById('web-rate-brick');
  if (rateBrickEl && settings.ratePerBrick) rateBrickEl.value = settings.ratePerBrick;

  const rate1000El = document.getElementById('web-rate-1000');
  if (rate1000El && settings.ratePer1000) rate1000El.value = settings.ratePer1000;

  const stockEl = document.getElementById('web-stock-count');
  if (stockEl && settings.currentStock) stockEl.value = settings.currentStock;

  const capEl = document.getElementById('web-daily-capacity');
  if (capEl && settings.dailyCapacity) capEl.value = settings.dailyCapacity;

  const noticeEl = document.getElementById('web-notice');
  if (noticeEl && settings.notice) noticeEl.value = settings.notice;

  const noticeMrEl = document.getElementById('web-notice-mr');
  if (noticeMrEl && settings.noticeMr) noticeMrEl.value = settings.noticeMr;
};

function initWebsiteSettingsForm() {
  const form = document.getElementById('website-settings-form');
  if (!form) return;

  loadWebsiteSettingsIntoAdmin();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
    const status = document.getElementById('web-kiln-status')?.value || 'Active Firing & Dispatching';
    const statusMr = document.getElementById('web-kiln-status-mr')?.value || 'सक्रिय भट्टी भाजणे व जलद वाहतूक सुरू';
    const rateBrick = parseFloat(document.getElementById('web-rate-brick')?.value) || 9.5;
    const rate1000 = parseInt(document.getElementById('web-rate-1000')?.value, 10) || Math.round(rateBrick * 1000);
    const stock = parseInt(document.getElementById('web-stock-count')?.value, 10) || 42000;
    const capacity = parseInt(document.getElementById('web-daily-capacity')?.value, 10) || 25000;
    const notice = document.getElementById('web-notice')?.value || '';
    const noticeMr = document.getElementById('web-notice-mr')?.value || '';

    const newSettings = {
      ...(currentAdminSiteSettings || {}),
      kilnStatus: status,
      kilnStatusMr: statusMr,
      ratePerBrick: rateBrick,
      ratePer1000: rate1000,
      currentStock: stock,
      dailyCapacity: capacity,
      notice: notice,
      noticeMr: noticeMr
    };

    if (typeof fbSaveSiteSettings === 'function') {
      const ok = await fbSaveSiteSettings(newSettings);
      if (ok) {
        currentAdminSiteSettings = newSettings;
        showAdminToast(isMarathi 
          ? '✅ वेबसाइट सेटिंग्ज क्लाउडवर पब्लिश झाल्या!' 
          : '✅ Website live settings published to Firebase!');
      } else {
        showAdminToast('⚠️ Could not publish settings to Firebase.');
      }
    }
  });
}





// ==========================================
// RAW MATERIALS INWARD MODULE (SOIL & COAL)
// Importer Khata, Trucks, Total Value, Paid & Remaining Balance
// ==========================================

let rawMaterialFilterType = 'all'; // 'all', 'Soil', 'Coal', 'due'
let rawMaterialSearchQuery = '';

/**
 * Normalizes raw materials data to ensure mathematical integrity:
 * 1. An individual bill cannot be overpaid (amountPaid cannot exceed totalValue).
 * 2. Any excess payment on one bill is automatically credited to other pending bills of the same importer.
 * 3. remainingAmount is strictly Math.max(0, totalValue - amountPaid).
 */
window.normalizeRawMaterialsData = function() {
  if (!Array.isArray(rawMaterials) || rawMaterials.length === 0) return;

  const byImporter = {};
  rawMaterials.forEach(item => {
    const name = (item.importerName || '').trim();
    if (!byImporter[name]) byImporter[name] = [];
    byImporter[name].push(item);
  });

  let needsSave = false;

  Object.keys(byImporter).forEach(name => {
    const docs = byImporter[name];
    let excessPayment = 0;

    // Step 1: Detect overpayment on any bill and cap it
    docs.forEach(doc => {
      const val = Math.max(0, Number(doc.totalValue) || 0);
      let paid = Math.max(0, Number(doc.amountPaid) || 0);

      if (paid > val) {
        excessPayment += (paid - val);
        doc.amountPaid = val;
        doc.remainingAmount = 0;
        doc.status = 'paid';
        needsSave = true;
      } else {
        doc.remainingAmount = Math.max(0, val - paid);
        doc.status = doc.remainingAmount <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
      }
    });

    // Step 2: Apply excess credit to any unpaid/partial bills of the same importer
    if (excessPayment > 0) {
      docs.forEach(doc => {
        if (excessPayment <= 0) return;
        const val = Math.max(0, Number(doc.totalValue) || 0);
        const currentPaid = Math.max(0, Number(doc.amountPaid) || 0);
        const due = val - currentPaid;

        if (due > 0) {
          const credit = Math.min(due, excessPayment);
          doc.amountPaid = currentPaid + credit;
          doc.remainingAmount = Math.max(0, val - doc.amountPaid);
          doc.status = doc.remainingAmount <= 0 ? 'paid' : 'partial';
          excessPayment -= credit;
          needsSave = true;
        }
      });
    }
  });

  if (needsSave) {
    saveToLocalStorage();
    if (typeof syncRawMaterialToCloud === 'function') {
      rawMaterials.forEach(doc => {
        syncRawMaterialToCloud(doc);
      });
    } else if (typeof fbSaveDoc === 'function') {
      rawMaterials.forEach(doc => {
        fbSaveDoc(FB_COLLECTIONS.RAW_MATERIALS, doc.id, doc);
      });
    }
  }
};

window.initRawMaterialsModule = function() {
  const form = document.getElementById('raw-material-form');
  const dateInput = document.getElementById('raw-date');
  const totalInput = document.getElementById('raw-total-value');
  const paidInput = document.getElementById('raw-amount-paid');
  const searchInput = document.getElementById('raw-search-input');
  const paymentForm = document.getElementById('raw-payment-form');

  // Set default date to today or selectedDate
  if (dateInput && !dateInput.value) {
    dateInput.value = selectedDate || getTodayDateStr();
  }

  // Radio button pill styling toggle
  document.querySelectorAll('input[name="raw-material-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.material-type-pill').forEach(pill => pill.classList.remove('active'));
      const activePill = document.getElementById(e.target.value === 'Soil' ? 'pill-mat-soil' : 'pill-mat-coal');
      if (activePill) activePill.classList.add('active');
    });
  });

  // Live Auto-Calculation for Remaining Balance & Status
  function updateLiveRemainingPreview() {
    const total = parseFloat(totalInput?.value) || 0;
    const paid = parseFloat(paidInput?.value) || 0;
    const remaining = Math.max(0, total - paid);
    
    const previewEl = document.getElementById('preview-raw-remaining');
    const tagEl = document.getElementById('preview-raw-status-tag');
    const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

    if (previewEl) {
      previewEl.textContent = '₹' + remaining.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (remaining > 0) {
        previewEl.style.color = '#EF4444'; // Red for pending due
      } else if (total > 0 && remaining === 0) {
        previewEl.style.color = '#4ADE80'; // Green for paid
      } else {
        previewEl.style.color = '#4ADE80';
      }
    }

    if (tagEl) {
      if (total <= 0) {
        tagEl.innerHTML = `<span style="background: rgba(255,255,255,0.08); color: var(--color-text-dim); padding: 4px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 700;">—</span>`;
      } else if (remaining === 0) {
        tagEl.innerHTML = `<span style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); padding: 4px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 700;">✅ ${isMarathi ? 'पूर्ण भरले (Paid)' : 'Fully Paid'}</span>`;
      } else if (paid > 0) {
        tagEl.innerHTML = `<span style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 700;">⚠️ ${isMarathi ? 'अंशतः बाकी (Partial Due)' : 'Partial Due'}</span>`;
      } else {
        tagEl.innerHTML = `<span style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 700;">❌ ${isMarathi ? 'संपूर्ण बाकी (Unpaid)' : 'Unpaid Due'}</span>`;
      }
    }
  }

  if (totalInput) totalInput.addEventListener('input', updateLiveRemainingPreview);
  if (paidInput) paidInput.addEventListener('input', updateLiveRemainingPreview);

  // Inward Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

      const typeRadio = document.querySelector('input[name="raw-material-type"]:checked');
      const materialType = typeRadio ? typeRadio.value : 'Soil';
      const trucksCount = parseInt(document.getElementById('raw-trucks-count')?.value, 10) || 1;
      const importerName = (document.getElementById('raw-importer-name')?.value || '').trim();
      const importerPhone = (document.getElementById('raw-importer-phone')?.value || '').trim();
      const vehicleNo = (document.getElementById('raw-vehicle-no')?.value || '').trim().toUpperCase();
      const dateVal = document.getElementById('raw-date')?.value || selectedDate || getTodayDateStr();
      const totalValue = Math.max(0, parseFloat(document.getElementById('raw-total-value')?.value) || 0);
      let amountPaid = Math.max(0, parseFloat(document.getElementById('raw-amount-paid')?.value) || 0);
      
      // Amount paid on a delivery cannot exceed its total value
      if (amountPaid > totalValue) {
        amountPaid = totalValue;
      }
      
      const remainingAmount = Math.max(0, totalValue - amountPaid);
      const notes = (document.getElementById('raw-notes')?.value || '').trim();

      if (!importerName) {
        alert(isMarathi ? 'कृपया पुरवठादार / आयातदाराचे नाव प्रविष्ट करा.' : 'Please enter the importer/supplier name.');
        return;
      }

      if (trucksCount < 1) {
        alert(isMarathi ? 'कृपया किमान १ ट्रक संख्या प्रविष्ट करा.' : 'Please enter at least 1 truck.');
        return;
      }

      const status = remainingAmount <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');

      const newRecord = {
        id: 'RAW-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        date: dateVal,
        materialType,
        trucksCount,
        importerName,
        importerPhone,
        vehicleNo,
        totalValue,
        amountPaid,
        remainingAmount,
        status,
        notes,
        createdAt: new Date().toISOString()
      };

      rawMaterials.unshift(newRecord);
      normalizeRawMaterialsData();
      saveToLocalStorage();

      // Sync to Cloud Firestore
      if (typeof syncRawMaterialToCloud === 'function') {
        syncRawMaterialToCloud(newRecord);
      } else if (typeof fbSaveDoc === 'function') {
        fbSaveDoc(FB_COLLECTIONS.RAW_MATERIALS, newRecord.id, newRecord);
      }

      // Reset form
      form.reset();
      const dateInp = document.getElementById('raw-date');
      if (dateInp) dateInp.value = selectedDate || getTodayDateStr();
      updateLiveRemainingPreview();

      // Refresh UI
      renderRawMaterialsTable();
      updateRawMaterialsKPIs();

      showAdminToast(isMarathi 
        ? `✅ ${materialType === 'Soil' ? 'माती' : 'कोळसा'} आवक नोंद यशस्वी झाली! (${trucksCount} ट्रक - ${importerName})` 
        : `✅ Inward delivery recorded: ${trucksCount} trucks of ${materialType} from ${importerName}!`);
    });
  }

  // Search input filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      rawMaterialSearchQuery = e.target.value.toLowerCase().trim();
      renderRawMaterialsTable();
    });
  }

  // Payment Settlement Modal Form
  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
      const recordId = document.getElementById('raw-payment-entry-id')?.value;
      const additionalAmount = parseFloat(document.getElementById('raw-payment-add-amount')?.value) || 0;
      const payDate = document.getElementById('raw-payment-date')?.value || getTodayDateStr();
      const payNote = (document.getElementById('raw-payment-note')?.value || '').trim();

      if (!recordId) return;
      if (additionalAmount <= 0) {
        alert(isMarathi ? 'कृपया योग्य जमा रक्कम प्रविष्ट करा.' : 'Please enter a valid payment amount.');
        return;
      }

      const index = rawMaterials.findIndex(r => r.id === recordId);
      if (index === -1) return;

      const record = rawMaterials[index];
      const val = Math.max(0, Number(record.totalValue) || 0);
      const currentPaid = Math.max(0, Number(record.amountPaid) || 0);
      const currentDue = Math.max(0, val - currentPaid);

      if (currentDue <= 0) {
        alert(isMarathi ? 'या बिलाची सर्व रक्कम आधीच पूर्ण भरलेली आहे.' : 'This delivery bill is already fully settled.');
        closeRawPaymentModal();
        return;
      }

      // Cap payment to remaining due for this specific bill
      const actualPayment = Math.min(currentDue, additionalAmount);

      record.amountPaid = currentPaid + actualPayment;
      record.remainingAmount = Math.max(0, val - record.amountPaid);
      record.status = record.remainingAmount <= 0 ? 'paid' : 'partial';
      const paymentRemark = `Paid ₹${actualPayment.toLocaleString('en-IN')} on ${payDate}${payNote ? ` (${payNote})` : ''}`;
      record.notes = (record.notes ? record.notes + ' | ' : '') + paymentRemark;
      record.updatedAt = new Date().toISOString();

      normalizeRawMaterialsData();
      saveToLocalStorage();

      if (typeof syncRawMaterialToCloud === 'function') {
        syncRawMaterialToCloud(record);
      } else if (typeof fbSaveDoc === 'function') {
        fbSaveDoc(FB_COLLECTIONS.RAW_MATERIALS, record.id, record);
      }

      closeRawPaymentModal();
      renderRawMaterialsTable();
      updateRawMaterialsKPIs();

      showAdminToast(isMarathi 
        ? `✅ ₹${actualPayment.toLocaleString('en-IN')} पेमेंट जमा झाले! (उर्वरित बाकी: ₹${record.remainingAmount.toLocaleString('en-IN')})` 
        : `✅ Payment of ₹${actualPayment.toLocaleString('en-IN')} recorded! Balance due: ₹${record.remainingAmount.toLocaleString('en-IN')}`);
    });
  }

  // Normalize data and do initial render of KPIs and table
  normalizeRawMaterialsData();
  updateRawMaterialsKPIs();
  renderRawMaterialsTable();
};

window.updateRawMaterialsKPIs = function() {
  const list = rawMaterials || [];
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const todayStr = selectedDate || getTodayDateStr();
  
  let soilTrucks = 0;
  let coalTrucks = 0;
  let soilTrucksToday = 0;
  let coalTrucksToday = 0;
  let totalValue = 0;
  let totalPaid = 0;

  // Importer tracking
  const importersMap = {};

  list.forEach(item => {
    const trucks = Number(item.trucksCount) || 0;
    const isToday = item.date === todayStr;

    if (item.materialType === 'Soil') {
      soilTrucks += trucks;
      if (isToday) soilTrucksToday += trucks;
    } else if (item.materialType === 'Coal') {
      coalTrucks += trucks;
      if (isToday) coalTrucksToday += trucks;
    }

    const val = Math.max(0, Number(item.totalValue) || 0);
    const paid = Math.max(0, Number(item.amountPaid) || 0);

    totalValue += val;
    totalPaid += paid;

    const impName = (item.importerName || '').trim();
    if (impName) {
      if (!importersMap[impName]) {
        importersMap[impName] = { name: impName, trucks: 0, totalVal: 0, totalPaid: 0, totalDue: 0, material: item.materialType };
      }
      importersMap[impName].trucks += trucks;
      importersMap[impName].totalVal += val;
      importersMap[impName].totalPaid += paid;
    }
  });

  // Calculate Net Remaining Due with strict mathematical consistency
  const totalRemaining = Math.max(0, totalValue - totalPaid);

  // Calculate each supplier's net balance due
  Object.values(importersMap).forEach(imp => {
    imp.totalDue = Math.max(0, imp.totalVal - imp.totalPaid);
  });

  // KPI elements
  const soilEl = document.getElementById('kpi-raw-soil-trucks');
  const coalEl = document.getElementById('kpi-raw-coal-trucks');
  const soilSubEl = document.getElementById('kpi-raw-soil-subtitle');
  const coalSubEl = document.getElementById('kpi-raw-coal-subtitle');
  const soilTodayTag = document.getElementById('raw-soil-today-tag');
  const coalTodayTag = document.getElementById('raw-coal-today-tag');

  const valEl = document.getElementById('kpi-raw-total-value');
  const paidEl = document.getElementById('kpi-raw-total-paid');
  const remEl = document.getElementById('kpi-raw-total-due');

  if (soilEl) soilEl.textContent = soilTrucks.toLocaleString('en-IN');
  if (coalEl) coalEl.textContent = coalTrucks.toLocaleString('en-IN');
  if (soilSubEl) soilSubEl.textContent = `${soilTrucks.toLocaleString('en-IN')} ${isMarathi ? 'एकूण मातीचे ट्रक' : 'Total Soil Trucks'}`;
  if (coalSubEl) coalSubEl.textContent = `${coalTrucks.toLocaleString('en-IN')} ${isMarathi ? 'एकूण कोळशाचे ट्रक' : 'Total Coal Trucks'}`;
  if (soilTodayTag) soilTodayTag.textContent = `${isMarathi ? 'आज' : 'Today'}: ${soilTrucksToday}`;
  if (coalTodayTag) coalTodayTag.textContent = `${isMarathi ? 'आज' : 'Today'}: ${coalTrucksToday}`;

  if (valEl) valEl.textContent = '₹' + totalValue.toLocaleString('en-IN');
  if (paidEl) paidEl.textContent = '₹' + totalPaid.toLocaleString('en-IN');
  if (remEl) remEl.textContent = '₹' + totalRemaining.toLocaleString('en-IN');

  // Render Importer chips & datalist
  const datalist = document.getElementById('raw-importers-datalist');
  if (datalist) {
    datalist.innerHTML = Object.keys(importersMap).map(name => `<option value="${escapeHtml(name)}">`).join('');
  }

  const countEl = document.getElementById('importers-count');
  const chipsContainer = document.getElementById('importers-chips-container');
  const importerNames = Object.keys(importersMap);
  if (countEl) countEl.textContent = importerNames.length;

  if (chipsContainer) {
    if (importerNames.length === 0) {
      chipsContainer.innerHTML = `<span style="font-size: 0.75rem; color: var(--color-text-dim);">${isMarathi ? 'कोणताही पुरवठादार नोंदवलेला नाही' : 'No suppliers registered yet'}</span>`;
    } else {
      chipsContainer.innerHTML = importerNames.map(name => {
        const imp = importersMap[name];
        const hasDue = imp.totalDue > 0;
        return `
          <div style="background: rgba(255,255,255,0.04); border: 1px solid ${hasDue ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.3)'}; border-radius: 6px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 8px; font-size: 0.78rem;">
            <strong>${escapeHtml(imp.name)}</strong>
            <span style="color: var(--color-text-dim); font-size: 0.72rem;">(${imp.trucks} ${isMarathi ? 'ट्रक' : 'trucks'})</span>
            <span style="font-weight: 800; color: ${hasDue ? '#EF4444' : '#4ADE80'};">
              ${hasDue ? `Due: ₹${imp.totalDue.toLocaleString('en-IN')}` : (isMarathi ? 'पूर्ण भरले ✅' : 'Paid ✅')}
            </span>
          </div>
        `;
      }).join('');
    }
  }
};

window.filterRawMaterials = function(filterType, buttonEl) {
  rawMaterialFilterType = filterType;
  document.querySelectorAll('.btn-filter-raw').forEach(btn => {
    btn.classList.remove('active');
    btn.style.background = 'transparent';
    btn.style.color = 'var(--color-text-dim)';
  });
  if (buttonEl) {
    buttonEl.classList.add('active');
    buttonEl.style.background = 'var(--color-terracotta)';
    buttonEl.style.color = '#fff';
  }
  renderRawMaterialsTable();
};

window.renderRawMaterialsTable = function() {
  const tbody = document.getElementById('raw-materials-table-body');
  if (!tbody) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  let list = (rawMaterials || []).slice();

  // Apply filter tab
  if (rawMaterialFilterType === 'Soil') {
    list = list.filter(item => item.materialType === 'Soil');
  } else if (rawMaterialFilterType === 'Coal') {
    list = list.filter(item => item.materialType === 'Coal');
  } else if (rawMaterialFilterType === 'due') {
    list = list.filter(item => {
      const val = Number(item.totalValue) || 0;
      const paid = Number(item.amountPaid) || 0;
      return (val - paid) > 0;
    });
  }

  // Apply search query
  if (rawMaterialSearchQuery) {
    const q = rawMaterialSearchQuery;
    list = list.filter(item => 
      (item.importerName || '').toLowerCase().includes(q) ||
      (item.vehicleNo || '').toLowerCase().includes(q) ||
      (item.importerPhone || '').includes(q) ||
      (item.notes || '').toLowerCase().includes(q)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 45px 20px; color: var(--color-text-dim);">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">🚚</div>
          <div style="font-weight: 700; font-size: 1rem; color: var(--color-text-main); margin-bottom: 4px;">
            ${isMarathi ? 'कोणतीही कच्चा माल आवक नोंद आढळली नाही' : 'No Raw Material Deliveries Found'}
          </div>
          <p style="font-size: 0.82rem; margin: 0;">
            ${isMarathi ? 'माती किंवा कोळशाच्या ट्रकची पहिली नोंद वर दिलेल्या फॉर्ममधून करा.' : 'Record your first incoming soil or coal delivery using the form above.'}
          </p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((item) => {
    const totalVal = Math.max(0, Number(item.totalValue) || 0);
    const paidVal = Math.max(0, Number(item.amountPaid) || 0);
    const remVal = Math.max(0, totalVal - paidVal);
    const isFullyPaid = remVal <= 0 || paidVal >= totalVal;
    const isPartial = paidVal > 0 && remVal > 0;
    const trucks = Number(item.trucksCount) || 1;
    const isSoil = item.materialType === 'Soil';

    // Badge styling for Material Type
    const materialBadge = isSoil ? `
      <span class="badge-status" style="background: rgba(184, 80, 40, 0.16); color: #F97316; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px;">
        🚜 ${isMarathi ? 'माती (Soil)' : 'Soil (माती)'}
      </span>
    ` : `
      <span class="badge-status" style="background: rgba(100, 116, 139, 0.22); color: #CBD5E1; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px;">
        ⛏️ ${isMarathi ? 'कोळसा (Coal)' : 'Coal (कोळसा)'}
      </span>
    `;

    // Status Badge
    let statusBadge = '';
    if (isFullyPaid) {
      statusBadge = `<span class="badge-status" style="background: rgba(34, 197, 94, 0.15); color: #4ADE80; font-weight: 800; font-size: 0.75rem;">✅ ${isMarathi ? 'पूर्ण भरले' : 'Paid'}</span>`;
    } else if (isPartial) {
      statusBadge = `<span class="badge-status" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; font-weight: 800; font-size: 0.75rem;">⚠️ ${isMarathi ? 'बाकी शिल्लक' : 'Partial Due'}</span>`;
    } else {
      statusBadge = `<span class="badge-status" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; font-weight: 800; font-size: 0.75rem;">❌ ${isMarathi ? 'बाकी' : 'Unpaid'}</span>`;
    }

    // Phone link
    const cleanPhone = (item.importerPhone || '').replace(/\D/g, '');
    const validPhone = cleanPhone.length === 10 ? '91' + cleanPhone : (cleanPhone.length > 10 ? cleanPhone : '');

    return `
      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.2s;">
        <!-- 1. Delivery Date & Material -->
        <td>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="margin-bottom: 4px;">${materialBadge}</div>
            <span style="font-size: 0.72rem; color: #34D399; opacity: 0.85;" title="Live synced in Firebase Cloud Firestore">☁️</span>
          </div>
          <div style="font-weight: 700; color: var(--color-text-main); font-size: 0.85rem;">${escapeHtml(item.date || '-')}</div>
          ${item.notes ? `<div style="font-size: 0.73rem; color: var(--color-text-dim); margin-top: 2px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.notes)}">📝 ${escapeHtml(item.notes)}</div>` : ''}
        </td>

        <!-- 2. Trucks Count & Vehicle No -->
        <td>
          <div style="display: flex; align-items: baseline; gap: 4px;">
            <strong style="font-size: 1.2rem; font-weight: 900; color: #FFFFFF;">${trucks}</strong>
            <span style="font-size: 0.75rem; color: var(--color-text-dim);">${isMarathi ? 'ट्रक' : 'trucks'}</span>
          </div>
          ${item.vehicleNo ? `<span style="font-size: 0.72rem; color: var(--color-terracotta); background: rgba(184, 51, 42, 0.1); padding: 1px 6px; border-radius: 4px; font-weight: 700;">${escapeHtml(item.vehicleNo)}</span>` : '<span style="font-size: 0.72rem; color: var(--color-text-muted);">-</span>'}
        </td>

        <!-- 3. Importer Name & Contact -->
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isSoil ? 'rgba(249, 115, 22, 0.18)' : 'rgba(148, 163, 184, 0.18)'}; color: ${isSoil ? '#F97316' : '#E2E8F0'}; font-weight: 800; font-size: 0.82rem; display: flex; align-items: center; justify-content: center;">
              ${escapeHtml((item.importerName || 'I').charAt(0).toUpperCase())}
            </div>
            <div>
              <strong style="color: var(--color-text-main); font-size: 0.88rem;">${escapeHtml(item.importerName || '-')}</strong>
              <div style="font-size: 0.74rem;">
                ${validPhone ? `
                  <a href="https://wa.me/${validPhone}" target="_blank" rel="noopener noreferrer" style="color: #10B981; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;">
                    <span>💬 ${escapeHtml(item.importerPhone)}</span>
                  </a>
                ` : `<span style="color: var(--color-text-dim);">${escapeHtml(item.importerPhone || '—')}</span>`}
              </div>
            </div>
          </div>
        </td>

        <!-- 4. Total Bill Value -->
        <td>
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--color-text-main);">
            ₹${totalVal.toLocaleString('en-IN')}
          </div>
        </td>

        <!-- 5. Amount Given / Paid -->
        <td>
          <div style="font-weight: 800; font-size: 0.95rem; color: #4ADE80;">
            ₹${paidVal.toLocaleString('en-IN')}
          </div>
        </td>

        <!-- 6. Remaining Balance & Status -->
        <td>
          <div style="font-weight: 900; font-size: 1rem; color: ${remVal > 0 ? '#EF4444' : '#4ADE80'};">
            ₹${remVal.toLocaleString('en-IN')}
          </div>
          <div style="margin-top: 3px;">${statusBadge}</div>
        </td>

        <!-- 7. Actions -->
        <td style="text-align: right;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            ${remVal > 0 ? `
              <button type="button" class="btn-admin btn-outline" style="padding: 4px 10px; font-size: 0.75rem; border-color: rgba(245, 158, 11, 0.5); color: #F59E0B;" onclick="openRawPaymentModal('${escapeHtml(item.id)}')" title="Record additional payment">
                💰 ${isMarathi ? 'जमा' : 'Pay'}
              </button>
            ` : ''}

            <button type="button" class="btn-admin btn-outline" style="padding: 4px 8px; font-size: 0.75rem; border-color: rgba(16, 185, 129, 0.4); color: #10B981;" onclick="sendRawMaterialWhatsApp('${escapeHtml(item.id)}')" title="Send WhatsApp Delivery Slip">
              💬
            </button>

            <button type="button" class="btn-action-icon" onclick="deleteRawMaterial('${escapeHtml(item.id)}')" title="Delete this entry">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

window.openRawPaymentModal = function(id) {
  const record = (rawMaterials || []).find(r => r.id === id);
  if (!record) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const overlay = document.getElementById('raw-payment-modal-overlay');
  if (!overlay) return;

  const idInput = document.getElementById('raw-payment-entry-id');
  if (idInput) idInput.value = record.id;

  const importerDisplay = document.getElementById('raw-payment-importer-display');
  if (importerDisplay) {
    importerDisplay.textContent = `${record.importerName || '-'} • ${record.materialType === 'Soil' ? (isMarathi ? 'माती' : 'Soil') : (isMarathi ? 'कोळसा' : 'Coal')} (${record.trucksCount || 1} ${isMarathi ? 'ट्रक' : 'trucks'})`;
  }

  const totalVal = Math.max(0, Number(record.totalValue) || 0);
  const paidVal = Math.max(0, Number(record.amountPaid) || 0);
  const rem = Math.max(0, totalVal - paidVal);

  const billDisplay = document.getElementById('raw-payment-bill-display');
  if (billDisplay) billDisplay.textContent = '₹' + totalVal.toLocaleString('en-IN');

  const paidDisplay = document.getElementById('raw-payment-paid-display');
  if (paidDisplay) paidDisplay.textContent = '₹' + paidVal.toLocaleString('en-IN');

  const dueDisplay = document.getElementById('raw-payment-due-display');
  if (dueDisplay) dueDisplay.textContent = '₹' + rem.toLocaleString('en-IN');

  const payInput = document.getElementById('raw-payment-add-amount');
  if (payInput) {
    payInput.value = rem > 0 ? rem : '';
    payInput.max = rem > 0 ? rem : '';
    setTimeout(() => payInput.focus(), 100);
  }

  const dateInput = document.getElementById('raw-payment-date');
  if (dateInput) {
    dateInput.value = getTodayDateStr();
  }

  const noteInput = document.getElementById('raw-payment-note');
  if (noteInput) noteInput.value = '';

  overlay.style.display = 'flex';
};

window.closeRawPaymentModal = function() {
  const overlay = document.getElementById('raw-payment-modal-overlay');
  if (overlay) overlay.style.display = 'none';
};

window.sendRawMaterialWhatsApp = function(id) {
  const record = (rawMaterials || []).find(r => r.id === id);
  if (!record) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const cleanPhone = (record.importerPhone || '').replace(/\D/g, '');
  const targetPhone = cleanPhone.length === 10 ? '91' + cleanPhone : (cleanPhone.length > 10 ? cleanPhone : '');

  const total = (Math.max(0, Number(record.totalValue) || 0)).toLocaleString('en-IN');
  const paid = (Math.max(0, Number(record.amountPaid) || 0)).toLocaleString('en-IN');
  const rem = (Math.max(0, (Number(record.totalValue) || 0) - (Number(record.amountPaid) || 0))).toLocaleString('en-IN');
  const materialName = record.materialType === 'Soil' ? 'माती (Soil)' : 'कोळसा (Coal)';

  const msg = 
`*SUKHAKARTA BRICKS (सुखकर्ता ब्रिक्स)*
*कच्चा माल आवक व पेमेंट पावती*
--------------------------------
📅 दिनांक / Date: ${record.date}
🚚 कच्चा माल: ${materialName}
🚛 एकूण गाड्या / Trucks: ${record.trucksCount} Trucks
👤 पुरवठादार / Importer: ${record.importerName}
🔢 वाहन क्रमांक: ${record.vehicleNo || 'N/A'}
--------------------------------
💰 एकूण बिल रक्कम (Total): ₹${total}
✅ आतापर्यंत दिलेली रक्कम (Paid): ₹${paid}
⚠️ उर्वरित बाकी रक्कम (Remaining Due): ₹${rem}
📊 स्थिती: ${rem === '0' ? 'पूर्ण भरले (Fully Paid) ✅' : 'शिल्लक बाकी (Pending Due) ⚠️'}
${record.notes ? `📝 टीप: ${record.notes}` : ''}
--------------------------------
सुखकर्ता ब्रिक्स, भट्टी व्यवस्थापन कार्यालय.
संपर्क: +91 73858 03641`;

  const waUrl = targetPhone 
    ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(waUrl, '_blank');
};

window.deleteRawMaterial = async function(id) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  if (confirm(isMarathi ? 'ही कच्चा माल आवक नोंद कायमची हटवायची का?' : 'Delete this raw material inward delivery record?')) {
    rawMaterials = rawMaterials.filter(r => r.id !== id);
    saveToLocalStorage();

    if (typeof fbDeleteDoc === 'function') {
      await fbDeleteDoc(FB_COLLECTIONS.RAW_MATERIALS, id);
    }

    normalizeRawMaterialsData();
    renderRawMaterialsTable();
    updateRawMaterialsKPIs();
    showAdminToast(isMarathi ? 'कच्चा माल नोंद हटवली.' : 'Raw material entry deleted.');
  }
};

window.exportRawMaterialsCSV = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const list = rawMaterials || [];

  if (list.length === 0) {
    alert(isMarathi ? 'डाऊनलोड करण्यासाठी कोणत्याही नोंदी उपलब्ध नाहीत.' : 'No delivery records available to export.');
    return;
  }

  const headers = [
    'Delivery ID',
    'Date',
    'Material Type',
    'Trucks Count',
    'Importer Name',
    'Phone',
    'Vehicle Number',
    'Total Value (INR)',
    'Amount Paid (INR)',
    'Remaining Balance (INR)',
    'Status',
    'Notes'
  ];

  const rows = list.map(item => {
    const val = Number(item.totalValue) || 0;
    const paid = Number(item.amountPaid) || 0;
    const rem = Math.max(0, val - paid);
    return [
      `"${item.id || ''}"`,
      `"${item.date || ''}"`,
      `"${item.materialType || ''}"`,
      item.trucksCount || 1,
      `"${(item.importerName || '').replace(/"/g, '""')}"`,
      `"${item.importerPhone || ''}"`,
      `"${item.vehicleNo || ''}"`,
      val,
      paid,
      rem,
      `"${rem <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid')}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sukhakarta_Raw_Materials_Inward_${getTodayDateStr()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAdminToast(isMarathi ? '✅ कच्चा माल CSV फाईल डाऊनलोड झाली!' : '✅ Raw materials CSV exported successfully!');
};

// ==========================================
// RAW BRICK TRAVELERS & KILN INWARD MODULE
// (Green brick transfer: Molding Land ➔ Kiln Chambers)
// ==========================================

// Helper: Calculate manufactured, delivered to kiln, and remaining green bricks for a molder worker
window.getMolderAvailableBricks = function(workerNameOrId, excludeLogId = null) {
  if (!workerNameOrId) {
    return { workerName: '', workerId: null, totalManufactured: 0, totalDelivered: 0, available: 0 };
  }
  const w = (workers || []).find(wk => wk.name === workerNameOrId || wk.id === workerNameOrId);
  const wName = w ? w.name : workerNameOrId;
  const wId = w ? w.id : null;

  // Total green bricks manufactured: sum of netCount from productionLogs
  const mfgLogs = (productionLogs || []).filter(l => (wId && l.workerId === wId) || l.workerName === wName);
  const totalManufactured = mfgLogs.reduce((acc, l) => acc + (Number(l.netCount) || 0), 0);

  // Total raw bricks delivered to kiln: sum of bricksCount from rawTravelersLogs
  const delLogs = (rawTravelersLogs || []).filter(l => {
    if (excludeLogId && l.id === excludeLogId) return false;
    return (l.molderWorker === wName || l.sourceLand === wName || (wId && l.molderWorkerId === wId));
  });
  const totalDelivered = delLogs.reduce((acc, l) => acc + (Number(l.bricksCount) || 0), 0);

  const available = Math.max(0, totalManufactured - totalDelivered);

  return {
    workerName: wName,
    workerId: wId,
    totalManufactured,
    totalDelivered,
    available
  };
};

window.initRawTravelersModule = function() {
  const form = document.getElementById('raw-traveler-entry-form');
  const dateInput = document.getElementById('raw-entry-date');
  const workerSelect = document.getElementById('raw-entry-worker-select');
  const modeSelect = document.getElementById('raw-entry-transport-mode');
  const vehNoInput = document.getElementById('raw-entry-vehicle-no');
  const tripsInput = document.getElementById('raw-entry-trips');
  const perTripInput = document.getElementById('raw-entry-per-trip');
  const bricksCountInput = document.getElementById('raw-entry-bricks-count');
  const rateInput = document.getElementById('raw-entry-rate');
  const wageDisplay = document.getElementById('raw-entry-wage-display');
  const filterWorkerSelect = document.getElementById('raw-travelers-filter-worker');
  const filterDateInput = document.getElementById('raw-travelers-filter-date');
  const workerModalForm = document.getElementById('raw-traveler-worker-form');
  const editEntryForm = document.getElementById('raw-traveler-edit-entry-form');
  const molderSelect = document.getElementById('raw-entry-source-land');
  const molderStockBadge = document.getElementById('molder-available-stock-badge');
  const bricksLimitMsg = document.getElementById('raw-entry-bricks-limit-msg');
  const editMolderSelect = document.getElementById('edit-entry-source-land');
  const editBricksInput = document.getElementById('edit-entry-bricks-count');
  const editStockBadge = document.getElementById('edit-molder-available-stock-badge');
  const editLimitMsg = document.getElementById('edit-entry-bricks-limit-msg');

  // Set default dates
  if (dateInput && !dateInput.value) {
    dateInput.value = selectedDate || getTodayDateStr();
  }
  if (filterDateInput && !filterDateInput.value) {
    filterDateInput.value = selectedDate || getTodayDateStr();
  }

  // Live auto-calculation for trips, bricks and wages
  function updateLiveTravelerWage() {
    const trips = parseInt(tripsInput?.value) || 0;
    const perTrip = parseInt(perTripInput?.value) || 0;
    
    // Auto-calculate total bricks if perTrip is provided and focused
    if (document.activeElement === perTripInput || document.activeElement === tripsInput) {
      if (trips > 0 && perTrip > 0 && bricksCountInput) {
        bricksCountInput.value = trips * perTrip;
      }
    }

    const totalBricks = parseInt(bricksCountInput?.value) || 0;
    const workerId = workerSelect?.value;
    const worker = (rawTravelersWorkers || []).find(w => w.id === workerId);
    const rate = worker && Number(worker.ratePer1000) ? Number(worker.ratePer1000) : (parseFloat(rateInput?.value) || 250);
    const totalWage = (totalBricks / 1000) * rate;

    if (wageDisplay) {
      wageDisplay.textContent = '₹' + totalWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  // Live validator for raw entry bricks limit vs manufactured stock
  function validateRawEntryBricks() {
    const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
    const molderName = molderSelect?.value;
    const enteredBricks = parseInt(bricksCountInput?.value) || 0;

    if (!molderName) {
      if (molderStockBadge) molderStockBadge.style.display = 'none';
      if (bricksLimitMsg) bricksLimitMsg.style.display = 'none';
      if (bricksCountInput) {
        bricksCountInput.removeAttribute('max');
        bricksCountInput.style.borderColor = 'rgba(234, 88, 12, 0.5)';
      }
      return true;
    }

    const stats = window.getMolderAvailableBricks(molderName);
    
    // Update live stock badge below molder select
    if (molderStockBadge) {
      molderStockBadge.style.display = 'block';
      molderStockBadge.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
          <span>🏭 <strong>${isMarathi ? 'उत्पादित कच्च्या विटा शिल्लक' : 'Manufactured Stock on Land'}:</strong></span>
          <span style="font-weight: 800; color: #34D399; font-size: 0.95rem;">${stats.available.toLocaleString('en-IN')} ${isMarathi ? 'विटा' : 'bricks'}</span>
        </div>
        <div style="font-size: 0.72rem; color: #fed7aa; margin-top: 3px; opacity: 0.9;">
          ${isMarathi ? 'एकूण उत्पादन' : 'Total Manufactured'}: ${stats.totalManufactured.toLocaleString('en-IN')} | ${isMarathi ? 'आधी पोहोचवले' : 'Already Inward to Kiln'}: ${stats.totalDelivered.toLocaleString('en-IN')}
        </div>
      `;
    }

    if (bricksCountInput) {
      bricksCountInput.setAttribute('max', stats.available);
    }

    if (stats.totalManufactured <= 0) {
      if (bricksLimitMsg) {
        bricksLimitMsg.style.display = 'block';
        bricksLimitMsg.textContent = isMarathi
          ? '⚠️ या कामगाराचे कोणतेही उत्पादन नोंदवलेले नाही! आधी दैनंदिन उत्पादनात नोंद करा.'
          : '⚠️ No production recorded for this worker! Please record in Daily Production first.';
      }
      if (bricksCountInput) bricksCountInput.style.borderColor = '#EF4444';
      return false;
    }

    if (enteredBricks > stats.available) {
      if (bricksLimitMsg) {
        bricksLimitMsg.style.display = 'block';
        bricksLimitMsg.textContent = isMarathi
          ? `⚠️ कमाल मर्यादा ओलांडली! जमिनीवर फक्त ${stats.available.toLocaleString('en-IN')} उत्पादित विटा शिल्लक आहेत.`
          : `⚠️ Exceeds available stock! Only ${stats.available.toLocaleString('en-IN')} bricks remaining on land.`;
      }
      if (bricksCountInput) bricksCountInput.style.borderColor = '#EF4444';
      return false;
    } else {
      if (bricksLimitMsg) bricksLimitMsg.style.display = 'none';
      if (bricksCountInput) bricksCountInput.style.borderColor = 'rgba(234, 88, 12, 0.5)';
      return true;
    }
  }

  // Live validator for edit modal bricks limit vs manufactured stock
  function validateEditEntryBricks() {
    const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
    const entryId = document.getElementById('edit-entry-id')?.value;
    const molderName = editMolderSelect?.value;
    const enteredBricks = parseInt(editBricksInput?.value) || 0;

    if (!molderName) {
      if (editStockBadge) editStockBadge.style.display = 'none';
      if (editLimitMsg) editLimitMsg.style.display = 'none';
      if (editBricksInput) {
        editBricksInput.removeAttribute('max');
        editBricksInput.style.borderColor = 'rgba(234, 88, 12, 0.5)';
      }
      return true;
    }

    const stats = window.getMolderAvailableBricks(molderName, entryId);
    
    if (editStockBadge) {
      editStockBadge.style.display = 'block';
      editStockBadge.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
          <span>🏭 <strong>${isMarathi ? 'उत्पादित शिल्लक' : 'Manufactured Stock'}:</strong></span>
          <span style="font-weight: 800; color: #34D399; font-size: 0.95rem;">${stats.available.toLocaleString('en-IN')} ${isMarathi ? 'विटा' : 'bricks'}</span>
        </div>
        <div style="font-size: 0.72rem; color: #fed7aa; margin-top: 3px; opacity: 0.9;">
          ${isMarathi ? 'एकूण उत्पादन' : 'Total Made'}: ${stats.totalManufactured.toLocaleString('en-IN')} | ${isMarathi ? 'इतर आवक' : 'Other Inwards'}: ${stats.totalDelivered.toLocaleString('en-IN')}
        </div>
      `;
    }

    if (editBricksInput) {
      editBricksInput.setAttribute('max', stats.available);
    }

    if (stats.totalManufactured <= 0) {
      if (editLimitMsg) {
        editLimitMsg.style.display = 'block';
        editLimitMsg.textContent = isMarathi
          ? '⚠️ या कामगाराचे कोणतेही उत्पादन नोंदवलेले नाही!'
          : '⚠️ No production recorded for this worker!';
      }
      if (editBricksInput) editBricksInput.style.borderColor = '#EF4444';
      return false;
    }

    if (enteredBricks > stats.available) {
      if (editLimitMsg) {
        editLimitMsg.style.display = 'block';
        editLimitMsg.textContent = isMarathi
          ? `⚠️ कमाल मर्यादा ओलांडली! फक्त ${stats.available.toLocaleString('en-IN')} विटा शिल्लक आहेत.`
          : `⚠️ Exceeds available stock! Only ${stats.available.toLocaleString('en-IN')} bricks remaining.`;
      }
      if (editBricksInput) editBricksInput.style.borderColor = '#EF4444';
      return false;
    } else {
      if (editLimitMsg) editLimitMsg.style.display = 'none';
      if (editBricksInput) editBricksInput.style.borderColor = 'rgba(234, 88, 12, 0.5)';
      return true;
    }
  }

  if (tripsInput) tripsInput.addEventListener('input', updateLiveTravelerWage);
  if (perTripInput) perTripInput.addEventListener('input', updateLiveTravelerWage);
  if (bricksCountInput) {
    bricksCountInput.addEventListener('input', () => {
      updateLiveTravelerWage();
      validateRawEntryBricks();
    });
  }
  if (rateInput) rateInput.addEventListener('input', updateLiveTravelerWage);

  if (molderSelect) {
    molderSelect.addEventListener('change', () => {
      validateRawEntryBricks();
    });
  }

  if (editMolderSelect) {
    editMolderSelect.addEventListener('change', validateEditEntryBricks);
  }
  if (editBricksInput) {
    editBricksInput.addEventListener('input', validateEditEntryBricks);
  }

  // Auto-fill worker details when selecting worker
  if (workerSelect) {
    workerSelect.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const worker = (rawTravelersWorkers || []).find(w => w.id === selectedId);
      if (worker) {
        if (modeSelect) modeSelect.value = worker.vehicleType || 'Tractor Trolley';
        if (vehNoInput) vehNoInput.value = worker.vehicleNo || '';
        if (rateInput) rateInput.value = worker.ratePer1000 || 250;
        updateLiveTravelerWage();
      }
    });
  }

  // Filter handlers
  if (filterWorkerSelect) {
    filterWorkerSelect.addEventListener('change', () => {
      renderRawTravelersLogsTable();
    });
  }
  if (filterDateInput) {
    filterDateInput.addEventListener('change', () => {
      renderRawTravelersLogsTable();
      updateRawTravelersKPIs();
    });
  }

  // Handle Inward Log Entry Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

      const workerId = workerSelect?.value;
      const worker = (rawTravelersWorkers || []).find(w => w.id === workerId);
      const workerName = worker ? worker.name : (workerSelect?.options[workerSelect.selectedIndex]?.text || 'Worker');
      const transportMode = modeSelect?.value || 'Tractor Trolley';
      const vehicleNo = vehNoInput?.value.trim() || '';
      const sourceLand = document.getElementById('raw-entry-source-land')?.value.trim();
      const destChamber = document.getElementById('raw-entry-dest-chamber')?.value.trim();
      const trips = parseInt(tripsInput?.value) || 1;
      const perTrip = parseInt(perTripInput?.value) || 0;
      const bricksCount = parseInt(bricksCountInput?.value) || 0;
      const entryDate = dateInput?.value || selectedDate || getTodayDateStr();
      const rate = worker && Number(worker.ratePer1000) ? Number(worker.ratePer1000) : (parseFloat(rateInput?.value) || 250);
      const wage = Math.round(((bricksCount / 1000) * rate) * 100) / 100;
      const notes = document.getElementById('raw-entry-notes')?.value.trim() || '';

      if (!workerId) {
        alert(isMarathi ? 'कृपया वाहतूक कामगार निवडा!' : 'Please select a traveler worker!');
        return;
      }
      if (!sourceLand || !destChamber) {
        alert(isMarathi ? 'कृपया विट बनवणारा कामगार व भट्टी चेंबर निवडा!' : 'Please select the brick manufacturing worker and destination kiln chamber!');
        return;
      }
      if (bricksCount <= 0) {
        alert(isMarathi ? 'कृपया भट्टीवर पोहोचलेल्या विटांची संख्या टाका!' : 'Please enter valid bricks reached quantity!');
        return;
      }

      // STRICT VALIDATION: Match against available manufactured bricks balance
      const molderStats = window.getMolderAvailableBricks(sourceLand);
      if (molderStats.totalManufactured <= 0) {
        alert(isMarathi 
          ? `⚠️ ${sourceLand} चे कोणतेही विट उत्पादन नोंदवलेले नाही! भट्टीवर पोहोचवण्यासाठी आधी "दैनिक उत्पादन" विभागात उत्पादन नोंदवा.` 
          : `⚠️ No brick production recorded for ${sourceLand}! Please record production in Daily Production section first.`);
        return;
      }
      if (bricksCount > molderStats.available) {
        alert(isMarathi 
          ? `⚠️ पोहोचलेल्या विटांची संख्या (${bricksCount.toLocaleString('en-IN')}) उत्पादित शिल्लक विटांपेक्षा (${molderStats.available.toLocaleString('en-IN')}) जास्त असू शकत नाही!` 
          : `⚠️ Delivered bricks (${bricksCount.toLocaleString('en-IN')}) cannot exceed remaining manufactured stock (${molderStats.available.toLocaleString('en-IN')})!`);
        return;
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const newEntryId = 'RTL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

      const newEntry = {
        id: newEntryId,
        date: entryDate,
        time: timeStr,
        workerId,
        workerName,
        transportMode,
        vehicleNo,
        sourceLand, // Brick manufacturing worker name
        molderWorker: sourceLand,
        molderWorkerId: molderStats.workerId,
        destChamber,
        trips,
        perTrip: perTrip > 0 ? perTrip : Math.round(bricksCount / trips),
        bricksCount,
        ratePer1000: rate,
        wage,
        notes,
        createdAt: new Date().toISOString()
      };

      rawTravelersLogs.unshift(newEntry);
      saveToLocalStorage();

      // Cloud Firestore document save
      if (typeof fbSaveDoc === 'function' && typeof FB_COLLECTIONS !== 'undefined') {
        fbSaveDoc(FB_COLLECTIONS.RAW_TRAVELERS_LOGS, newEntryId, newEntry);
      }

      // Reset form fields
      if (tripsInput) tripsInput.value = '1';
      if (perTripInput) perTripInput.value = '';
      if (bricksCountInput) {
        bricksCountInput.value = '';
        bricksCountInput.style.borderColor = 'rgba(234, 88, 12, 0.5)';
      }
      if (document.getElementById('raw-entry-notes')) document.getElementById('raw-entry-notes').value = '';
      if (bricksLimitMsg) bricksLimitMsg.style.display = 'none';
      updateLiveTravelerWage();

      // Refresh UI
      updateRawTravelersKPIs();
      renderRawTravelersWorkers();
      renderRawTravelersLogsTable();
      if (typeof refreshDashboard === 'function') refreshDashboard();

      showAdminToast(isMarathi 
        ? `✅ ${bricksCount.toLocaleString('en-IN')} कच्च्या विटा भट्टीवर यशस्वीरित्या नोंदवल्या!`
        : `✅ Recorded ${bricksCount.toLocaleString('en-IN')} raw bricks reached to kiln!`
      );
    });
  }

  // Handle Add / Edit Traveler Worker Modal Form Submission
  if (workerModalForm) {
    workerModalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

      const editId = document.getElementById('raw-worker-edit-id')?.value;
      const name = document.getElementById('raw-worker-name')?.value.trim();
      const vehicleType = document.getElementById('raw-worker-vehicle-type')?.value;
      const vehicleNo = document.getElementById('raw-worker-vehicle-no')?.value.trim();
      const ratePer1000 = parseFloat(document.getElementById('raw-worker-rate')?.value) || 250;
      const phone = document.getElementById('raw-worker-phone')?.value.trim();

      if (!name) {
        alert(isMarathi ? 'कामगाराचे नाव आवश्यक आहे!' : 'Worker name is required!');
        return;
      }

      if (editId) {
        // Edit existing worker
        const idx = rawTravelersWorkers.findIndex(w => w.id === editId);
        if (idx !== -1) {
          rawTravelersWorkers[idx] = {
            ...rawTravelersWorkers[idx],
            name,
            vehicleType,
            vehicleNo,
            ratePer1000,
            phone
          };
          if (typeof fbSaveDoc === 'function' && typeof FB_COLLECTIONS !== 'undefined') {
            fbSaveDoc(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS, editId, rawTravelersWorkers[idx]);
          }
          showAdminToast(isMarathi ? '✅ कामगार माहिती अपडेट झाली!' : '✅ Traveler worker updated successfully!');
        }
      } else {
        // Add new worker
        const newWorkerId = 'RTW-' + Date.now();
        const newWorker = {
          id: newWorkerId,
          name,
          vehicleType,
          vehicleNo,
          ratePer1000,
          phone,
          status: 'active'
        };
        rawTravelersWorkers.push(newWorker);
        if (typeof fbSaveDoc === 'function' && typeof FB_COLLECTIONS !== 'undefined') {
          fbSaveDoc(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS, newWorkerId, newWorker);
        }
        showAdminToast(isMarathi ? '✅ नवीन वाहतूक कामगार जोडला!' : '✅ New traveler worker added to roster!');
      }

      saveToLocalStorage();
      closeRawTravelerWorkerModal();
      renderRawTravelersWorkers();
      updateRawTravelersKPIs();
    });
  }

  // Handle Edit Log Entry Modal Form Submission
  if (editEntryForm) {
    editEntryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

      const entryId = document.getElementById('edit-entry-id')?.value;
      const workerId = document.getElementById('edit-entry-worker-select')?.value;
      const worker = (rawTravelersWorkers || []).find(w => w.id === workerId);
      const workerName = worker ? worker.name : '';
      const transportMode = document.getElementById('edit-entry-transport-mode')?.value;
      const vehicleNo = document.getElementById('edit-entry-vehicle-no')?.value.trim();
      const sourceLand = document.getElementById('edit-entry-source-land')?.value.trim();
      const destChamber = document.getElementById('edit-entry-dest-chamber')?.value.trim();
      const trips = parseInt(document.getElementById('edit-entry-trips')?.value) || 1;
      const date = document.getElementById('edit-entry-date')?.value;
      const bricksCount = parseInt(document.getElementById('edit-entry-bricks-count')?.value) || 0;
      const rate = worker && Number(worker.ratePer1000) ? Number(worker.ratePer1000) : (parseFloat(document.getElementById('edit-entry-rate')?.value) || 250);
      const wage = Math.round(((bricksCount / 1000) * rate) * 100) / 100;
      const notes = document.getElementById('edit-entry-notes')?.value.trim() || '';

      // STRICT VALIDATION for edit entry
      const molderStats = window.getMolderAvailableBricks(sourceLand, entryId);
      if (molderStats.totalManufactured <= 0) {
        alert(isMarathi 
          ? `⚠️ ${sourceLand} चे कोणतेही विट उत्पादन नोंदवलेले नाही!` 
          : `⚠️ No brick production recorded for ${sourceLand}!`);
        return;
      }
      if (bricksCount > molderStats.available) {
        alert(isMarathi 
          ? `⚠️ पोहोचलेल्या विटांची संख्या (${bricksCount.toLocaleString('en-IN')}) शिल्लक उत्पादनापेक्षा (${molderStats.available.toLocaleString('en-IN')}) जास्त असू शकत नाही!` 
          : `⚠️ Delivered bricks count (${bricksCount.toLocaleString('en-IN')}) cannot exceed remaining manufactured stock (${molderStats.available.toLocaleString('en-IN')})!`);
        return;
      }

      const idx = rawTravelersLogs.findIndex(l => l.id === entryId);
      if (idx !== -1) {
        rawTravelersLogs[idx] = {
          ...rawTravelersLogs[idx],
          workerId,
          workerName,
          transportMode,
          vehicleNo,
          sourceLand,
          molderWorker: sourceLand,
          molderWorkerId: molderStats.workerId,
          destChamber,
          trips,
          perTrip: Math.round(bricksCount / trips),
          date,
          bricksCount,
          ratePer1000: rate,
          wage,
          notes
        };

        saveToLocalStorage();
        if (typeof fbSaveDoc === 'function' && typeof FB_COLLECTIONS !== 'undefined') {
          fbSaveDoc(FB_COLLECTIONS.RAW_TRAVELERS_LOGS, entryId, rawTravelersLogs[idx]);
        }

        closeRawTravelerEditModal();
        updateRawTravelersKPIs();
        renderRawTravelersWorkers();
        renderRawTravelersLogsTable();
        if (typeof refreshDashboard === 'function') refreshDashboard();

        showAdminToast(isMarathi ? '✅ भट्टी आवक नोंद अपडेट झाली!' : '✅ Kiln inward entry updated successfully!');
      }
    });
  }

  // Initial renders
  renderRawTravelersWorkers();
  updateRawTravelersKPIs();
  renderRawTravelersLogsTable();
};

window.updateRawTravelersKPIs = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const filterDateInput = document.getElementById('raw-travelers-filter-date');
  const targetDate = filterDateInput?.value || selectedDate || getTodayDateStr();

  const todayLogs = (rawTravelersLogs || []).filter(l => l.date === targetDate);
  const todayBricks = todayLogs.reduce((sum, item) => sum + (Number(item.bricksCount) || 0), 0);
  const allTimeBricks = (rawTravelersLogs || []).reduce((sum, item) => sum + (Number(item.bricksCount) || 0), 0);
  const todayTrips = todayLogs.reduce((sum, item) => sum + (Number(item.trips) || 0), 0);
  const allTimeTrips = (rawTravelersLogs || []).reduce((sum, item) => sum + (Number(item.trips) || 0), 0);
  const activeWorkerIds = new Set(todayLogs.map(l => l.workerId));

  // Cumulative Manufactured vs Reached Kiln vs Remaining on Land
  const allTimeManufactured = (productionLogs || []).reduce((acc, curr) => acc + (Number(curr.netCount) || 0), 0);
  const remainingOnLand = Math.max(0, allTimeManufactured - allTimeBricks);

  // Update Section KPI Elements
  const todayEl = document.getElementById('raw-travelers-today-bricks');
  if (todayEl) todayEl.textContent = todayBricks.toLocaleString('en-IN');

  const allTimeEl = document.getElementById('raw-travelers-alltime-bricks');
  if (allTimeEl) allTimeEl.textContent = allTimeBricks.toLocaleString('en-IN');

  const allTimeSubtitleEl = document.getElementById('raw-travelers-alltime-subtitle');
  if (allTimeSubtitleEl) {
    allTimeSubtitleEl.textContent = isMarathi
      ? `एकूण बनवले: ${allTimeManufactured.toLocaleString('en-IN')} | जमिनीवर शिल्लक: ${remainingOnLand.toLocaleString('en-IN')}`
      : `Total Made: ${allTimeManufactured.toLocaleString('en-IN')} | Remaining on Land: ${remainingOnLand.toLocaleString('en-IN')}`;
  }

  const todayTripsEl = document.getElementById('raw-travelers-today-trips');
  if (todayTripsEl) todayTripsEl.textContent = todayTrips.toLocaleString('en-IN') + (isMarathi ? ' फेऱ्या' : ' trips');

  const allTimeTripsEl = document.getElementById('raw-travelers-alltime-trips');
  if (allTimeTripsEl) allTimeTripsEl.textContent = allTimeTrips.toLocaleString('en-IN') + (isMarathi ? ' एकूण फेऱ्या' : ' total trips recorded');

  const activeCountEl = document.getElementById('raw-travelers-active-count');
  if (activeCountEl) activeCountEl.textContent = `${activeWorkerIds.size} / ${(rawTravelersWorkers || []).length}`;

  const dateInd = document.getElementById('raw-travelers-date-indicator');
  if (dateInd) {
    const isToday = targetDate === getTodayDateStr();
    dateInd.textContent = isToday ? (isMarathi ? '📅 आजचा दिवस' : "📅 Today's Date") : `📅 ${targetDate}`;
  }

  const formDateBadge = document.getElementById('raw-traveler-form-date-badge');
  if (formDateBadge) {
    const formDate = document.getElementById('raw-entry-date')?.value || targetDate;
    formDateBadge.textContent = formDate;
  }

  // Also update Overview KPI cards and Sidebar Live Badge
  const kpiRawTotal = document.getElementById('kpi-raw-reach-total');
  if (kpiRawTotal) kpiRawTotal.textContent = allTimeBricks.toLocaleString('en-IN');
  const kpiRawToday = document.getElementById('kpi-raw-reach-today');
  if (kpiRawToday) kpiRawToday.textContent = todayBricks.toLocaleString('en-IN');

  const badgeRaw = document.getElementById('badge-raw-travelers-today');
  if (badgeRaw) {
    if (todayBricks > 0) {
      badgeRaw.textContent = todayBricks.toLocaleString('en-IN');
      badgeRaw.style.display = 'inline-block';
    } else {
      badgeRaw.style.display = 'none';
    }
  }
};

window.renderRawTravelersWorkers = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const targetDate = selectedDate || getTodayDateStr();
  const listContainer = document.getElementById('raw-travelers-workers-list');
  const workerSelect = document.getElementById('raw-entry-worker-select');
  const editWorkerSelect = document.getElementById('edit-entry-worker-select');
  const filterWorkerSelect = document.getElementById('raw-travelers-filter-worker');

  // Populate Traveler Workers Dropdowns
  const currentSelectedId = workerSelect?.value || '';
  if (workerSelect) {
    workerSelect.innerHTML = `<option value="">-- ${isMarathi ? 'वाहतूक कामगार निवडा' : 'Select Worker'} --</option>`;
    (rawTravelersWorkers || []).forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} (${w.vehicleType || 'Transport'})`;
      if (w.id === currentSelectedId) opt.selected = true;
      workerSelect.appendChild(opt);
    });
  }

  if (editWorkerSelect) {
    editWorkerSelect.innerHTML = '';
    (rawTravelersWorkers || []).forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} (${w.vehicleType || 'Transport'})`;
      editWorkerSelect.appendChild(opt);
    });
  }

  if (filterWorkerSelect) {
    const prevFilter = filterWorkerSelect.value || 'ALL';
    filterWorkerSelect.innerHTML = `<option value="ALL">${isMarathi ? 'सर्व कामगार (All Workers)' : 'All Traveler Workers'}</option>`;
    (rawTravelersWorkers || []).forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = w.name;
      if (w.id === prevFilter) opt.selected = true;
      filterWorkerSelect.appendChild(opt);
    });
  }

  // Populate Brick Manufacturing Workers (Molders / Pathai Workers) Dropdown
  // STRICT RULE: If no production of bricks, do NOT show worker in raw brick delivered section!
  const molderSelect = document.getElementById('raw-entry-source-land');
  const noProdAlert = document.getElementById('no-production-alert');
  const saveBtn = document.getElementById('btn-save-raw-traveler-entry');
  const molderStockBadge = document.getElementById('molder-available-stock-badge');

  // Filter workers who have actual production AND available bricks remaining
  const activeMoldersWithStock = (workers || [])
    .map(w => {
      const stats = window.getMolderAvailableBricks(w.name);
      return { worker: w, ...stats };
    })
    .filter(item => item.totalManufactured > 0 && item.available > 0);

  if (molderSelect) {
    const prevMolder = molderSelect.value;
    
    if (activeMoldersWithStock.length === 0) {
      // No workers have available manufactured bricks
      molderSelect.innerHTML = `<option value="">-- ${isMarathi ? 'कोणतेही उत्पादित विटा शिल्लक नाहीत (No Available Production)' : 'No Available Production on Land'} --</option>`;
      molderSelect.disabled = true;
      if (noProdAlert) noProdAlert.style.display = 'block';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.title = isMarathi ? 'आधी दैनिक उत्पादनात विटांची नोंद करा' : 'Please record brick production first in Daily Production section';
      }
      if (molderStockBadge) molderStockBadge.style.display = 'none';
    } else {
      molderSelect.disabled = false;
      if (noProdAlert) noProdAlert.style.display = 'none';
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
        saveBtn.removeAttribute('title');
      }

      molderSelect.innerHTML = `<option value="">-- ${isMarathi ? 'विट बनवणारा कामगार निवडा' : 'Select Manufacturing Worker'} --</option>`;
      activeMoldersWithStock.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.worker.name;
        opt.textContent = `${item.worker.name} (${isMarathi ? 'शिल्लक' : 'Available'}: ${item.available.toLocaleString('en-IN')} / ${isMarathi ? 'बनवले' : 'Made'}: ${item.totalManufactured.toLocaleString('en-IN')})`;
        if (item.worker.name === prevMolder) opt.selected = true;
        molderSelect.appendChild(opt);
      });

      // Update badge if someone was already selected
      if (molderSelect.value) {
        const selectedStats = window.getMolderAvailableBricks(molderSelect.value);
        if (molderStockBadge) {
          molderStockBadge.style.display = 'block';
          molderStockBadge.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
              <span>🏭 <strong>${isMarathi ? 'उत्पादित कच्च्या विटा शिल्लक' : 'Manufactured Stock on Land'}:</strong></span>
              <span style="font-weight: 800; color: #34D399; font-size: 0.95rem;">${selectedStats.available.toLocaleString('en-IN')} ${isMarathi ? 'विटा' : 'bricks'}</span>
            </div>
            <div style="font-size: 0.72rem; color: #fed7aa; margin-top: 3px; opacity: 0.9;">
              ${isMarathi ? 'एकूण उत्पादन' : 'Total Manufactured'}: ${selectedStats.totalManufactured.toLocaleString('en-IN')} | ${isMarathi ? 'आधी पोहोचवले' : 'Already Inward to Kiln'}: ${selectedStats.totalDelivered.toLocaleString('en-IN')}
            </div>
          `;
        }
      } else {
        if (molderStockBadge) molderStockBadge.style.display = 'none';
      }
    }
  }

  const editMolderSelect = document.getElementById('edit-entry-source-land');
  if (editMolderSelect) {
    const prevEditMolder = editMolderSelect.value;
    editMolderSelect.innerHTML = `<option value="">-- ${isMarathi ? 'विट बनवणारा कामगार निवडा' : 'Select Manufacturing Worker'} --</option>`;
    // In edit dropdown, include molders with any manufacturing history
    (workers || [])
      .map(w => ({ worker: w, ...window.getMolderAvailableBricks(w.name) }))
      .filter(item => item.totalManufactured > 0)
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.worker.name;
        opt.textContent = `${item.worker.name} (${isMarathi ? 'एकूण उत्पादन' : 'Total Made'}: ${item.totalManufactured.toLocaleString('en-IN')})`;
        if (item.worker.name === prevEditMolder) opt.selected = true;
        editMolderSelect.appendChild(opt);
      });
  }

  // Populate Cards in Roster Panel
  if (!listContainer) return;

  if (!rawTravelersWorkers || rawTravelersWorkers.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 24px 16px; color: var(--color-text-dim);">
        <p style="font-size: 0.88rem;">${isMarathi ? 'कोणताही वाहतूक कामगार नोंदवलेला नाही.' : 'No raw brick traveler workers added yet.'}</p>
        <button type="button" class="btn-admin btn-terracotta" onclick="openRawTravelerWorkerModal()" style="margin-top: 10px; font-size: 0.8rem; padding: 8px 14px;">
          + ${isMarathi ? 'कामगार जोडा' : 'Add First Worker'}
        </button>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = (rawTravelersWorkers || []).map(w => {
    const workerLogs = (rawTravelersLogs || []).filter(l => l.workerId === w.id);
    const todayWorkerLogs = workerLogs.filter(l => l.date === targetDate);
    const todayBricks = todayWorkerLogs.reduce((acc, curr) => acc + (Number(curr.bricksCount) || 0), 0);
    const allTimeBricks = workerLogs.reduce((acc, curr) => acc + (Number(curr.bricksCount) || 0), 0);
    const totalTrips = workerLogs.reduce((acc, curr) => acc + (Number(curr.trips) || 0), 0);
    const totalWages = workerLogs.reduce((acc, curr) => acc + (Number(curr.wage) || 0), 0);

    let vehicleIcon = '🚜';
    if (w.vehicleType === 'Hand Cart') vehicleIcon = '🛒';
    else if (w.vehicleType === 'Wheelbarrow') vehicleIcon = '🛞';
    else if (w.vehicleType === 'Head-Load') vehicleIcon = '🧺';
    else if (w.vehicleType === 'Animal Cart') vehicleIcon = '🐴';

    return `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--color-charcoal-border); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.2s;" onmouseenter="this.style.borderColor='rgba(234, 88, 12, 0.4)'" onmouseleave="this.style.borderColor='var(--color-charcoal-border)'">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.15rem;">${vehicleIcon}</span>
              <strong style="color: #fff; font-size: 0.95rem;">${w.name}</strong>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 3px; font-size: 0.74rem; color: var(--color-text-dim);">
              <span>${w.vehicleType}</span>
              ${w.vehicleNo ? `<span>• 🆔 ${w.vehicleNo}</span>` : ''}
              ${w.phone ? `<span>• 📞 ${w.phone}</span>` : ''}
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-action-icon" onclick="openRawTravelerWorkerModal('${w.id}')" title="Edit Worker" style="background: rgba(255,255,255,0.06); border: 1px solid var(--color-charcoal-border); color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
              ✏️
            </button>
            <button type="button" class="btn-action-icon" onclick="deleteRawTravelerWorker('${w.id}')" title="Delete Worker" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #FCA5A5; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
              🗑️
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(0,0,0,0.25); border-radius: 6px; padding: 8px 10px; margin-top: 4px;">
          <div>
            <span style="font-size: 0.68rem; color: #FDBA74; text-transform: uppercase; font-weight: 700; display: block;">Today Reached</span>
            <strong style="font-size: 0.95rem; color: #fff; font-family: var(--font-heading);">${todayBricks.toLocaleString('en-IN')}</strong>
            <span style="font-size: 0.68rem; color: var(--color-text-dim); display: block;">bricks</span>
          </div>
          <div>
            <span style="font-size: 0.68rem; color: #93C5FD; text-transform: uppercase; font-weight: 700; display: block;">Total Reached</span>
            <strong style="font-size: 0.95rem; color: #fff; font-family: var(--font-heading);">${allTimeBricks.toLocaleString('en-IN')}</strong>
            <span style="font-size: 0.68rem; color: var(--color-text-dim); display: block;">(${totalTrips} trips)</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.renderRawTravelersLogsTable = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const tbody = document.getElementById('raw-travelers-logs-tbody');
  if (!tbody) return;

  const filterWorkerId = document.getElementById('raw-travelers-filter-worker')?.value || 'ALL';
  const filterDate = document.getElementById('raw-travelers-filter-date')?.value || '';

  let filtered = [...(rawTravelersLogs || [])];

  if (filterWorkerId && filterWorkerId !== 'ALL') {
    filtered = filtered.filter(l => l.workerId === filterWorkerId);
  }

  if (filterDate) {
    filtered = filtered.filter(l => l.date === filterDate);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--color-text-dim);">
          <div style="font-size: 1.8rem; margin-bottom: 6px; opacity: 0.4;">🚜</div>
          <strong style="display: block; font-size: 0.95rem; color: var(--color-text-dim);">
            ${isMarathi ? 'निवडलेल्या निकषांसाठी कोणतीही भट्टी आवक नोंद आढळली नाही.' : 'No raw brick transit logs found for the selected filter.'}
          </strong>
          <span style="font-size: 0.78rem; color: var(--color-text-muted); display: block; margin-top: 4px;">
            ${isMarathi ? 'डाव्या बाजूचा फॉर्म वापरून भट्टीवर कच्च्या विटांची आवक नोंदवा.' : 'Use the form above to record green bricks transported from land to kiln.'}
          </span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    let vehicleIcon = '🚜';
    if (item.transportMode === 'Hand Cart') vehicleIcon = '🛒';
    else if (item.transportMode === 'Wheelbarrow') vehicleIcon = '🛞';
    else if (item.transportMode === 'Head-Load') vehicleIcon = '🧺';
    else if (item.transportMode === 'Animal Cart') vehicleIcon = '🐴';

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #fff;">${item.date}</div>
          <div style="font-size: 0.72rem; color: var(--color-text-dim);">${item.time || ''}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>${vehicleIcon}</span>
            <strong style="color: #fff;">${item.workerName}</strong>
          </div>
          <div style="font-size: 0.72rem; color: var(--color-text-dim); margin-top: 2px;">
            ${item.transportMode} ${item.vehicleNo ? `• ${item.vehicleNo}` : ''}
          </div>
        </td>
        <td>
          <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.04); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--color-charcoal-border);">
            <span style="color: #93C5FD; font-size: 0.8rem; font-weight: 600;">👷‍♂️ ${item.molderWorker || item.sourceLand || (isMarathi ? 'विट बनवणारा' : 'Maker')}</span>
            <span style="color: var(--color-text-muted); font-weight: bold;">➔</span>
            <span style="color: #FDBA74; font-size: 0.8rem; font-weight: 700;">🔥 ${item.destChamber || 'Kiln'}</span>
          </div>
          ${item.notes ? `<div style="font-size: 0.72rem; color: var(--color-text-dim); margin-top: 3px; font-style: italic;">📝 ${item.notes}</div>` : ''}
        </td>
        <td>
          <span style="font-weight: 700; color: #fff;">${item.trips} ${isMarathi ? 'फेऱ्या' : 'trips'}</span>
          ${item.perTrip ? `<div style="font-size: 0.72rem; color: var(--color-text-dim);">~${item.perTrip.toLocaleString('en-IN')}/trip</div>` : ''}
        </td>
        <td>
          <span style="background: rgba(234, 88, 12, 0.18); border: 1.5px solid rgba(234, 88, 12, 0.5); color: #FB923C; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.95rem; font-family: var(--font-heading); display: inline-block;">
            ${(Number(item.bricksCount) || 0).toLocaleString('en-IN')}
          </span>
          <span style="font-size: 0.72rem; color: var(--color-text-dim); display: block; margin-top: 2px;">${isMarathi ? 'कच्च्या विटा' : 'green bricks'}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-action-icon" onclick="shareSingleTravelerReceiptWhatsApp('${item.id}')" title="Share WhatsApp Trip Slip" style="background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); color: #4ADE80; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/></svg>
            </button>
            <button type="button" class="btn-action-icon" onclick="openRawTravelerEditModal('${item.id}')" title="Edit Entry" style="background: rgba(255,255,255,0.06); border: 1px solid var(--color-charcoal-border); color: #fff; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
              ✏️
            </button>
            <button type="button" class="btn-action-icon" onclick="deleteRawTravelerLog('${item.id}')" title="Delete Entry" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #FCA5A5; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

window.setRawTravelersDateFilter = function(filterType) {
  const filterDateInput = document.getElementById('raw-travelers-filter-date');
  if (!filterDateInput) return;

  if (filterType === 'today') {
    filterDateInput.value = selectedDate || getTodayDateStr();
  } else if (filterType === 'all') {
    filterDateInput.value = '';
  }
  updateRawTravelersKPIs();
  renderRawTravelersLogsTable();
};

window.openRawTravelerWorkerModal = function(workerId = null) {
  const modal = document.getElementById('raw-traveler-worker-modal');
  const title = document.getElementById('raw-worker-modal-title');
  const editIdInput = document.getElementById('raw-worker-edit-id');
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

  if (!modal) return;

  if (workerId) {
    const worker = (rawTravelersWorkers || []).find(w => w.id === workerId);
    if (worker) {
      if (title) title.textContent = isMarathi ? '✏️ कच्ची विट वाहतूक कामगार माहिती बदला' : '✏️ Edit Traveler Worker Profile';
      if (editIdInput) editIdInput.value = worker.id;
      if (document.getElementById('raw-worker-name')) document.getElementById('raw-worker-name').value = worker.name || '';
      if (document.getElementById('raw-worker-vehicle-type')) document.getElementById('raw-worker-vehicle-type').value = worker.vehicleType || 'Tractor Trolley';
      if (document.getElementById('raw-worker-vehicle-no')) document.getElementById('raw-worker-vehicle-no').value = worker.vehicleNo || '';
      if (document.getElementById('raw-worker-rate')) document.getElementById('raw-worker-rate').value = worker.ratePer1000 || 250;
      if (document.getElementById('raw-worker-phone')) document.getElementById('raw-worker-phone').value = worker.phone || '';
    }
  } else {
    if (title) title.textContent = isMarathi ? '+ नवीन कच्ची विट वाहतूक कामगार जोडा' : '+ Add Raw Brick Traveler Worker';
    if (editIdInput) editIdInput.value = '';
    document.getElementById('raw-traveler-worker-form')?.reset();
    if (document.getElementById('raw-worker-rate')) document.getElementById('raw-worker-rate').value = '250';
  }

  modal.classList.add('open');
  modal.classList.add('active');
  const nameInput = document.getElementById('raw-worker-name');
  if (nameInput) setTimeout(() => nameInput.focus(), 100);
};

window.closeRawTravelerWorkerModal = function() {
  const modal = document.getElementById('raw-traveler-worker-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('active');
  }
};

window.deleteRawTravelerWorker = function(workerId) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const worker = (rawTravelersWorkers || []).find(w => w.id === workerId);
  const workerName = worker ? worker.name : 'Worker';

  const confirmMsg = isMarathi 
    ? `तुम्हाला खात्री आहे का "${workerName}" या वाहतूक कामगाराचे रेकॉर्ड हटवायचे आहे?` 
    : `Are you sure you want to remove traveler worker "${workerName}"?`;

  if (!confirm(confirmMsg)) return;

  rawTravelersWorkers = rawTravelersWorkers.filter(w => w.id !== workerId);
  saveToLocalStorage();

  if (typeof fbDeleteDoc === 'function' && typeof FB_COLLECTIONS !== 'undefined') {
    fbDeleteDoc(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS, workerId);
  }

  renderRawTravelersWorkers();
  updateRawTravelersKPIs();
  showAdminToast(isMarathi ? '🗑️ कामगार यशस्वीरित्या हटवला.' : '🗑️ Traveler worker removed.');
};

window.openRawTravelerEditModal = function(entryId) {
  const modal = document.getElementById('raw-traveler-edit-entry-modal');
  const entry = (rawTravelersLogs || []).find(l => l.id === entryId);
  if (!modal || !entry) return;

  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';

  document.getElementById('edit-entry-id').value = entry.id;
  document.getElementById('edit-entry-worker-select').value = entry.workerId;
  document.getElementById('edit-entry-transport-mode').value = entry.transportMode || 'Tractor Trolley';
  const editVehInput = document.getElementById('edit-entry-vehicle-no');
  if (editVehInput) editVehInput.value = entry.vehicleNo || '';
  
  const editMolderSelect = document.getElementById('edit-entry-source-land');
  const molderVal = entry.sourceLand || entry.molderWorker || '';
  if (editMolderSelect) {
    if (molderVal && ![...editMolderSelect.options].some(o => o.value === molderVal)) {
      const opt = document.createElement('option');
      opt.value = molderVal;
      opt.textContent = molderVal;
      editMolderSelect.appendChild(opt);
    }
    editMolderSelect.value = molderVal;
  }
  document.getElementById('edit-entry-dest-chamber').value = entry.destChamber || '';
  document.getElementById('edit-entry-trips').value = entry.trips || 1;
  document.getElementById('edit-entry-date').value = entry.date || '';
  
  const editBricksInput = document.getElementById('edit-entry-bricks-count');
  if (editBricksInput) {
    editBricksInput.value = entry.bricksCount || 0;
    editBricksInput.style.borderColor = 'rgba(234, 88, 12, 0.5)';
  }

  document.getElementById('edit-entry-rate').value = entry.ratePer1000 || 250;
  document.getElementById('edit-entry-notes').value = entry.notes || '';

  // Update edit stock badge and validation
  const editStockBadge = document.getElementById('edit-molder-available-stock-badge');
  const editLimitMsg = document.getElementById('edit-entry-bricks-limit-msg');
  if (editLimitMsg) editLimitMsg.style.display = 'none';

  if (molderVal) {
    const stats = window.getMolderAvailableBricks(molderVal, entry.id);
    if (editStockBadge) {
      editStockBadge.style.display = 'block';
      editStockBadge.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
          <span>🏭 <strong>${isMarathi ? 'उत्पादित शिल्लक' : 'Manufactured Stock'}:</strong></span>
          <span style="font-weight: 800; color: #34D399; font-size: 0.95rem;">${stats.available.toLocaleString('en-IN')} ${isMarathi ? 'विटा' : 'bricks'}</span>
        </div>
        <div style="font-size: 0.72rem; color: #fed7aa; margin-top: 3px; opacity: 0.9;">
          ${isMarathi ? 'एकूण उत्पादन' : 'Total Made'}: ${stats.totalManufactured.toLocaleString('en-IN')} | ${isMarathi ? 'इतर आवक' : 'Other Inwards'}: ${stats.totalDelivered.toLocaleString('en-IN')}
        </div>
      `;
    }
    if (editBricksInput) {
      editBricksInput.setAttribute('max', stats.available);
    }
  } else {
    if (editStockBadge) editStockBadge.style.display = 'none';
  }

  modal.classList.add('open');
  modal.classList.add('active');
};

window.closeRawTravelerEditModal = function() {
  const modal = document.getElementById('raw-traveler-edit-entry-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('active');
  }
};

window.deleteRawTravelerLog = function(entryId) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const confirmMsg = isMarathi 
    ? 'तुम्हाला खात्री आहे का ही कच्ची विट आवक नोंद हटवायची आहे?' 
    : 'Are you sure you want to delete this raw brick inward entry?';

  if (!confirm(confirmMsg)) return;

  rawTravelersLogs = rawTravelersLogs.filter(l => l.id !== entryId);
  saveToLocalStorage();

  if (typeof fbDeleteDoc === 'function' && typeof FB_COLLECTIONS !== 'undefined') {
    fbDeleteDoc(FB_COLLECTIONS.RAW_TRAVELERS_LOGS, entryId);
  }

  updateRawTravelersKPIs();
  renderRawTravelersWorkers();
  renderRawTravelersLogsTable();
  if (typeof refreshDashboard === 'function') refreshDashboard();

  showAdminToast(isMarathi ? '🗑️ नोंद यशस्वीरित्या हटवली.' : '🗑️ Kiln inward entry deleted.');
};

window.exportRawTravelersCSV = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const list = rawTravelersLogs || [];

  if (list.length === 0) {
    showAdminToast(isMarathi ? '⚠️ डाऊनलोड करण्यासाठी नोंदी उपलब्ध नाहीत.' : '⚠️ No raw brick inward records to export.');
    return;
  }

  const headers = [
    'Log ID',
    'Date',
    'Time',
    'Traveler Worker Name',
    'Transport Vehicle Mode',
    'Vehicle Number',
    'Source Land / Area',
    'Destination Kiln Chamber',
    'Trips Count',
    'Per Trip Quantity',
    'Total Reached Bricks',
    'Wage Rate per 1000 (INR)',
    'Labor Wage (INR)',
    'Remarks'
  ];

  const rows = list.map(item => [
    `"${item.id || ''}"`,
    `"${item.date || ''}"`,
    `"${item.time || ''}"`,
    `"${(item.workerName || '').replace(/"/g, '""')}"`,
    `"${item.transportMode || ''}"`,
    `"${item.vehicleNo || ''}"`,
    `"${(item.sourceLand || '').replace(/"/g, '""')}"`,
    `"${(item.destChamber || '').replace(/"/g, '""')}"`,
    item.trips || 1,
    item.perTrip || 0,
    item.bricksCount || 0,
    item.ratePer1000 || 0,
    item.wage || 0,
    `"${(item.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sukhakarta_Raw_Brick_Travelers_Kiln_Inward_${getTodayDateStr()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAdminToast(isMarathi ? '✅ कच्ची विट आवक नोंदवही CSV डाऊनलोड झाली!' : '✅ Raw brick inward CSV exported successfully!');
};

window.shareRawTravelersWhatsApp = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const targetDate = document.getElementById('raw-travelers-filter-date')?.value || selectedDate || getTodayDateStr();
  const dayLogs = (rawTravelersLogs || []).filter(l => l.date === targetDate);
  const todayBricks = dayLogs.reduce((acc, curr) => acc + (Number(curr.bricksCount) || 0), 0);
  const allTimeBricks = (rawTravelersLogs || []).reduce((acc, curr) => acc + (Number(curr.bricksCount) || 0), 0);
  const todayTrips = dayLogs.reduce((acc, curr) => acc + (Number(curr.trips) || 0), 0);
  const totalWages = dayLogs.reduce((acc, curr) => acc + (Number(curr.wage) || 0), 0);

  // Worker wise summary
  const workerSummary = {};
  dayLogs.forEach(l => {
    if (!workerSummary[l.workerName]) {
      workerSummary[l.workerName] = { bricks: 0, trips: 0, mode: l.transportMode };
    }
    workerSummary[l.workerName].bricks += Number(l.bricksCount) || 0;
    workerSummary[l.workerName].trips += Number(l.trips) || 0;
  });

  let workerLines = '';
  Object.keys(workerSummary).forEach(name => {
    const w = workerSummary[name];
    workerLines += `• *${name}* (${w.mode}): ${w.bricks.toLocaleString('en-IN')} विटा (${w.trips} फेऱ्या)\n`;
  });

  const message = isMarathi ? 
`🧱 *सुखकर्ता ब्रिक्स - कच्ची विट वाहतूक व भट्टी आवक दैनिक अहवाल*
📅 *तारीख:* ${targetDate}

🔥 *आज भट्टीवर पोहोचलेल्या कच्च्या विटा:* *${todayBricks.toLocaleString('en-IN')}* विटा
🧱 *एकूण भट्टीवर पोहोचलेल्या कच्च्या विटा (All-time):* *${allTimeBricks.toLocaleString('en-IN')}* विटा
🔄 *आजच्या एकूण फेऱ्या (Trips):* ${todayTrips} फेऱ्या
💰 *आजची एकूण वाहतूक मजुरी:* ₹${Math.round(totalWages).toLocaleString('en-IN')}

👷 *कामगार निहाय तपशील (Worker-wise Breakdown):*
${workerLines || '• आज कोणतीही नोंद झालेली नाही.\n'}
📍 *मार्ग:* विट बनवण्याची जागा (पठाई जमीन) ➔ भट्टी चेंबर
🏭 *भट्टी:* सुखकर्ता ब्रिक्स, पुणे Bypass Highway`
:
`🧱 *SUKHAKARTA BRICKS - RAW BRICK KILN INWARD DAILY REPORT*
📅 *Date:* ${targetDate}

🔥 *Today's Bricks Reached to Kiln:* *${todayBricks.toLocaleString('en-IN')}* Bricks
🧱 *Total Reached Bricks to Kiln (All-time):* *${allTimeBricks.toLocaleString('en-IN')}* Bricks
🔄 *Today's Transit Trips:* ${todayTrips} trips
💰 *Total Labor Wages:* ₹${Math.round(totalWages).toLocaleString('en-IN')}

👷 *Worker-wise Breakdown:*
${workerLines || '• No trips recorded for this date.\n'}
📍 *Route:* Manufacturing Land Ground ➔ Kiln Chambers
🏭 *Kiln:* Sukhakarta Bricks Works`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
};

window.shareSingleTravelerReceiptWhatsApp = function(entryId) {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const item = (rawTravelersLogs || []).find(l => l.id === entryId);
  if (!item) return;

  const msg = isMarathi ?
`🧱 *सुखकर्ता ब्रिक्स - कच्ची विट आवक पावती*
🆔 *नोंद क्रमांक:* ${item.id}
📅 *तारीख:* ${item.date} | ${item.time || ''}

👷 *वाहतूक कामगार:* ${item.workerName}
🚜 *वाहतूक साधन:* ${item.transportMode} ${item.vehicleNo ? `(${item.vehicleNo})` : ''}
👷‍♂️ *विट बनवणारा ➔ भट्टी:* ${item.molderWorker || item.sourceLand} ➔ ${item.destChamber}

📦 *फेऱ्या:* ${item.trips} फेऱ्या
🧱 *भट्टीवर पोहोचलेल्या विटा:* *${(Number(item.bricksCount) || 0).toLocaleString('en-IN')}* विटा
💵 *हिशोब दर:* ₹${item.ratePer1000}/१००० विटा
💰 *देय मजुरी रक्कम:* *₹${(Number(item.wage) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*

${item.notes ? `📝 *शेरा:* ${item.notes}\n` : ''}✅ सुखकर्ता ब्रिक्स भट्टी प्रशासन`
:
`🧱 *SUKHAKARTA BRICKS - RAW BRICK KILN INWARD RECEIPT*
🆔 *Log ID:* ${item.id}
📅 *Date:* ${item.date} | ${item.time || ''}

👷 *Traveler Worker:* ${item.workerName}
🚜 *Transport Vehicle:* ${item.transportMode} ${item.vehicleNo ? `(${item.vehicleNo})` : ''}
👷‍♂️ *Maker ➔ Kiln:* ${item.molderWorker || item.sourceLand} ➔ ${item.destChamber}

📦 *Trips:* ${item.trips}
🧱 *Bricks Reached to Kiln:* *${(Number(item.bricksCount) || 0).toLocaleString('en-IN')}* Bricks
💵 *Piece-Rate:* ₹${item.ratePer1000}/1000 bricks
💰 *Labor Wage:* *₹${(Number(item.wage) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*

${item.notes ? `📝 *Remarks:* ${item.notes}\n` : ''}✅ Sukhakarta Bricks Kiln Management`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
};

window.exportRawTravelersPDF = function() {
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const targetDate = document.getElementById('raw-travelers-filter-date')?.value || selectedDate || getTodayDateStr();
  const dayLogs = (rawTravelersLogs || []).filter(l => l.date === targetDate);
  const todayBricks = dayLogs.reduce((acc, curr) => acc + (Number(curr.bricksCount) || 0), 0);
  const allTimeBricks = (rawTravelersLogs || []).reduce((acc, curr) => acc + (Number(curr.bricksCount) || 0), 0);
  const todayTrips = dayLogs.reduce((acc, curr) => acc + (Number(curr.trips) || 0), 0);

  const rowsHtml = (rawTravelersLogs || []).map(item => `
    <tr style="page-break-inside: avoid; break-inside: avoid;">
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; word-break: break-word;">${item.date} ${item.time || ''}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; word-break: break-word;"><strong>${item.workerName}</strong><br><small>${item.transportMode} ${item.vehicleNo || ''}</small></td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; word-break: break-word;">${item.sourceLand} ➔ ${item.destChamber}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; text-align: center;">${item.trips}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; text-align: right; font-weight: bold; color: #b84528;">${(Number(item.bricksCount) || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; word-break: break-word;">${item.notes || '-'}</td>
    </tr>
  `).join('');

  const reportHtml = `
    <div style="font-family: 'Noto Sans Devanagari', 'Mukta', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 22px 24px; color: #0f172a; width: 760px; max-width: 760px; min-width: 760px; margin: 0; box-sizing: border-box; background: #ffffff; text-align: left; letter-spacing: normal;">
      <div style="text-align: center; border-bottom: 2px solid #b84528; padding-bottom: 12px; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
        <h1 style="margin: 0; color: #b84528; font-size: 22px;">SUKHAKARTA BRICKS - RAW BRICK TRANSFER TO KILN REPORT</h1>
        <p style="margin: 4px 0 0; color: #666; font-size: 12px;">Ground Manufacturing Land ➔ Kiln Chambers Inward Audit Trail | Date: ${targetDate}</p>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; gap: 12px; width: 100%; box-sizing: border-box;">
        <div style="flex: 1 1 0; min-width: 0; border: 1px solid #ddd; border-radius: 6px; padding: 12px; text-align: center; background: #f9f9f9; box-sizing: border-box;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Today's Reached Bricks to Kiln</div>
          <div style="font-size: 20px; font-weight: bold; color: #b84528; margin: 4px 0;">${todayBricks.toLocaleString('en-IN')}</div>
          <small style="color: #666;">Selected Date Inward</small>
        </div>
        <div style="flex: 1 1 0; min-width: 0; border: 1px solid #ddd; border-radius: 6px; padding: 12px; text-align: center; background: #f9f9f9; box-sizing: border-box;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Total Reached Bricks to Kiln</div>
          <div style="font-size: 20px; font-weight: bold; color: #b84528; margin: 4px 0;">${allTimeBricks.toLocaleString('en-IN')}</div>
          <small style="color: #666;">Cumulative Green Bricks</small>
        </div>
        <div style="flex: 1 1 0; min-width: 0; border: 1px solid #ddd; border-radius: 6px; padding: 12px; text-align: center; background: #f9f9f9; box-sizing: border-box;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Today's Transit Trips</div>
          <div style="font-size: 20px; font-weight: bold; color: #b84528; margin: 4px 0;">${todayTrips}</div>
          <small style="color: #666;">Trolleys & Carts</small>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; table-layout: fixed; width: 100%;">
        <thead>
          <tr style="background: #b84528; color: #fff; page-break-inside: avoid; break-inside: avoid;">
            <th style="padding: 10px 8px; border: 1px solid #b84528; text-align: left; width: 16%;">Date & Time</th>
            <th style="padding: 10px 8px; border: 1px solid #b84528; text-align: left; width: 22%;">Traveler Worker</th>
            <th style="padding: 10px 8px; border: 1px solid #b84528; text-align: left; width: 22%;">Route (Land ➔ Kiln)</th>
            <th style="padding: 10px 8px; border: 1px solid #b84528; text-align: center; width: 10%;">Trips</th>
            <th style="padding: 10px 8px; border: 1px solid #b84528; text-align: right; width: 15%;">Bricks Reached</th>
            <th style="padding: 10px 8px; border: 1px solid #b84528; text-align: left; width: 15%;">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 12px; color:#888;">No green brick inward logs recorded for this date.</td></tr>'}
        </tbody>
      </table>
      <div style="margin-top: 30px; text-align: right; font-size: 11px; color: #777; width: 100%; box-sizing: border-box;">
        Printed on ${new Date().toLocaleString('en-IN')} | Sukhakarta Bricks Kiln Management System
      </div>
    </div>
  `;

  if (typeof window.html2pdf !== 'undefined') {
    const reportContainer = document.createElement('div');
    reportContainer.id = 'sukhakarta-raw-pdf-container';
    reportContainer.style.width = '760px';
    reportContainer.style.maxWidth = '760px';
    reportContainer.style.minWidth = '760px';
    reportContainer.style.margin = '0';
    reportContainer.style.padding = '0';
    reportContainer.style.background = '#ffffff';
    reportContainer.style.color = '#0f172a';
    reportContainer.style.boxSizing = 'border-box';
    reportContainer.style.position = 'relative';
    reportContainer.style.left = '0';
    reportContainer.style.top = '0';
    reportContainer.style.textAlign = 'left';
    reportContainer.innerHTML = reportHtml;

    const cleanupRaw = () => {
      if (reportContainer.parentNode) reportContainer.parentNode.removeChild(reportContainer);
    };

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Raw_Bricks_Transfer_Report_${targetDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        width: 760,
        windowWidth: 760
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    window.html2pdf().set(opt).from(reportContainer).save()
      .then(() => {
        cleanupRaw();
        showAdminToast(isMarathi ? '✅ कच्ची विट अहवाल PDF डाऊनलोड झाला!' : '✅ Raw brick report PDF downloaded!');
      })
      .catch((err) => {
        cleanupRaw();
        console.error('Raw travelers html2pdf failed, falling back to print:', err);
        openPrintWindowFallback(reportHtml);
      });
  } else {
    openPrintWindowFallback(reportHtml);
  }
};

// ==========================================
// THEME SWITCHER (DARK / LIGHT MODE)
// ==========================================
window.initAdminTheme = function() {
  const saved = localStorage.getItem('sukhakarta_admin_theme') || 'dark';
  window.applyTheme(saved);
};

window.applyTheme = function(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  localStorage.setItem('sukhakarta_admin_theme', theme);
  window.updateThemeLabels(theme);
};

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const target = current === 'dark' ? 'light' : 'dark';
  window.applyTheme(target);

  const isMr = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const dict = typeof TRANSLATIONS !== 'undefined' ? (isMr ? TRANSLATIONS.mr : TRANSLATIONS.en) : null;
  const msg = target === 'light'
    ? (dict?.admin_theme_switched_light || (isMr ? '☀️ लाइट मोड चालू केला' : '☀️ Switched to Light Mode'))
    : (dict?.admin_theme_switched_dark || (isMr ? '🌙 डार्क मोड चालू केला' : '🌙 Switched to Dark Mode'));

  if (typeof showAdminToast === 'function') {
    showAdminToast(msg);
  }
};

window.updateThemeLabels = function(theme) {
  const isMr = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const dict = typeof TRANSLATIONS !== 'undefined' ? (isMr ? TRANSLATIONS.mr : TRANSLATIONS.en) : null;
  const label = theme === 'light'
    ? (dict?.admin_theme_label_dark || (isMr ? 'डार्क' : 'Dark'))
    : (dict?.admin_theme_label_light || (isMr ? 'लाइट' : 'Light'));

  document.querySelectorAll('.theme-btn-label').forEach(el => {
    el.textContent = label;
  });
};
