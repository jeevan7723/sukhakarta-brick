/**
 * SUKHAKARTA BRICKS - FIREBASE CLOUD FIRESTORE INTEGRATION
 * Real-time cloud database synchronization for Workers, Production, Leaves, Deliveries, and Customer Inquiries
 */

// Firebase Configuration provided for Sukhakarta Bricks project
const firebaseConfig = {
  apiKey: "AIzaSyCnq-p8fliU8Uiix4Ns2hNXUvFrsAyV32k",
  authDomain: "sukhakarta-bricks.firebaseapp.com",
  projectId: "sukhakarta-bricks",
  storageBucket: "sukhakarta-bricks.firebasestorage.app",
  messagingSenderId: "826828459777",
  appId: "1:826828459777:web:367dc97af2ceecdb559500",
  measurementId: "G-12NW10JGMM"
};

// Firestore Collections Constants
const FB_COLLECTIONS = {
  WORKERS: 'workers',
  PRODUCTION_LOGS: 'production_logs',
  WORKER_LEAVES: 'worker_leaves',
  DELIVERY_LOGS: 'delivery_logs',
  TRANSPORTERS: 'transporters',
  INQUIRIES: 'inquiries',
  SITE_SETTINGS: 'site_settings',
  RAW_MATERIALS: 'raw_materials',
  RAW_TRAVELERS_WORKERS: 'raw_travelers_workers',
  RAW_TRAVELERS_LOGS: 'raw_travelers_logs'
};

let fbApp = null;
let fbDb = null;
let isFirebaseReady = false;
let syncStatusListeners = [];

// Initialize Firebase App & Firestore Database
try {
  if (typeof firebase !== 'undefined') {
    // Avoid double initialization if script is loaded multiple times
    if (!firebase.apps || firebase.apps.length === 0) {
      fbApp = firebase.initializeApp(firebaseConfig);
    } else {
      fbApp = firebase.app();
    }

    fbDb = firebase.firestore();

    // Enable offline persistence only on http/https to avoid file:// security restrictions
    if (typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
      fbDb.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.info('Firestore multi-tab persistence note: Persistence active in primary tab.');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence not supported in this browser environment.');
        }
      });
    }

    isFirebaseReady = true;
    console.log('🔥 Sukhakarta Bricks: Cloud Firestore initialized successfully (' + firebaseConfig.projectId + ')');
  } else {
    console.warn('Firebase SDK not yet available on window.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

/**
 * Register listener for sync status updates
 */
function onSyncStatusChange(callback) {
  if (typeof callback === 'function') {
    syncStatusListeners.push(callback);
  }
}

function notifySyncStatus(status, details) {
  syncStatusListeners.forEach(cb => {
    try { cb(status, details); } catch (e) { console.error(e); }
  });
}

/**
 * Save or update a single document in Firestore
 */
async function fbSaveDoc(collectionName, docId, data) {
  if (!isFirebaseReady || !fbDb) {
    console.warn('Firestore not ready, skipping remote save for', collectionName, docId);
    return false;
  }
  try {
    notifySyncStatus('syncing', { collection: collectionName, action: 'save' });
    const payload = {
      ...data,
      _updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await fbDb.collection(collectionName).doc(String(docId)).set(payload, { merge: true });
    notifySyncStatus('synced', { collection: collectionName, docId });
    return true;
  } catch (error) {
    console.error('Error saving to Firestore:', collectionName, docId, error);
    notifySyncStatus('error', { collection: collectionName, error });
    return false;
  }
}

/**
 * Delete a document from Firestore
 */
async function fbDeleteDoc(collectionName, docId) {
  if (!isFirebaseReady || !fbDb) return false;
  try {
    notifySyncStatus('syncing', { collection: collectionName, action: 'delete' });
    await fbDb.collection(collectionName).doc(String(docId)).delete();
    notifySyncStatus('synced', { collection: collectionName, docId });
    return true;
  } catch (error) {
    console.error('Error deleting from Firestore:', collectionName, docId, error);
    notifySyncStatus('error', { collection: collectionName, error });
    return false;
  }
}

/**
 * Purge/Clear all documents from a Firestore collection
 */
async function fbClearEntireCollection(collectionName) {
  if (!isFirebaseReady || !fbDb) return false;
  try {
    notifySyncStatus('syncing', { collection: collectionName, action: 'clear_all' });
    const snapshot = await fbDb.collection(collectionName).get();
    if (snapshot.empty) {
      notifySyncStatus('synced', { collection: collectionName });
      return true;
    }
    let batch = fbDb.batch();
    let count = 0;
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = fbDb.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    notifySyncStatus('synced', { collection: collectionName });
    return true;
  } catch (error) {
    console.error('Error clearing collection from Firestore:', collectionName, error);
    notifySyncStatus('error', { collection: collectionName, error });
    return false;
  }
}

/**
 * Fetch all documents from a collection
 */
async function fbFetchCollection(collectionName) {
  if (!isFirebaseReady || !fbDb) return null;
  try {
    const snapshot = await fbDb.collection(collectionName).get();
    const items = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      items.push({ ...data, id: data.id || doc.id });
    });
    return items;
  } catch (error) {
    console.error('Error fetching collection:', collectionName, error);
    return null;
  }
}

/**
 * Subscribe to real-time updates for a collection
 */
function fbSubscribeCollection(collectionName, onData, onError) {
  if (!isFirebaseReady || !fbDb) return () => {};
  try {
    return fbDb.collection(collectionName).onSnapshot(
      (snapshot) => {
        const items = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          items.push({ ...data, id: data.id || doc.id });
        });
        notifySyncStatus('synced', { collection: collectionName, count: items.length });
        if (typeof onData === 'function') onData(items);
      },
      (error) => {
        console.error('Firestore snapshot listener error for', collectionName, error);
        notifySyncStatus('error', { collection: collectionName, error });
        if (typeof onError === 'function') onError(error);
      }
    );
  } catch (error) {
    console.error('Failed to subscribe to', collectionName, error);
    return () => {};
  }
}

