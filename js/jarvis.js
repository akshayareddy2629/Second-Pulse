/* ==========================================================================
   Voice assistant for Second Pulse — JARVIS (male) or FRIDAY (female),
   a tribute to Iron Man's AIs. Speaks and replies in English, Hindi or Telugu,
   listens (Web Speech API), answers from the site's knowledge, and drives
   navigation. No backend.

   Voices: every reply has a recorded clip (assets/voice/, made by
   tools/build-voices.mjs) with a male voice for JARVIS and a female voice
   for FRIDAY in all three languages, so the gender holds on every device.
   If a clip is missing or can't load, the browser's own speech engine takes
   over and picks a voice of the right gender when the device has one.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const panel = $('#jarvisPanel');
  if (!panel) return;

  const fab = $('#jarvisFab');
  const LINES = window.SP_LINES;
  if (!LINES) { fab.hidden = true; return; }

  const hintEl = fab.querySelector('.jarvis-fab__hint');
  const nameEl = $('#jarvisName');
  const log = $('#jarvisLog');
  const statusEl = $('#jarvisStatus');
  const form = $('#jarvisForm');
  const input = $('#jarvisText');
  const micBtn = $('#jarvisMic');
  const muteBtn = $('#jarvisMute');
  const switchBtn = $('#jarvisSwitch');
  const closeBtn = $('#jarvisClose');
  const suggest = $('#jarvisSuggest');
  const choose = $('#jarvisChoose');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smallScreen = () => window.matchMedia('(max-width: 760px)').matches;

  /* ---------- Language ---------- */
  const LANG_KEY = 'sp-lang';
  const LANGS = {
    en: { code: 'en', speech: ['en-GB', 'en-IN', 'en'], stt: 'en-IN', label: 'English' },
    hi: { code: 'hi', speech: ['hi-IN', 'hi'], stt: 'hi-IN', label: 'हिंदी' },
    te: { code: 'te', speech: ['te-IN', 'te'], stt: 'te-IN', label: 'తెలుగు' },
  };
  let lang = 'en';
  try { const s = localStorage.getItem(LANG_KEY); if (s && LANGS[s]) lang = s; } catch {}
  document.addEventListener('sp:lang', (e) => { if (LANGS[e.detail]) setLang(e.detail, true); });

  /* ---------- Personas ---------- */
  // pitch: used with a browser voice of the persona's own gender.
  // altPitch: used when the device only has a voice of the other (or unknown) gender.
  const PERSONAS = {
    jarvis: { id: 'jarvis', name: 'JARVIS', gender: 'm', pitch: 0.8, altPitch: 0.6, rate: 0.98, prefer: ['en-GB', 'en-IN'] },
    friday: { id: 'friday', name: 'FRIDAY', gender: 'f', pitch: 1.06, altPitch: 1.25, rate: 1.02, prefer: ['en-IE', 'en-GB'] },
  };

  const AS_KEY = 'sp-assistant';
  const saveAS = (id) => { try { localStorage.setItem(AS_KEY, id); } catch {} };
  const readAS = () => { try { return localStorage.getItem(AS_KEY); } catch { return null; } };
  let persona = null, greeted = false;

  // Replies live in js/assistant-lines.js
  const t = (key) => LINES.line(lang, persona ? persona.id : 'jarvis', key);
  const PH = { en: 'Ask {n} anything…', hi: '{n} से कुछ पूछिए…', te: '{n}ని ఏదైనా అడగండి…' };
  const placeholder = () => (PH[lang] || PH.en).replace('{n}', persona.name);

  /* ---------- Browser voices (fallback) ---------- */
  // Known voice names by gender: Apple (macOS, iOS), Microsoft (Windows, Edge), Google (Chrome, Android)
  const nameRx = (names) => new RegExp(`(?:^|[^a-z])(?:${names.join('|')})(?:[^a-z]|$)`, 'i');
  const MALE_RX = nameRx(['daniel', 'arthur', 'oliver', 'george', 'ryan', 'thomas', 'aaron', 'rishi', 'aman', 'ravi',
    'prabhat', 'hemant', 'madhur', 'mohan', 'connor', 'gordon', 'lee', 'guy', 'eric', 'david', 'mark', 'christopher',
    'roger', 'steffan', 'andrew', 'brian', 'alex', 'fred', 'ralph', 'eddy', 'reed', 'rocko']);
  const FEMALE_RX = nameRx(['moira', 'fiona', 'tessa', 'karen', 'samantha', 'serena', 'kate', 'stephanie', 'martha',
    'catherine', 'nicky', 'lekha', 'geeta', 'tara', 'veena', 'heera', 'neerja', 'swara', 'kalpana', 'shruti', 'emily',
    'sonia', 'libby', 'maisie', 'zira', 'hazel', 'susan', 'aria', 'jenny', 'michelle', 'emma', 'ava', 'kathy', 'flo',
    'sandy', 'shelley', 'google us english', 'google हिन्दी']);
  const NOVELTY_RX = nameRx(['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'grandma',
    'grandpa', 'jester', 'junior', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox']);
  const ROBOTIC_RX = nameRx(['fred', 'ralph', 'kathy', 'eddy', 'flo', 'reed', 'rocko', 'sandy', 'shelley']);
  const QUALITY_RX = /natural|neural|premium|enhanced/i;

  const langIs = (voiceLang, code) => {
    const a = String(voiceLang || '').toLowerCase().replace('_', '-');
    const c = code.toLowerCase();
    return a === c || a.startsWith(c + '-');
  };
  function genderOf(v) {
    const s = `${v.name} ${v.voiceURI || ''}`;
    if (/(?:^|[^a-z])female(?:[^a-z]|$)/i.test(s)) return 'f';
    if (/(?:^|[^a-z])male(?:[^a-z]|$)/i.test(s)) return 'm';
    if (FEMALE_RX.test(s)) return 'f';
    if (MALE_RX.test(s)) return 'm';
    return '';
  }
  function voiceScore(v) {
    const g = genderOf(v);
    let s = g === persona.gender ? 100 : g ? 0 : 40; // a voice of unknown gender beats the wrong one
    if (NOVELTY_RX.test(v.name)) s -= 1000;
    if (ROBOTIC_RX.test(v.name)) s -= 30;
    if (QUALITY_RX.test(v.name)) s += 20;
    const p = persona.prefer.findIndex((c) => langIs(v.lang, c));
    if (p >= 0) s += 10 - p * 5;
    if (v.localService) s += 3;
    return s;
  }

  const synth = window.speechSynthesis || null;
  let voice = null, voiceFits = false, muted = false;

  function pickVoice() {
    voice = null; voiceFits = false;
    if (!synth || !persona) return;
    const pool = synth.getVoices().filter((v) => LANGS[lang].speech.some((c) => langIs(v.lang, c)));
    let best = null, top = -Infinity;
    for (const v of pool) { const s = voiceScore(v); if (s > top) { top = s; best = v; } }
    // No usable voice in this language: leave it to the browser (it may still have one for utterance.lang)
    if (!best || top < -500) return;
    voice = best;
    voiceFits = genderOf(best) === persona.gender;
  }
  if (synth) synth.addEventListener('voiceschanged', () => { if (persona) pickVoice(); });

  function ttsSpeak(text, id) {
    if (!synth) { setState('idle'); return; }
    if (!voice) pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : LANGS[lang].speech[0];
    // A voice of the persona's gender keeps its natural pitch; any other voice is pushed towards it
    u.pitch = voiceFits ? persona.pitch : persona.altPitch;
    u.rate = persona.rate;
    u.volume = 1;
    u.onstart = () => { if (id === speechId) setState('speaking'); };
    u.onend = u.onerror = () => { if (id === speechId) setState('idle'); };
    synth.speak(u);
  }

  /* ---------- Voice output: recorded clips first ---------- */
  const CLIPS = window.SP_CLIPS && window.SP_CLIPS.clips ? window.SP_CLIPS : null;
  const clip = CLIPS && typeof Audio === 'function' ? new Audio() : null;
  if (clip) clip.preload = 'auto';
  if (!synth && !clip && muteBtn) muteBtn.hidden = true;
  let speechId = 0, clipFails = 0;

  // Only play a clip that records exactly these words; otherwise the browser voice reads them
  function clipSrc(key, said) {
    if (!clip || clipFails >= 3) return '';
    const id = `${persona.id}/${lang}/${key}`;
    const h = CLIPS.clips[id];
    return h && h === LINES.hash(said) ? `${CLIPS.base}${id}.${h}.mp3` : '';
  }

  function stopVoice() {
    speechId++;
    if (clip) { try { clip.pause(); } catch {} }
    if (synth) { try { synth.cancel(); } catch {} }
  }

  function speak(key, text) {
    if (muted || !persona) return;
    stopVoice();
    const id = speechId;
    const said = LINES.spoken(text);
    const src = clipSrc(key, said);
    if (!src) { ttsSpeak(said, id); return; }

    let handled = false;
    const fallback = (err) => {
      if (handled || id !== speechId) return;
      handled = true;
      if (!(err && err.name === 'NotAllowedError')) clipFails++; // a blocked autoplay isn't the clip's fault
      ttsSpeak(said, id);
    };
    clip.onplaying = () => { if (id === speechId) { clipFails = 0; setState('speaking'); } };
    clip.onended = () => { if (id === speechId) setState('idle'); };
    clip.onerror = fallback;
    clip.src = src;
    const p = clip.play(); // called inside the tap where possible, so iOS allows it
    if (p && typeof p.catch === 'function') p.catch(fallback);
  }

  function setLang(next, announce) {
    if (!LANGS[next]) return;
    lang = next;
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
    if (recog) recog.lang = LANGS[lang].stt;
    pickVoice();
    if (persona) input.placeholder = placeholder();
    if (announce && persona) say('langSet');
  }

  /* ---------- Status ---------- */
  function setState(s) {
    panel.classList.toggle('jarvis--speaking', s === 'speaking');
    panel.classList.toggle('jarvis--listening', s === 'listening');
    statusEl.textContent = s === 'speaking' ? 'Speaking…' : s === 'listening' ? 'Listening…' : LANGS[lang].label;
  }

  /* ---------- Messages ---------- */
  function add(role, text) {
    const el = document.createElement('div');
    el.className = `jmsg jmsg--${role}`;
    if (lang !== 'en') el.setAttribute('lang', lang);
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  // Show and speak a reply, worded for the current assistant and language
  function say(key) {
    const text = t(key);
    add('jarvis', text);
    speak(key, text);
  }

  /* ---------- Actions ---------- */
  // Panels that close on their own (after navigating or opening a form) let the reply finish
  function navigate(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (smallScreen()) setTimeout(() => closePanel(true), 500);
  }
  function clickSel(sel, delay) {
    closePanel(true);
    const el = document.querySelector(sel);
    if (el) setTimeout(() => el.click(), delay || 260);
  }
  const openPledge = () => clickSel('[data-pledge-open]');
  const openDonate = () => clickSel('[data-donate-open]');
  function startClock() {
    navigate('science');
    setTimeout(() => { const b = document.getElementById('simBtn'); if (b && /start/i.test(b.textContent)) b.click(); }, 950);
  }
  function goFullscreen() { const b = document.getElementById('fsToggle'); if (b) b.click(); }

  /* ---------- Intents (English + native keywords) ---------- */
  const intents = [
    { r: 'hello', keys: ['hello', 'hi', 'hey', 'greetings', 'namaste', 'नमस्ते', 'हेलो', 'నమస్కారం', 'హాయ్'] },
    { r: 'who', keys: ['who', 'your name', 'what are you', 'jarvis', 'friday', 'yourself', 'कौन', 'तुम कौन', 'ఎవరు', 'నీ పేరు'] },
    { r: 'about', keys: ['what is second pulse', 'what is this', 'about', 'purpose', 'explain second pulse', 'सेकंड पल्स', 'क्या है', 'సెకండ్ పల్స్', 'ఏమిటి'] },
    { r: 'problem', keys: ['problem', 'statistic', 'statistics', 'how many', 'die', 'waiting', 'awareness', 'percent', 'lakh', 'समस्या', 'आंकड़े', 'कितने', 'అవగాహన', 'సమస్య', 'గణాంకాలు', 'ఎంత మంది'] },
    { r: 'science', keys: ['science', 'how long', 'survive', 'viability', 'organs die', 'golden time', 'golden window', 'विज्ञान', 'कितनी देर', 'समय', 'శాస్త్రం', 'సైన్స్', 'ఎంత సమయం', 'సమయం'] },
    { r: 'brain', keys: ['brain', 'मस्तिष्क', 'दिमाग', 'మెదడు'] },
    { r: 'heart', keys: ['heart', 'हृदय', 'दिल', 'గుండె'] },
    { r: 'lungs', keys: ['lung', 'lungs', 'फेफड़े', 'ఊపిరితిత్తులు'] },
    { r: 'liver', keys: ['liver', 'यकृत', 'लिवर', 'కాలేయం'] },
    { r: 'kidney', keys: ['kidney', 'kidneys', 'गुर्दे', 'किडनी', 'మూత్రపిండాలు', 'కిడ్నీ'] },
    { r: 'cornea', keys: ['cornea', 'corneas', 'eye', 'eyes', 'sight', 'blind', 'vision', 'आंख', 'आँख', 'नेत्र', 'दृष्टि', 'కన్ను', 'కళ్ళు', 'చూపు', 'నేత్ర'], act: () => navigate('sight') },
    { r: 'how', keys: ['how it works', 'how does it work', 'steps', 'step', 'flow', 'process', 'scan', 'कैसे काम', 'चरण', 'ఎలా పని', 'దశలు'], act: () => navigate('how') },
    { r: 'features', keys: ['feature', 'features', 'app do', 'what can the app', 'timer', 'emergency', 'functions', 'सुविधा', 'फीचर', 'సౌకర్యాలు', 'ఫీచర్'], act: () => navigate('solution') },
    { r: 'different', keys: ['different', 'edge', 'other app', 'other apps', 'compare', 'better', 'unique', 'अलग', 'अंतर', 'వేరు', 'తేడా'], act: () => navigate('different') },
    { r: 'legal', keys: ['legal', 'law', 'thota', 'illegal', 'money', 'buy', 'sell', 'safe', 'कानून', 'कानूनी', 'अवैध', 'पैसा', 'చట్టం', 'చట్టబద్ధం', 'డబ్బు'], act: () => navigate('legal') },
    { r: 'future', keys: ['future', 'plan', 'roadmap', 'next', 'ambulance', 'matching', 'भविष्य', 'योजना', 'భవిష్యత్', 'ప్రణాళిక'], act: () => navigate('future') },
    { r: 'clock', keys: ['start the clock', 'start clock', 'start timer', 'run the clock', 'simulate', 'demonstrate', 'घड़ी', 'टाइमर चालू', 'గడియారం', 'టైమర్'], act: startClock },
    { r: 'pledge', keys: ['pledge', 'register', 'sign up', 'become a donor', 'donor card', 'i will', 'प्रतिज्ञा', 'पंजीकरण', 'दानकर्ता', 'ప్రతిజ్ఞ', 'నమోదు', 'దాత'], act: openPledge },
    // Money only: on an organ-donation site a bare "donation" usually means organs
    { r: 'donate', keys: ['donate money', 'money donation', 'make a donation', 'pay', 'upi', 'phonepe', 'contribute', 'fund', 'दान', 'पैसे दें', 'भुगतान', 'విరాళం', 'డబ్బు ఇవ్వ', 'చెల్లింపు'], act: openDonate },
    { r: 'fullscreen', keys: ['full screen', 'fullscreen', 'present', 'फुल स्क्रीन', 'ఫుల్ స్క్రీన్'] , act: goFullscreen },
    { r: 'lives', keys: ['lives', 'eight', 'save', 'आठ', 'जान', 'ఎనిమిది', 'ప్రాణాలు'] },
    { r: 'help', keys: ['help', 'what can you do', 'commands', 'options', 'capabilities', 'मदद', 'सहायता', 'సహాయం'] },
    { r: 'thanks', keys: ['thank', 'thanks', 'cheers', 'well done', 'good job', 'brilliant', 'धन्यवाद', 'शुक्रिया', 'ధన్యవాదాలు'] },
    { r: 'bye', keys: ['bye', 'goodbye', 'see you', 'that is all', 'dismiss', 'अलविदा', 'बाय', 'బై', 'సెలవు'] },
  ];

  const NAV = {
    hero: ['home', 'start', 'top', 'title', 'beginning'],
    problem: ['problem', 'statistics', 'stats', 'numbers', 'समस्या', 'సమస్య'],
    science: ['science', 'clock', 'timer', 'organ time', 'विज्ञान', 'సైన్స్', 'శాస్త్రం'],
    solution: ['app', 'solution', 'features', 'ऐप', 'యాప్'],
    how: ['how it works', 'steps', 'flow', 'process', 'चरण', 'దశలు'],
    sight: ['sight', 'eye', 'eyes', 'cornea', 'emotion', 'आंख', 'కన్ను'],
    different: ['different', 'edge', 'comparison', 'compare', 'अलग', 'తేడా'],
    legal: ['legal', 'law', 'safety', 'thota', 'कानून', 'చట్టం'],
    future: ['future', 'roadmap', 'plan', 'भविष्य', 'భవిష్యత్'],
    pledge: ['pledge', 'question', 'closing', 'प्रतिज्ञा', 'ప్రతిజ్ఞ'],
    donate: ['donate', 'donation', 'upi', 'दान', 'విరాళం'],
  };

  const GO = /\b(go to|take me to|open|show|navigate|jump to|scroll to|goto)\b|दिखा|खोल|चलो|చూపించు|తెరు|వెళ్ళు/;
  const LANG_ASK = {
    hi: ['hindi', 'हिंदी', 'हिन्दी', 'हिंदी में', 'హిందీ'],
    te: ['telugu', 'తెలుగు', 'तेलुगु', 'తెలుగులో'],
    en: ['english', 'अंग्रेजी', 'अंग्रेज़ी', 'ఇంగ్లీష్', 'ఆంగ్లం'],
  };
  const LANG_VERB = /speak|talk|switch|change|reply|बोल|बात|बदल|भाषा|మాట్లాడు|మార్చు|భాష/;

  function respond(raw) {
    // Unicode-safe clean-up: keep letters, numbers and the vowel signs (\p{M}) Hindi and Telugu words are built from
    const q = ' ' + raw.normalize('NFC').toLowerCase().replace(/[\u200c\u200d]/g, '')
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim() + ' ';
    const words = new Set(q.trim().split(' '));
    const hit = (key) => {
      const k = key.normalize('NFC').replace(/[\u200c\u200d]/g, '');
      return k.includes(' ') ? q.includes(' ' + k + ' ') || q.includes(' ' + k) : words.has(k);
    };

    // "speak in Hindi" / "तेलुगु में बोलो" → switch language
    for (const [code, keys] of Object.entries(LANG_ASK)) {
      if (keys.some(hit) && (LANG_VERB.test(q) || words.size <= 3)) {
        if (code === lang) { say('langSet'); return; }
        setLang(code, true);
        return;
      }
    }

    if (GO.test(q)) {
      for (const [id, keys] of Object.entries(NAV)) {
        if (keys.some(hit)) {
          if (id === 'pledge') { say('pledge'); openPledge(); return; }
          if (id === 'donate') { say('donate'); openDonate(); return; }
          say('navOk'); navigate(id); return;
        }
      }
    }

    let best = null, score = 0;
    for (const it of intents) {
      let s = 0;
      // "about" is weak: "tell me about the heart" is about the heart
      for (const k of it.keys) if (hit(k)) s += k === 'about' ? 0.5 : k.length > 6 ? 2 : 1;
      if (s > score) { score = s; best = it; }
    }
    if (best && score > 0) { say(best.r); if (best.act) best.act(); return; }
    say('fallback');
  }

  function handle(text) {
    const s = (text || '').trim();
    if (!s) return;
    add('user', s);
    respond(s);
  }

  /* ---------- Voice input (STT) ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let recog = null, listening = false;
  if (SR) {
    recog = new SR();
    recog.lang = LANGS[lang].stt;
    recog.interimResults = true;
    recog.maxAlternatives = 1;
    recog.continuous = false;
    recog.onstart = () => { listening = true; micBtn.classList.add('is-on'); setState('listening'); };
    recog.onend = () => { listening = false; micBtn.classList.remove('is-on'); if (!panel.classList.contains('jarvis--speaking')) setState('idle'); };
    recog.onerror = (e) => {
      listening = false; micBtn.classList.remove('is-on'); setState('idle');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') say('micDenied');
    };
    recog.onresult = (e) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      input.value = txt;
      if (e.results[e.results.length - 1].isFinal) { input.value = ''; handle(txt); }
    };
  } else if (micBtn) {
    micBtn.hidden = true;
  }

  micBtn && micBtn.addEventListener('click', () => {
    if (!recog) return;
    if (listening) { try { recog.stop(); } catch {} return; }
    stopVoice();
    try { recog.start(); } catch {}
  });

  /* ---------- Persona apply + chooser ---------- */
  function applyPersona(id) {
    persona = PERSONAS[id] || PERSONAS.jarvis;
    const friday = persona.id === 'friday';
    panel.classList.toggle('jarvis--friday', friday);
    fab.classList.toggle('jarvis-fab--friday', friday);
    nameEl.textContent = persona.name;
    if (hintEl) hintEl.textContent = 'Ask ' + persona.name;
    input.placeholder = placeholder();
    fab.setAttribute('aria-label', 'Open ' + persona.name + ', the voice assistant');
    panel.setAttribute('aria-label', persona.name + ' voice assistant');
    setState('idle');
    pickVoice();
  }
  function showChooser() { panel.classList.add('jarvis--choosing'); choose.hidden = false; stopVoice(); setState('idle'); }
  function hideChooser() { panel.classList.remove('jarvis--choosing'); choose.hidden = true; }

  choose.addEventListener('click', (e) => {
    const b = e.target.closest('[data-voice]');
    if (!b) return;
    applyPersona(b.dataset.voice);
    saveAS(persona.id);
    hideChooser();
    log.innerHTML = '';
    greeted = true;
    say('greet'); // spoken inside the click (iOS needs this)
    setTimeout(() => { try { input.focus({ preventScroll: true }); } catch {} }, 60);
  });
  switchBtn && switchBtn.addEventListener('click', showChooser);

  /* ---------- Open / close ---------- */
  function openPanel() {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-in'));
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.add('is-active');
    fab.classList.remove('is-hint');

    const saved = readAS();
    if (!persona && saved && PERSONAS[saved]) applyPersona(saved);

    if (!persona) {
      showChooser();
    } else if (!greeted) {
      greeted = true;
      say('greet');
    }
    setTimeout(() => {
      try { (persona ? input : choose.querySelector('.vopt')).focus({ preventScroll: true }); } catch {}
    }, 320);
  }
  // keepVoice === true when the panel closes itself; a user closing it also silences the voice
  function closePanel(keepVoice) {
    panel.classList.remove('is-in');
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('is-active');
    if (keepVoice !== true) { stopVoice(); setState('idle'); }
    try { if (recog && listening) recog.stop(); } catch {}
    setTimeout(() => { panel.hidden = true; }, 300);
  }

  fab.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
  closeBtn.addEventListener('click', () => closePanel());
  form.addEventListener('submit', (e) => { e.preventDefault(); const s = input.value.trim(); if (!s) return; input.value = ''; handle(s); });
  suggest.addEventListener('click', (e) => { const b = e.target.closest('[data-ask]'); if (!b) return; input.value = ''; handle(b.dataset.ask); });

  muteBtn && muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.setAttribute('aria-pressed', String(muted));
    const u = muteBtn.querySelector('use');
    if (u) u.setAttribute('href', muted ? '#i-volume-off' : '#i-volume');
    muteBtn.title = muted ? 'Unmute voice' : 'Mute voice';
    if (muted) { stopVoice(); setState('idle'); }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
  window.addEventListener('pagehide', stopVoice);

  setState('idle');
  setTimeout(() => { if (panel.hidden && !greeted) { fab.classList.add('is-hint'); setTimeout(() => fab.classList.remove('is-hint'), 6000); } }, 5500);
})();
