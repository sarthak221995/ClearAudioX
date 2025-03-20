# YouTube Audio & Caption Enhancer

A Chrome extension that enhances the YouTube viewing experience with advanced audio controls and intelligent subtitle extraction and summarization.

## Features

### Audio Enhancement
- **Volume Boost**: Amplify audio volume beyond YouTube's maximum level
- **Noise Reduction**: Reduce background noise in videos with poor audio quality
- **Equalizer**: Adjust bass, mid, and treble frequencies
- **Dynamic Compression**: Improve audio clarity by balancing loud and quiet parts
- **Quick Controls**: Easy-to-use buttons directly on the YouTube player

### Subtitle Extraction and Summarization
- **Extract Subtitles**: Capture YouTube video subtitles with accurate timestamps
- **Smart Summarization**: Generate comprehensive lecture notes using the Gemini Flash AI
- **Download Options**: Save extracted subtitles and summaries for offline reference

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension is now installed and ready to use on YouTube

## How to Use

### Audio Enhancement
1. Navigate to any YouTube video
2. Use the 2X and NR buttons on the YouTube player for quick volume boost and noise reduction
3. Click the extension icon to open the popup for more detailed audio controls
4. Adjust sliders for volume boost, noise reduction, equalization, and compression
5. Settings are automatically applied and saved for future sessions

### Subtitle Extraction and Summarization
1. Navigate to a YouTube video that has subtitles/captions available
2. Click the extension icon to open the popup
3. Switch to the "Subtitle Extractor" tab
4. Enter your Gemini API key (required only once)
5. Click "Extract Subtitles" to fetch the video's subtitles
6. Click "Summarize Content" to generate a concise summary with key points
7. Use the "Download" button to save the results as a text file

## Getting a Gemini API Key

To use the summarization feature, you'll need a Gemini API key:

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and paste it into the extension's API key field
5. Click "Save" to store the key securely

## Technical Details

- The extension uses the Web Audio API for advanced audio processing
- YouTube subtitle extraction works with both automatic and manual captions
- Summarization powered by Google's Gemini 2.0 Flash API (free tier)
- Optimized to use minimal API calls even for longer videos
- All processing happens in real-time within the browser

## Privacy & Security

- Your Gemini API key is stored securely in Chrome's sync storage
- No audio or subtitle data is sent to any servers other than Google's Gemini API
- The extension requires minimal permissions to function

## Support & Feedback

If you encounter any issues or have suggestions for improvement, please open an issue on the GitHub repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Known Limitations
- Works only on YouTube website
- Requires page refresh if video player is already loaded
- May need manual activation on first video play

## Troubleshooting
1. If buttons don't appear:
   - Refresh the page
   - Ensure extension is enabled
   - Check if other extensions conflict

2. If audio doesn't change:
   - Click video to ensure it's focused
   - Refresh the page
   - Check browser console for errors

## Development
### Setup
1. Clone repository
2. Load unpacked extension in Chrome
3. Make changes to source files
4. Refresh extension to test

### File Structure
```
ClearAudioX/
├── manifest.json
├── content.js
├── popup.html
├── README.md
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## Version History
- 1.0.0: Initial release
  - Basic sound boost
  - Noise reduction
  - YouTube player integration

## Future Plans
- Advanced equalizer controls
- Preset audio profiles
- Custom boost levels
- More noise reduction algorithms
- Support for other video platforms

## Support
For issues or feature requests, please use the GitHub issues page or contact [contact information].

---
Made with ♥ for better YouTube audio 