/**
 * DEFAULT WEBSITE SETTINGS (Live Kiln Config)
 */
const DEFAULT_SITE_SETTINGS = {
  businessName: 'Sukhakarta Bricks',
  phoneNumber: '917385803641',
  displayPhone: '+91 73858 03641',
  kilnAddress: 'Sukhakarta Brick Works, Site No. 4, Industrial Bypass Highway, Maharashtra 412207',
  ratePerBrick: 9.50,
  ratePer1000: 9500,
  kilnStatus: 'Active Firing & Dispatching',
  kilnStatusMr: 'सक्रिय भट्टी भाजणे व जलद वाहतूक सुरू',
  dailyCapacity: 25000,
  currentStock: 42000,
  bricksSupplied: '50M+',
  isKilnActive: true,
  operatingHours: 'Mon – Sat: 6:00 AM – 7:00 PM | Sun: 7:00 AM – 2:00 PM',
  notice: 'Fresh kiln-burned batch ready for immediate site delivery across Pune & surrounding regions.',
  noticeMr: 'पुणे व परिसरासाठी ताजी, पक्की भाजलेली लाल विटांची पहिली बॅच त्वरित डिलिव्हरीसाठी सज्ज.'
};

/**
 * Fetch Live Website & Kiln Settings from Firestore
 */
async function fbGetSiteSettings() {
  if (!isFirebaseReady || !fbDb) return DEFAULT_SITE_SETTINGS;
  try {
    const doc = await fbDb.collection(FB_COLLECTIONS.SITE_SETTINGS).doc('kiln_config').get();
    if (doc.exists) {
      return { ...DEFAULT_SITE_SETTINGS, ...doc.data() };
    } else {
      // Seed initial document to Firestore
      await fbDb.collection(FB_COLLECTIONS.SITE_SETTINGS).doc('kiln_config').set(DEFAULT_SITE_SETTINGS);
      return DEFAULT_SITE_SETTINGS;
    }
  } catch (err) {
    console.warn('Error reading site_settings:', err);
    return DEFAULT_SITE_SETTINGS;
  }
}

/**
 * Save Live Website & Kiln Settings to Firestore
 */
