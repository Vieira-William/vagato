# Figma Design System Implementation Guide
## Vagas UX Platform - Complete Design System

### Project Information
- **Figma File**: Vagas
- **File URL**: https://figma.com/design/46upQ0yYDHuJqssvTT4Pxp/Vagas
- **Frontend Path**: /Users/williammarangon/Projects/vagas-ux-platform/frontend
- **Design Tokens Reference**: /src/index.css, tailwind.config.js

---

## PART 1: COLOR VARIABLES & PALETTE

### Light Mode Colors
```
backgrounds:
  - bg-primary: #f8fafc
  - bg-secondary: #ffffff
  - bg-tertiary: #f1f5f9
text:
  - text-primary: #0f172a
  - text-secondary: #64748b
  - text-muted: #94a3b8
structure:
  - border: #e2e8f0
```

### Dark Mode Colors
```
backgrounds:
  - bg-primary: #0f0f12
  - bg-secondary: #1a1a1f
  - bg-tertiary: #252529
text:
  - text-primary: #ffffff
  - text-secondary: #a1a1aa
  - text-muted: #71717a
structure:
  - border: #2e2e33
```

### Accent Colors (Brand Colors)
```
- Primary (Indigo): #6366f1
- Success (Green): #22c55e
- Warning (Amber): #f59e0b
- Danger (Red): #ef4444
- Info (Cyan): #06b6d4
- Purple: #a855f7
```

