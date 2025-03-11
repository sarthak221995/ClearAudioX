document.addEventListener('DOMContentLoaded', () => {
  const volumeBoost = document.getElementById('volume-boost');
  const volumeValue = document.getElementById('volume-value');
  const noiseReduction = document.getElementById('noise-reduction');
  const noiseValue = document.getElementById('noise-value');
  const eqBass = document.getElementById('eq-bass');
  const bassValue = document.getElementById('bass-value');
  const eqMid = document.getElementById('eq-mid');
  const midValue = document.getElementById('mid-value');
  const eqTreble = document.getElementById('eq-treble');
  const trebleValue = document.getElementById('treble-value');
  const compression = document.getElementById('compression');
  const compressionValue = document.getElementById('compression-value');
  const resetButton = document.getElementById('reset-button');

  // Load saved settings
  chrome.storage.sync.get([
    'volumeBoost',
    'noiseReduction',
    'eqBass',
    'eqMid',
    'eqTreble',
    'compression'
  ], (result) => {
    volumeBoost.value = result.volumeBoost || 100;
    noiseReduction.value = result.noiseReduction || 0;
    eqBass.value = result.eqBass || 0;
    eqMid.value = result.eqMid || 0;
    eqTreble.value = result.eqTreble || 0;
    compression.value = result.compression || 0;
    
    updateValues();
  });

  function updateValues() {
    volumeValue.textContent = `${volumeBoost.value}%`;
    noiseValue.textContent = `${noiseReduction.value}%`;
    bassValue.textContent = `${eqBass.value} dB`;
    midValue.textContent = `${eqMid.value} dB`;
    trebleValue.textContent = `${eqTreble.value} dB`;
    compressionValue.textContent = `${compression.value}%`;
  }

  function saveSettings() {
    chrome.storage.sync.set({
      volumeBoost: volumeBoost.value,
      noiseReduction: noiseReduction.value,
      eqBass: eqBass.value,
      eqMid: eqMid.value,
      eqTreble: eqTreble.value,
      compression: compression.value
    });
  }

  function sendSettingsToContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'updateAudioSettings',
        settings: {
          volumeBoost: parseFloat(volumeBoost.value) / 100,
          noiseReduction: parseFloat(noiseReduction.value) / 100,
          eqBass: parseFloat(eqBass.value),
          eqMid: parseFloat(eqMid.value),
          eqTreble: parseFloat(eqTreble.value),
          compression: parseFloat(compression.value) / 100
        }
      });
    });
  }

  // Event listeners for all controls
  [volumeBoost, noiseReduction, eqBass, eqMid, eqTreble, compression].forEach(control => {
    control.addEventListener('input', () => {
      updateValues();
      sendSettingsToContentScript();
    });

    control.addEventListener('change', saveSettings);
  });

  // Reset button handler
  resetButton.addEventListener('click', () => {
    volumeBoost.value = 100;
    noiseReduction.value = 0;
    eqBass.value = 0;
    eqMid.value = 0;
    eqTreble.value = 0;
    compression.value = 0;
    
    updateValues();
    saveSettings();
    sendSettingsToContentScript();
  });
}); 