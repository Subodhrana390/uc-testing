---
version: alpha
name: ecommerce
description: Design system extracted from https://adminlte.io/wp-content/uploads/2026/03/ecommerce-admin-dashboard-templates-flux.jpg
colors:
  text-primary: "#000000"
  surface-base: "#0e0e0e"
typography:
  xs:
    fontFamily: Times New Roman
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.text-primary}"
    rounded: 8px
    padding: 12px
---

# ecommerce

## Mission
Create implementation-ready, token-driven UI guidance for ecommerce that is optimized for consistency, accessibility, and fast delivery across dashboard web app.

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
- Spacing scale: No reliable extraction yet; teams should define explicit semantic tokens manually.
- Radius/shadow/motion tokens: No reliable extraction yet; motion and shape tokens should be defined manually.

## Overview

A minimal, utility-first, accessibility-prioritized interface designed for ecommerce.

**Target Audience:** authenticated users and operators

**Product Surface:** dashboard web app

This design system prioritizes accessibility, consistency, and implementation efficiency. All components follow WCAG 2.2 AA standards with keyboard-first interactions and clear focus indicators.

## Colors

The color palette is organized into semantic categories for consistent application across the interface.

**Text Colors:**
- **text.primary** (`#000000`): Primary text and headlines

**Surface Colors:**
- **surface.base** (`#0e0e0e`): Base background surface

## Typography

**Primary Font:** Times New Roman

The typography scale provides a consistent hierarchy for all text elements.

- **xs** (`16px`): Weight 400, Line height 1.5


## Layout

The layout system uses a consistent spacing scale for margins, padding, and gaps.

**Spacing Scale:** Define an 8px-based spacing scale manually.

Recommended values: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

## Elevation & Depth

Elevation is achieved through subtle shadows and tonal layers.

**Recommended approach:**
- Use minimal shadows for depth
- Prefer tonal backgrounds over heavy shadows
- Maintain clear visual hierarchy through layering

## Shapes

Corner radii create a consistent shape language across components.

**Recommended values:**
- **sm:** 4px - Subtle rounding for small elements
- **md:** 8px - Standard rounding for buttons and inputs
- **lg:** 12px - Larger rounding for cards
- **full:** 9999px - Fully rounded for pills and avatars

## Components

**Detected Components:** Limited component detection

### Component Guidelines

**Buttons:**
- Use primary style for main actions
- Secondary style for alternative actions
- Maintain minimum 44×44px touch target
- Include default, hover, focus-visible, active, disabled, loading, and error states

**Inputs:**
- Clear focus indicators required
- Label positioning must be consistent
- Error states with descriptive messages
- Support for keyboard navigation

**Cards:**
- Consistent padding and spacing
- Optional elevation for hierarchy
- Responsive behavior for different viewports

All components must define:
- Default, hover, focus-visible, active, disabled, loading, and error states
- Keyboard interaction patterns
- Touch target sizes (minimum 44×44px)
- Responsive behavior
- Accessibility requirements

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required
- Focus-visible rules required
- Contrast constraints required (4.5:1 for normal text, 3:1 for large text)
- Touch targets minimum 44×44px
- Screen reader compatibility with proper ARIA labels

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error
- Component behavior should specify responsive and edge-case handling
- Interactive components must document keyboard, pointer, and touch behavior
- Accessibility acceptance criteria must be testable in implementation
- Maintain WCAG AA contrast ratios
- Provide clear focus indicators for all interactive elements

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators
- Do not introduce one-off spacing or typography exceptions
- Do not use ambiguous labels or non-descriptive actions
- Do not ship component guidance without explicit state rules
- Do not mix different corner radius values in the same component
- Do not create touch targets smaller than 44×44px
- Do not use color alone to convey information

## Guideline Authoring Workflow
1. Restate design intent in one sentence
2. Define foundations and semantic tokens
3. Define component anatomy, variants, interactions, and state behavior
4. Add accessibility acceptance criteria with pass/fail checks
5. Add anti-patterns, migration notes, and edge-case handling
6. End with a QA checklist

## Required Output Structure
- Context and goals
- Design tokens and foundations (YAML front matter + descriptions)
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
- Every non-negotiable rule must use "must"
- Every recommendation should use "should"
- Every accessibility rule must be testable in implementation
- Teams should prefer system consistency over local visual exceptions

---

**Extraction Metadata:**
- Source: https://adminlte.io/wp-content/uploads/2026/03/ecommerce-admin-dashboard-templates-flux.jpg
- Extracted: 2026-06-05T19:26:25.585Z
- Elements sampled: 1 of 6
