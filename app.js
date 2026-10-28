/**
 * SUKHAKARTA BRICKS - INTERACTIVE LOGIC & WHATSAPP ENGINE
 * High-Converting Red Clay Bricks Landing Page
 */

// ==========================================
// CONFIGURATION (Customize easily here)
// ==========================================
const SITE_CONFIG = {
  phoneNumber: '917385803641', // Format: Country code without '+' followed by number
  displayPhone: '+91 73858 03641',
  businessName: 'Sukhakarta Bricks',
  defaultHeroMessage: 'Hi, I am interested in ordering Standard Red Clay Bricks from your kiln.',
  defaultInquiryMessage: 'Hi Sukhakarta Bricks, I would like to get a quote for bulk red clay bricks.'
};

document.addEventListener('DOMContentLoaded', () => {
  initLanguageSwitcher();
  initHeader();
  initCalculator();
  initInquiryForm();
  initHotspots();
  initFAQ();
  initFloatingWhatsApp();
  initLiveWebsiteData();

  // Apply saved or default language
  if (typeof applyLanguage === 'function') {
    applyLanguage(typeof currentLang !== 'undefined' ? currentLang : 'en');
  }
});

// ==========================================
// LANGUAGE SWITCHER
// ==========================================
function initLanguageSwitcher() {
  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lang = e.currentTarget.dataset.lang;
      if (lang && typeof applyLanguage === 'function') {
        applyLanguage(lang);
        showToast(lang === 'mr' ? '🌐 भाषा बदलली: मराठी' : '🌐 Language switched: English');
      }
    });
  });
}

// ==========================================
// HEADER & MOBILE NAVIGATION
// ==========================================
function initHeader() {
  const header = document.querySelector('.site-header');
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Sticky header scroll shadow
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  });

  // Mobile menu toggle
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen);
      mobileToggle.innerHTML = isOpen
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    });

    // Close menu when clicking any nav link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        if (mobileToggle) {
          mobileToggle.setAttribute('aria-expanded', 'false');
          mobileToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
        }
      });
    });
  }
}

