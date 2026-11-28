# MediAgent — Accessibility Report (WCAG 2.2 AA)

**Date:** 2026-11-25  
**Scope:** Frontend React application (client/src)  
**Status:** Preliminary — automated and manual review  
**Certification:** NOT CERTIFIED — This is a self-assessment, not a formal accessibility audit.

---

## 1. Summary

MediAgent is a research-oriented clinical decision support prototype. Accessibility has been considered during design but has not undergone formal WCAG 2.2 AA certification. This document outlines current status, known limitations, and recommended improvements.

---

## 2. Current Status by WCAG Principle

### Perceivable

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.1.1 Non-text Content | Partial | Images have alt text where applicable; charts lack ARIA labels |
| 1.2.1 Audio-only / Video-only | N/A | No audio-only or video-only content |
| 1.2.2 Captions | N/A | No pre-recorded video content |
| 1.3.1 Info and Relationships | Partial | Semantic HTML used; some dynamic content lacks ARIA |
| 1.3.2 Meaningful Sequence | Pass | DOM order follows visual order |
| 1.3.3 Sensory Characteristics | Partial | Color used for status but text labels also provided |
| 1.4.1 Use of Color | Partial | StatusBadge uses color + text; some charts may rely on color |
| 1.4.2 Audio Control | N/A | No auto-playing audio |
| 1.4.3 Contrast (Minimum) | Partial | Dark theme colors appear sufficient; not formally measured |
| 1.4.4 Resize Text | Partial | Relative units used; not tested at 200% |
| 1.4.5 Images of Text | Pass | No images of text used |
| 1.4.10 Reflow | Partial | Responsive breakpoints at 768px; not fully tested at 320px |
| 1.4.11 Non-text Contrast | Partial | UI component borders visible; not formally measured |
| 1.4.12 Text Spacing | Pass | Standard CSS line-height and spacing |
| 1.4.13 Content on Hover/Focus | Pass | No content that appears only on hover |

### Operable

| Criterion | Status | Notes |
|-----------|--------|-------|
| 2.1.1 Keyboard | Partial | Native buttons/links are keyboard accessible; custom components not fully tested |
| 2.1.2 No Keyboard Trap | Pass | No keyboard traps identified |
| 2.1.4 Character Key Shortcuts | N/A | No single-key shortcuts |
| 2.2.1 Timing Adjustable | N/A | No time limits |
| 2.2.2 Pause/Stop/Hide | N/A | No auto-updating content |
| 2.3.1 Three Flashes | Pass | No flashing content |
| 2.4.1 Bypass Blocks | N/A | No skip links; single-page application |
| 2.4.2 Page Titled | Partial | Page titles not dynamically set per route |
| 2.4.3 Focus Order | Partial | Follows DOM order; not explicitly managed |
| 2.4.4 Link Purpose | Pass | Link text describes purpose |
| 2.4.7 Focus Visible | **FAIL** | No explicit `:focus-visible` styles |
| 2.5.1 Pointer Gestures | Pass | No multipoint gestures |
| 2.5.2 Pointer Cancellation | Pass | Click events on mouse up |
| 2.5.3 Label in Name | Partial | Most buttons have visible text labels |
| 2.5.4 Motion Actuation | N/A | No motion-based controls |

### Understandable

| Criterion | Status | Notes |
|-----------|--------|-------|
| 3.1.1 Language of Page | Partial | HTML lang attribute not set |
| 3.1.2 Language of Parts | Partial | Multilingual content supported but not marked up |
| 3.2.1 On Focus | Pass | No context change on focus |
| 3.2.2 On Input | Pass | No context change on input |
| 3.2.3 Consistent Navigation | Pass | Consistent sidebar and navigation |
| 3.2.4 Consistent Identification | Pass | Consistent component identification |
| 3.3.1 Error Identification | Pass | Error messages displayed inline |
| 3.3.2 Labels or Instructions | Partial | Most fields have labels; not all use `<label>` elements |
| 3.3.3 Error Suggestion | Partial | Error messages provided; suggestions limited |
| 3.3.4 Error Prevention | Partial | No confirmation for destructive actions |

### Robust

| Criterion | Status | Notes |
|-----------|--------|-------|
| 4.1.1 Parsing | Pass | Valid HTML/JSX |
| 4.1.2 Name, Role, Value | **FAIL** | No ARIA roles on custom components (charts, modals, pipeline nodes) |
| 4.1.3 Status Messages | Partial | Toast notifications used; not announced to screen readers |

---

## 3. Known Limitations

| Limitation | Impact | Recommended Fix |
|------------|--------|-----------------|
| No `:focus-visible` styles | Keyboard users cannot see focused element | Add `outline: 2px solid var(--accent-primary)` on `:focus-visible` |
| No ARIA roles on charts/recharts | Screen reader users cannot understand data visualizations | Add `role="img"` and `aria-label` to chart containers |
| No ARIA labels on modals | Screen reader users cannot identify modal purpose | Add `aria-modal="true"` and `aria-labelledby` to modals |
| No `lang` attribute on HTML | Screen readers may use wrong language | Add `lang="en"` to `<html>` element |
| No skip links | Keyboard users must tab through all navigation | Add skip-to-content link |
| No `aria-label` on icon buttons | Icon-only buttons lack accessible names | Add `aria-label` to all icon buttons |
| No reduced-motion support | Users with vestibular disorders may be affected | Add `@media (prefers-reduced-motion)` to disable animations |
| Color used as sole indicator in some charts | Color-blind users may miss status | Add patterns or text labels to charts |

---

## 4. Recommended Improvements

1. **Add `:focus-visible` styles** to all interactive elements in `client/src/index.css`
2. **Add ARIA attributes** to recharts components, modals, and custom widgets
3. **Add `lang="en"`** to the HTML document
4. **Add skip-to-content link** at the top of each page
5. **Add `aria-label`** to icon-only buttons
6. **Implement `prefers-reduced-motion`** media query
7. **Add `aria-modal` and `aria-labelledby`** to all modal dialogs
8. **Use `<label>` elements** for all form inputs
9. **Add page title updates** on route changes
10. **Announce status messages** to screen readers via ARIA live regions

---

## 5. Tools Used

- Visual inspection of component code
- CSS design system review
- WCAG 2.2 AA criteria comparison

No automated accessibility testing tools (axe, Lighthouse, etc.) were run during this assessment.

---

## 6. Conclusion

MediAgent meets several WCAG 2.2 AA criteria but has notable gaps, particularly in ARIA markup, focus indicators, and screen reader support. These should be addressed before any production deployment. The system is identified as a research prototype and has not undergone formal accessibility certification.
