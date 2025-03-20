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
  } else if (request.type === 'extractSubtitles') {
    extractYouTubeSubtitles()
      .then(subtitles => {
        sendResponse({ success: true, subtitles });
      })
      .catch(error => {
        console.error('Error extracting subtitles:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for asynchronous response
  } else if (request.type === 'apiKeyAvailable') {
    // Show the Notes button when API key is available
    const notesButton = document.querySelector('.notes-button');
    if (notesButton) {
      notesButton.style.display = request.available ? 'inline-flex' : 'none';
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

    // Common button styles - More targeted to avoid affecting YouTube UI
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
        z-index: 35; /* Lower than YouTube's autocomplete (50-60) */
        white-space: nowrap;
        overflow: visible;
    `;

    // Create Audio Boost button with more targeted styling
    const soundButton = document.createElement('button');
    soundButton.className = 'ytp-button custom-audio-button';
    soundButton.innerHTML = '2X';
    soundButton.title = 'Audio Boost (toggle)';
    soundButton.style.cssText = commonStyles;
    soundButton.dataset.active = 'false';
    
    // Create Notes button with more targeted styling
    const notesButton = document.createElement('button');
    notesButton.className = 'ytp-button custom-audio-button notes-button';
    notesButton.innerHTML = 'Gen Notes';
    notesButton.title = 'Generate Class Notes (requires API key)';
    notesButton.style.cssText = commonStyles;
    notesButton.style.display = 'none'; // Hidden by default until API key is available

    // Insert buttons after volume control - use a more careful insertion method
    // Use a wrapper to isolate our buttons from affecting the layout
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'custom-buttons-wrapper';
    buttonWrapper.style.cssText = 'display: inline-flex; height: 100%; align-items: center;';
    buttonWrapper.appendChild(soundButton);
    buttonWrapper.appendChild(notesButton);
    
    // Insert after volume area
    volumeArea.insertAdjacentElement('afterend', buttonWrapper);

    // Add click handlers with fixed color toggle
    soundButton.addEventListener('click', function() {
        const isActive = this.dataset.active === 'true';
        toggleSoundBoost.call(this);
        this.dataset.active = (!isActive).toString();
        this.classList.toggle('button-active', !isActive);
    });

    // Notes button click handler
    notesButton.addEventListener('click', function() {
        // Open the popup with the notes tab active
        chrome.runtime.sendMessage({ type: 'openPopupWithNotesTab' });
        // Alternatively, directly trigger the notes generation
        chrome.runtime.sendMessage({ type: 'generateNotes' });
    });

    // Check if API key exists and show Notes button if it does
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            notesButton.style.display = 'inline-flex';
        }
    });
}

// Function to toggle Audio Boost (formerly 2X sound boost)
function toggleSoundBoost() {
    const video = document.querySelector('video');
    if (!video) return;
    
    const isActive = this.dataset.active === 'true';
    
    if (!audioContext) {
        initializeAudioContext(video);
    }
    
    // Check if gainNode exists before using it
    if (gainNode) {
        gainNode.gain.setValueAtTime(isActive ? 1 : 4, audioContext.currentTime);
    }
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

// Cleanup function to completely remove our buttons from the DOM when needed
function cleanupControls() {
    const customButtons = document.querySelectorAll('.custom-buttons-wrapper, .custom-audio-button');
    customButtons.forEach(el => {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });
}

// Initialize controls only when video player is ready, using a more careful approach
function initializeControls() {
    const videoPlayer = document.querySelector('.html5-video-player');
    if (videoPlayer && !document.querySelector('.custom-buttons-wrapper')) {
        addControls();
    }
}

// More careful cleanup of old observers
if (window.controlsObserver) {
    window.controlsObserver.disconnect();
    window.controlsObserver = null;
}

// Use a more targeted approach for observing the player
// Only initialize when on a video page, not search or other YouTube pages
function setupObserver() {
    // Only run on watch pages to avoid interfering with search
    if (!window.location.href.includes('youtube.com/watch')) {
        cleanupControls();
        return;
    }
    
    // Initialize when page loads and when navigating between videos
    const videoPlayer = document.querySelector('.html5-video-player');
    if (videoPlayer) {
        initializeControls();
        
        // Create a new mutation observer with more limited scope
        if (!window.controlsObserver) {
            window.controlsObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.target.classList.contains('html5-video-player')) {
                        initializeControls();
                        break;
                    }
                }
            });
            
            // Start observing only the video player with minimal options
            window.controlsObserver.observe(videoPlayer, {
                childList: true,
                subtree: false,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    } else {
        // If no video player, clean up any existing controls to prevent interference
        cleanupControls();
    }
}

// Initialize when page loads
window.addEventListener('load', setupObserver);

// Handle navigation between YouTube pages - important for single-page app behavior
document.addEventListener('yt-navigate-finish', () => {
    // Delay slightly to ensure DOM is ready
    setTimeout(setupObserver, 100);
});

// Clean up on navigation away from video pages
document.addEventListener('yt-navigate-start', () => {
    if (window.controlsObserver) {
        window.controlsObserver.disconnect();
        window.controlsObserver = null;
    }
    cleanupControls();
});

// Function to extract YouTube subtitles with timestamps
async function extractYouTubeSubtitles() {
  try {
    // Check if we're on a YouTube video page
    if (!window.location.href.includes('youtube.com/watch')) {
      throw new Error('Not on a YouTube video page');
    }

    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
      throw new Error('Could not find video ID');
    }

    // Try to get captions from video player first (more reliable for current video)
    const playerCaptions = await getPlayerCaptions();
    if (playerCaptions && playerCaptions.length > 0) {
      return playerCaptions;
    }

    // Fallback to API if player captions aren't available
    const captions = await fetchCaptionsFromAPI(videoId);
    return captions;
  } catch (error) {
    console.error('Error extracting subtitles:', error);
    throw new Error('Failed to extract subtitles. Make sure the video has captions available.');
  }
}

// Function to get captions directly from the YouTube player (preferred method)
async function getPlayerCaptions() {
  return new Promise((resolve) => {
    // Give the page a moment to fully initialize if needed
    setTimeout(() => {
      try {
        // Try to access YouTube's player captions
        const captions = [];
        
        // Find the player and extract caption track data
        const videoElement = document.querySelector('video');
        if (!videoElement) {
          return resolve(null);
        }
        
        // If textTracks are available, use them
        if (videoElement.textTracks && videoElement.textTracks.length > 0) {
          const track = videoElement.textTracks[0];
          
          // Enable the track if not active
          if (track.mode !== 'showing') {
            track.mode = 'showing';
          }
          
          // Wait a moment for cues to initialize
          setTimeout(() => {
            if (track.cues && track.cues.length > 0) {
              // Convert cues to our format
              for (let i = 0; i < track.cues.length; i++) {
                const cue = track.cues[i];
                captions.push({
                  start: cue.startTime,
                  end: cue.endTime,
                  text: cue.text.replace(/<[^>]*>/g, '') // Remove HTML tags
                });
              }
              resolve(captions);
            } else {
              resolve(null); // No cues found
            }
          }, 500);
        } else {
          resolve(null); // No text tracks found
        }
      } catch (error) {
        console.error('Error getting player captions:', error);
        resolve(null);
      }
    }, 1000);
  });
}

// Function to fetch captions from YouTube API (fallback method)
async function fetchCaptionsFromAPI(videoId) {
  try {
    // Get video info to extract available captions
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Look for caption track data in the page source
    const captionRegex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(captionRegex);
    
    if (!match || !match[1]) {
      throw new Error('No caption tracks found');
    }
    
    // Parse the caption tracks JSON
    const captionTracks = JSON.parse(match[1].replace(/\\"/g, '"').replace(/\\u0026/g, '&'));
    
    // Find the English captions or use the first available
    const trackInfo = captionTracks.find(track => 
      track.languageCode === 'en' || track.name.simpleText.includes('English')
    ) || captionTracks[0];
    
    if (!trackInfo || !trackInfo.baseUrl) {
      throw new Error('No suitable caption track found');
    }
    
    // Fetch the actual caption file (XML format)
    const captionResponse = await fetch(trackInfo.baseUrl);
    const captionXml = await captionResponse.text();
    
    // Parse the XML to extract captions with timestamps
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(captionXml, 'text/xml');
    const textElements = xmlDoc.getElementsByTagName('text');
    
    const captions = [];
    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i];
      const startTime = parseFloat(element.getAttribute('start'));
      const duration = element.getAttribute('dur') ? parseFloat(element.getAttribute('dur')) : 2.0;
      const text = element.textContent.trim();
      
      if (text) {
        captions.push({
          start: startTime,
          end: startTime + duration,
          text: text
        });
      }
    }
    
    return captions;
  } catch (error) {
    console.error('Error fetching captions from API:', error);
    throw new Error('Failed to fetch captions');
  }
} 