async function fbSaveSiteSettings(settings) {
  if (!isFirebaseReady || !fbDb) return false;
  try {
    notifySyncStatus('syncing', { collection: FB_COLLECTIONS.SITE_SETTINGS, action: 'save' });
    const payload = {
      ...settings,
      _updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await fbDb.collection(FB_COLLECTIONS.SITE_SETTINGS).doc('kiln_config').set(payload, { merge: true });
    notifySyncStatus('synced', { collection: FB_COLLECTIONS.SITE_SETTINGS });
    return true;
  } catch (err) {
    console.error('Error saving site_settings:', err);
    notifySyncStatus('error', { collection: FB_COLLECTIONS.SITE_SETTINGS, error: err });
    return false;
  }
}

/**
 * Real-time listener for Website Live Settings
 */
function fbSubscribeSiteSettings(callback) {
  if (!isFirebaseReady || !fbDb) return () => {};
  try {
    return fbDb.collection(FB_COLLECTIONS.SITE_SETTINGS).doc('kiln_config').onSnapshot(
      (doc) => {
        if (doc.exists && typeof callback === 'function') {
          callback({ ...DEFAULT_SITE_SETTINGS, ...doc.data() });
        }
      },
      (err) => console.warn('Site settings subscription warning:', err)
    );
  } catch (err) {
    console.warn('Could not subscribe to site_settings:', err);
    return () => {};
  }
}

/**
 * Save customer inquiry to Firestore
 */
async function fbSaveInquiry(inquiryData) {
  if (!isFirebaseReady || !fbDb) {
    console.info('Firestore not active, proceeding without remote inquiry log');
    return null;
  }
  try {
    const docId = inquiryData.id || ('INQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));
    const record = {
      ...inquiryData,
      id: docId,
      status: inquiryData.status || 'new',
      receivedAt: firebase.firestore.FieldValue.serverTimestamp(),
      source: inquiryData.source || 'website_inquiry_form'
    };
    await fbDb.collection(FB_COLLECTIONS.INQUIRIES).doc(docId).set(record);
    console.log('✅ Customer inquiry logged to Firestore:', docId);
    return docId;
  } catch (err) {
    console.warn('Could not write customer inquiry to Firestore:', err);
    return null;
  }
}

/**
 * Batch upload all local records to Firestore (e.g. Initial migration or Force Sync)
 */
async function fbSyncAllToCloud(data) {
  if (!isFirebaseReady || !fbDb) return false;
  try {
    notifySyncStatus('syncing', { action: 'batch_upload' });
    const batchLimit = 400;
    
    const syncCollection = async (collName, list) => {
      if (!Array.isArray(list) || list.length === 0) return;
      let batch = fbDb.batch();
      let count = 0;

      for (const item of list) {
        const id = item.id || ('doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
        const ref = fbDb.collection(collName).doc(String(id));
        batch.set(ref, { ...item, id, _syncedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        count++;
        if (count >= batchLimit) {
          await batch.commit();
          batch = fbDb.batch();
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    };

    if (data.workers) await syncCollection(FB_COLLECTIONS.WORKERS, data.workers);
    if (data.productionLogs) await syncCollection(FB_COLLECTIONS.PRODUCTION_LOGS, data.productionLogs);
    if (data.workerLeaves) await syncCollection(FB_COLLECTIONS.WORKER_LEAVES, data.workerLeaves);
    if (data.deliveryLogs) await syncCollection(FB_COLLECTIONS.DELIVERY_LOGS, data.deliveryLogs);
    if (data.storedTransporters) await syncCollection(FB_COLLECTIONS.TRANSPORTERS, data.storedTransporters);
    if (data.websiteInquiries) await syncCollection(FB_COLLECTIONS.INQUIRIES, data.websiteInquiries);
    if (data.rawMaterials) await syncCollection(FB_COLLECTIONS.RAW_MATERIALS, data.rawMaterials);
    if (data.rawTravelersWorkers) await syncCollection(FB_COLLECTIONS.RAW_TRAVELERS_WORKERS, data.rawTravelersWorkers);
    if (data.rawTravelersLogs) await syncCollection(FB_COLLECTIONS.RAW_TRAVELERS_LOGS, data.rawTravelersLogs);

    notifySyncStatus('synced', { action: 'batch_upload_complete' });
    return true;
  } catch (error) {
    console.error('Error in fbSyncAllToCloud:', error);
    notifySyncStatus('error', { action: 'batch_upload', error });
    return false;
  }
}

// Attach helpers to global window object
window.fbDb = fbDb;
window.isFirebaseReady = isFirebaseReady;
window.FB_COLLECTIONS = FB_COLLECTIONS;
window.DEFAULT_SITE_SETTINGS = DEFAULT_SITE_SETTINGS;
window.fbGetSiteSettings = fbGetSiteSettings;
window.fbSaveSiteSettings = fbSaveSiteSettings;
window.fbSubscribeSiteSettings = fbSubscribeSiteSettings;
window.fbSaveDoc = fbSaveDoc;
window.fbDeleteDoc = fbDeleteDoc;
window.fbClearEntireCollection = fbClearEntireCollection;
window.fbFetchCollection = fbFetchCollection;
window.fbSubscribeCollection = fbSubscribeCollection;
window.fbSaveInquiry = fbSaveInquiry;
window.fbSyncAllToCloud = fbSyncAllToCloud;
window.onSyncStatusChange = onSyncStatusChange;
