---
name: design-system-ecommerce
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards for ecommerce. Use when creating or updating UI rules, component specifications, or design-system documentation.
version: "1.0"
tags: [design-system, ui, accessibility, tokens, ecommerce]
---

<!-- AI_DESIGN_TASTE_MANAGED_START -->

# ecommerce

## Mission
Deliver implementation-ready design-system guidance for ecommerce that ensures consistency, accessibility, and efficient implementation across dashboard web app interfaces.

## Brand
- Product/brand: ecommerce
- URL: https://adminlte.io/wp-content/uploads/2026/03/ecommerce-admin-dashboard-templates-flux.jpg
- Audience: authenticated users and operators
- Product surface: dashboard web app

## Style Foundations
- Visual style: minimal, utility-first, accessibility-prioritized
- Main font style: `font.family.primary=Times New Roman`, `font.family.stack=Times New Roman`, `font.size.base=16px`, `font.weight.base=400`, `font.lineHeight.base=normal`
- Typography scale: `font.size.xs=16px`
- Color palette: `color.text.primary=#000000`, `color.surface.base=#0e0e0e`
- Spacing scale: manual token definitions required
- Radius/shadow/motion tokens: manual token definitions required

## Design Tokens

### Colors
`color.text.primary=#000000`, `color.surface.base=#0e0e0e`

**Usage Guidelines:**
- Always use semantic token names, never hard-coded hex values
- Maintain WCAG 2.2 AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Define light and dark mode variants where applicable

### Typography
**Primary Font Family:** Times New Roman

`font.size.xs=16px`

**Typography Rules:**
- Use consistent font weights (typically 400, 500, 600)
- Maintain readable line heights (1.2 for headlines, 1.5-1.6 for body)
- Limit to 2-3 font weights per view

### Spacing
manual token definitions required

**Spacing Principles:**
- Use consistent spacing from the defined scale
- Avoid one-off spacing values
- Apply spacing tokens for margins, padding, and gaps

## Accessibility
**Target:** WCAG 2.2 AA compliance

**Required Practices:**
- Keyboard navigation support for all interactive elements
- Visible focus indicators (minimum 2px outline, high contrast)
- Touch targets minimum 44×44px
- Color contrast ratios: 4.5:1 for normal text, 3:1 for large text (18px+)
- Screen reader compatibility with proper ARIA labels
- Skip links for main content navigation
- Form inputs with associated labels

**Testing Requirements:**
- Test with keyboard only (Tab, Enter, Space, Arrow keys)
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Verify color contrast with automated tools
- Test responsive behavior at multiple breakpoints

## Component Specifications

**Detected Components:** Limited component detection

### Required Component States
Every interactive component must define:
1. **default:** Initial appearance
2. **hover:** Mouse pointer over element
3. **focus-visible:** Keyboard focus indicator
4. **active:** Element being pressed/clicked
5. **disabled:** Non-interactive state
6. **loading:** Async operation in progress (where applicable)
7. **error:** Validation or error state (where applicable)

### Component Anatomy Template
For each component, specify:
- **Structure:** HTML semantic elements and hierarchy
- **Tokens:** Which design tokens apply (colors, spacing, typography, radius)
- **Variants:** Size variants (sm, md, lg) and style variants (primary, secondary, outline)
- **Behavior:** Interaction patterns and state transitions
- **Responsive:** Breakpoint-specific adjustments
- **Accessibility:** ARIA attributes, keyboard shortcuts, screen reader text

### Common Components

**Buttons:**
- Minimum 44×44px touch target
- Clear hover, focus-visible, active, and disabled states
- Loading state with spinner or text change
- Disabled state with reduced opacity (0.5-0.6)
- Variants: primary (filled), secondary (outline), tertiary (text)

**Form Inputs:**
- Associated label (visible or aria-label)
- Clear focus indicator
- Error state with descriptive message
- Placeholder text for format guidance
- Support for keyboard navigation

