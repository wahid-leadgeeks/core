# Design

CORE should feel like a **calm infrastructure command center**.

Not:

- Spreadsheet 2.0
- Generic corporate ERP dashboard #47

---

## Principles

### 1. Resource-First

CORE manages company resources.

- 📧 Account
- 💻 Device
- 🧩 Application
- 🎫 License
- 👥 Group

Each resource has its own lifecycle.

### 2. Relationship-First

Users should easily understand:

```
ACCOUNT

  belongs to
      ↓

  PERSON

  member of
      ↓

  GROUPS

  assigned
      ↓

  DEVICE

  uses
      ↓

  SOFTWARE
```

### 3. Information Without Overload

Instead of 50 columns, use:

- Summary
- Details
- Relationships
- History

---

## Resource Page Pattern

Every resource should follow:

```
┌─────────────────────────────────────┐
│                                     │
│  💻 LeadGeeks-011                   │
│                                     │
│  Active                             │
│                                     │
│  LGI-CD-2024-042                    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Overview                           │
│  Specifications                     │
│  Assignment                         │
│  Software                           │
│  Access                             │
│  History                            │
│                                     │
└─────────────────────────────────────┘
```

---

## List Page Pattern

```
┌──────────────────────────────────────────┐
│                                          │
│  Devices                    + Add Device │
│                                          │
│  🔍 Search                               │
│                                          │
│  Filters                                 │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  💻 LeadGeeks-011                        │
│     Lenovo IdeaPad                       │
│     Assigned • Active                    │
│                                          │
│  💻 LeadGeeks-012                        │
│     Lenovo V14                           │
│     Available                            │
│                                          │
└──────────────────────────────────────────┘
```

---

## Status Language

Use clear visual states:

| Status | Indicator |
| --- | --- |
| Active | 🟢 |
| Assigned | 🔵 |
| Available | ⚪ |
| Pending | 🟡 |
| Attention | 🟠 |
| Issue | 🔴 |
| Archived | ⚫ |

Don't make users decode mysterious colors.

---

## UI/UX Ergonomics & Interaction Patterns

### 1. Orientation & 3-Layer UI
- **Layer 1 (Orientation)**: Hierarchical breadcrumbs (`<nav aria-label="Breadcrumb">`) on all detail and matrix pages; persistent domain indicators on mobile viewports.
- **Layer 2 (Understanding)**: Content-matched skeleton loaders (`TableSkeleton`, `CardSkeleton`, `DetailSkeleton`) eliminate Cumulative Layout Shift (CLS) and communicate layout structure instantly during data fetching.
- **Layer 3 (Action)**: Primary actions, 1-click filter reset buttons, and copy affordances always visible and accessible.

### 2. Search & Filter Ergonomics
- Global search focus hotkey (`/`) activates primary search input across list views.
- Inline clear button (`✕`) for immediate query clearing.
- 1-Click "Reset All Filters" affordance in both filter toolbars and zero-results empty states.

### 3. Detail Views & Data Tables
- Accessible WAI-ARIA tab navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`).
- Tactile quick-copy affordances with visual checkmark feedback for high-frequency infrastructure identifiers (Asset Tags, Hostnames, Emails).
- Crosshair row & column hover synchronization on high-density 2D grids (Membership Matrix) to prevent scanning disorientation.

