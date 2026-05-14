# Frontend Redesign Tasks

## Phase 1: Foundation (Design System)
- [ ] **Task 1.1**: Update `frontend/tailwind.config.js` with new color palette and font family (Inter).
- [ ] **Task 1.2**: Update `frontend/src/index.css` with base styles (`@layer base`, reset, and scrollbar styles).
- [ ] **Task 1.3**: Add `Inter` font import to `frontend/index.html` or `index.css`.

## Phase 2: Core Components
- [ ] **Task 2.1**: Create/Update `Button.jsx` (with variants: primary, secondary, outline, danger, ghost, loading state).
- [ ] **Task 2.2**: Create/Update `Card.jsx` (base card component with shadow/border).
- [ ] **Task 2.3**: Create/Update `Input.jsx` (with label, error message, focus states).
- [ ] **Task 2.4**: Create/Update `Badge.jsx` (status indicators: success, warning, error, info).
- [ ] **Task 2.5**: Create/Update `Modal.jsx` (centered, backdrop blur, smooth animation).

## Phase 3: Layout Components
- [ ] **Task 3.1**: Redesign `Sidebar.jsx` (collapsible, active states, icons, logo area).
- [ ] **Task 3.2**: Redesign `Navbar.jsx` (breadcrumbs, user menu, clean look).
- [ ] **Task 3.3**: Update `Layout.jsx` to integrate new Sidebar and Navbar with responsive behavior.

## Phase 4: Page Redesign (Iterative)
- [ ] **Task 4.1**: Redesign `Dashboard.jsx` (Grid layout for StatCards, recent activity, charts if any).
- [ ] **Task 4.2**: Redesign `RouterDetail.jsx` (Tabs for Interfaces, VPN, Logs; clean data presentation).
- [ ] **Task 4.3**: Redesign `Boards.jsx` (Router List) - Grid or Table view with actions.
- [ ] **Task 4.4**: Redesign `Users.jsx` (User management table).
- [ ] **Task 4.5**: Redesign `Reports.jsx` (Report generation forms and history).
- [ ] **Task 4.6**: Redesign `Settings.jsx` (Form layout for app settings).
- [ ] **Task 4.7**: Redesign `AuditLogs.jsx` (Clean table for logs).

## Phase 5: Polish & QA
- [ ] **Task 5.1**: Verify responsiveness on mobile/tablet.
- [ ] **Task 5.2**: Check accessibility (contrast, focus states).
- [ ] **Task 5.3**: Ensure all pages use the new components consistently.
