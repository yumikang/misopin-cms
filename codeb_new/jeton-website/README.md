# Jeton Website - Complete Clone

Complete download and extraction of the Jeton financial services website (https://www.jeton.com/), including all animations, interactive components, and modern web technologies.

## 🚀 Quick Start

### Local Server (Required)
```bash
cd jeton-website
python3 -m http.server 8000
# Open browser: http://localhost:8000/index-fixed.html
```

**Important**: Use `index-fixed.html` for proper local functionality!

## 📁 Project Structure

```
jeton-website/
├── index-full.html           # Original HTML (203KB)
├── index-fixed.html          # ✅ Fixed for local use
├── _nuxt/
│   ├── entry.DRZRUrlT.css   # Main styles (77KB)
│   ├── main.css             # Additional CSS (1.1KB)
│   └── DJNGssg4.js          # Main app (514KB)
├── scripts/
│   └── signature.js         # Signature verification
├── images/
│   └── og-image.png         # Social media image
├── favicon.ico              # Site icon (33KB)
├── favicon-16x16.png        # 16px icon
├── favicon-32x32.png        # 32px icon
├── apple-touch-icon.png     # iOS icon
├── payload.json             # Data payload (30KB)
├── ANIMATIONS.md            # Animation documentation
└── README.md                # This file
```

## ✨ Key Features

### Technology Stack
- **Nuxt.js**: Server-side rendering framework
- **Vue.js**: Progressive JavaScript framework
- **CSS Custom Properties**: Extensive variable system
- **Sequel Sans**: Custom typography
- **Modern CSS**: Grid, Flexbox, clamp()

### Animation System
- ✅ **Text Animations**: Character-by-character reveals
- ✅ **Button Effects**: Hover transformations with scaling
- ✅ **Loading Spinners**: SVG stroke animations
- ✅ **Dropdown Transitions**: Smooth fade & slide effects
- ✅ **Card Hover Effects**: Image scaling and focus rings
- ✅ **Accordion Animations**: Icon morphing and content expansion
- ✅ **Currency Converter**: Swap button rotations
- ✅ **Scroll Effects**: Transform-based parallax

### Interactive Components
1. **Navigation**
   - Multi-level dropdowns
   - Language selector
   - Currency selector
   - Country dial code picker

2. **Financial Tools**
   - Currency converter
   - Fee calculator
   - Exchange rate display

3. **Content Elements**
   - Article cards with hover effects
   - Media cards with backdrop blur
   - FAQ accordions
   - Partnership cards

4. **Form Elements**
   - Input fields with focus animations
   - Select dropdowns
   - Button animations
   - Loading states

## 🎨 Design System

### Colors
- **Primary**: `#f73b20` (Jeton Orange)
- **Dark Text**: `#360802`
- **Background**: `#fff`
- **Accent**: `#f73b200d` (13% opacity)

### Typography
- **Sequel Sans**: Primary font family
- Responsive scaling with `clamp()`
- Variable font weights

### Animation Timing
- **Fast**: 150ms (opacity)
- **Standard**: 300ms (transforms)
- **Complex**: 500ms (multi-step)

### Easing Functions
- Standard: `cubic-bezier(.215,.61,.355,1)`
- Entrance: `cubic-bezier(.55,.085,.68,.53)`
- Exit: `cubic-bezier(.165,.84,.44,1)`

## 📱 Responsive Design

### Breakpoints
- **Ultra-wide**: 2000px+ (Special scaling)
- **Desktop**: 1024-1999px
- **Tablet**: 768-1023px
- **Mobile**: <768px

### Mobile Optimizations
- Touch-friendly interactions
- Reduced animation complexity
- Optimized font scaling
- Hover effects disabled on touch

## ⚡ Performance Features

### CSS Optimizations
- Hardware acceleration with `will-change`
- Transform-only animations for 60fps
- Efficient CSS custom properties
- Responsive image loading

### JavaScript Features
- Minified production build (514KB)
- Component-based architecture
- Lazy loading patterns
- Efficient state management

## 🔧 Technical Details

### Framework
- **Nuxt.js 3**: Modern Vue.js framework
- **Vue.js**: Reactive component system
- **SSR**: Server-side rendering support

### CSS Features
- **Custom Properties**: Extensive variable system
- **Modern Layout**: Grid and Flexbox
- **Responsive Units**: clamp(), vw, vh
- **Advanced Selectors**: :has(), :not(), nth-child()

### JavaScript Features
- **ES6+ Modules**: Modern JavaScript
- **Component System**: Modular architecture
- **State Management**: Reactive data flow
- **API Integration**: RESTful service calls

## 🎯 Use Cases

### Viewing Animations
1. **Button Animations**: Hover over any button
2. **Dropdown Menus**: Click language/currency selectors
3. **Card Effects**: Hover over article cards
4. **Accordion**: Expand FAQ sections
5. **Forms**: Focus on input fields

### Testing Components
- Currency converter functionality
- Fee calculator interactions
- Navigation dropdown behaviors
- Scroll-based animations

## 🌐 Browser Support

- **Chrome**: 90+ ✅
- **Safari**: 14+ ✅
- **Firefox**: 88+ ✅
- **Edge**: 90+ ✅
- **Mobile**: iOS Safari, Chrome Mobile ✅

## 📝 File Sizes

- **Total**: ~800KB
- **HTML**: 203KB (full) / ~200KB (fixed)
- **CSS**: 78KB total
- **JavaScript**: 514KB (main app)
- **Images**: ~250KB (icons + sample)

## 🔗 External Dependencies

Some resources may still load externally:
- Google Tag Manager (analytics)
- Sanity CDN (images)
- External font resources

## 💡 Development Tips

1. **Animations**: Check `ANIMATIONS.md` for detailed technical specs
2. **Performance**: Use Chrome DevTools for animation profiling
3. **Mobile**: Test with device emulation
4. **Accessibility**: Respects `prefers-reduced-motion`

## 🚀 Advanced Features

### Payment Integration
- Payment gateway interfaces
- Currency conversion tools
- Financial calculations
- Security features

### Internationalization
- Multi-language support
- Regional currency handling
- Locale-specific formatting

### Security
- Content Security Policy
- Signature verification
- Secure payment processing

---

**Original Site**: https://www.jeton.com/
**Download Date**: 2025-09-15
**Framework**: Nuxt.js + Vue.js
**License**: Educational/Reference use