# ClearAudioX - YouTube Audio Enhancement Extension

## Overview
ClearAudioX is a Chrome extension that enhances your YouTube viewing experience by providing advanced audio controls directly in the YouTube player interface. It offers features like volume boosting and noise reduction, making it perfect for quiet videos, lectures, or content with audio quality issues.

## Features
- **2X Sound Boost**: Amplify video volume beyond YouTube's maximum limit
- **Noise Reduction (NR)**: Reduce background noise and enhance voice clarity
- **Seamless Integration**: Controls appear directly in the YouTube player
- **Easy Toggle**: Simple one-click activation/deactivation of features
- **Native Look**: Matches YouTube's design for a consistent experience

## Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage
1. Navigate to any YouTube video
2. Look for two new buttons next to the volume control:
   - `2X`: Toggle sound boost
   - `NR`: Toggle noise reduction
3. Click to activate/deactivate:
   - Grey = Feature inactive
   - White = Feature active

## Technical Details
- Uses Web Audio API for audio processing
- Implements advanced noise reduction chain:
  - High-pass filter (removes low-frequency noise)
  - Low-pass filter (reduces high-frequency hiss)
  - Dynamic range compression
  - Voice frequency enhancement

## Files
- `manifest.json`: Extension configuration
- `content.js`: Main functionality
- `popup.html`: Extension popup (minimal)
- `icons/`: Extension icons

## Requirements
- Google Chrome Browser
- YouTube access

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

## Privacy
This extension:
- Does not collect any user data
- Does not modify video content
- Only processes audio locally
- Requires no external services

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

## License
MIT License - Feel free to use and modify as needed.

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

## Credits
Developed by [Your Name/Organization]
Icon design by [Designer Name/Source]

## Support
For issues or feature requests, please use the GitHub issues page or contact [contact information].

---
Made with ♥ for better YouTube audio 