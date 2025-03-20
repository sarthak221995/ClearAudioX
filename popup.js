document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Check if we should open the notes tab and/or start generation
  chrome.storage.local.get(['openNotesTab', 'startNotesGeneration'], (result) => {
    if (result.openNotesTab) {
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
    return data.candidates[0].content.parts[0].text;
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
}); 