// ==========================================
// INTERACTIVE BRICK CALCULATOR ENGINE
// ==========================================
function initCalculator() {
  const lengthInput = document.getElementById('calc-length');
  const heightInput = document.getElementById('calc-height');
  const deductionsInput = document.getElementById('calc-deductions');
  const locationInput = document.getElementById('calc-site-location');
  if (!lengthInput) return;
  const unitButtons = document.querySelectorAll('.unit-btn');
  const thicknessRadios = document.querySelectorAll('input[name="wall-thickness"]');
  const wastageRadios = document.querySelectorAll('input[name="wastage-allowance"]');
  
  // Output elements
  const totalAreaEl = document.getElementById('res-total-area');
  const totalBricksEl = document.getElementById('res-total-bricks');
  const baseBricksEl = document.getElementById('res-base-bricks');
  const bufferBricksEl = document.getElementById('res-buffer-bricks');
  const cementBagsEl = document.getElementById('res-cement-bags');
  const sandTonsEl = document.getElementById('res-sand-tons');
  const truckEstimateEl = document.getElementById('res-truckload');
  const btnSendWhatsApp = document.getElementById('btn-calc-whatsapp');
  const btnCopyEstimate = document.getElementById('btn-copy-estimate');

  let currentUnit = 'feet'; // 'feet' or 'meters'

  // Unit Toggle handler
  unitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      unitButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentUnit = btn.dataset.unit;
      
      const unitAddons = document.querySelectorAll('.calc-unit-addon');
      unitAddons.forEach(addon => {
        addon.textContent = currentUnit === 'feet' ? 'ft' : 'm';
      });

      const areaAddons = document.querySelectorAll('.calc-area-addon');
      areaAddons.forEach(addon => {
        addon.textContent = currentUnit === 'feet' ? 'sq.ft' : 'sq.m';
      });

      // Adjust sample default values for realistic demonstration
      if (currentUnit === 'meters') {
        if (parseFloat(lengthInput.value) > 20) lengthInput.value = '6';
        if (parseFloat(heightInput.value) > 12) heightInput.value = '3';
        if (parseFloat(deductionsInput.value) > 10) deductionsInput.value = '2';
      } else {
        if (parseFloat(lengthInput.value) <= 10) lengthInput.value = '20';
        if (parseFloat(heightInput.value) <= 5) heightInput.value = '10';
        if (parseFloat(deductionsInput.value) <= 4) deductionsInput.value = '21';
      }

      calculateBricks();
    });
  });

  // Calculate whenever inputs change
  [lengthInput, heightInput, deductionsInput, locationInput].forEach(input => {
    if (input) input.addEventListener('input', calculateBricks);
  });

  thicknessRadios.forEach(radio => radio.addEventListener('change', calculateBricks));
  wastageRadios.forEach(radio => radio.addEventListener('change', calculateBricks));

  function calculateBricks() {
    const length = Math.max(0, parseFloat(lengthInput.value) || 0);
    const height = Math.max(0, parseFloat(heightInput.value) || 0);
    const deductions = Math.max(0, parseFloat(deductionsInput.value) || 0);
    
    // Gross area minus deductions
    const grossArea = length * height;
    const netArea = Math.max(0, grossArea - deductions);

    // Selected thickness: 4.5, 9, or 13.5 inches
    let selectedThickness = '9';
    thicknessRadios.forEach(radio => {
      if (radio.checked) selectedThickness = radio.value;
    });

    // Selected wastage percentage: e.g. 5, 8, or 10
    let selectedWastage = 5;
    wastageRadios.forEach(radio => {
      if (radio.checked) selectedWastage = parseInt(radio.value, 10);
    });

    // Standard Red Clay Brick Coverage Factors (IS standard brick with 10mm mortar)
    // Feet:
    // 4.5" wall: ~4.9 bricks per sq.ft
    // 9.0" wall: ~9.8 bricks per sq.ft
    // 13.5" wall: ~14.7 bricks per sq.ft
    // Meters:
    // 4.5" (115mm) wall: ~53 bricks per sq.m
    // 9.0" (230mm) wall: ~106 bricks per sq.m
    // 13.5" (345mm) wall: ~158 bricks per sq.m
    let bricksPerUnit = 9.8;
    if (currentUnit === 'feet') {
      if (selectedThickness === '4.5') bricksPerUnit = 4.9;
      else if (selectedThickness === '9') bricksPerUnit = 9.8;
      else if (selectedThickness === '13.5') bricksPerUnit = 14.7;
    } else {
      if (selectedThickness === '4.5') bricksPerUnit = 53;
      else if (selectedThickness === '9') bricksPerUnit = 106;
      else if (selectedThickness === '13.5') bricksPerUnit = 158;
    }

    const baseBricks = Math.round(netArea * bricksPerUnit);
    const bufferBricks = Math.round(baseBricks * (selectedWastage / 100));
    const totalBricks = baseBricks + bufferBricks;

    // Mortar calculations (approx 1 bag of 50kg cement per ~500 bricks for standard 1:6 mix)
    const cementBags = Math.max(1, Math.ceil(totalBricks / 520));
    // Sand ~ 0.5 Tons per 1000 bricks (~0.18 Brass per 1000)
    const sandTons = (totalBricks * 0.00055).toFixed(1);

    // Truckload estimation
    let truckloadText = '';
    if (totalBricks <= 3000) {
      truckloadText = '1 Tractor Trolley (~3,000 bricks)';
    } else if (totalBricks <= 6000) {
      truckloadText = '1 Medium 6-Wheeler (~6,000 bricks)';
    } else if (totalBricks <= 10000) {
      truckloadText = '1 Heavy 10-Wheeler Dumper (~10,000 bricks)';
    } else {
      const dumpers = (totalBricks / 10000).toFixed(1);
      truckloadText = `${dumpers} Heavy Dumper Loads`;
    }

    // Update UI elements with formatted numbers
    totalAreaEl.textContent = `${netArea.toLocaleString('en-IN', { maximumFractionDigits: 1 })} ${currentUnit === 'feet' ? 'sq.ft' : 'sq.m'}`;
    totalBricksEl.textContent = totalBricks.toLocaleString('en-IN');
    baseBricksEl.textContent = baseBricks.toLocaleString('en-IN');
    bufferBricksEl.textContent = `+${bufferBricks.toLocaleString('en-IN')} (${selectedWastage}%)`;
    cementBagsEl.textContent = `${cementBags} Bags (50kg)`;
    sandTonsEl.textContent = `${sandTons} Tons`;
    truckEstimateEl.textContent = truckloadText;

    // Expose recalculation hook for language switch
    window.recalculateForLanguage = calculateBricks;

    // Estimated material cost based on live Firestore kiln rate
    const activeRate = Number(currentSiteSettings?.ratePerBrick) || 9.5;
    const estimatedCost = Math.round(totalBricks * activeRate);

    const costEl = document.getElementById('res-total-cost');
    if (costEl) costEl.textContent = `₹${estimatedCost.toLocaleString('en-IN')}`;

    const rateBadge = document.getElementById('calc-rate-badge');
    if (rateBadge) rateBadge.textContent = activeRate.toFixed(2);

    // Generate dynamic WhatsApp Message based on language
    const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
    const locationVal = locationInput ? locationInput.value.trim() : '';
    
    let waText = '';
    if (isMarathi) {
      const locText = locationVal ? `*${locationVal}* येथील साइटसाठी` : 'माझ्या बांधकाम साइटसाठी';
      const thickText = selectedThickness === '4.5' ? '४.५" सिंगल पार्टिशन भिंत' : selectedThickness === '9' ? '९.०" डबल बाह्य भिंत' : '१३.५" जड पाया भिंत';
      const unitText = currentUnit === 'feet' ? 'फूट' : 'मीटर';
      const areaUnitText = currentUnit === 'feet' ? 'चौ. फूट' : 'चौ. मीटर';

      waText = 
        `*🧱 चौकशी: सुखकर्ता लाल मातीच्या विटांचा दर*\n` +
        `ऑनलाइन विटा कॅल्क्युलेटर अंदाज:\n\n` +
        `• *भिंत मोजमाप:* ${length} × ${height} ${unitText} (${netArea.toFixed(1)} ${areaUnitText})\n` +
        `• *भिंतीची जाडी:* ${thickText}\n` +
        `• *मूळ विटांची संख्या:* ${baseBricks.toLocaleString('en-IN')}\n` +
        `• *तुटफूट बफर:* +${bufferBricks.toLocaleString('en-IN')} (${selectedWastage}%)\n` +
        `• *एकूण आवश्यक विटा:* *${totalBricks.toLocaleString('en-IN')} विटा*\n` +
        `• *अंदाजे विटा खर्च (₹${activeRate}/विट):* ₹${estimatedCost.toLocaleString('en-IN')}\n` +
        `• *अंदाजे मोर्टार:* ${cementBags} सिमेंट पोती (५० कि.) | ${sandTons} टन वाळू\n\n` +
        `कृपया ${locText} पोहच थेट भट्टीचा घाऊक दर सांगा.`;
    } else {
      const locText = locationVal ? `for site in *${locationVal}*` : 'to my site';
      const thickText = selectedThickness === '4.5' ? 'Single/Partition' : selectedThickness === '9' ? 'Double/External' : 'Heavy Load';
      
      waText = 
        `*🧱 INQUIRY: Standard Red Clay Bricks Quote*\n` +
        `From Sukhakarta Bricks Online Calculator:\n\n` +
        `• *Wall Dimensions:* ${length} x ${height} ${currentUnit === 'feet' ? 'ft' : 'm'} (${netArea.toFixed(1)} ${currentUnit === 'feet' ? 'sq.ft' : 'sq.m'})\n` +
        `• *Wall Thickness:* ${selectedThickness}" (${thickText})\n` +
        `• *Base Bricks:* ${baseBricks.toLocaleString('en-IN')}\n` +
        `• *Buffer Added:* +${bufferBricks.toLocaleString('en-IN')} (${selectedWastage}%)\n` +
        `• *TOTAL REQUIRED:* *${totalBricks.toLocaleString('en-IN')} Bricks*\n` +
        `• *Est. Material Cost (@ ₹${activeRate}/brick):* ₹${estimatedCost.toLocaleString('en-IN')}\n` +
        `• *Approx Mortar Needed:* ${cementBags} Cement bags | ${sandTons} Tons sand\n\n` +
        `Please provide delivered wholesale kiln price ${locText}.`;
    }

    const waUrl = `https://wa.me/${SITE_CONFIG.phoneNumber}?text=${encodeURIComponent(waText)}`;
    
    if (btnSendWhatsApp) {
      btnSendWhatsApp.href = waUrl;
      btnSendWhatsApp.onclick = async () => {
        if (typeof fbSaveInquiry === 'function') {
          await fbSaveInquiry({
            name: 'Website Calculator User',
            phone: 'Via WhatsApp',
            location: locationVal || 'Pune / Direct Site',
            quantity: `${totalBricks.toLocaleString('en-IN')} Bricks (Est. ₹${estimatedCost.toLocaleString('en-IN')})`,
            type: `${selectedThickness}" Wall Estimation`,
            notes: `Calculated ${netArea.toFixed(1)} ${currentUnit === 'feet' ? 'sq.ft' : 'sq.m'} (${cementBags} Cement Bags, ${sandTons} T Sand) at ₹${activeRate}/brick`,
            language: isMarathi ? 'mr' : 'en',
            source: 'calculator_estimate',
            timestampStr: new Date().toISOString()
          }).catch(console.error);
        }
      };
    }

    // Copy Estimate functionality
    if (btnCopyEstimate) {
      btnCopyEstimate.onclick = () => {
        navigator.clipboard.writeText(waText).then(() => {
          showToast(isMarathi ? '📋 विटांचा अंदाज क्लिपबोर्डवर कॉपी केला!' : '📋 Brick estimate copied to clipboard!');
        }).catch(() => {
          showToast('Calculated: ' + totalBricks.toLocaleString('en-IN') + ' Bricks');
        });
      };
    }
  }

  // Initial calculation run
  calculateBricks();
}

