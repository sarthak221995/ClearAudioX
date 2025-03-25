// Background script for handling messages from content script

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request.type);
  
  if (request.type === 'openPopupWithNotesTab') {
    // Open the popup and set a flag to switch to notes tab
    chrome.storage.local.set({ 'openNotesTab': true }, () => {
      chrome.action.openPopup();
    });
  } else if (request.type === 'generateNotes') {
    // Open popup and set a flag to start notes generation
    chrome.storage.local.set({ 
      'openNotesTab': true,
      'startNotesGeneration': true 
    }, () => {
      chrome.action.openPopup();
    });
  } else if (request.type === 'openFocusTab') {
    // Open the popup with focus tab active
    chrome.storage.local.set({ 'openFocusTab': true }, () => {
      chrome.action.openPopup();
    });
  } else if (request.type === 'focusModeToggled') {
    // Forward the focus mode status to all tabs with YouTube videos
    chrome.tabs.query({ url: '*://*.youtube.com/watch*' }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'updateFocusMode',
            focusData: request.focusData
          });
        }
      });
    });
  }
  
  return true;
});

// When extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated');
  
  // Initialize default settings if not already set
  chrome.storage.sync.get(['focusEnabled', 'focusSensitivity'], (result) => {
    if (result.focusEnabled === undefined) {
      chrome.storage.sync.set({ focusEnabled: false });
    }
    
    if (result.focusSensitivity === undefined) {
      chrome.storage.sync.set({ focusSensitivity: 3 });
    }
  });
}); 