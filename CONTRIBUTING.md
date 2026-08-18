# Contributing to HustleOS

Thank you for your interest in contributing to HustleOS! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/hustleos.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Start dev server: `npm run dev`

## Development Workflow

### Code Style
- Follow the existing code structure
- Use TypeScript for all new files
- Components should be in `src/components/`
- Styles use Tailwind CSS with custom design system tokens
- No external CSS libraries (use Tailwind only)

### Component Guidelines
- Create reusable, composable components
- Use TypeScript interfaces for props
- Include PropTypes or TS types for all props
- Keep components focused and single-responsibility

### Commit Messages
```
feat: Add new feature
fix: Bug fix
refactor: Code refactoring
docs: Documentation update
style: Formatting changes
test: Add/update tests
```

## Making Changes

### Before Submitting
1. Ensure code compiles: `npm run build`
2. Test locally: `npm run dev`
3. Check TypeScript: `npx tsc --noEmit`
4. Keep commits atomic and well-described

### Pull Request Process
1. Push your branch to your fork
2. Create a Pull Request to the main branch
3. Describe your changes clearly
4. Link any related issues
5. Wait for review

## Design System

Refer to `src/styles/design-system.ts` for:
- Colors (primary, secondary, success)
- Typography (fonts, sizes)
- Spacing
- Animations
- Shadows

Use these tokens consistently across all components.

## Adding Features

### New Page/View
1. Create component in `src/components/`
2. Add route/tab in `src/App.tsx`
3. Update Navigation component
4. Style using design system

### New Component
1. Create in `src/components/`
2. Export from `src/components/index.ts`
3. Use TypeScript for prop types
4. Add to component library documentation

## Testing

While tests aren't yet implemented, when adding features consider:
- Component behavior across different props
- Responsive design on mobile/tablet/desktop
- Accessibility (keyboard navigation, ARIA labels)
- Animation smoothness

## Questions?

Open an issue for discussions and questions.

---

Happy coding! 🎉