// ==========================================
// DIRECT INQUIRY FORM & WHATSAPP GENERATOR
// ==========================================
function initInquiryForm() {
  const form = document.getElementById('kiln-inquiry-form');
  const qtyInput = document.getElementById('inq-quantity');
  const qtyChips = document.querySelectorAll('.qty-chip');
  const btnDirectWa = document.getElementById('btn-inq-direct-wa');

  // Quantity chip selector
  qtyChips.forEach(chip => {
    chip.addEventListener('click', () => {
      qtyChips.forEach(c => c.classList.remove.apply(c.classList, ['active']));
      chip.classList.add('active');
      const val = chip.dataset.qty;
      if (val && qtyInput) {
        qtyInput.value = val;
      }
    });
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳ Saving to Kiln Database...</span>';
      }

      const name = document.getElementById('inq-name').value.trim();
      const phone = document.getElementById('inq-phone').value.trim();
      const location = document.getElementById('inq-location').value.trim();
      const quantity = qtyInput ? qtyInput.value.trim() : '5,000';
      const date = document.getElementById('inq-date').value;
      const type = document.getElementById('inq-type').value;
      const notes = document.getElementById('inq-notes').value.trim();

      const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
      let msg = '';
      if (isMarathi) {
        msg = 
          `*🧱 नवीन विटा मागणी चौकशी - सुखकर्ता ब्रिक्स*\n\n` +
          `• *ग्राहकाचे नाव:* ${name}\n` +
          `• *मोबाईल नंबर:* ${phone}\n` +
          `• *डिलिव्हरी ठिकाण:* ${location}\n` +
          `• *आवश्यक विटा:* *${quantity} विटा*\n` +
          `• *बांधकाम प्रकार:* ${type}\n` +
          `• *अपेक्षित तारीख:* ${date || 'तातडीने / सोयीनुसार'}\n` +
          (notes ? `• *सूचना:* ${notes}\n` : '') +
          `\nकृपया भट्टी उपलब्धता व अंतिम दर निश्चित करा.`;
      } else {
        msg = 
          `*🧱 NEW ORDER INQUIRY - Sukhakarta Bricks*\n\n` +
          `• *Client Name:* ${name}\n` +
          `• *Contact Phone:* ${phone}\n` +
          `• *Delivery Location:* ${location}\n` +
          `• *Required Quantity:* *${quantity} Bricks*\n` +
          `• *Project Type:* ${type}\n` +
          `• *Delivery Date:* ${date || 'Immediate / Flexible'}\n` +
          (notes ? `• *Notes:* ${notes}\n` : '') +
          `\nPlease confirm kiln availability and dispatch schedule.`;
      }

      const targetUrl = `https://wa.me/${SITE_CONFIG.phoneNumber}?text=${encodeURIComponent(msg)}`;
      
      // Save inquiry directly into Cloud Firestore and wait for completion
      try {
        if (typeof fbSaveInquiry === 'function') {
          await fbSaveInquiry({
            name,
            phone,
            location,
            quantity,
            type,
            preferredDate: date || 'Flexible',
            notes: notes || '',
            language: isMarathi ? 'mr' : 'en',
            source: 'website_inquiry_form',
            timestampStr: new Date().toISOString()
          });
          console.log('✅ Customer inquiry confirmed in Cloud Firestore!');
        }
      } catch (err) {
        console.error('Inquiry Firestore write error:', err);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }

      // Open WhatsApp
      window.open(targetUrl, '_blank');
      showToast(isMarathi ? '✅ नोंद डेटाबेसमध्ये सेव्ह झाली! व्हॉट्सॲप उघडत आहे...' : '✅ Inquiry saved to kiln database! Opening WhatsApp...');
      form.reset();
    });
  }

  // Secondary 1-click inquiry button
  if (btnDirectWa) {
    btnDirectWa.href = `https://wa.me/${SITE_CONFIG.phoneNumber}?text=${encodeURIComponent(SITE_CONFIG.defaultInquiryMessage)}`;
  }
}

