// script.js (with Voice Guidance & Device Pairing)
// Single-file app navigation + simulation (updated + Listen + Guidance + Pairing)
(function () {
  // pages — DOM elements
  const views = {
    home: document.getElementById('view-home'),
    simulation: document.getElementById('view-simulation'),
    sensors: document.getElementById('view-sensors'),
    about: document.getElementById('view-about')
  };

  // voice guidance helper
  function speak(text, opts = {}) {
    try {
      if (!('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      if (opts.lang) u.lang = opts.lang;
      if (typeof opts.rate === 'number') u.rate = opts.rate;
      if (typeof opts.pitch === 'number') u.pitch = opts.pitch;
      if (window.__voiceMuted) return;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('speak failed', e);
    }
  }

  function show(page) {
    Object.values(views).forEach(v => {
      if (!v) return;
      v.classList.add('hidden');
      v.classList.remove('active');
    });
    const el = views[page];
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('active');
      window.scrollTo(0, 0);
      // Voice guidance on view change
      switch (page) {
        case 'home': speak('مرحباً! هذه الصفحة الرئيسية. اضغط ابدأ للتجربة.'); break;
        case 'simulation': speak('تم فتح لوحة المراقبة. هنا يمكنك محاكاة حركة أو تسرب غاز.'); break;
        case 'sensors': speak('معلومات الحساسات. هنا تفاصيل مكونات النظام.'); break;
        case 'about': speak('معلومات عن النظام والفريق.'); break;
      }
    }
  }

  // nav wiring
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      if (target && views[target]) show(target);
    });
  });

  // theme toggle
  const themeBtn = document.getElementById('theme-toggle');
  let dark = false;
  function updateTheme() {
    dark = !dark;
    if (dark) {
      document.body.classList.add('dark-mode');
      if (themeBtn) themeBtn.textContent = '☀';
      document.body.style.background = 'linear-gradient(180deg,#0b1724,#2b3945)';
      speak('تم تفعيل الوضع الداكن');
    } else {
      document.body.classList.remove('dark-mode');
      if (themeBtn) themeBtn.textContent = '🌙';
      document.body.style.background = '';
      speak('تم إيقاف الوضع الداكن');
    }
  }
  if (themeBtn) themeBtn.addEventListener('click', updateTheme);

  // Simulation elements
  const alertBanner = document.getElementById('alert-banner');
  const badgeDistance = document.getElementById('badge-distance');
  const badgeGas = document.getElementById('badge-gas');
  const badgeAlarm = document.getElementById('badge-alarm');
  const batteryBar = document.getElementById('battery-bar');
  const batteryPercent = document.getElementById('battery-percent');

  // audio elements (may be null if HTML not updated)
  const audioMotion = document.getElementById('audio-motion');
  const audioGas = document.getElementById('audio-gas');
  const audioAlarm = document.getElementById('audio-alarm');

  let batteryLevel = 85;
  let alarmTimeout = null;
  let dangerBg = null;

  function setBattery(delta) {
    batteryLevel = Math.max(0, Math.min(100, batteryLevel + delta));
    if (batteryBar) batteryBar.style.width = batteryLevel + '%';
    if (batteryPercent) batteryPercent.textContent = batteryLevel + '%';
  }

  function showBanner(text, bgColor = '#b91c1c', autoHideMs) {
    if (!alertBanner) return;
    alertBanner.textContent = text;
    alertBanner.style.background = bgColor;
    alertBanner.style.opacity = '0.98';
    alertBanner.classList.remove('hidden');
    if (autoHideMs) setTimeout(() => alertBanner.classList.add('hidden'), autoHideMs);
  }

  function triggerAlarm(kind) {
    if (badgeAlarm) {
      badgeAlarm.textContent = 'SOUNDING';
      badgeAlarm.style.background = '#fdecea';
      badgeAlarm.style.color = '#b91c1c';
    }
    if (!dangerBg) {
      dangerBg = document.createElement('div');
      dangerBg.style.position = 'fixed';
      dangerBg.style.inset = '0';
      dangerBg.style.background = 'rgba(185,28,28,0.06)';
      dangerBg.style.pointerEvents = 'none';
      dangerBg.style.zIndex = '5';
      document.body.appendChild(dangerBg);
    }

    try {
      if (kind === 'motion' && audioMotion) { audioMotion.currentTime = 0; audioMotion.play().catch(()=>{}); }
      if (kind === 'gas' && audioGas) { audioGas.currentTime = 0; audioGas.play().catch(()=>{}); }
      if (audioAlarm) { audioAlarm.currentTime = 0; audioAlarm.play().catch(()=>{}); }
    } catch (err) {
      console.warn('Audio play failed', err);
    }

    if (kind === 'motion') speak('انتباه، تم اكتشاف حركة قريبة');
    if (kind === 'gas') speak('تنبيه! تم اكتشاف غاز');

    setBattery(-2);
    clearTimeout(alarmTimeout);
    alarmTimeout = setTimeout(deactivateAlarm, 2000);
  }

  function deactivateAlarm() {
    if (badgeAlarm) {
      badgeAlarm.textContent = 'Silent';
      badgeAlarm.style.background = '#efefef';
      badgeAlarm.style.color = '#05203b';
    }
    if (dangerBg) { document.body.removeChild(dangerBg); dangerBg = null; }
    if (alertBanner) setTimeout(()=> alertBanner.classList.add('hidden'), 600);
    try {
      if (audioMotion) { audioMotion.pause(); audioMotion.currentTime = 0; }
      if (audioGas) { audioGas.pause(); audioGas.currentTime = 0; }
      if (audioAlarm) { audioAlarm.pause(); audioAlarm.currentTime = 0; }
    } catch (e) {}
    speak('انتهى التنبيه. النظام في وضع طبيعي');
  }

  function setAlert(type) {
    if (badgeDistance) {
      badgeDistance.textContent = (type === 'motion') ? 'ACTIVE' : 'Standby';
      badgeDistance.style.background = (type === 'motion') ? '#fdecea' : '#efefef';
      badgeDistance.style.color = (type === 'motion') ? '#b91c1c' : '#05203b';
    }
    if (badgeGas) {
      badgeGas.textContent = (type === 'gas') ? 'ALERT' : 'Normal';
      badgeGas.style.background = (type === 'gas') ? '#fdecea' : '#efefef';
      badgeGas.style.color = (type === 'gas') ? '#b91c1c' : '#05203b';
    }

    if (type === 'motion') {
      showBanner('⚠ Motion detected nearby!', '#b91c1c');
      triggerAlarm('motion');
    } else if (type === 'gas') {
      showBanner('🚨 Gas leak detected!', '#b91c1c');
      triggerAlarm('gas');
    } else if (type === 'safe') {
      showBanner('✅ All clear.', '#065f46', 3000);
      deactivateAlarm();
    }
  }

  // wire simulation buttons
  const btnMotion = document.getElementById('btn-motion');
  const btnGas = document.getElementById('btn-gas');
  const btnSafe = document.getElementById('btn-safe');
  if (btnMotion) btnMotion.addEventListener('click', () => { setAlert('motion'); speak('محاكاة اكتشاف حركة'); });
  if (btnGas) btnGas.addEventListener('click', () => { setAlert('gas'); speak('محاكاة اكتشاف غاز'); });
  if (btnSafe) btnSafe.addEventListener('click', () => { setAlert('safe'); speak('تم تفعيل وضع الأمان'); });

  if (batteryBar) batteryBar.style.width = batteryLevel + '%';
  if (batteryPercent) batteryPercent.textContent = batteryLevel + '%';
  deactivateAlarm();

  // dynamic sensors list
  const sensorsList = [
    { ico: '🔊', name: 'Ultrasonic Sensor', desc: 'Detects nearby objects using sound waves.', specs: 'Range: 2cm - 400cm | Accuracy: ±3mm' },
    { ico: '🌫', name: 'Gas Sensor', desc: 'Detects harmful gases like LPG, methane, propane.', specs: 'Response: <10s' },
    { ico: '🔔', name: 'Buzzer (Alarm)', desc: 'Produces loud audible alerts.', specs: 'Volume: ~85dB' },
    { ico: '🔋', name: 'Rechargeable Battery', desc: 'Lithium-ion power for portability.', specs: 'Capacity: ~2000mAh' },
    { ico: '🧠', name: 'Arduino Uno R3', desc: 'Processes sensor data and controls components.', specs: 'ATmega328P | 16MHz' },
    { ico: '🏃', name: 'Motion Detector', desc: 'Identifies movement using PIR.', specs: 'Range: up to 7m | Angle: 120°' },
  ];
  const sensorsGrid = document.getElementById('sensors-grid');
  if (sensorsGrid) {
    sensorsGrid.innerHTML = '';
    sensorsList.forEach(s => {
      const card = document.createElement('div');
      card.className = 'card sensor-info';
      card.innerHTML = `<div class="info-ico">${s.ico}</div>
                        <h3>${s.name}</h3>
                        <p>${s.desc}</p>
                        <div class="specs">${s.specs}</div>`;
      sensorsGrid.appendChild(card);
    });
  }

  // initial view
  show('home');

  // --------------------------
  // Device Pairing (Web Bluetooth) + UI
  // --------------------------
  const btnPair = document.getElementById('btn-pair');
  const pairedName = document.getElementById('paired-name');

  // load stored paired info
  const PAIR_KEY = 'smartaid_paired_device';
  function loadPaired() {
    const data = localStorage.getItem(PAIR_KEY);
    if (!data) { if (pairedName) pairedName.textContent = ''; return; }
    try {
      const obj = JSON.parse(data);
      if (pairedName) pairedName.innerHTML = `<span style="opacity:0.85">${obj.name || 'Device'}</span> <button id="btn-disconnect" class="disconnect" style="margin-left:8px;">Disconnect</button>`;
      const disc = document.getElementById('btn-disconnect');
      if (disc) disc.addEventListener('click', () => {
        localStorage.removeItem(PAIR_KEY);
        if (pairedName) pairedName.textContent = '';
        speak('تم فصل الجهاز');
      });
    } catch (e) { if (pairedName) pairedName.textContent = ''; }
  }
  loadPaired();

  async function pairDevice() {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth غير مدعوم في متصفحك. يُمكنك تجربة Chrome/Edge على HTTPS أو localhost.');
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
      const obj = { id: device.id, name: device.name || 'Unknown device', time: Date.now() };
      localStorage.setItem(PAIR_KEY, JSON.stringify(obj));
      loadPaired();
      speak('تم الاتصال بالجهاز ' + (device.name || 'غير معروف'));
      try {
        if (device.gatt) {
          await device.gatt.connect();
          speak('تم إنشاء اتصال آمن بالجهاز');
        }
      } catch (e) {
        console.warn('gatt connect failed or not applicable', e);
      }
      device.addEventListener('gattserverdisconnected', () => {
        localStorage.removeItem(PAIR_KEY);
        loadPaired();
        speak('تم فصل الجهاز');
      });
    } catch (err) {
      console.warn('pairing canceled or failed', err);
    }
  }

  if (btnPair) btnPair.addEventListener('click', async () => {
    const stored = localStorage.getItem(PAIR_KEY);
    if (stored) {
      if (confirm('جهاز مرتبط حالياً. هل تريد فصله؟')) {
        localStorage.removeItem(PAIR_KEY);
        loadPaired();
        speak('تم فصل الجهاز');
      }
    } else {
      await pairDevice();
    }
  });

  // expose for debug
  window.__appShow = show;

  // cleanup
  window.addEventListener('beforeunload', () => {
    deactivateAlarm();
  });

  // global mute flag (can extend with UI later)
  window.__voiceMuted = false;
})();