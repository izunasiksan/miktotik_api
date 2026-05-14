# Frontend Redesign Specification (HCI Focused)

## 1. Overview
Redesign the entire frontend of the Mikrotik Management API to adhere to modern HCI (Human-Computer Interaction) principles. The goal is to improve usability, accessibility, visual appeal, and responsiveness.

## 2. Design Philosophy & HCI Principles
- **Visibility of System Status**: Clear feedback (loading spinners, toast notifications, status badges).
- **Match Between System and Real World**: Use familiar icons (Router, Server, Network) and terminology.
- **User Control and Freedom**: Easy navigation (Back buttons, Breadcrumbs), undo actions (where applicable).
- **Consistency and Standards**: Uniform color palette, typography, and component behavior.
- **Error Prevention**: Validation on forms, confirmation modals for destructive actions.
- **Aesthetics**: "Clean Modern" / "Glassmorphism" inspired.
  - **Background**: Light/Slate Gray (`bg-slate-50`).
  - **Cards**: White with subtle shadow (`shadow-sm`, `rounded-xl`).
  - **Primary Color**: Deep Blue / Indigo (`indigo-600`).
  - **Secondary**: Teal / Cyan for network status.
  - **Danger**: Rose / Red for critical actions.

## 3. Technical Architecture
- **Framework**: React 18 (Functional Components).
- **Styling**: Tailwind CSS v3.
- **Icons**: Lucide React.
- **State Management**: React Context (Auth) + Local State.
- **Routing**: React Router DOM v6.

## 4. Component Redesign Plan

### 4.1. Layout (`components/layout/`)
- **Sidebar**:
  - Collapsible (maximize screen real estate).
  - Active state highlighting (bg-indigo-50 text-indigo-600).
  - Icons for all menu items.
  - Logo area at top.
- **Navbar**:
  - Breadcrumbs integration.
  - User profile dropdown.
  - Notifications bell (mockup or real).
  - Theme toggle (optional).
- **Main Content Area**:
  - Consistent padding (`p-6` or `p-8`).
  - `max-w-7xl` centered container.

### 4.2. UI Components (`components/ui/`)
- **Buttons**:
  - Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
  - States: `hover`, `active`, `disabled`, `loading`.
  - Rounded corners (`rounded-lg`).
- **Cards (`StatCard`, etc.)**:
  - Clean white background.
  - Subtle border (`border-slate-200`).
  - Hover lift effect (`hover:-translate-y-1`).
- **Inputs & Forms**:
  - Floating labels or clean top labels.
  - Focus rings (`ring-2 ring-indigo-500`).
  - Error message support.
- **Modals**:
  - Centered overlay with blur backdrop (`backdrop-blur-sm`).
  - Smooth enter/exit animations (using standard CSS transitions).
- **Tables**:
  - Clean headers (`bg-slate-50`).
  - Row hover effects.
  - Status pills/badges.

### 4.3. Pages (`pages/`)
- **Dashboard**: Grid layout (responsive: 1col -> 2col -> 4col).
- **Login**: (Already updated).
- **Router List**: Card or Table view with search/filter.
- **Detail Pages**: Tabbed interface for complex router data (Interfaces, VPN, Logs).

## 5. Color Palette (Tailwind Config)
- **Primary**: `indigo` (50-900)
- **Secondary**: `cyan` (50-900)
- **Success**: `emerald` (50-900)
- **Warning**: `amber` (50-900)
- **Error**: `rose` (50-900)
- **Neutral**: `slate` (50-900)

## 6. Typography
- **Font Family**: Inter (Google Fonts) or System UI.
- **Headings**: Semibold/Bold, tighter tracking.
- **Body**: Regular/Medium, readable line height.