// ==========================================
// PRODUCT SHOWCASE HOTSPOTS & INTERACTION
// ==========================================
function initHotspots() {
  const hotspots = document.querySelectorAll('.hotspot-tag');
  hotspots.forEach(tag => {
    tag.addEventListener('mouseenter', () => {
      tag.style.transform = 'scale(1.08)';
    });
    tag.addEventListener('mouseleave', () => {
      tag.style.transform = 'scale(1)';
    });
  });
}

// ==========================================
// FAQ ACCORDION
// ==========================================
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (questionBtn && answer) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close other FAQs
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherAnswer) otherAnswer.style.maxHeight = null;
          }
        });

        // Toggle current FAQ
        if (isActive) {
          item.classList.remove('active');
          answer.style.maxHeight = null;
        } else {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    }
  });
}

// ==========================================
// FLOATING WHATSAPP BUTTON LOGIC
// ==========================================
function initFloatingWhatsApp() {
  const floatBtn = document.getElementById('whatsapp-floating-link');
  if (floatBtn) {
    const url = `https://wa.me/${SITE_CONFIG.phoneNumber}?text=${encodeURIComponent(SITE_CONFIG.defaultHeroMessage)}`;
    floatBtn.href = url;
  }
}

// ==========================================
// TOAST NOTIFICATION UTILITY
// ==========================================
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ==========================================
// REAL-TIME FIRESTORE WEBSITE DATA SYNC
// ==========================================
let currentSiteSettings = typeof DEFAULT_SITE_SETTINGS !== 'undefined' ? { ...DEFAULT_SITE_SETTINGS } : {
  ratePerBrick: 9.5,
  ratePer1000: 9500,
  currentStock: 42000,
  kilnStatus: 'Active Firing & Dispatching',
  kilnStatusMr: 'सक्रिय भट्टी भाजणे व जलद वाहतूक सुरू',
  displayPhone: '+91 73858 03641',
  phoneNumber: '917385803641',
  notice: 'Fresh kiln-burned batch ready for immediate site delivery across Pune & surrounding regions.',
  noticeMr: 'पुणे व परिसरासाठी ताजी, पक्की भाजलेली लाल विटांची पहिली बॅच त्वरित डिलिव्हरीसाठी सज्ज.'
};