### Semantic Colors
- **Alert**: Red (#ef4444)
- **Success**: Green (#22c55e)
- **Warning**: Amber (#f59e0b)
- **Info**: Cyan (#06b6d4)

---

## PART 2: TYPOGRAPHY SYSTEM

### Font Family
- Primary: Inter
- System Fallbacks: system-ui, -apple-system, sans-serif

### Type Scale

| Level | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| Display | 32px | Bold (700) | 1.2 | Page titles |
| H1 | 28px | Semibold (600) | 1.2 | Main sections |
| H2 | 24px | Semibold (600) | 1.3 | Subsections |
| H3 | 20px | Semibold (600) | 1.3 | Card titles |
| Body | 16px | Regular (400) | 1.5 | Body text |
| Body Small | 14px | Regular (400) | 1.5 | Secondary text |
| Button | 14px | Semibold (600) | 1.5 | Button labels |
| Caption | 12px | Regular (400) | 1.4 | Labels, metadata |

### Letter Spacing
- Headings: -0.01em
- Body: 0em
- Button: 0em

---

## PART 3: SPACING & LAYOUT

### 8px Grid Base
```
Spacing Scale:
  4px   → 1 unit
  8px   → 1.5 units
  12px  → 1.5 units
  16px  → 2 units
  20px  → 2.5 units
  24px  → 3 units
  32px  → 4 units
  40px  → 5 units
  48px  → 6 units
```

### Card & Container Spacing
- Card padding: 24px (internal)
- Container padding: 16px (external)
- Card gap: 16px
- Grid gaps: 16px

### Responsive Grid
- Desktop: 3 columns (flex: 1, min-width: 300px)
- Tablet: 2 columns
- Mobile: 1 column

### Border Radius
- Large cards: 16px (2xl)
- Buttons/inputs: 8px (lg)
- Small elements: 6px (md)
- Circular: 50% (full)

---

## PART 4: COMPONENT SPECIFICATIONS

### 1. Button Component
**Variants**: primary, secondary, danger, ghost
**States**: default, hover, active, disabled, loading
**Sizes**: sm, md, lg (default: md)
**Properties**:
- Padding: 8px 16px (sm), 10px 20px (md), 12px 24px (lg)
- Border radius: 8px
- Font weight: 600 (semibold)
- Font size: 14px (Button scale)
- Transition: 200ms ease

**Primary Button Style**:
- Background: #6366f1 (accent-primary)
- Text: White (#ffffff)
- Hover: 90% opacity + glow shadow
- Disabled: 50% opacity

**Secondary Button Style**:
- Background: rgba(99, 102, 241, 0.1)
- Text: #6366f1
- Border: 1px solid #6366f1

**Ghost Button Style**:
- Background: transparent
- Text: #0f172a (light) / #ffffff (dark)
- Hover: 10% opacity background

**Danger Button Style**:
- Background: #ef4444 (red)
- Text: White
- Hover: 90% opacity

### 2. Badge Component
**Variants**: default, primary, success, warning, danger, info, purple
**Sizes**: sm (12px), md (14px), lg (16px)
**Properties**:
- Padding: 4px 8px (sm), 6px 12px (md), 8px 12px (lg)
- Border radius: 50% (full)
- Font weight: 500 (medium)
- Background: color with 10% opacity
- Text: Solid color

**Color Mapping**:
- primary: #6366f1 background/text
- success: #22c55e background/text
- warning: #f59e0b background/text
- danger: #ef4444 background/text
- info: #06b6d4 background/text
- purple: #a855f7 background/text

### 3. Card Component
**Properties**:
- Background: bg-secondary
- Border: 1px solid border color
- Border radius: 16px
- Padding: 24px
- Shadow: subtle (0 1px 3px rgba(0,0,0,0.1))
- Transition: 200ms ease all

**Variations**:
- Default card
- Interactive card (hover: slight shadow increase)
- Expandable card
- Stat card (with icon, number, label)

### 4. Input Component
**Properties**:
- Height: 40px
- Padding: 10px 12px
- Border: 1px solid border color
- Border radius: 8px
- Font size: 14px
- Background: bg-secondary
- Transition: 200ms ease

**States**:
- Default: normal styling
- Focus: border color → primary accent, shadow
- Disabled: 50% opacity, cursor not-allowed
- Error: border color → red

**Input Types**: text, email, password, number, textarea

### 5. Select/Dropdown Component
**Properties**:
- Similar to input (40px height, 8px radius)
- Dropdown arrow on right
- Background: bg-secondary
- Border: 1px solid border
- Transition: 200ms ease

**Dropdown Menu**:
- Background: bg-secondary
- Border: 1px solid border
- Border radius: 8px
- Box shadow: 4px/8px blur
- Item padding: 8px 12px
- Hover: background color change

### 6. Toggle/Switch Component
**Properties**:
- Width: 44px
- Height: 24px
- Border radius: 12px
- Transition: 200ms ease

**States**:
- Off: background gray-300, circle on left
- On: background primary accent, circle on right
- Disabled: opacity 50%

### 7. Avatar Component
**Properties**:
- Sizes: 32px, 40px, 48px, 56px
- Border radius: 50% (circle)
- Border: optional, 2px
- Background: accent color (for initials)
- Font: bold, white text

**Variations**:
- Image avatar
- Initials avatar
- Fallback (colored background with initials)

### 8. StatCard Component
**Properties**:
- Card-based layout
- Icon (top-left): 24px × 24px
- Number (large): H3 style (20px semibold)
- Label (small): Body Small style (14px)
- Trend indicator: TrendingUp/Down icon
- Color indicator: accent color variant

**Sections**:
- Header with icon + label
- Large number display
- Trend indicator (up/down)
- Change percentage

### 9. Badge with Icon Component
**Properties**:
- Icon: 16px × 16px (left)
- Text: 14px regular
- Padding: 6px 12px
- Border radius: 16px (pill)
- Spacing between icon & text: 4px

### 10. Checkbox Component
**Properties**:
- Size: 20px × 20px
- Border radius: 4px
- Border: 2px solid border color
- Checked: background primary, checkmark icon

**States**:
- Unchecked: empty box
- Checked: filled with accent color + white checkmark
- Disabled: 50% opacity
- Indeterminate: minus sign

### 11. Radio Button Component
**Properties**:
- Size: 20px × 20px
- Border radius: 50% (circle)
- Border: 2px solid border color
- Selected: accent primary background + white inner circle

**States**:
- Unselected: empty circle
- Selected: filled circle with white inner
- Disabled: 50% opacity

### 12. Modal/Dialog Component
**Properties**:
- Background: bg-secondary
- Border: 1px solid border
- Border radius: 16px
- Shadow: large (0 20px 25px -5px rgba)
- Padding: 24px
- Width: 90% max (mobile), 600px (desktop)
- Overlay: backdrop blur + dark overlay (40% opacity)

**Elements**:
- Header with title (H2)
- Close button (X icon, top-right)
- Content area
- Footer with action buttons

### 13. Progress Bar Component
**Properties**:
- Height: 8px
- Background: light gray (bg-tertiary)
- Fill: accent color
- Border radius: 4px (pill)
- Animation: smooth transition
- Percentage label: optional

### 14. Toast/Alert Notification
**Variants**: success, error, info, warning
**Properties**:
- Height: 56px
- Padding: 12px 16px
- Border radius: 8px
- Border: 1px left accent color (4px width)
- Shadow: subtle
- Position: fixed (top-right, bottom-right)
- Icon: 20px × 20px
- Text: Body Small (14px)
- Auto-dismiss: 5 seconds

### 15. Chip/Pill Component
**Properties**:
- Height: 32px
- Padding: 8px 12px
- Border radius: 16px (pill)
- Background: bg-tertiary
- Border: 1px solid border
- Font: 14px regular
- Close icon: optional (X)

**Variations**:
- Removable chip (with X)
- Static chip
- Selectable chip (active state)

### 16. Breadcrumb Component
**Properties**:
- Font size: 14px
- Text color: secondary
- Separator: "/"
- Active item: primary accent color
- Hover: underline on links

### 17. Pagination Component
**Properties**:
- Button size: 36px × 36px
- Border radius: 6px
- Current page: primary accent background
- Hover: light background
- Disabled: 50% opacity
- Spacing: 4px between buttons

### 18. Alert Banner Component
**Variants**: success, error, warning, info
**Properties**:
- Height: variable (min 44px)
- Padding: 12px 16px
- Border: 1px solid color
- Background: color with 10% opacity
- Border radius: 8px
- Icon: 20px × 20px
- Text: Body Small (14px)
- Optional close button

---

## PART 5: SHADOWS & EFFECTS

### Shadow Depth Levels
```
Subtle: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
Small:  0 1px 3px 0 rgba(0, 0, 0, 0.1)
Medium: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
Large:  0 10px 15px -3px rgba(0, 0, 0, 0.1)
XL:     0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

### Glow Effects
- Primary Glow: 0 0 20px rgba(99, 102, 241, 0.3)
- Success Glow: 0 0 20px rgba(34, 197, 94, 0.3)
- Info Glow: 0 0 20px rgba(6, 182, 212, 0.3)
- Danger Glow: 0 0 20px rgba(239, 68, 68, 0.3)

### Hover Effects
- Scale: 102% (slight zoom)
- Shadow increase: +4px blur radius
- Opacity change: base 100% → hover 90%
- Color darken: base → 10% darker

---

## PART 6: ANIMATIONS & TRANSITIONS

### Timing Functions
- Quick feedback: 200ms ease-out
- Smooth transitions: 300ms ease
- Loading animations: 3s ease-in-out (infinite)

### Common Animations
1. **Pulse** (loading state)
   - Opacity: 100% → 50% → 100%
   - Duration: 3s
   - Iteration: infinite

2. **Expand** (enter animation)
   - Transform: translateY(-10px)
   - Opacity: 0 → 100%
   - Duration: 200ms

3. **Fade** (transitions)
   - Opacity: transition
   - Duration: 200ms-300ms

4. **Slide** (sidebar collapse)
   - Transform: translateX
   - Duration: 300ms
   - Easing: ease

### Interaction States
- Hover: 200ms transition
- Active/Focus: visual feedback + 200ms transition
- Disabled: 50% opacity, cursor not-allowed
- Loading: pulse animation with spinner

---

## PART 7: DARK MODE IMPLEMENTATION

### Strategy
- CSS Custom Properties with dual sets (light/dark)
- Class-based toggle on root element (.dark class)
- Figma component variants for light/dark

### Variables to Create for Dark Mode
```
Light Mode (default):
  --bg-primary: #f8fafc
  --bg-secondary: #ffffff
  --bg-tertiary: #f1f5f9
  --border: #e2e8f0
  --text-primary: #0f172a
  --text-secondary: #64748b
  --text-muted: #94a3b8

Dark Mode (active):
  --bg-primary: #0f0f12
  --bg-secondary: #1a1a1f
  --bg-tertiary: #252529
  --border: #2e2e33
  --text-primary: #ffffff
  --text-secondary: #a1a1aa
  --text-muted: #71717a
```

### Component Approach
- Create components in light mode first
- Create dark variants by changing:
  - Background colors
  - Text colors
  - Border colors
  - Shadow depths (may be more subtle in dark)

---

## PART 8: ICONS SYSTEM

### Icon Library
- **Library**: Lucide React
- **Size**: Flexible (16px, 20px, 24px, 32px common)
- **Color**: Inherits from text color or explicit color prop
- **Stroke width**: 2px (default)

### Common Icons Used in App
- **Navigation**: LayoutDashboard, User, Settings, Target
- **Actions**: Check, X, Edit, Delete, Download, Upload, Copy
- **Indicators**: TrendingUp, TrendingDown, AlertCircle, InfoIcon
- **UI**: Menu, ChevronDown, ChevronUp, Search, Filter
- **Features**: MapPin, Building2, Clock, DollarSign, Code

### Icon Usage Pattern
```jsx
<Icon className={`w-5 h-5 text-accent-primary`} />
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Setup & Foundation
- [ ] Create "[SYSTEM] Design System" page
- [ ] Create color variables (light + dark modes)
- [ ] Create typography text styles
- [ ] Create spacing guide frame
- [ ] Create shadows reference frame
- [ ] Create animations guide frame

### Phase 2: Components Library
- [ ] Create Button component (4 variants)
- [ ] Create Badge component (7 colors)
- [ ] Create Card component
- [ ] Create Input component
- [ ] Create Select/Dropdown
- [ ] Create Toggle/Switch
- [ ] Create Avatar
- [ ] Create StatCard
- [ ] Create Checkbox
- [ ] Create Radio Button
- [ ] Create Modal/Dialog
- [ ] Create Progress Bar
- [ ] Create Toast/Alert
- [ ] Create Chip/Pill
- [ ] Create Breadcrumb
- [ ] Create Pagination

### Phase 3: Screens
- [ ] Dashboard - Main view
- [ ] Dashboard - With alert
- [ ] Dashboard - List view
- [ ] Dashboard - Expanded filters
- [ ] ScrapingProgress - Idle
- [ ] ScrapingProgress - Collecting
- [ ] ScrapingProgress - Auditing
- [ ] ScrapingProgress - Complete
- [ ] Perfil - Form
- [ ] Perfil - Skills
- [ ] Match - Dashboard
- [ ] Match - Chart focused
- [ ] Configurações - LinkedIn
- [ ] Configurações - Search URLs
- [ ] Configurações - Match Weights
- [ ] Configurações - IA Consumption
- [ ] Configurações - Scheduler
- [ ] VagaCard - Expanded
- [ ] Modal - Confirm Delete
- [ ] Notifications (4 types)
- [ ] Loading States

### Phase 4: Polish
- [ ] Review all colors in light/dark modes
- [ ] Verify consistency across screens
- [ ] Test component interactions
- [ ] Create prototype links
- [ ] Document naming conventions
- [ ] Organize layers
- [ ] Final review

---

## NEXT STEPS

1. **Set up Figma File Structure**
   - Delete placeholder "Frame 1"
   - Create 6 main pages: [SYSTEM], [SCREENS] Dashboard, User, Analytics, Settings, Components
   - Organize layers for clear navigation

2. **Create Color Variables**
   - Define Figma variables for all colors
   - Set up light/dark mode variants
   - Test variable switching

3. **Build Component Library**
   - Create main components with variants
   - Use Figma's component system (variants, instances)
   - Document each component's properties

4. **Create Screen Mockups**
   - Use components to build screens
   - Maintain consistency across screens
   - Add interactions/prototyping

5. **Documentation**
   - Add frames describing usage guidelines
   - Create reference frames for colors, typography
   - Add annotations where needed

---

## FIGMA SETUP TIPS

1. **Use Variables**: Create Figma variables for colors to maintain consistency
2. **Component Variants**: Use Figma's variant system for component states (primary/secondary, enabled/disabled, light/dark)
3. **Instances**: Create instances of components in screens rather than duplicating
4. **Grid System**: Enable 8px grid to align elements properly
5. **Naming Conventions**: Use clear, hierarchical naming (e.g., "Button/Primary/Default")
6. **Documentation**: Use guide frames to explain design system
7. **Prototyping**: Link screens for navigation testing

---

## DESIGN SYSTEM SUCCESS CRITERIA

✅ All 15+ components created with variants
✅ All screens represented as mockups
✅ Color system with light/dark modes
✅ Typography system documented
✅ Spacing guidelines clear
✅ Smooth transitions and animations planned
✅ Component naming consistent and organized
✅ Figma variables for maintainability
✅ Ready for Code Connect integration
✅ Documentation complete and integrated

---

## FILES REFERENCED

- Frontend codebase: /Users/williammarangon/Projects/vagas-ux-platform/frontend
- Design tokens: /src/index.css
- Tailwind config: tailwind.config.js
- Components: /src/components
- Pages: /src/pages
- Theme context: /src/contexts/ThemeContext.jsx

---

**Last Updated**: February 26, 2026
**Status**: Ready for Implementation
**Estimated Time**: 7-10 hours (4 phases)
