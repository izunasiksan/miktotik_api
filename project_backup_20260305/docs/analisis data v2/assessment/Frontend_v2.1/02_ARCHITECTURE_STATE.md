# 02: ARSITEKTUR KOMPONEN & STATE MANAGEMENT V2.1
**(Tanggal: 2026-03-05 | Fokus: Modularisasi & Skalabilitas)**

## 1. PENDAHULUAN
Arsitektur frontend V2.1 mengadopsi prinsip **Atomic Design** dan **Modular Clean Architecture** untuk mendukung integrasi pipeline backend yang kompleks.

---

## 2. STRUKTUR FOLDER (FRONTEND DIRECTORY)

```text
src/
├── assets/           # Gambar, Ikon, Global CSS (Tailwind)
├── components/       # Atomic Design Components
│   ├── atoms/        # Button, Input, Badge, Typography
│   ├── molecules/    # FormField, StatCard, Breadcrumbs
│   ├── organisms/    # Navbar, Sidebar, ChartContainer
│   └── templates/    # LayoutWrapper, DashboardLayout
├── features/         # Modular Business Logic (Domain Driven)
│   ├── analysis_v2/     # Stage 0-7 Components & Hooks
│   ├── boards/       # Mikrotik Board Management
│   ├── users/        # Auth & Profile
│   └── settings/     # App Configuration
├── hooks/            # Global Custom Hooks (useAuth, useAPI)
├── services/         # API Service Layer (Axios Instances)
├── store/            # State Management (Zustand/Context API)
├── utils/            # Helper Functions (Date Formatting, Math)
└── App.jsx           # Root Application Component
```

---

## 3. STANDAR PENAMAAN (NAMING CONVENTION)

### **3.1 Komponen UI (React)**
- **Format**: `PascalCase`
- **Contoh**: `DataQualityAlert.jsx`, `HealthGaugeChart.tsx`
- **Aturan**: Gunakan suffix yang jelas (misal: `...Button`, `...Card`, `...Modal`).

### **3.2 State & Functions**
- **Format**: `camelCase`
- **Contoh**: `isOnline`, `fetchAnalysisData()`, `handleFilterChange`
- **Aturan**: Gunakan prefix `is` atau `has` untuk boolean.

### **3.3 File Pendukung**
- **Format**: `kebab-case`
- **Contoh**: `date-formatter.js`, `global-styles.css`

---

## 4. STATE MANAGEMENT STRATEGY

### **4.1 Global Context (Zustand)**
Gunakan Zustand untuk state yang diakses secara luas di seluruh aplikasi (Shared State).
- **Store 1: AuthStore** (User info, token, roles).
- **Store 2: ContextLockStore** (Selected Board ID, Time Range, Granularity).
- **Store 3: AnalysisStore** (Raw datasets dari Stage 1-7 untuk efisiensi re-render).

### **4.2 Local State (React useState)**
Gunakan `useState` hanya untuk interaksi internal komponen (misal: toggle modal, input form sementara).

### **4.3 Server State (React Query/SWR)**
Sangat direkomendasikan untuk menangani caching data API, status loading, dan re-fetching otomatis.

---

## 5. MODULARISASI KODE (BEST PRACTICES)

### **5.1 Feature-Based Structure**
Setiap modul di `features/` harus memiliki struktur internal yang mandiri:
```text
features/analysis/
├── components/       # Komponen spesifik stage (misal: TrendChart)
├── hooks/            # Hooks spesifik (misal: useAnalysisPipeline)
├── services/         # API calls khusus analisis
└── types/            # TypeScript definitions (jika ada)
```

### **5.2 Komposisi Komponen**
Gunakan pola *Higher-Order Components* (HOC) atau *Render Props* jika diperlukan, namun prioritaskan *Custom Hooks* untuk pemisahan logika dan visual.

---
**Referensi Backend:** [2026-03-05_backend_implementation_workflow_v2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/2026-03-05_backend_implementation_workflow_v2.1.md)
