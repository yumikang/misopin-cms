# Jeton Website - Animation & Interactive Documentation

## Overview
The Jeton website is a sophisticated financial services platform featuring advanced CSS animations, interactive components, and smooth transitions. Built with Nuxt.js/Vue.js and modern web technologies.

## Technology Stack

### Core Framework
- **Nuxt.js**: Server-side rendering framework
- **Vue.js**: Progressive JavaScript framework
- **CSS Custom Properties**: Extensive use of CSS variables
- **Sequel Sans**: Custom typography system

### Animation Technologies
- **CSS Transitions & Transforms**: Hardware-accelerated animations
- **CSS Keyframes**: Complex loading and state animations
- **Will-change**: Performance optimization for animations
- **Cubic-bezier**: Custom easing functions

## Key Animation Features

### 1. Text Animations
#### Split Text Animation System
```css
[data-split-text] {
  display: inline-block;
  text-indent: 0;
  white-space: pre-wrap;
}

[data-split-text] .c {
  will-change: transform;
}

._button .label .c {
  transform: translateY(-110%);
  transition: transform .25s cubic-bezier(.55,.085,.68,.53) calc(7ms*var(--i));
}
```

- Character-by-character animations
- Staggered timing with CSS custom properties
- Smooth enter/exit transitions

### 2. Button Animations
#### Interactive Button System
```css
._button [data-button-background] {
  transition: transform .3s cubic-bezier(.215,.61,.355,1);
}

._button:hover [data-button-background] {
  transform: scale(.98);
}

._button:active [data-button-background] {
  transform: scale(.95);
}
```

Features:
- Scale transforms on hover/active states
- Character rotation and translation
- Background scaling effects
- Staggered text reveal animations

### 3. Loading Animations
#### Icon Loading Animation
```css
@keyframes loading-icon {
  0% {
    stroke-dasharray: 74.912361145 14.982472229px;
    stroke-dashoffset: 74.912361145;
    transform: rotate(0) scaleY(-1);
  }
  50% {
    stroke-dasharray: 74.912361145 22.4737083435px;
  }
  to {
    stroke-dasharray: 74.912361145 14.982472229px;
    transform: rotate(1turn) scaleY(-1);
  }
}
```

- SVG stroke animations
- Rotating spinner effects
- Dash offset animations

### 4. Accordion Animations
#### FAQ Accordion System
```css
._faq-accordion button ._icon path {
  transition: transform .3s cubic-bezier(.895,.03,.685,.22);
}

._faq-accordion button[aria-expanded=true] ._icon path:first-child {
  transform: rotate(90deg);
}

._faq-accordion button[aria-expanded=true] ._icon path:nth-child(2),
._faq-accordion button[aria-expanded=true] ._icon path:nth-child(3) {
  transform: scaleX(0);
}
```

Features:
- Icon morphing animations
- Smooth content expansion
- Multi-path SVG transformations

### 5. Dropdown Animations
#### Dropdown System
```css
._dropdown[aria-expanded=true] > .overlay-container {
  opacity: 1;
  transform: translateY(0);
  transition: opacity .15s, transform .4s;
}

._dropdown .overlay-container {
  opacity: 0;
  transform: translateY(-8px);
}
```

- Fade and slide transitions
- Backdrop blur effects
- Box shadow animations

### 6. Card Hover Effects
#### Article Card Animations
```css
._article-card img {
  transition: transform .3s cubic-bezier(.215,.61,.355,1);
  transition-property: transform, opacity;
}

._article-card:hover img {
  opacity: .93;
  transform: scale(1.02);
}

._article-card:hover figure {
  box-shadow: 0 0 0 1px #f73b20, 0 0 0 3px #f73b2080;
}
```

- Image scaling on hover
- Opacity changes
- Focus ring animations

### 7. Currency Converter Animations
#### Swap Button Animation
```css
._currency-converter .swap-btn {
  transform: rotate(180deg);
  transition: transform .3s cubic-bezier(.645,.045,.355,1);
}

._currency-converter .swap-btn[data-swapped=true] {
  transform: rotate(180deg);
}
```

- Rotation animations
- State-based transforms

### 8. Scroll Stack Effects
#### Transform-based Scrolling
```css
._scroll-stack[data-method=transform] .views-slot > ._scroll-stack-view {
  will-change: transform;
  z-index: calc(var(--length) - var(--index, 0));
}
```

- Parallax scrolling effects
- Layered z-index animations
- Transform-based positioning

## Design System

### Color Palette
- **Primary Orange**: `#f73b20`
- **Dark Text**: `#360802`
- **Background**: `#fff`
- **Accent**: `#f73b200d` (13% opacity)

### Animation Timing
- **Fast**: `0.15s` (opacity changes)
- **Standard**: `0.3s` (transforms)
- **Slow**: `0.5s` (complex animations)

### Easing Functions
- **Standard**: `cubic-bezier(.215,.61,.355,1)`
- **Entrance**: `cubic-bezier(.55,.085,.68,.53)`
- **Exit**: `cubic-bezier(.165,.84,.44,1)`
- **Elastic**: `cubic-bezier(.645,.045,.355,1)`

## Responsive Design

### Breakpoints
- **Desktop**: `2000px+` (Ultra-wide support)
- **Standard**: `1024px-1999px`
- **Tablet**: `768px-1023px`
- **Mobile**: `<768px`

### Responsive Animations
- Font sizes scale with viewport width
- Animation speeds adjusted for mobile
- Hover effects disabled on touch devices

## Interactive Components

### Component Categories
1. **Navigation**: Dropdowns, menus, language selectors
2. **Forms**: Input fields, currency selectors, calculators
3. **Content**: Article cards, media cards, accordions
4. **Feedback**: Loading states, hover effects, focus rings

### State Management
- CSS-only state changes using `:hover`, `:focus`, `:active`
- ARIA attributes for accessibility
- Data attributes for component states

## Performance Optimizations

### Hardware Acceleration
- `will-change: transform` for animated elements
- `transform` and `opacity` only for smooth 60fps
- `backface-visibility: hidden` for 3D transforms

### Lazy Loading
- Progressive enhancement approach
- Critical CSS inlined
- Non-critical animations loaded later

### Reduced Motion Support
- Respects `prefers-reduced-motion` user preference
- Fallback to instant state changes

## Browser Compatibility
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

## File Structure

```
jeton-website/
├── index-full.html           # Original HTML
├── index-fixed.html          # Fixed paths for local use
├── _nuxt/
│   ├── entry.DRZRUrlT.css   # Main CSS with animations (77KB)
│   ├── main.css             # Additional styles
│   └── DJNGssg4.js          # Main JavaScript (514KB)
├── scripts/
│   └── signature.js         # Additional scripts
├── favicon.ico              # Site icons
├── payload.json             # Data payload
└── ANIMATIONS.md            # This documentation
```

## Usage Instructions

### Running Locally
```bash
cd jeton-website
python3 -m http.server 8000
# Open http://localhost:8000/index-fixed.html
```

### Testing Animations
1. Hover over buttons to see text animations
2. Open dropdowns to see smooth transitions
3. Check currency converter for swap animations
4. Test accordion expansion/collapse

## Notes
- Built for modern payment services
- Extensive use of CSS custom properties
- Performance-optimized animations
- Accessibility-first design approach
- Mobile-responsive with touch considerations