# Trustless Granary Backend

**Event-Sourced Warehouse Management System**

## 🏗️ Architecture

This is a **production-grade, event-sourced backend** built on core principles:

- ✅ **Append-only event log** (single source of truth)
- ✅ **Immutable events** (no updates/deletes on events table)
- ✅ **Server-authoritative timestamps**
- ✅ **Hard role separation** (Admin, Owner, Attendant)
- ✅ **Rebuildable projections** from events
- ✅ **Offline-first sync** support

---

## 📦 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trustless_granary
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 3. Create Database

```bash
psql -U postgres
CREATE DATABASE trustless_granary;
\q
```

### 4. Run Migrations

```bash
npm run migrate
```

### 5. Seed Test Data

```bash
npm run seed
```

This creates:
- Admin: `0200000000` / PIN: `0000`
- Owner (Sarah): `0201234567` / PIN: `5678`
- Attendant (James): `0241234567` / PIN: `1234`

### 6. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:4000`

---

## ✅ Completed Components

### Core Infrastructure
- [x] TypeScript configuration
- [x] Database connection pool (PostgreSQL)
- [x] Winston logging
- [x] Error handling middleware
- [x] JWT authentication
- [x] Role-based authorization middleware

### Services
- [x] **EventService** - Event creation and retrieval
- [x] **StockProjectionService** - Stock calculation from events
- [x] **AuthService** - User authentication and management

### Database
- [x] Complete schema with:
  - Events table (append-only, immutable)
  - Users, Warehouses, Attendant links
  - Request projections
  - Stock projections
  - Audit logs
- [x] Migration script
- [x] Seed script with test data

### API Endpoints (Auth)
- [x] `POST /api/auth/login` - User login
- [x] `POST /api/auth/refresh` - Token refresh
- [x] `GET /api/auth/profile` - Get user profile

---

## 🚧 TODO: Remaining Implementation

### Controllers & Routes
- [ ] **Admin Controller**
  - Create warehouse
  - Create users
  - Perform Genesis inventory
  
- [ ] **Attendant Controller**
  - Log inbound stock
  - Request outbound dispatch
  - Execute approved dispatch
  
- [ ] **Owner Controller**
  - View pending approvals
  - Approve/reject requests
  - View audit trail
  - View current stock

### Services
- [ ] **WarehouseService** - Warehouse CRUD
- [ ] **GenesisService** - One-time genesis inventory
- [ ] **InboundService** - Stock inbound logic
- [ ] **OutboundService** - Request/approval/execution flow
- [ ] **SyncService** - Offline sync handling
- [ ] **PhotoStorageService** - Photo upload/storage

### Additional Features
- [ ] Photo upload handling (multer + S3/local)
- [ ] Sync endpoint for offline events
- [ ] Projection rebuild endpoint
- [ ] Audit trail export
- [ ] Request pagination
- [ ] Event replay functionality

---

## 📡 API Endpoints (Full Spec)

### Authentication
- `POST /api/auth/login` ✅
- `POST /api/auth/refresh` ✅
- `GET /api/auth/profile` ✅

### Admin (Platform Admin only)
- `POST /api/admin/warehouse` - Create warehouse
- `POST /api/admin/user` - Create user
- `POST /api/admin/genesis` - Record genesis inventory

### Attendant
- `POST /api/attendant/inbound` - Log inbound stock
- `POST /api/attendant/request-dispatch` - Request outbound
- `POST /api/attendant/dispatch/:id/execute` - Execute approved dispatch

### Owner
- `GET /api/owner/approvals` - Get pending approvals
- `POST /api/owner/approvals/:id/approve` - Approve request
- `POST /api/owner/approvals/:id/reject` - Reject request
- `GET /api/owner/stock` - Get current stock
- `GET /api/owner/audit` - Get audit trail

### Universal
- `GET /api/warehouse/:id/status` - Warehouse status
- `GET /api/events/since/:sequence` - Sync events
- `POST /api/sync` - Submit offline events

---

## 🔐 Role Permissions

### Platform Admin
✅ Create warehouses  
✅ Create users  
✅ Perform Genesis  
❌ Approve requests  
❌ Execute dispatch  

### Owner
✅ Approve/reject requests  
✅ View stock  
✅ View audit trail  
❌ Log inbound  
❌ Execute dispatch  
❌ Create users  

### Attendant
✅ Log inbound  
✅ Request dispatch  
✅ Execute approved dispatch  
❌ Approve anything  
❌ View full audit  

---

## 📊 Event Types (The Six Sacred Events)

1. `GENESIS_INVENTORY_RECORDED` - Initial stock (admin only, one-time)
2. `STOCK_INBOUND_RECORDED` - New stock arrives
3. `OUTBOUND_REQUESTED` - Attendant requests dispatch
4. `OUTBOUND_APPROVED` - Owner approves request
5. `OUTBOUND_REJECTED` - Owner rejects request
6. `DISPATCH_EXECUTED` - Attendant executes approved dispatch

---

## 🧮 Stock Formula (SACRED)

```
CurrentBags = SUM(GENESIS_INVENTORY_RECORDED.bags)
            + SUM(STOCK_INBOUND_RECORDED.bags)
            - SUM(DISPATCH_EXECUTED.bags)
```

**CRITICAL:** Pending or approved requests DO NOT reduce stock.  
Only `DISPATCH_EXECUTED` reduces stock.

---

## 🧪 Testing

```bash
# Run tests
npm test

# Test login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0201234567","pin":"5678"}'
```

---

## 📝 Development Notes

### Adding New Endpoints

1. Create controller in `/src/controllers/`
2. Add routes in `/src/routes/`
3. Update `/src/routes/index.ts`
4. Add middleware if needed
5. Test with Postman/curl

### Database Changes

⚠️ **NEVER** modify the events table structure without full system review.  
Other tables can be modified via migrations.

### Event Sourcing Rules

1. Events are **append-only**
2. Server timestamp is **authoritative**
3. Projections are **rebuildable**
4. Events are the **source of truth**

---

## 🚀 Deployment

```bash
# Build
npm run build

# Start production server
npm start
```

**Requirements:**
- PostgreSQL 12+
- Node.js 18+
- Object storage (S3 or local filesystem)

---

## 📚 Next Steps

To complete the backend:

1. Implement remaining controllers (Admin, Attendant, Owner)
2. Add photo upload handling
3. Implement sync service for offline support
4. Add comprehensive tests
5. Set up CI/CD pipeline
6. Configure production database
7. Set up photo storage (S3)

See TODO section above for detailed task list.
