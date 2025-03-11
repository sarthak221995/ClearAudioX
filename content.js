chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updateAudioSettings') {
    const settings = request.settings;
    const video = document.querySelector('video');
    if (video) {
      // Apply volume boost
      video.volume = Math.min(1, settings.volumeBoost);

      // Apply noise reduction and equalization
      // Note: Implementing noise reduction and equalization requires more complex audio processing
      // which typically involves using the Web Audio API.
      // This is a placeholder for where such processing would occur.

      // Example: Create an audio context and connect nodes for processing
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(video);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = settings.volumeBoost;

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Additional processing for noise reduction and equalization would go here
    }
  }
});

// Audio context and nodes (make them persistent across the session)
let audioContext = null;
let source = null;
let gainNode = null;
let noiseReductionChain = null;

// Function to add buttons to the YouTube player
function addControls() {
    const volumeArea = document.querySelector('.ytp-volume-area');
    if (!volumeArea) return;

    // Remove existing buttons if any (prevents duplicates)
    const existingButtons = document.querySelectorAll('.custom-audio-button');
    existingButtons.forEach(button => button.remove());

    // Common button styles
    const commonStyles = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 0 8px;
        background: none;
        border: none;
        cursor: pointer;
        color: #999;
        font-size: 13px;
        font-family: Roboto, Arial, sans-serif;
        font-weight: bold;
        vertical-align: middle;
        position: relative;
        top: 0;
        margin: 0;
    `;

    // Create 2X Sound button
    const soundButton = document.createElement('button');
    soundButton.className = 'ytp-button custom-audio-button';
    soundButton.innerHTML = '2X';
    soundButton.title = '2X Sound Boost (toggle)';
    soundButton.style.cssText = commonStyles;
    soundButton.dataset.active = 'false';

    // Create Noise Reduction button
    const noiseButton = document.createElement('button');
    noiseButton.className = 'ytp-button custom-audio-button';
    noiseButton.innerHTML = 'NR';
    noiseButton.title = 'Noise Reduction (toggle)';
    noiseButton.style.cssText = commonStyles;
    noiseButton.dataset.active = 'false';

    // Insert buttons after volume control
    volumeArea.insertAdjacentElement('afterend', noiseButton);
    volumeArea.insertAdjacentElement('afterend', soundButton);

    // Add click handlers with fixed color toggle
    soundButton.addEventListener('click', function() {
        const isActive = this.dataset.active === 'true';
        toggleSoundBoost.call(this);
        this.dataset.active = (!isActive).toString();
        this.style.color = !isActive ? '#fff' : '#999'; // Toggle color immediately
    });

    noiseButton.addEventListener('click', function() {
        const isActive = this.dataset.active === 'true';
        toggleNoiseReduction.call(this);
        this.dataset.active = (!isActive).toString();
        this.style.color = !isActive ? '#fff' : '#999'; // Toggle color immediately
    });
}

// Function to toggle 2X sound boost
function toggleSoundBoost() {
    const video = document.querySelector('video');
    if (!video) return;
    
    const isActive = this.dataset.active === 'true';
    
    if (!audioContext) {
        initializeAudioContext(video);
    }
    
    gainNode.gain.setValueAtTime(isActive ? 1 : 4, audioContext.currentTime);
}

// Function to toggle noise reduction
function toggleNoiseReduction() {
    const video = document.querySelector('video');
    if (!video) return;
    
    const isActive = this.dataset.active === 'true';
    
    if (!audioContext) {
        initializeAudioContext(video);
    }
    
    if (!noiseReductionChain) {
        noiseReductionChain = createNoiseReductionChain();
    }
    
    if (isActive) {
        disconnectNoiseReduction();
    } else {
        connectNoiseReduction();
    }
}

// Initialize audio context and nodes
function initializeAudioContext(video) {
    try {
        if (audioContext) {
            audioContext.close();
        }
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        source = audioContext.createMediaElementSource(video);
        gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        
        // Default connection
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
    } catch (error) {
        console.error('Error initializing audio context:', error);
    }
}

// Create enhanced noise reduction chain
function createNoiseReductionChain() {
    try {
        // High-pass filter (remove low frequency noise)
        const highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 80;
        highpass.Q.value = 0.7;

        // Low-pass filter (remove high frequency hiss)
        const lowpass = audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 8000;
        lowpass.Q.value = 0.7;

        // Compressor for dynamic range compression
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -30;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        // Voice frequency enhancement
        const voiceBoost = audioContext.createBiquadFilter();
        voiceBoost.type = 'peaking';
        voiceBoost.frequency.value = 2500;
        voiceBoost.Q.value = 0.5;
        voiceBoost.gain.value = 8.0;

        // Connect filters in series
        highpass.connect(lowpass);
        lowpass.connect(compressor);
        compressor.connect(voiceBoost);

        return {
            input: highpass,
            output: voiceBoost
        };
    } catch (error) {
        console.error('Error creating noise reduction chain:', error);
        return null;
    }
}

// Helper function to connect noise reduction
function connectNoiseReduction() {
    if (!noiseReductionChain) return;
    try {
        source.disconnect();
        source.connect(noiseReductionChain.input);
        noiseReductionChain.output.connect(gainNode);
    } catch (error) {
        console.error('Error connecting noise reduction:', error);
    }
}

// Helper function to disconnect noise reduction
function disconnectNoiseReduction() {
    try {
        source.disconnect();
        source.connect(gainNode);
    } catch (error) {
        console.error('Error disconnecting noise reduction:', error);
    }
}

// Initialize controls only when video player is ready
function initializeControls() {
    const videoPlayer = document.querySelector('.html5-video-player');
    if (videoPlayer && !document.querySelector('.custom-audio-button')) {
        addControls();
    }
}

// Clean up old observers
if (window.controlsObserver) {
    window.controlsObserver.disconnect();
}

// Initialize when page loads and when navigating between videos
window.addEventListener('load', initializeControls);
document.addEventListener('yt-navigate-finish', initializeControls);

// Create a new mutation observer for the video player only
window.controlsObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.target.classList.contains('html5-video-player')) {
            initializeControls();
            break;
        }
    }
});

// Start observing only when the video player exists
const videoPlayer = document.querySelector('.html5-video-player');
if (videoPlayer) {
    window.controlsObserver.observe(videoPlayer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
} 