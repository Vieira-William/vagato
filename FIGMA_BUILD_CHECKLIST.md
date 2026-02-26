# Figma Design System - Step-by-Step Build Checklist
## Vagas UX Platform

**File**: Vagas (https://figma.com/design/46upQ0yYDHuJqssvTT4Pxp/Vagas)
**Estimated Time**: 7-10 hours total
**Progress**: Starting Phase 1

---

## PHASE 1: DESIGN SYSTEM FOUNDATION (2-3 hours)

### 1.1 Setup & Page Structure
- [ ] **Delete** existing "Frame 1" from the file
- [ ] **Create** new page: `[SYSTEM] Design System`
- [ ] **Create** new page: `[SCREENS] Dashboard`
- [ ] **Create** new page: `[SCREENS] User`
- [ ] **Create** new page: `[SCREENS] Analytics`
- [ ] **Create** new page: `[SCREENS] Settings`
- [ ] **Create** new page: `[SCREENS] Components`

**Status**: Ready to create pages

---

### 1.2 Color Palette Frame (in [SYSTEM] Design System page)

#### Frame: "01-Colors"
**Size**: 1200 × 1600

**Section 1: Light Mode Colors (Row 1)**
```
Layout: 8 color swatches in a row, labeled

bg-primary     #f8fafc  - Light off-white background
bg-secondary   #ffffff  - Pure white secondary background
bg-tertiary    #f1f5f9  - Light gray tertiary background
border         #e2e8f0  - Light gray borders
text-primary   #0f172a  - Dark blue text primary
text-secondary #64748b  - Medium gray text secondary
text-muted     #94a3b8  - Light gray text muted
(empty/divider)

Each swatch:
- Size: 120 × 120px
- Color square with label below
- Font: Inter 12px regular
```

**Section 2: Dark Mode Colors (Row 2)**
```
Layout: Same as light mode, directly below

bg-primary     #0f0f12  - Dark bg primary
bg-secondary   #1a1a1f  - Dark bg secondary
bg-tertiary    #252529  - Dark bg tertiary
border         #2e2e33  - Dark border
text-primary   #ffffff  - White text primary
text-secondary #a1a1aa  - Medium gray text secondary
text-muted     #71717a  - Light gray text muted
(empty/divider)
```

**Section 3: Accent Colors (Row 3)**
```
Layout: 6 accent colors in a row

Primary (Indigo)   #6366f1  - Main accent color
Success (Green)    #22c55e  - Positive/success states
Warning (Amber)    #f59e0b  - Warning/attention states
Danger (Red)       #ef4444  - Error/destructive states
Info (Cyan)        #06b6d4  - Informational states
Purple             #a855f7  - Secondary accent

Each swatch: 140 × 140px with color name and hex code below
```

**Add Text Labels**:
- Title at top: "01-Colors" (32px bold, text-primary)
- Section labels: "Light Mode", "Dark Mode", "Accent Colors" (16px semibold)
- Color labels: 12px regular, text-muted

**Add to Variables** (Figma Variables):
- Create color variable for each: `colors/light/bg-primary`, etc.
- Create dark mode variant for each
- Assign hex values to each variable

✅ **Checklist for 01-Colors**:
- [ ] Frame created (1200×1600)
- [ ] All light mode swatches added
- [ ] All dark mode swatches added
- [ ] All accent color swatches added
- [ ] Labels added to each color
- [ ] Variables created in Figma
- [ ] Title and section headers added

---

### 1.3 Typography Frame

#### Frame: "02-Typography"
**Size**: 1200 × 1200

**Layout**: 8 typography samples, vertically stacked

```
Sample 1: Display (32px, Bold)
  Text: "The quick brown fox jumps over the lazy dog"
  Font: Inter 32px / Bold / -0.01em letter spacing
  Line height: 1.2
  Space below: 32px

Sample 2: H1 (28px, Semibold)
  Text: "The quick brown fox jumps over the lazy dog"
  Font: Inter 28px / Semibold / -0.01em letter spacing
  Line height: 1.2
  Space below: 24px

Sample 3: H2 (24px, Semibold)
  Text: "The quick brown fox jumps over the lazy dog"
  Font: Inter 24px / Semibold / -0.01em letter spacing
  Line height: 1.3
  Space below: 24px

Sample 4: H3 (20px, Semibold)
  Text: "The quick brown fox jumps over the lazy dog"
  Font: Inter 20px / Semibold / -0.01em letter spacing
  Line height: 1.3
  Space below: 20px

Sample 5: Body (16px, Regular)
  Text: "The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit."
  Font: Inter 16px / Regular
  Line height: 1.5
  Space below: 16px

Sample 6: Body Small (14px, Regular)
  Text: "The quick brown fox jumps over the lazy dog"
  Font: Inter 14px / Regular
  Line height: 1.5
  Space below: 16px

Sample 7: Button (14px, Semibold)
  Text: "Click Me"
  Font: Inter 14px / Semibold
  Line height: 1.5
  Space below: 16px

Sample 8: Caption (12px, Regular)
  Text: "This is a caption text for labels and metadata"
  Font: Inter 12px / Regular
  Line height: 1.4
  Space below: 0
```

**Add Reference Table** (Right side):
```
Name          | Size | Weight    | Use Case
Display       | 32px | Bold      | Page titles
H1            | 28px | Semibold  | Main sections
H2            | 24px | Semibold  | Subsections
H3            | 20px | Semibold  | Card titles
Body          | 16px | Regular   | Body text
Body Small    | 14px | Regular   | Secondary text
Button        | 14px | Semibold  | Button labels
Caption       | 12px | Regular   | Labels/metadata
```

✅ **Checklist for 02-Typography**:
- [ ] Frame created (1200×1200)
- [ ] All 8 typography scales added
- [ ] Reference table added
- [ ] Text styles created/applied
- [ ] Correct font families and weights
- [ ] Correct sizes and line heights
- [ ] Correct letter spacing

---

### 1.4 Component Documentation Frames

#### Frame: "03-Components-Buttons"
**Size**: 1200 × 800

**Layout**: 4 button variants (Primary, Secondary, Danger, Ghost)

**Button Row**: Display each variant with all states
```
Column 1: Primary Button
  [Default]   [Hover]   [Active]   [Disabled]   [Loading]

Column 2: Secondary Button
  [Default]   [Hover]   [Active]   [Disabled]   [Loading]

Column 3: Danger Button
  [Default]   [Hover]   [Active]   [Disabled]   [Loading]

Column 4: Ghost Button
  [Default]   [Hover]   [Active]   [Disabled]   [Loading]
```

**Button Specifications**:
- Medium size: 40px height, 16px horizontal padding
- Text: 14px semibold, white/primary color
- Border radius: 8px
- Transition: 200ms ease
- States: Default, Hover (+opacity/shadow), Active, Disabled (50%), Loading (spinner)

✅ **Checklist for 03-Components-Buttons**:
- [ ] Frame created (1200×800)
- [ ] Primary button variants (5 states)
- [ ] Secondary button variants (5 states)
- [ ] Danger button variants (5 states)
- [ ] Ghost button variants (5 states)
- [ ] Labels under each
- [ ] Correct spacing between variants

---

#### Frame: "04-Components-Cards"
**Size**: 1200 × 600

**Layout**: 4 card variations

```
Card 1: Default Card
  Title: "Basic Card"
  Content: Lorem ipsum dolor sit amet
  Size: 280×180px
  Padding: 24px
  Border radius: 16px
  Border: 1px solid border-color
  Shadow: subtle

Card 2: Interactive Card (Hover state)
  Title: "Interactive Card"
  Content: Hover state with increased shadow
  Size: 280×180px
  Shadow: increased (4px more blur)

Card 3: Stat Card
  Icon: TrendingUp icon (24px)
  Number: "1,234"
  Label: "Total Matches"
  Change: "+12.5%"
  Color: accent-primary
  Size: 280×180px

Card 4: Expandable Card
  Header with expand icon
  Can collapse/expand
  Size: 280×180px (collapsed) / 280×240px (expanded)
```

✅ **Checklist for 04-Components-Cards**:
- [ ] Frame created (1200×600)
- [ ] Default card (bg-secondary, border, shadow)
- [ ] Interactive card (hover state)
- [ ] Stat card (with icon, number, label)
- [ ] Expandable card (with expand icon)
- [ ] Correct spacing and padding
- [ ] Labels for each card type

---

#### Frame: "05-Components-Forms"
**Size**: 1200 × 600

**Form Components Layout**:

```
Row 1: Input Components
  Text Input (40px height, 8px radius)
  Email Input (with validation state)
  Number Input (with stepper)
  Textarea (multiple rows)

Row 2: Select & Control Components
  Select/Dropdown (closed state)
  Select/Dropdown (open state)
  Toggle Off
  Toggle On

Row 3: Check & Radio
  Checkbox Unchecked
  Checkbox Checked
  Checkbox Indeterminate
  Radio Unselected
  Radio Selected
```

**Each component with states**:
- Default
- Focus (with border highlight)
- Disabled (50% opacity)
- Error (for inputs)

✅ **Checklist for 05-Components-Forms**:
- [ ] Frame created (1200×600)
- [ ] Input fields (text, email, number, textarea)
- [ ] Select/Dropdown components
- [ ] Toggle switches (on/off states)
- [ ] Checkboxes (all states)
- [ ] Radio buttons (all states)
- [ ] Focus/disabled/error states visible

---

#### Frame: "06-Components-Badges"
**Size**: 1200 × 400

**Layout**: 6 badge color variants + 3 sizes

```
Variant 1: Default Badge
  [Small] [Medium] [Large]

Variant 2: Primary Badge
  [Small] [Medium] [Large]

Variant 3: Success Badge
  [Small] [Medium] [Large]

Variant 4: Warning Badge
  [Small] [Medium] [Large]

Variant 5: Danger Badge
  [Small] [Medium] [Large]

Variant 6: Info Badge
  [Small] [Medium] [Large]
```

**Badge Specifications**:
- Small: 12px font, 4px vertical, 8px horizontal padding
- Medium: 14px font, 6px vertical, 12px horizontal padding
- Large: 16px font, 8px vertical, 12px horizontal padding
- Border radius: 50% (fully rounded)
- Background: color with 10% opacity
- Text: solid color

✅ **Checklist for 06-Components-Badges**:
- [ ] Frame created (1200×400)
- [ ] 6 color variants shown
- [ ] 3 size options for each
- [ ] Labels showing color names
- [ ] Correct padding and border radius
- [ ] Proper contrast and readability

---

#### Frame: "07-Icons"
**Size**: 1200 × 800

**Icon Grid**:
```
Display 20-24 common Lucide icons in a grid layout
Icon sizes: 24px (default reference), 16px, 20px, 32px examples

Icons to include:
Row 1: LayoutDashboard, User, Settings, Target, TrendingUp, TrendingDown
Row 2: AlertCircle, Check, X, Edit, Delete, Download
Row 3: MapPin, Building2, Clock, DollarSign, Code, Search
Row 4: Filter, Menu, ChevronDown, ChevronUp, Upload, Copy

Each icon with label below showing Lucide React name
```

**Reference section**:
- Icon sizes: 16px, 20px, 24px, 32px examples
- Stroke width: 2px (default)
- Color examples: primary, secondary, success, danger

✅ **Checklist for 07-Icons**:
- [ ] Frame created (1200×800)
- [ ] 20+ common icons displayed
- [ ] Icons labeled with Lucide names
- [ ] Size reference examples (16/20/24/32px)
- [ ] Color variations shown
- [ ] Clear grid layout

---

#### Frame: "08-Spacing"
**Size**: 1200 × 600

**Spacing Grid System**:

```
Display 8px grid base system
Show spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48px

Visual representation:
- Horizontal bars showing each spacing value
- Labeled with pixel value
- Show grid reference (8px blocks)
- Show card padding example: 24px
- Show container padding example: 16px
- Show gap example: 16px
- Show common combinations

Card example:
  Padding: 24px
  Gap between elements: 16px
  Border radius: 16px (2 × 8px grid)
```

✅ **Checklist for 08-Spacing**:
- [ ] Frame created (1200×600)
- [ ] All spacing values shown (4-48px)
- [ ] Visual bars with measurements
- [ ] Practical examples (card, container, gap)
- [ ] Grid reference overlay
- [ ] Clear labels

---

#### Frame: "09-Shadows"
**Size**: 1200 × 600

**Shadow Depth Levels**:

```
Shadow 1: Subtle
  0 1px 2px 0 rgba(0,0,0,0.05)
  Example card

Shadow 2: Small
  0 1px 3px 0 rgba(0,0,0,0.1)
  Example card with slightly more depth

Shadow 3: Medium
  0 4px 6px -1px rgba(0,0,0,0.1)
  Example card with medium depth

Shadow 4: Large
  0 10px 15px -3px rgba(0,0,0,0.1)
  Example card with large depth

Shadow 5: XL
  0 20px 25px -5px rgba(0,0,0,0.1)
  Example card with XL depth

Shadow 6: Glow Effects
  Primary Glow: 0 0 20px rgba(99,102,241,0.3)
  Success Glow: 0 0 20px rgba(34,197,94,0.3)
  Info Glow: 0 0 20px rgba(6,182,212,0.3)
  Example cards with glow
```

Each example shows:
- Visual card with shadow applied
- Shadow CSS value
- Text label
- Use case description

✅ **Checklist for 09-Shadows**:
- [ ] Frame created (1200×600)
- [ ] All 5 depth levels shown
- [ ] Glow effects demonstrated (3 variants)
- [ ] Visual cards showing each shadow
- [ ] CSS values labeled
- [ ] Use cases described

---

#### Frame: "10-Animations"
**Size**: 1200 × 600

**Component States & Animations**:

```
Interactive States:

1. Button States
   Default → Hover (scale 102%, shadow +4px, opacity -)
   → Active (scale 98%, darker color)
   → Disabled (50% opacity, not-allowed cursor)

2. Card Hover
   Default (subtle shadow)
   → Hover (scale 101%, shadow increased)

3. Loading State
   Spinner animation (3s infinite)
   Icon rotation (360° cycle)

4. Transitions
   Color transitions (200ms ease)
   Transform transitions (200ms ease-out)
   Height transitions (300ms ease)

5. Input Focus
   Border color change
   Shadow glow (200ms transition)
   Cursor styling

6. Pulse Loading
   Opacity pulse (100% → 50% → 100%)
   Duration: 3s infinite
   Used for skeleton states
```

Display with:
- Before/After visual examples
- Timing information (200ms, 300ms, etc.)
- Easing functions (ease-out, ease, etc.)
- Use case labels

✅ **Checklist for 10-Animations**:
- [ ] Frame created (1200×600)
- [ ] Button state transitions shown
- [ ] Card hover effect demonstrated
- [ ] Loading spinner example
- [ ] Input focus state shown
- [ ] Pulse animation documented
- [ ] Timing and easing labeled

---

## ✅ PHASE 1 COMPLETION CRITERIA

**[SYSTEM] Design System page complete with:**
- [ ] 01-Colors (8 light + 8 dark + 6 accents)
- [ ] 02-Typography (8 scales documented)
- [ ] 03-Components-Buttons (4 variants, 5 states each)
- [ ] 04-Components-Cards (4 card types)
- [ ] 05-Components-Forms (inputs, selects, toggles, checkboxes, radios)
- [ ] 06-Components-Badges (6 colors, 3 sizes)
- [ ] 07-Icons (20+ icons with sizes)
- [ ] 08-Spacing (complete spacing scale)
- [ ] 09-Shadows (5 depths + 3 glows)
- [ ] 10-Animations (states and transitions)

**Design System Variables created:**
- [ ] All color variables defined (light + dark)
- [ ] All typography styles defined
- [ ] Shadow presets documented
- [ ] Spacing scale documented

**Estimated completion time**: 2-3 hours

---

## NEXT: PHASE 2 - COMPONENT LIBRARY CREATION

After Phase 1 completion, proceed to Phase 2:
- Create main Button component (in [SCREENS] Components page)
- Create main Badge component
- Create Card component
- Create Input component
- Create all other UI component base components
- These will be used as instances in Phase 3 screens

**Duration**: 1-2 hours

---

## NOTES

- Use Figma's 8px grid (View > Show Grid)
- Keep component naming consistent: `ComponentName/Variant/State`
- Use colors via variables (not hardcoded hex)
- Document everything with labels
- Save frequently
- After Phase 1, move to Phase 2 (Components) and Phase 3 (Screens)

---

**Status**: 🟡 Phase 1 - Design System Documentation Ready
**Next Action**: Begin creating frames in Figma
**Total Progress**: 0% (Planning complete, Implementation starting)
