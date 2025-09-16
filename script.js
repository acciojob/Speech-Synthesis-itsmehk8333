// Your script here.
// Populate voices and wire up the controls for the speech synthesis app

// helper to get voices and populate select
function populateVoiceList() {
  voices = window.speechSynthesis.getVoices() || [];
  // clear existing options
  voicesDropdown.innerHTML = '<option value="">Select A Voice</option>';

  if (!voices.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No voices available';
    voicesDropdown.appendChild(opt);
    return;
  }

  voices.forEach((voice, i) => {
    const option = document.createElement('option');
    option.value = i; // store index
    option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — default' : ''}`;
    voicesDropdown.appendChild(option);
  });
}

// initial population (may be empty until onvoiceschanged)
populateVoiceList();
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

// sync msg properties from UI
function syncMsgFromUI() {
  // text
  const textEl = document.querySelector('[name="text"]');
  msg.text = textEl ? textEl.value : '';

  // voice
  const selectedIndex = parseInt(voicesDropdown.value, 10);
  if (!isNaN(selectedIndex) && voices[selectedIndex]) {
    msg.voice = voices[selectedIndex];
  } else {
    msg.voice = null;
  }

  // rate & pitch (inputs are selected in `options` NodeList)
  const rateEl = document.querySelector('[name="rate"]');
  const pitchEl = document.querySelector('[name="pitch"]');
  msg.rate = rateEl ? parseFloat(rateEl.value) : 1;
  msg.pitch = pitchEl ? parseFloat(pitchEl.value) : 1;
}

// speak function
function speak() {
  syncMsgFromUI();
  if (!msg.text || msg.text.trim().length === 0) {
    alert('Please enter text to speak.');
    return;
  }

  // if already speaking, cancel first
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  // Attach events to update UI
  msg.onstart = () => {
    speakButton.disabled = true;
    stopButton.disabled = false;
  };
  msg.onend = () => {
    speakButton.disabled = false;
    stopButton.disabled = true;
  };
  msg.onerror = (e) => {
    console.error('SpeechSynthesisUtterance error', e);
    speakButton.disabled = false;
    stopButton.disabled = true;
  };

  try {
    speechSynthesis.speak(msg);
  } catch (err) {
    console.error('speak() failed', err);
  }
}

// stop function
function stop() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  speakButton.disabled = false;
  stopButton.disabled = true;
}

// restart speaking if currently speaking (used when changing voice/rate/pitch)
function restartIfSpeaking() {
  if (!speechSynthesis.speaking) return;
  // Grab the current text
  const currentText = msg.text || (document.querySelector('[name="text"]') || {}).value || '';
  speechSynthesis.cancel();
  // small delay to ensure cancel is processed
  setTimeout(() => {
    msg.text = currentText;
    syncMsgFromUI();
    speechSynthesis.speak(msg);
  }, 50);
}

// wire up UI events
if (speakButton) speakButton.addEventListener('click', (e) => {
  e.preventDefault();
  speak();
});
if (stopButton) stopButton.addEventListener('click', (e) => {
  e.preventDefault();
  stop();
});

// when user picks a new voice, restart if speaking
voicesDropdown.addEventListener('change', () => {
  syncMsgFromUI();
  restartIfSpeaking();
});

// rate & pitch inputs: update msg and restart if speaking
const rateInput = document.querySelector('[name="rate"]');
const pitchInput = document.querySelector('[name="pitch"]');
if (rateInput) {
  rateInput.addEventListener('input', () => {
    syncMsgFromUI();
    restartIfSpeaking();
  });
}
if (pitchInput) {
  pitchInput.addEventListener('input', () => {
    syncMsgFromUI();
    restartIfSpeaking();
  });
}

// update text area into msg on change (no restart required)
const textArea = document.querySelector('[name="text"]');
if (textArea) {
  textArea.addEventListener('input', () => {
    msg.text = textArea.value;
  });
}

// initial UI state
stopButton.disabled = true;
speakButton.disabled = false;
