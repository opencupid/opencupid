---
name: frontend-accessibility
description: Build accessible user interfaces following WCAG guidelines with semantic HTML, keyboard navigation, proper ARIA attributes, and screen reader support. Use this skill when creating or modifying UI components, implementing interactive elements (buttons, forms, modals, menus), adding keyboard navigation support, implementing focus management, adding ARIA attributes or roles, ensuring color contrast compliance, writing alt text for images, creating form labels and error messages, implementing heading structures, building custom interactive widgets, testing for screen reader compatibility, or working with any HTML, JSX, or template files that render user-facing content. Use when working with React components, Vue templates, Angular templates, HTML files, or any frontend framework components.
---

## When to use this skill

- When creating or modifying UI components
- When implementing interactive elements (buttons, forms, modals, dropdowns, menus)
- When adding keyboard navigation support
- When implementing focus management for dynamic content
- When adding ARIA attributes, roles, or properties
- When ensuring color contrast compliance
- When writing alt text for images or icons
- When creating form labels, placeholders, and error messages
- When implementing heading structures (h1-h6)
- When building custom interactive widgets or controls
- When testing for screen reader compatibility
- When implementing skip links or landmark regions
- When working with HTML, JSX, Vue templates, Angular templates, or any UI component files
- When working with React, Vue, Angular, Svelte, or any frontend framework

# Frontend Accessibility

This Skill provides guidance on how to adhere to coding standards as they relate to frontend accessibility.

## Core Principles

### Semantic HTML First
- Use native HTML elements (`<button>`, `<nav>`, `<main>`, `<header>`, `<footer>`) before reaching for ARIA
- First rule of ARIA: Don't use ARIA if native HTML works

### Keyboard Navigation
- All interactive elements must be reachable and operable via keyboard (Tab, Enter, Space, Arrow keys)
- Manage focus explicitly on open/close of dialogs and dynamic content
- Return focus to a logical element after closing modals/dialogs

### ARIA Best Practices
- Use ARIA only to enhance semantics that cannot be expressed in HTML
- Keep roles and states up-to-date with component state
- Provide descriptive labels, instructions, and error messages
- Include visible and programmatic relationships

### Color and Contrast
- WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text and UI components
- Do not rely on color alone to convey information
- Verify color contrast meets thresholds

### Forms and Inputs
- Every input must have an associated `<label>` (not just placeholder)
- Use `aria-describedby` for error messages and help text
- Use `aria-invalid` for invalid fields
- Use appropriate `autocomplete` attributes

### Images and Icons
- Meaningful images: descriptive `alt` text
- Decorative images: `alt=""` or `aria-hidden="true"`
- Icon-only buttons: `aria-label` required
- SVG icons: `role="img"` and `aria-label` OR `aria-hidden="true"`

### Touch Targets
- Minimum size: 44x44px (Apple/WCAG) or 48x48dp (Material)
- Minimum spacing: 8px between adjacent targets

### Testing
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Verify keyboard-only workflows
- Check announcements and focus order