**Cards:**
- Consistent padding using spacing tokens
- Optional elevation for hierarchy
- Responsive width behavior
- Interactive cards need hover/focus states

**Navigation:**
- Current page indicator
- Keyboard navigation (Tab, Arrow keys)
- Mobile responsive (hamburger menu pattern)
- Skip link for main content

## Writing Tone
Professional, clear, action-oriented. Be concise and specific.

**Writing Principles:**
- Use active voice
- Be concise and specific
- Avoid jargon unless necessary
- Write for international audiences (avoid idioms)

**UI Copy Standards:**
- Button labels: Verb + noun (e.g., "Save Changes", "Delete Account")
- Error messages: Explain what happened and how to fix it
- Empty states: Explain why empty and suggest next action
- Loading states: Indicate progress and expected duration

## Rules: Do
- Use semantic design tokens exclusively
- Define all component states explicitly (default, hover, focus-visible, active, disabled, loading, error)
- Document keyboard interactions
- Include responsive behavior specifications
- Write testable accessibility criteria
- Provide code examples for complex patterns
- Version control design token changes
- Document breaking changes
- Maintain WCAG 2.2 AA contrast ratios
- Test with keyboard navigation and screen readers

## Rules: Don't
- Do not use hard-coded color values or spacing
- Do not hide focus indicators
- Do not create touch targets smaller than 44×44px
- Do not use color alone to convey information
- Do not mix different corner radius values in same component
- Do not override system tokens without documentation
- Do not ship components without accessibility review
- Do not introduce one-off spacing or typography exceptions
- Do not use ambiguous labels or non-descriptive actions

## Guideline Authoring Workflow

When creating component guidelines:

1. Define Intent: One-sentence description of component purpose
2. Specify Tokens: List all applicable design tokens
3. Document Anatomy: HTML structure and semantic elements
4. Define Variants: Size and style variations
5. Specify States: All interactive states with visual changes
6. Detail Behavior: User interactions and state transitions
7. Add Accessibility: ARIA attributes, keyboard support, screen reader text
8. Include Examples: Code snippets for common use cases
9. List Anti-patterns: Common mistakes to avoid
10. Create QA Checklist: Testable acceptance criteria

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior
- Include spacing and typography token requirements
- Include long-content, overflow, and empty-state handling
- Include known page component density: not enough evidence from extraction

- Extraction diagnostics: Low sample size: fewer than 30 visible elements were extracted. Limited color diversity detected; color token inference confidence is low. Limited typography variety detected; size scale may need manual refinement. Audience and product surface inference confidence is low; verify generated brand context.

## Quality Gates

Before shipping component guidelines:

- Every non-negotiable rule must use "must"
- Every recommendation should use "should"
- Every accessibility rule must be testable in implementation
- Teams should prefer system consistency over local visual exceptions
- All design tokens are defined and documented
- Component has all required states (default, hover, focus-visible, active, disabled, loading, error)
- Keyboard navigation is specified
- Touch targets meet 44×44px minimum
- Color contrast ratios verified (WCAG 2.2 AA)
- Responsive behavior documented
- ARIA attributes specified where needed
- Code examples provided
- Anti-patterns documented
- QA checklist included

## Edge Cases & Considerations

**Long Content:**
- Text truncation with ellipsis or wrapping strategy
- Scrollable regions with visible scroll indicators
- Maximum widths for readability

**Empty States:**
- Helpful messaging explaining why empty
- Clear call-to-action for next step
- Appropriate illustration or icon

**Loading States:**
- Skeleton screens for content loading
- Spinners for actions in progress
- Progress indicators for multi-step processes

**Error Handling:**
- Inline validation for forms
- Toast notifications for system errors
- Error boundaries for component failures

---

**Extraction Metadata:**
- Extracted from: https://adminlte.io/wp-content/uploads/2026/03/ecommerce-admin-dashboard-templates-flux.jpg
- Extraction date: 2026-06-05T19:26:37.794Z
- Elements analyzed: 1 of 6

<!-- AI_DESIGN_TASTE_MANAGED_END -->