function initLiveWebsiteData() {
  // 1. Subscribe to live site settings from Firestore
  if (typeof fbSubscribeSiteSettings === 'function') {
    fbSubscribeSiteSettings((settings) => {
      if (!settings) return;
      currentSiteSettings = { ...currentSiteSettings, ...settings };
      applyLiveWebsiteData(currentSiteSettings);
    });
  } else if (typeof fbGetSiteSettings === 'function') {
    fbGetSiteSettings().then(settings => {
      if (settings) {
        currentSiteSettings = { ...currentSiteSettings, ...settings };
        applyLiveWebsiteData(currentSiteSettings);
      }
    });
  }

  // 2. Calculate real-time ready stock from live Firestore production & delivery logs
  if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && fbDb) {
    Promise.all([
      fbDb.collection(FB_COLLECTIONS.PRODUCTION_LOGS).get(),
      fbDb.collection(FB_COLLECTIONS.DELIVERY_LOGS).get()
    ]).then(([pSnap, dSnap]) => {
      let mfgTotal = 0;
      let delTotal = 0;
      pSnap.forEach(d => mfgTotal += (Number(d.data().netCount) || 0));
      dSnap.forEach(d => delTotal += (Number(d.data().brickCount) || 0));
      
      if (mfgTotal > 0) {
        const liveStock = Math.max(0, mfgTotal - delTotal);
        currentSiteSettings.currentStock = liveStock;
        applyLiveWebsiteData(currentSiteSettings);
      }
    }).catch(console.warn);
  }
}

