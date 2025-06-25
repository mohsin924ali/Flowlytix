# 🚀 Minimal Authentication Version - Quick Start Guide

## Overview

This is the **minimal authentication-only version** of Flowlytix. It contains:

- ✅ **Authentication System** - Login/Logout with IPC communication
- ✅ **Electron App** - Working desktop application
- ✅ **Build System** - No errors, clean compilation
- ✅ **Session Management** - Persistent login state
- 🟡 **Basic UI** - Simple, functional interface (no MUI)

## Quick Start

### 1. Build and Run

```bash
# Build and run the minimal version
npm run dev:minimal

# OR do it step by step:
npm run build
npm run electron
```

### 2. Test Authentication

- **Email:** `admin@flowlytix.com`
- **Password:** `admin123`
- Click "Login" button
- You should see the success dashboard

### 3. Verify Features

- ✅ Login with default credentials
- ✅ View user information on dashboard
- ✅ Session persistence (refresh/restart keeps you logged in)
- ✅ Logout functionality
- ✅ Error handling for wrong credentials

## Current Status

### ✅ Working Features

1. **Electron App Launches** - No crashes or errors
2. **IPC Communication** - Frontend can talk to backend
3. **Authentication** - Full login/logout cycle
4. **Session Management** - User stays logged in
5. **Error Handling** - Shows meaningful error messages
6. **Build System** - Zero compilation errors

### 🟡 Simplified Features

1. **UI Framework** - Basic CSS (no Material-UI yet)
2. **Routing** - Single page app (no React Router yet)
3. **State Management** - Simple React state (no Zustand yet)

### 🔧 Ready for Extension

1. **IPC Handlers** - All backend handlers are ready
2. **Domain Models** - Rich business logic is implemented
3. **Database** - SQLite schema is complete
4. **Analytics** - 8 analytics modules are available
5. **CRUD Operations** - Products, Orders, Customers, etc.

## Next Steps (Incremental Addition)

### Phase 1: Core UI Enhancement

```bash
# Add Material-UI back
npm install @mui/material @emotion/react @emotion/styled
# Add routing
npm install react-router-dom
```

### Phase 2: Add Dashboard Modules

1. **Products Module** - Add product management
2. **Orders Module** - Add order processing
3. **Customers Module** - Add customer management
4. **Analytics Module** - Add reporting dashboard

### Phase 3: Advanced Features

1. **State Management** - Add Zustand
2. **Form Handling** - Add React Hook Form + Zod
3. **Data Fetching** - Add React Query
4. **UI Polish** - Add animations and transitions

## Troubleshooting

### If App Doesn't Launch

```bash
# Check if build is successful
npm run build

# Check console for errors
npm run electron
# Look for errors in the terminal
```

### If Authentication Fails

1. **Check Console** - Look for error messages
2. **Verify IPC** - Look for "Electron API Available" status
3. **Check Credentials** - Use exact default credentials
4. **Clear Storage** - Clear localStorage if needed

### If Build Fails

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

## Architecture Notes

The current minimal version follows the same **Clean Architecture** as the full version:

```
Frontend (React) ↔ IPC ↔ Main Process ↔ Domain/Infrastructure
```

**Key Files:**

- `src/renderer/App.tsx` - Minimal React app
- `src/main/ipc/ipcHandlers.ts` - IPC communication
- `src/preload/preload.ts` - Secure API bridge
- `src/renderer/services/AuthService.ts` - Authentication logic

## Success Criteria

You'll know it's working when:

1. ✅ Electron app opens without crashes
2. ✅ Login form shows "Electron API Available"
3. ✅ Default credentials work
4. ✅ Dashboard shows user information
5. ✅ Logout returns to login screen
6. ✅ Session persists after app restart

**Ready to add modules one by one!** 🎉
