# StudioBonded Website - Animation Documentation

## Overview
The StudioBonded website uses Framer as its primary framework for animations and interactions. The site implements sophisticated animations including scroll-based effects, responsive transitions, and interactive hover states.

## Framework & Technologies

### Primary Framework
- **Framer**: Web design and animation framework
- **CSS Custom Properties**: Dynamic theming and animations
- **Will-change optimization**: Performance optimization for animations

### Animation Libraries & Features
1. **Framer Motion** (embedded)
2. **CSS Transitions & Transforms**
3. **Scroll-based animations**
4. **Responsive breakpoint animations**

## Key Animation Patterns

### 1. Scroll-Based Animations
- Sticky positioning elements
- Parallax scrolling effects
- Progressive reveal animations
- Scroll-triggered state changes

### 2. Responsive Transitions
The site uses different animation behaviors at various breakpoints:
- **Desktop (1600px+)**: Full animation suite
- **Tablet Large (1200-1599px)**: Optimized animations
- **Tablet Medium (810-1199px)**: Reduced complexity
- **Mobile (≤809px)**: Performance-focused animations

### 3. Interactive Elements
- Hover state transitions
- Cursor following effects
- Click/tap feedback animations
- Form interaction animations

## CSS Animation Properties Used

### Transform Properties
```css
transform: translateX(), translateY(), scale(), rotate()
will-change: transform, opacity
```

### Transition Properties
```css
transition: all 0.3s ease
transition-timing-function: cubic-bezier()
```

### Performance Optimizations
- Hardware acceleration via `transform3d()`
- `will-change` property for anticipated animations
- GPU-accelerated properties only

## Color Themes & Transitions

### Light/Dark Mode Transitions
The site supports smooth transitions between color themes:

#### Light Mode Colors
- Background: `rgb(255, 250, 230)`
- Primary: `rgb(0, 0, 0)`
- Accent: `rgb(255, 28.05, 0)`

#### Dark Mode Colors
- Background: `rgb(255, 250, 230)`
- Primary: `rgb(255, 28.05, 0)`
- Secondary: `rgb(250, 246, 227)`

### Display-P3 Color Support
Enhanced color gamut for supported displays:
```css
@supports (color: color(display-p3 1 1 1)) {
  /* P3 color values for richer colors */
}
```

## Typography Animations

### Font Loading Strategy
- **Font-display: swap**: Ensures text remains visible during font load
- Progressive enhancement with fallback fonts
- Smooth font-weight transitions

### Fonts Used
1. **DM Sans**: Primary UI font (300, 400, 500, 700 weights)
2. **Noto Serif Display**: Display font
3. **Fragment Mono**: Monospace font
4. **Inter**: Secondary font
5. **Satoshi**: Custom font

## Responsive Animation Breakpoints

### Desktop (1600px+)
- Full parallax effects
- Complex hover interactions
- Multi-layer animations

### Tablet (810-1599px)
- Simplified parallax
- Touch-optimized interactions
- Reduced animation complexity

### Mobile (≤809px)
- Performance-first approach
- Essential animations only
- Touch gestures prioritized

## Implementation Notes

### Performance Considerations
1. **GPU Acceleration**: All animations use transform and opacity for best performance
2. **Batch DOM Updates**: Animations are batched to reduce reflows
3. **RequestAnimationFrame**: Smooth 60fps animations
4. **Lazy Loading**: Off-screen animations are deferred

### Accessibility
- **Prefers-reduced-motion**: Respects user preferences
- **Focus states**: Clear visual feedback
- **ARIA attributes**: Proper labeling for screen readers

## File Structure

```
studiobonded-website/
├── index.html              # Main HTML with Framer setup
├── css/
│   ├── extracted-styles.css    # All CSS including animations
│   └── inline-styles.css       # Inline style blocks
├── js/
│   ├── extracted-scripts.js    # JavaScript animation logic
│   └── inline-scripts.js       # Inline script blocks
├── assets/                 # Images and media
├── fonts/                  # Web fonts
├── resources.json          # External resource URLs
└── metadata.json          # Site metadata
```

## Usage Instructions

### Running Locally
1. Open `index.html` in a modern browser
2. Ensure all assets are in correct directories
3. May require local server for some features

### Customization
- Modify CSS custom properties for theme changes
- Adjust animation timing in CSS
- Update Framer configuration in JavaScript

## Browser Compatibility
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

## Notes
- The site uses Framer's proprietary animation system
- Some animations may require Framer runtime
- Performance optimized for modern browsers
- Implements progressive enhancement strategy