function applyLiveWebsiteData(data) {
  if (!data) return;
  const isMarathi = typeof currentLang !== 'undefined' && currentLang === 'mr';
  const rate = Number(data.ratePerBrick) || 9.5;
  const rate1000 = Number(data.ratePer1000) || Math.round(rate * 1000);
  const stock = Number(data.currentStock) || 42000;
  const status = isMarathi ? (data.kilnStatusMr || data.kilnStatus) : data.kilnStatus;
  const notice = isMarathi ? (data.noticeMr || data.notice) : data.notice;

  // 1. Top bar live indicator
  const topStatusText = document.getElementById('top-live-status-text');
  if (topStatusText) {
    topStatusText.textContent = `${status} • ${stock.toLocaleString('en-IN')} Bricks Ready`;
  }

  // 2. Specs Table Pricing
  const specsRate = document.getElementById('specs-live-rate');
  if (specsRate) specsRate.textContent = rate.toFixed(2);
  const specsRate1000 = document.getElementById('specs-live-rate-1000');
  if (specsRate1000) specsRate1000.textContent = rate1000.toLocaleString('en-IN');

  // 3. Calculator Rate Badge & calculation
  const calcRate = document.getElementById('calc-rate-badge');
  if (calcRate) calcRate.textContent = rate.toFixed(2);

  // 4. Hero Section Stock
  const heroStock = document.getElementById('hero-live-stock');
  if (heroStock) {
    heroStock.textContent = isMarathi 
      ? `🟢 उपलब्ध स्टॉक: ${stock.toLocaleString('en-IN')} विटा सज्ज` 
      : `🟢 Ready Stock: ${stock.toLocaleString('en-IN')} Bricks in Yard`;
  }

  // 5. Contact Section Kiln Status
  const kilnStatusDesc = document.getElementById('live-kiln-status-desc');
  if (kilnStatusDesc) {
    kilnStatusDesc.innerHTML = `<strong>${isMarathi ? 'भट्टी स्थिती:' : 'Kiln Status:'} ${escapeHtml(status)}</strong>. ${escapeHtml(notice)}`;
  }

  // 6. Recalculate calculator with live rate
  const lengthInput = document.getElementById('calc-length');
  if (lengthInput) {
    lengthInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
