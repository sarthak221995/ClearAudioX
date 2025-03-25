document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Check if we should open specific tabs
  chrome.storage.local.get(['openNotesTab', 'startNotesGeneration', 'openFocusTab'], (result) => {
    if (result.openFocusTab) {
      // Switch to the focus tab
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      const focusTabButton = document.querySelector('.tab-button[data-tab="focus"]');
      focusTabButton.classList.add('active');
      document.getElementById('focus-tab').classList.add('active');
      
      // Clear the flag
      chrome.storage.local.remove('openFocusTab');
    }
    else if (result.openNotesTab) {
      // Switch to the notes tab
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      const subtitleTabButton = document.querySelector('.tab-button[data-tab="subtitle"]');
      subtitleTabButton.classList.add('active');
      document.getElementById('subtitle-tab').classList.add('active');
      
      // Clear the flag
      chrome.storage.local.remove('openNotesTab');
      
      // Check if we should also start notes generation
      if (result.startNotesGeneration) {
        // Wait a short moment for the popup to fully initialize
        setTimeout(() => {
          const generateNotesButton = document.getElementById('generate-notes');
          if (generateNotesButton && !generateNotesButton.disabled) {
            generateNotesButton.click();
          }
          // Clear the flag
          chrome.storage.local.remove('startNotesGeneration');
        }, 100);
      }
    }
  });
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to the clicked button and corresponding content
      button.classList.add('active');
      const tabId = button.dataset.tab;
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });

  // AUDIO ENHANCEMENT TAB
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

  // Load saved audio settings
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

  // Event listeners for all audio controls
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

  // SUBTITLE EXTRACTOR TAB
  const apiKeyInput = document.getElementById('gemini-api-key');
  const saveApiKeyButton = document.getElementById('save-api-key');
  const apiStatus = document.getElementById('api-status');
  const generateNotesButton = document.getElementById('generate-notes');
  const downloadResultsButton = document.getElementById('download-results');
  const resultsArea = document.getElementById('results-area');
  const loadingContainer = document.querySelector('.loading-container');
  const progressFill = document.querySelector('.progress-fill');
  const progressPercentage = document.getElementById('progress-percentage');
  const cancelSummaryButton = document.getElementById('cancel-summary');

  // Data storage for subtitle processing
  let subtitleData = {
    rawSubtitles: [],
    summary: ''
  };

  // Global variable to store subtitles for use across tabs
  let subtitles = [];

  // Controller for cancellation
  let abortController = null;

  // Load saved API key
  chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
      apiStatus.textContent = 'API key saved';
      apiStatus.className = 'api-status success';
    }
  });

  // Save API key
  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        apiStatus.textContent = 'API key saved successfully';
        apiStatus.className = 'api-status success';
        
        // Signal to content script that API key is available
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'apiKeyAvailable', 
            available: true 
          });
        });
      });
    } else {
      apiStatus.textContent = 'Please enter a valid API key';
      apiStatus.className = 'api-status error';
    }
  });

  // Generate notes - combines subtitle extraction and summarization
  generateNotesButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      apiStatus.textContent = 'Please enter a Gemini API key';
      apiStatus.className = 'api-status error';
      return;
    }
    
    // Disable download button until process completes
    downloadResultsButton.disabled = true;
    
    // Reset and show loading UI
    loadingContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressPercentage.textContent = '0%';
    generateNotesButton.disabled = true;
    abortController = new AbortController();
    
    resultsArea.innerHTML = '<p>Extracting subtitles, please wait...</p>';
    
    // Step 1: Extract subtitles
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'extractSubtitles' }, (response) => {
        if (response && response.success) {
          // Store subtitles in the global variable for use by other tabs
          subtitles = response.subtitles;
          subtitleData.rawSubtitles = response.subtitles;
          
          // Update progress indication
          progressFill.style.width = '10%';
          progressPercentage.textContent = '10%';
          resultsArea.innerHTML = '<p>Generating notes, please wait...</p>';
          
          // Step 2: Generate summary
          summarizeContent(response.subtitles, apiKey)
            .then(summary => {
              subtitleData.summary = summary;
              displaySummaryAndSubtitles(subtitleData.rawSubtitles, summary);
              // Enable download button
              downloadResultsButton.disabled = false;
            })
            .catch(error => {
              if (error.name === 'AbortError') {
                resultsArea.innerHTML = '<p class="no-results">Notes generation cancelled.</p>';
              } else {
                resultsArea.innerHTML = `<p class="no-results">Error generating notes: ${error.message}</p>`;
              }
            })
            .finally(() => {
              // Hide loading UI and reset button state
              loadingContainer.style.display = 'none';
              generateNotesButton.disabled = false;
              abortController = null;
            });
        } else {
          resultsArea.innerHTML = '<p class="no-results">Error extracting subtitles. Make sure you are on a YouTube video page with available subtitles.</p>';
          loadingContainer.style.display = 'none';
          generateNotesButton.disabled = false;
          abortController = null;
        }
      });
    });
  });

  // Cancel button handler
  cancelSummaryButton.addEventListener('click', () => {
    if (abortController) {
      abortController.abort();
    }
  });

  // Download results
  downloadResultsButton.addEventListener('click', () => {
    let content = '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (subtitleData.summary) {
      content = formatDownloadContent(subtitleData.summary);
      downloadTextFile(content, `youtube-notes-${timestamp}.txt`);
    }
  });

  // Helper function to display summary and subtitles
  function displaySummaryAndSubtitles(subtitles, summary) {
    // Function to convert markdown to HTML
    function markdownToHtml(markdown) {
      if (!markdown) return '';
      
      // Convert headers
      markdown = markdown.replace(/^### (.*$)/gm, '<h4>$1</h4>');
      markdown = markdown.replace(/^## (.*$)/gm, '<h3>$1</h3>');
      markdown = markdown.replace(/^# (.*$)/gm, '<h2>$1</h2>');
      
      // Convert bullet points
      markdown = markdown.replace(/^\* (.*$)/gm, '<li>$1</li>');
      markdown = markdown.replace(/^- (.*$)/gm, '<li>$1</li>');
      
      // Wrap lists
      markdown = markdown.replace(/<li>(.*)<\/li>/gm, function(match) {
        return '<ul>' + match + '</ul>';
      });
      markdown = markdown.replace(/<\/ul>\s*<ul>/g, '');
      
      // Convert bold and italic
      markdown = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      markdown = markdown.replace(/\*(.*?)\*/g, '<em>$1</em>');
      markdown = markdown.replace(/__(.*?)__/g, '<strong>$1</strong>');
      markdown = markdown.replace(/_(.*?)_/g, '<em>$1</em>');
      
      // Convert line breaks to paragraphs
      markdown = markdown.replace(/\n\s*\n/g, '</p><p>');
      
      // Wrap in paragraph if not already
      if (!markdown.startsWith('<')) {
        markdown = '<p>' + markdown + '</p>';
      }
      
      return markdown;
    }
    
    let html = `
      <div class="summary-section">
        <h4>Summary</h4>
        <div class="summary-content markdown-content">${markdownToHtml(summary)}</div>
      </div>
      <h4>Lecture Transcript</h4>
    `;
    
    subtitles.forEach(subtitle => {
      html += `
        <div class="subtitle-entry">
          <div class="subtitle-time">${formatTime(subtitle.start)} - ${formatTime(subtitle.end)}</div>
          <div class="subtitle-text">${subtitle.text}</div>
        </div>
      `;
    });
    
    resultsArea.innerHTML = html;
  }

  // Helper function to format time
  function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  }

  // Helper function to summarize content using Gemini API
  async function summarizeContent(subtitles, apiKey) {
    if (!subtitles || subtitles.length === 0) {
      throw new Error("No subtitles available to summarize.");
    }
    
    // Join all subtitles with timestamps to create a full transcript
    const transcript = subtitles
      .map(s => `[${formatTime(s.start)}] ${s.text}`)
      .join("\n");
    
    // Split transcript into chunks if needed (to avoid API limits)
    const MAX_CHUNK_LENGTH = 8000; // Character limit for API request
    let chunks = [];
    
    if (transcript.length <= MAX_CHUNK_LENGTH) {
      chunks = [transcript];
    } else {
      // Split by time intervals to create reasonable chunks
      let currentChunk = "";
      let subtitleIndex = 0;
      
      while (subtitleIndex < subtitles.length) {
        const nextLine = `[${formatTime(subtitles[subtitleIndex].start)}] ${subtitles[subtitleIndex].text}\n`;
        
        if (currentChunk.length + nextLine.length > MAX_CHUNK_LENGTH) {
          chunks.push(currentChunk);
          currentChunk = nextLine;
        } else {
          currentChunk += nextLine;
        }
        
        subtitleIndex++;
      }
      
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
    }
    
    // Process each chunk and combine results
    let fullSummary = "";
    
    for (let i = 0; i < chunks.length; i++) {
      // Update progress
      const progress = Math.round((i / chunks.length) * 100);
      progressFill.style.width = `${progress}%`;
      progressPercentage.textContent = `${progress}%`;
      
      const chunkPrompt = `
        Below is a transcript from an educational YouTube lecture.
        Please provide a comprehensive summary of the key points discussed in this part of the video (${i+1}/${chunks.length}). 
        Structure your summary with bullet points for main topics and include any important 
        concepts, definitions, examples, or questions raised during the discussion.

        Format your response in markdown with:
        - Headers for main topics
        - Bullet points for subtopics and details
        - Bold for important terms or concepts
        - Clear section organization
        
        Transcript:
        ${chunks[i]}
      `;
      
      const chunkResponse = await callGeminiAPI(chunkPrompt, apiKey);
      fullSummary += (i > 0 ? "\n\n" : "") + chunkResponse;
    }
    
    // If there were multiple chunks, provide a concise overall summary
    if (chunks.length > 1) {
      const finalSummaryPrompt = `
        Based on the following detailed summary of a lecture, create a concise executive summary 
        that captures the most important points and the overall structure of the lecture.
        Focus on the key takeaways that a student would need for notes.
        
        Format your response in markdown with:
        - Headers for main topics
        - Bullet points for key points
        - Bold for important terms or concepts
        - Clear section organization
        
        Detailed summary:
        ${fullSummary}
      `;
      
      try {
        const finalSummary = await callGeminiAPI(finalSummaryPrompt, apiKey);
        return finalSummary;
      } catch (error) {
        // If the final summary fails, return the chunked summaries
        console.error("Failed to create final summary:", error);
        return fullSummary;
      }
    }
    
    return fullSummary;
  }

  // Helper function to call Gemini API
  async function callGeminiAPI(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
      signal: abortController.signal // Add abort signal to the fetch request
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    
    // More detailed logging of the API response
    console.log('API response received:', data);
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in Gemini API response:', data);
      throw new Error('Gemini API returned no valid candidates. Please try again.');
    }
    
    // Extract JSON response from Gemini
    const content = data.candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      console.error('Invalid content structure in API response:', content);
      throw new Error('Gemini API returned an empty or invalid response');
    }
    
    return content.parts[0].text;
  }

  // Helper function to post-process segments for better quality
  function postProcessSegments(segments, videoDuration) {
    // Ensure we have at least some segments
    if (!segments || segments.length === 0) {
      // Create a default segment if none exist
      return [{
        start: 0,
        end: videoDuration,
        important: true,
        reason: 'Default segment (entire video)'
      }];
    }
    
    // Sort segments by start time
    segments.sort((a, b) => a.start - b.start);
    
    // Ensure the first segment starts at 0
    if (segments[0].start > 0) {
      segments.unshift({
        start: 0,
        end: segments[0].start,
        important: true, // Assume the beginning is important
        reason: 'Video introduction'
      });
    }
    
    // Ensure the last segment ends at video duration
    const lastSegment = segments[segments.length - 1];
    if (lastSegment.end < videoDuration) {
      segments.push({
        start: lastSegment.end,
        end: videoDuration,
        important: true, // Assume the ending is important
        reason: 'Video conclusion'
      });
    }
    
    // Fix any gaps between segments
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].end < segments[i + 1].start) {
        // Insert a segment to fill the gap
        segments.splice(i + 1, 0, {
          start: segments[i].end,
          end: segments[i + 1].start,
          important: true, // Assume gaps should be watched
          reason: 'Transition between segments'
        });
      }
    }
    
    // Fix any overlapping segments
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].end > segments[i + 1].start) {
        segments[i].end = segments[i + 1].start;
      }
    }
    
    return segments;
  }

  // Helper function to format content for download
  function formatDownloadContent(summary) {
    let content = '';
    
    content += '# SUMMARY\n\n';
    content += summary + '\n\n';
    
    return content;
  }

  // Helper function to download text file
  function downloadTextFile(content, filename) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // FOCUS MODE TAB
  const focusToggle = document.getElementById('focus-toggle');
  const focusSensitivity = document.getElementById('focus-sensitivity');
  const analyzeVideoButton = document.getElementById('analyze-video');
  const focusStatus = document.getElementById('focus-status');
  const videoTimelineContainer = document.getElementById('video-timeline');
  
  // Add API key elements for Focus tab
  const focusApiKeyInput = document.getElementById('focus-gemini-api-key');
  const focusSaveApiKeyButton = document.getElementById('focus-save-api-key');
  const focusApiStatus = document.getElementById('focus-api-status');

  // Add loading UI elements
  const focusLoadingContainer = document.querySelector('.focus-loading-container');
  const focusProgressFill = document.querySelector('.focus-progress-fill');
  const focusProgressPercentage = document.getElementById('focus-progress-percentage');
  const cancelFocusButton = document.getElementById('cancel-focus-analysis');

  // Controller for focus analysis cancellation
  let focusAbortController = null;

  // Data storage for focus mode
  let focusData = {
    enabled: false,
    sensitivity: 3,
    currentVideoId: null,
    segments: []
  };

  // Separate variable to store Focus Mode subtitles
  let focusSubtitles = [];

  console.log('Initializing Focus Mode tab');
  
  // Load saved focus mode settings and API key
  chrome.storage.sync.get(['focusEnabled', 'focusSensitivity', 'geminiApiKey'], (result) => {
    console.log('Loaded Focus Mode settings:', result);
    
    if (result.focusEnabled !== undefined) {
      focusData.enabled = result.focusEnabled;
      focusToggle.checked = result.focusEnabled;
    }
    
    if (result.focusSensitivity !== undefined) {
      focusData.sensitivity = result.focusSensitivity;
      focusSensitivity.value = result.focusSensitivity;
    }
    
    // Load the API key if available
    if (result.geminiApiKey) {
      focusApiKeyInput.value = result.geminiApiKey;
      focusApiStatus.textContent = 'API key saved';
      focusApiStatus.className = 'api-status success';
    }
    
    // Send current settings to content script
    updateContentFocusMode();
  });
  
  // Handle Focus tab API key saving
  focusSaveApiKeyButton.addEventListener('click', () => {
    const apiKey = focusApiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        focusApiStatus.textContent = 'API key saved successfully';
        focusApiStatus.className = 'api-status success';
        
        // Signal to content script that API key is available
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'apiKeyAvailable', 
            available: true 
          });
        });
      });
    } else {
      focusApiStatus.textContent = 'Please enter a valid API key';
      focusApiStatus.className = 'api-status error';
    }
  });

  // Check if current video has been analyzed
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com/watch')) {
      console.log('Current tab is a YouTube video:', tabs[0].url);
      
      // Extract video ID from URL
      const videoId = getYoutubeVideoId(tabs[0].url);
      if (videoId) {
        focusData.currentVideoId = videoId;
        console.log('Video ID:', videoId);
        
        // Try to load any existing segments from storage
        chrome.storage.local.get([`focus_${videoId}`], (result) => {
          const videoFocusData = result[`focus_${videoId}`];
          if (videoFocusData && videoFocusData.segments) {
            console.log('Found existing segments for video:', videoFocusData.segments.length);
            focusData.segments = videoFocusData.segments;
            focusStatus.textContent = 'Video analyzed';
            focusStatus.classList.add('status-success');
            renderVideoTimeline();
            
            // Update content script with focus data
            updateContentFocusMode();
          } else {
            console.log('No existing segments found for video');
            focusStatus.textContent = 'Video not analyzed';
            focusStatus.classList.add('status-warning');
          }
        });
      }
    } else {
      console.log('Current tab is not a YouTube video');
      focusStatus.textContent = 'Not on a YouTube video';
      focusStatus.classList.add('status-error');
      analyzeVideoButton.disabled = true;
    }
  });
  
  // Add event listeners for Focus Mode
  focusToggle.addEventListener('change', function() {
    console.log('Focus Mode toggle changed:', this.checked);
    focusData.enabled = this.checked;
    chrome.storage.sync.set({ focusEnabled: focusData.enabled });
    
    // Update UI to reflect changes
    if (this.checked) {
      if (!focusData.segments || focusData.segments.length === 0) {
        focusStatus.textContent = 'Enabled, but no segments analyzed yet';
        focusStatus.classList.remove('status-error', 'status-success');
        focusStatus.classList.add('status-warning');
      } else {
        focusStatus.textContent = 'Focus Mode enabled';
        focusStatus.classList.remove('status-error', 'status-warning');
        focusStatus.classList.add('status-success');
      }
    } else {
      focusStatus.textContent = 'Focus Mode disabled';
      focusStatus.classList.remove('status-success', 'status-error');
      focusStatus.classList.add('status-warning');
    }
    
    updateContentFocusMode();
  });
  
  focusSensitivity.addEventListener('input', function() {
    focusData.sensitivity = parseInt(focusSensitivity.value);
    chrome.storage.sync.set({ focusSensitivity: focusData.sensitivity });
    updateContentFocusMode();
  });
  
  analyzeVideoButton.addEventListener('click', function() {
    // First check if we have a valid API key
    const apiKey = focusApiKeyInput.value.trim();
    if (!apiKey) {
      focusStatus.textContent = 'API key required';
      focusStatus.classList.remove('status-progress', 'status-success', 'status-warning');
      focusStatus.classList.add('status-error');
      return;
    }
    
    // Indicate analysis is starting
    focusStatus.textContent = 'Extracting subtitles...';
    focusStatus.classList.remove('status-error', 'status-warning', 'status-success');
    focusStatus.classList.add('status-progress');
    
    // Show loading UI for extraction
    focusLoadingContainer.style.display = 'block';
    focusProgressFill.style.width = '0%';
    focusProgressPercentage.textContent = '0%';
    analyzeVideoButton.disabled = true;
    
    // Create abort controller for cancellation
    focusAbortController = new AbortController();
    
    // Update progress to show we've started
    updateFocusProgress(5);
    
    // Extract subtitles first
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'extractSubtitles' }, (response) => {
        if (response && response.success) {
          // Store subtitles in the focus-specific variable
          focusSubtitles = response.subtitles;
          
          // Now proceed with analysis
          focusStatus.textContent = 'Analyzing video...';
          updateFocusProgress(10);
          analyzeVideo(focusSubtitles, apiKey);
        } else {
          focusStatus.textContent = 'Error extracting subtitles';
          focusStatus.classList.remove('status-progress');
          focusStatus.classList.add('status-error');
          
          // Hide loading UI and reset button state
          focusLoadingContainer.style.display = 'none';
          analyzeVideoButton.disabled = false;
          focusAbortController = null;
        }
      });
    });
  });
  
  // Separate function to analyze videos for Focus Mode
  function analyzeVideo(subtitles, apiKey) {
    if (!subtitles || subtitles.length === 0) {
      focusStatus.textContent = 'No subtitles found to analyze';
      focusStatus.classList.remove('status-progress');
      focusStatus.classList.add('status-error');
      
      // Hide loading UI and reset button state
      focusLoadingContainer.style.display = 'none';
      analyzeVideoButton.disabled = false;
      focusAbortController = null;
      return;
    }
    
    analyzeSubtitlesForFocus(subtitles, apiKey)
      .then(segments => {
        if (segments && segments.length > 0) {
          focusData.segments = segments;
          
          // Save segments to storage
          if (focusData.currentVideoId) {
            const storageData = {};
            storageData[`focus_${focusData.currentVideoId}`] = {
              segments: segments,
              timestamp: Date.now()
            };
            chrome.storage.local.set(storageData);
          }
          
          // Update status
          focusStatus.textContent = 'Analysis complete';
          focusStatus.classList.remove('status-progress', 'status-error', 'status-warning');
          focusStatus.classList.add('status-success');
          
          // Render the timeline
          renderVideoTimeline();
          
          // Update content script
          updateContentFocusMode();
        } else {
          focusStatus.textContent = 'Analysis failed: No segments identified';
          focusStatus.classList.remove('status-progress', 'status-success', 'status-warning');
          focusStatus.classList.add('status-error');
        }
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          focusStatus.textContent = 'Analysis cancelled';
        } else {
          focusStatus.textContent = `Analysis failed: ${error.message}`;
          focusStatus.classList.remove('status-progress', 'status-success', 'status-warning');
          focusStatus.classList.add('status-error');
          console.error('Focus analysis error:', error);
        }
      })
      .finally(() => {
        // Hide loading UI and reset button state
        focusLoadingContainer.style.display = 'none';
        analyzeVideoButton.disabled = false;
        focusAbortController = null;
      });
  }

  // Cancel button handler for focus analysis
  cancelFocusButton.addEventListener('click', () => {
    if (focusAbortController) {
      focusAbortController.abort();
    }
  });

  // Function to update content script with focus mode data
  function updateContentFocusMode() {
    console.log('Sending Focus Mode data to content script:', {
      enabled: focusData.enabled,
      sensitivity: focusData.sensitivity,
      segments: focusData.segments ? focusData.segments.length : 0
    });
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'updateFocusMode',
          focusData: {
            enabled: focusData.enabled,
            sensitivity: focusData.sensitivity,
            segments: focusData.segments || []
          }
        }, response => {
          if (response && response.success) {
            console.log('Focus Mode update successful');
          } else {
            console.log('Focus Mode update response:', response);
          }
        });
      } else {
        console.error('No active tab found to send Focus Mode data');
      }
    });
  }

  // Function to render the video timeline
  function renderVideoTimeline() {
    // Clear existing timeline
    videoTimelineContainer.innerHTML = '';
    
    if (!focusData.segments || focusData.segments.length === 0) {
      return;
    }
    
    // Find the maximum end time for scaling
    const maxTime = Math.max(...focusData.segments.map(segment => segment.end));
    
    // Create timeline container
    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    
    // Add each segment to the timeline
    focusData.segments.forEach(segment => {
      const segmentElement = document.createElement('div');
      segmentElement.className = `timeline-segment ${segment.important ? 'important' : 'skippable'}`;
      
      // Calculate width based on duration relative to total
      const width = (segment.end - segment.start) / maxTime * 100;
      segmentElement.style.width = `${width}%`;
      
      // Add tooltip with time info
      const startMin = Math.floor(segment.start / 60);
      const startSec = Math.floor(segment.start % 60);
      const endMin = Math.floor(segment.end / 60);
      const endSec = Math.floor(segment.end % 60);
      
      segmentElement.title = `${startMin}:${startSec.toString().padStart(2, '0')} - ${endMin}:${endSec.toString().padStart(2, '0')}${segment.reason ? '\n' + segment.reason : ''}`;
      
      timeline.appendChild(segmentElement);
    });
    
    videoTimelineContainer.appendChild(timeline);
  }

  // Function to analyze subtitles and identify important segments - improved with better error handling
  async function analyzeSubtitlesForFocus(subtitles, apiKey) {
    if (!apiKey) {
      throw new Error('Valid Gemini API key required');
    }
    
    // Prepare the transcript as input for Gemini
    let transcript = '';
    subtitles.forEach(item => {
      transcript += `[${formatTime(item.start)} - ${formatTime(item.end)}] ${item.text}\n`;
    });
    
    console.log('Analyzing transcript with length:', transcript.length);
    
    // Update progress to show we've prepared the transcript
    updateFocusProgress(10);
    
    // Get video duration from the last subtitle
    const videoDuration = subtitles.length > 0 ? 
      subtitles[subtitles.length - 1].end + 10 : // add 10 seconds buffer
      600; // fallback to 10 minutes if no subtitles
    
    // Construct prompt for Gemini
    const prompt = `Analyze the following YouTube video transcript and identify important vs. skippable segments.

TRANSCRIPT:
${transcript}

TASK:
I need you to analyze this transcript and divide the entire video (from 0 seconds to ${Math.round(videoDuration)} seconds) into segments, classifying each segment as either IMPORTANT or SKIPPABLE.

CONTEXT:
- Sensitivity level: ${focusData.sensitivity} (1=very strict, only truly essential content is important; 5=lenient, most content is important)
- Important segments contain: key points, crucial information, main arguments, demonstrations, conclusions
- Skippable segments contain: repetitive information, filler content, unnecessary examples, tangents

REQUIREMENTS:
1. Each segment must have a start time, end time, importance flag, and reason
2. Start times and end times must be numbers in seconds
3. First segment must start at 0 seconds
4. Last segment must end at ${Math.round(videoDuration)} seconds
5. No gaps allowed between segments
6. No overlapping segments allowed
7. Approximately ${6 - focusData.sensitivity}0% of content should be marked skippable at sensitivity level ${focusData.sensitivity}

REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON array of segment objects in this exact format:
[
  {
    "start": 0,
    "end": 30,
    "important": true,
    "reason": "Brief explanation why this segment is important"
  },
  {
    "start": 30,
    "end": 45,
    "important": false,
    "reason": "Brief explanation why this segment can be skipped"
  }
]

IMPORTANT: Your response must contain ONLY the JSON array, no additional text, explanations, or markdown.`;

    console.log('Sending analysis prompt to Gemini API');
    updateFocusProgress(20);
    
    // Call Gemini API with better error handling - Now using gemini-2.0-flash model
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more deterministic results
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 8192,
          }
        }),
        signal: focusAbortController.signal // Add abort signal
      });

      // Update progress after API call
      updateFocusProgress(60);

      // Check for HTTP errors first
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API returned an error:', errorData);
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // More detailed logging of the API response
      console.log('API response received');
      updateFocusProgress(80);
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error('No candidates in Gemini API response');
        throw new Error('Gemini API returned no valid candidates. Please try again.');
      }
      
      // Extract JSON response from Gemini
      const content = data.candidates[0].content;
      if (!content || !content.parts || content.parts.length === 0) {
        console.error('Invalid content structure in API response');
        throw new Error('Gemini API returned an empty or invalid response');
      }
      
      const responseText = content.parts[0].text;
      console.log('Raw response text length:', responseText.length);
      
      // Extract JSON from the response text
      let jsonStr = responseText.trim();
      
      // Update progress before processing
      updateFocusProgress(90);
      
      // Process response to extract valid JSON
      const result = processGeminiResponse(jsonStr, videoDuration);
      
      // Final progress update
      updateFocusProgress(100);
      
      return result;
      
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  // Helper function to update the focus progress bar
  function updateFocusProgress(percentage) {
    focusProgressFill.style.width = `${percentage}%`;
    focusProgressPercentage.textContent = `${percentage}%`;
  }

  // Helper function to process Gemini response and extract valid segments
  function processGeminiResponse(responseText, videoDuration) {
    console.log('Processing Gemini response');
    let jsonStr = responseText.trim();
    
    // If response contains markdown code block, extract the JSON part
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      console.log('Extracted JSON from code block');
      updateFocusProgress(92);
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      console.log('Extracted content from code block');
      updateFocusProgress(92);
    }
    
    // Remove any potential text before or after the JSON
    // Sometimes Flash model adds explanation text around the JSON
    let possibleJsonStart = jsonStr.indexOf('[');
    let possibleJsonEnd = jsonStr.lastIndexOf(']');
    
    if (possibleJsonStart >= 0 && possibleJsonEnd > possibleJsonStart) {
      jsonStr = jsonStr.substring(possibleJsonStart, possibleJsonEnd + 1);
      console.log('Extracted potential JSON array');
      updateFocusProgress(94);
    }
    
    // Try to parse the JSON
    try {
      console.log('Attempting to parse JSON');
      updateFocusProgress(95);
      const segments = JSON.parse(jsonStr);
      
      // Validate the segments
      if (!Array.isArray(segments)) {
        console.error('Parsed result is not an array');
        throw new Error('API response is not in the expected array format');
      }
      
      console.log('Successfully parsed segments:', segments.length);
      updateFocusProgress(96);
      
      // Additional validation for segments
      const validSegments = segments.filter(segment => 
        segment && 
        typeof segment.start !== 'undefined' && 
        typeof segment.end !== 'undefined' && 
        typeof segment.important !== 'undefined' &&
        segment.start >= 0 &&
        segment.end > segment.start
      );
      
      console.log(`Validated ${validSegments.length} of ${segments.length} segments`);
      updateFocusProgress(97);
      
      if (validSegments.length === 0) {
        throw new Error('No valid segments in API response');
      }
      
      // Convert any string values to proper types
      const processedSegments = validSegments.map(segment => ({
        start: Number(segment.start),
        end: Number(segment.end),
        important: Boolean(segment.important),
        reason: String(segment.reason || '')
      }));
      
      updateFocusProgress(98);
      
      // Post-process segments to ensure quality
      const finalSegments = postProcessSegments(processedSegments, videoDuration);
      
      updateFocusProgress(99);
      
      // Sort segments by start time
      return finalSegments.sort((a, b) => a.start - b.start);
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
      
      // Try to fix common JSON issues
      try {
        updateFocusProgress(95);
        // Replace single quotes with double quotes
        let fixedJson = jsonStr.replace(/'/g, '"');
        
        // Fix property names
        fixedJson = fixedJson.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
        
        // Fix boolean values
        fixedJson = fixedJson.replace(/:\s*true/gi, ':true');
        fixedJson = fixedJson.replace(/:\s*false/gi, ':false');
        
        console.log('Attempting to parse fixed JSON');
        const segments = JSON.parse(fixedJson);
        
        if (Array.isArray(segments) && segments.length > 0) {
          // Process and validate fixed segments
          const validSegments = segments.filter(segment => 
            segment && 
            segment.start !== undefined && 
            segment.end !== undefined && 
            segment.important !== undefined
          );
          
          updateFocusProgress(96);
          
          if (validSegments.length > 0) {
            // Convert any string values to proper types
            const processedSegments = validSegments.map(segment => ({
              start: Number(segment.start),
              end: Number(segment.end),
              important: Boolean(segment.important),
              reason: String(segment.reason || '')
            }));
            
            updateFocusProgress(98);
            return postProcessSegments(processedSegments, videoDuration);
          }
        }
      } catch (fixError) {
        console.error('Failed to fix and parse JSON');
      }
      
      // If all else fails, create default segments based on video duration
      console.log('Creating default segments as fallback');
      updateFocusProgress(98);
      const defaultSegments = createDefaultSegments(videoDuration);
      return defaultSegments;
    }
  }

  // Helper function to create default segments if analysis fails
  function createDefaultSegments(videoDuration) {
    // Create a simple segmentation - divide video into 5-minute chunks
    // and consider first and last 2 minutes important
    const segments = [];
    const chunkSize = 300; // 5 minutes in seconds
    
    for (let start = 0; start < videoDuration; start += chunkSize) {
      const end = Math.min(start + chunkSize, videoDuration);
      const isImportant = (start < 120) || (videoDuration - end < 120) || Math.random() > 0.5;
      
      segments.push({
        start,
        end,
        important: isImportant,
        reason: isImportant ? 'Default important segment' : 'Default skippable segment'
      });
    }
    
    return segments;
  }

  // Helper function to get YouTube video ID from URL
  function getYoutubeVideoId(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v');
  }
}); 