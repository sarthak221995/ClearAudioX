// Background script for handling messages from content script

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
  }
  
  return true;
}); 