# Architecture

## Overview

CORE uses a **Modular Monolith** architecture.

```
                    CORE

             Web Application
                    │
                    ▼

             Application Layer

     ┌──────────────┼──────────────┐

     ▼              ▼              ▼

  Identity        Assets        Software

     │              │              │

     ▼              ▼              ▼

  Accounts       Devices       Licenses

  Groups         Hardware      Subscriptions


     └──────────────┼──────────────┘
                    │
                    ▼

               PostgreSQL
                    │
           ┌────────┴────────┐
           │                 │
           ▼                 ▼

        Redis         Background Jobs

                              │
                              ▼

                       Google Workspace
```

---

## Stack

### Frontend

- Next.js
- React
- TypeScript

### Backend

- Next.js Server
- Domain Modules
- REST / RPC API

### Database

- PostgreSQL (PGlite embedded WASM for local development; PostgreSQL for production)


### ORM

- Drizzle or Prisma

### Cache / Jobs

- Redis
- BullMQ

### Authentication

- Google OAuth / OIDC

### Authorization

- RBAC + Permissions

### Integration

- Google Admin SDK
- Google Directory API
- Google Groups API

### Secrets

- External Secret Manager or encrypted secrets layer

---

## Layered Architecture

```
CORE

├── Presentation
│
├── Application
│
├── Domain
│
├── Infrastructure
│
└── Integrations
```

---

## Module Structure

Each domain module follows:

```
modules/

├── accounts/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── assets/
│
├── software/
│
├── groups/
│
└── access/
```

This prevents CORE from becoming:

- ❌ `giant-api.ts`
- ❌ `giant-schema.ts`
- ❌ `giant-dashboard.tsx`
