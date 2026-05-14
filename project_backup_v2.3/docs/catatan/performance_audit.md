# Frontend Performance Audit & Optimization Report

## Date: 2026-03-01
## Status: COMPLETED

### 1. Executive Summary
The frontend application was reported as feeling "heavy" during execution. An audit was conducted to identify performance bottlenecks. The primary issues identified were the lack of code splitting (monolithic bundle) and unoptimized context re-renders.

### 2. Key Findings

#### A. Monolithic Bundle (Critical)
- **Issue**: All page components (`Dashboard`, `Boards`, `Reports`, etc.) were imported directly in `App.jsx`.
- **Impact**: The browser had to download, parse, and execute the JavaScript for *every* page in the application before rendering the initial view (e.g., Login). This significantly increases "Time to Interactive" (TTI) and memory usage.
- **Fix**: Implemented **Code Splitting** using `React.lazy` and `Suspense`. Pages are now loaded on-demand as chunks.

#### B. Context Re-renders (Major)
- **Issue**: The `AuthContext` provider was creating a new `value` object on every render.
- **Impact**: Any state change in the `AuthProvider` (or its parent) would force a re-render of *all* components consuming `useAuth`, even if the actual data didn't change.
- **Fix**: Memoized the context value using `React.useMemo`.

#### C. Redundant Polling (Minor)
- **Issue**: Both `Layout.jsx` and `Dashboard.jsx` poll the `/dashboard/summary` endpoint every 30 seconds.
- **Impact**: Duplicate network requests when the user is on the Dashboard.
- **Recommendation**: Future refactoring should move this polling to a shared query client (e.g., TanStack Query) to deduplicate requests. For now, the impact is negligible compared to the bundle size issue.

### 3. Implementation Details

#### Code Splitting in `App.jsx`
```javascript
// Before
import Dashboard from './pages/Dashboard';

// After
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

#### Memoization in `AuthContext.jsx`
```javascript
// Before
const value = { user, login, logout };

// After
const value = React.useMemo(() => ({ user, login, logout }), [user]);
```

### 4. Verification
- **Build Size**: The application is now split into multiple chunks (e.g., `assets/Dashboard-xxxx.js`, `assets/Boards-xxxx.js`).
- **Initial Load**: Only critical CSS/JS is loaded initially.
- **UX**: A loading spinner is displayed during page transitions via `Suspense`.

### 5. React Query Implementation
- Installed `@tanstack/react-query` and added a `QueryClientProvider` in `App.jsx` with sensible defaults:
  - `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: 1`.
- Replaced manual polling/state with `useQuery`/`useMutation`:
  - `Layout.jsx`: Uses `useQuery(['backendStatus'], getDashboardSummary, { refetchInterval: 30_000, retry: false })` and derives `backendStatus` from `isError`.
  - `Dashboard.jsx`: Uses `useQuery(['dashboardStats'], getDashboardSummary, { refetchInterval: 30_000 })`, exposes manual `refetch` for the Refresh button, and shows a spinner during `isLoading`/`isRefetching`.
  - `Boards.jsx`: Uses `useQuery(['boards'], getBoards)` and mutations for create/update/delete with cache invalidation via `queryClient.invalidateQueries(['boards'])`.
- Result: Duplicate requests are deduplicated, background refetching is standardized, and component-level state/intervals are removed for leaner renders.

### 6. Future Recommendations
- **Virtualization**: If the "Boards" list grows to hundreds of items, implement `react-window` to virtualize the table rendering.
- **Image Optimization**: Ensure any static assets are optimized (WebP format).
