# StudioBonded Website Clone

Complete download and extraction of the StudioBonded website (https://studiobonded.com/), including all animations, styles, and interactive elements.

## 📁 Project Structure

```
studiobonded-website/
├── index.html              # Main HTML file (465KB, Framer-based)
├── css/
│   ├── extracted-styles.css    # All CSS styles with animations
│   └── inline-styles.css       # Inline style blocks
├── js/
│   ├── extracted-scripts.js    # JavaScript code (10 script blocks)
│   └── inline-scripts.js       # Inline scripts
├── assets/                 # Images and media files
├── fonts/                  # Web fonts directory
├── resources.json          # External resource URLs
├── metadata.json          # Site metadata
├── ANIMATIONS.md          # Complete animation documentation
└── README.md              # This file
```

## 🚀 Features

### Framework & Technology Stack
- **Framer**: Primary framework for animations and interactions
- **Responsive Design**: 4 breakpoints (390px, 810px, 1200px, 1600px)
- **Dark Mode Support**: Automatic theme switching
- **Display-P3 Color**: Enhanced color gamut support

### Animations Included
- ✅ Scroll-based animations
- ✅ Parallax effects
- ✅ Hover state transitions
- ✅ Responsive animations
- ✅ Theme transitions (light/dark)
- ✅ Font loading animations
- ✅ Interactive cursor effects

### Typography
- DM Sans (300, 400, 500, 700 weights)
- Noto Serif Display
- Fragment Mono
- Inter
- Satoshi

## 📊 Statistics

- **HTML**: 60 lines (465KB total)
- **CSS Blocks**: 3 style blocks extracted
- **JavaScript Blocks**: 10 script blocks extracted
- **External Links**: 19 resources
- **External Scripts**: 2 main scripts

## 🔗 External Resources

### Scripts
1. Framer Events Script: `https://events.framer.com/script?v=2`
2. Main Framer Script: `https://framerusercontent.com/sites/2vlsOyNXx2r3ujZ1f1ch7L/script_main.FAVA6HQX.mjs`

### Additional Framer Chunks
The site loads multiple JavaScript chunks for optimized performance:
- SBQJJ2FO.mjs
- TVZ7CGGF.mjs
- A3IIQ6X3.mjs
- HZL4YIMB.mjs
- And 9 more chunks...

## 💻 Usage

### Local Development
1. Clone or download this directory
2. Open `index.html` in a modern browser
3. For full functionality, serve via local web server:
   ```bash
   python3 -m http.server 8000
   # or
   npx serve .
   ```

### Browser Requirements
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

## 🎨 Customization

### Theme Colors
Edit CSS custom properties in `extracted-styles.css`:
```css
--token-c5c4fdcb-9482-48bb-aedf-353188472aae: /* Background */
--token-4321a524-8651-4268-85f9-e884d8cb6223: /* Text color */
--token-255056e5-8d24-4f0a-8647-877278861b1b: /* Accent color */
```

### Animation Timing
Modify transition durations and easing functions in the CSS files.

## ⚠️ Important Notes

1. **Framer Dependency**: This site was built with Framer and requires Framer runtime for full functionality
2. **External Resources**: Some assets and scripts are loaded from Framer's CDN
3. **Responsive Design**: Best viewed on desktop, but fully responsive
4. **Performance**: Animations are GPU-accelerated for smooth performance

## 📝 License

This is a downloaded copy of the StudioBonded website for educational and reference purposes. All original content, designs, and code belong to StudioBonded.

## 🔍 Additional Documentation

See `ANIMATIONS.md` for detailed animation documentation including:
- Animation patterns and techniques
- Performance optimizations
- Accessibility features
- Implementation details

---

Downloaded and documented on: 2025-09-15