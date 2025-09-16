// Speech Synthesis app script
(function () {
  // Robust element selection (cover several possible attribute names/ids)
  const voicesDropdown = document.getElementById('voices') || document.querySelector('[name="voice"]') || null;
  const rateEl = document.getElementById('rate') || document.querySelector('[name="rate"]') || document.querySelector('input[name="rate"]') || null;
  const pitchEl = document.getElementById('pitch') || document.querySelector('[name="pitch"]') || document.querySelector('input[name="pitch"]') || null;
  const textEl = document.querySelector('textarea[name="text"]') || document.querySelector('textarea') || null;
  const speakBtn = document.getElementById('speak') || document.querySelector('button#speak') || null;
  const stopBtn = document.getElementById('stop') || document.querySelector('button#stop') || null;

  // Basic checks
  if (!('speechSynthesis' in window)) {
    console.warn('Speech Synthesis API not supported in this browser.');
    if (speakBtn) speakBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    return;
  }

  // state
  let voices = [];
  let utterance = null;

  function populateVoiceList() {
    voices = window.speechSynthesis.getVoices() || [];
    if (!voicesDropdown) return;

    // Clear current options
    voicesDropdown.innerHTML = '';

    if (!voices.length) {
      const opt = document.createElement('option');
      opt.textContent = 'No voices available';
      opt.value = '';
      voicesDropdown.appendChild(opt);
      voicesDropdown.disabled = true;
      return;
    }

    voicesDropdown.disabled = false;

    voices.forEach((voice, i) => {
      const option = document.createElement('option');
      // Use a readable label including lang and name
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — default' : ''}`;
      // store index so we can find voice quickly
      option.value = i;
      voicesDropdown.appendChild(option);
    });

    // Try to select a reasonable default (first local en-US or the default)
    const preferIndex = voices.findIndex(v => /en-US/i.test(v.lang)) ;
    if (preferIndex >= 0) voicesDropdown.value = preferIndex;
    else {
      const defaultIndex = voices.findIndex(v => v.default) ;
      if (defaultIndex >= 0) voicesDropdown.value = defaultIndex;
      else voicesDropdown.value = 0;
    }
  }

  // populate voices now and when they change (some browsers fire async)
  populateVoiceList();
  window.speechSynthesis.onvoiceschanged = populateVoiceList;

  // Build or restart utterance using current settings
  function buildUtterance() {
    if (!textEl) return null;
    const text = (textEl.value || '').trim();
    if (!text) return null;

    const msg = new SpeechSynthesisUtterance(text);

    // set voice if available
    if (voices.length && voicesDropdown && voicesDropdown.value !== '') {
      const idx = parseInt(voicesDropdown.value, 10);
      if (!isNaN(idx) && voices[idx]) msg.voice = voices[idx];
    }

    // set rate and pitch
    if (rateEl) {
      const r = parseFloat(rateEl.value);
      if (!isNaN(r)) msg.rate = r;
    }
    if (pitchEl) {
      const p = parseFloat(pitchEl.value);
      if (!isNaN(p)) msg.pitch = p;
    }

    // Optional: handle events for UI feedback
    msg.onstart = () => {
      if (speakBtn) speakBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
    };
    msg.onend = () => {
      if (speakBtn) speakBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
    };
    msg.onerror = (e) => {
      console.error('Speech synthesis error', e);
      if (speakBtn) speakBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
    };

    return msg;
  }

  function speak() {
    if (!textEl) return;
    const text = (textEl.value || '').trim();
    if (!text) {
      // graceful prevention
      alert('Please enter text to speak.');
      return;
    }

    // If already speaking, cancel first then speak new
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    utterance = buildUtterance();
    if (!utterance) {
      alert('Nothing to speak or voices unavailable.');
      return;
    }
    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('speak() failed:', err);
    }
  }

  function stop() {
    try {
      window.speechSynthesis.cancel();
      utterance = null;
      if (speakBtn) speakBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
    } catch (err) {
      console.error('stop() failed:', err);
    }
  }

  // If user changes voice while speaking -> restart with new voice
  function onVoiceChange() {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      // rebuild and restart
      const pos = utterance && utterance.text ? (window.speechSynthesis.paused ? 0 : 0) : 0;
      // simplest approach: cancel and speak from start with new voice
      stop();
      speak();
    }
  }

  // Update utterance options live (rate/pitch change while speaking)
  function onRatePitchChange() {
    // If speaking, restart with new settings
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      stop();
      speak();
    }
  }

  // wire event listeners if elements exist
  if (speakBtn) speakBtn.addEventListener('click', speak);
  if (stopBtn) stopBtn.addEventListener('click', stop);

  if (voicesDropdown) voicesDropdown.addEventListener('change', onVoiceChange);

  if (rateEl) {
    rateEl.addEventListener('input', onRatePitchChange);
    // optionally display current value as label (not required)
  }
  if (pitchEl) {
    pitchEl.addEventListener('input', onRatePitchChange);
  }

  // disable/enable buttons initial state
  if (stopBtn) stopBtn.disabled = true;

  // Optional: keyboard shortcut - Ctrl/Cmd+Enter to speak
  if (textEl) {
    textEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        speak();
      }
    });
  }

  // Expose small API for debugging
  window.voiceSynthesisApp = {
    speak,
    stop,
    getVoices: () => voices,
    getCurrentUtterance: () => utterance
  };
})();
