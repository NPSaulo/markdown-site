# Adding WorkOS AuthKit to markdown-site (Dashboard Only)

A beginner-friendly, step-by-step guide for adding WorkOS AuthKit authentication to only the `/dashboard` page of your [markdown-site](https://github.com/waynesutton/markdown-site) project. The main site remains public—no login required.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Part 1: Create a WorkOS Account](#3-part-1-create-a-workos-account)
4. [Part 2: Configure WorkOS Dashboard](#4-part-2-configure-workos-dashboard)
5. [Part 3: Install Dependencies](#5-part-3-install-dependencies)
6. [Part 4: Add Environment Variables](#6-part-4-add-environment-variables)
7. [Part 5: Configure Convex Auth](#7-part-5-configure-convex-auth)
8. [Part 6: Update the Main App Entry Point](#8-part-6-update-the-main-app-entry-point)
9. [Part 7: Create the Callback Route](#9-part-7-create-the-callback-route)
10. [Part 8: Create the Protected Dashboard Page](#10-part-8-create-the-protected-dashboard-page)
11. [Part 9: Add Dashboard Route to Router](#11-part-9-add-dashboard-route-to-router)
12. [Part 10: Deploy and Test](#12-part-10-deploy-and-test)
13. [Troubleshooting](#13-troubleshooting)
14. [Quick Reference](#14-quick-reference)

---

## 1. Overview

### What We're Building

- **Public site**: All existing pages (Home, Blog posts, About, etc.) remain publicly accessible
- **Protected dashboard**: Only `/dashboard` requires login via WorkOS AuthKit
- **Authentication provider**: WorkOS AuthKit (supports passwords, social login, SSO, and more)

### Architecture

```
markdown-site/
├── src/
│   ├── main.tsx              ← Wrap app with AuthKitProvider
│   ├── App.tsx               ← Main router (unchanged for public routes)
│   └── pages/
│       ├── Home.tsx          ← Public (no changes)
│       ├── Post.tsx          ← Public (no changes)
│       ├── Callback.tsx      ← NEW: Handle auth callback
│       └── Dashboard.tsx     ← NEW: Protected page
└── convex/
    └── auth.config.ts        ← NEW: Convex auth configuration
```

---

## 2. Prerequisites

Before starting, make sure you have:

- [ ] Node.js 18 or higher installed
- [ ] A working [markdown-site](https://github.com/waynesutton/markdown-site) project
- [ ] A Convex account and project already set up
- [ ] Your Convex development server running (`npx convex dev`)

**Don't have markdown-site yet?** Clone it first:

```bash
git clone https://github.com/waynesutton/markdown-site.git
cd markdown-site
npm install
npx convex dev
```

---

## 3. Part 1: Create a WorkOS Account

### Step 1.1: Sign Up for WorkOS

1. Go to [workos.com/sign-up](https://signin.workos.com/sign-up)
2. Create a free account with your email
3. Verify your email address

### Step 1.2: Set Up AuthKit

1. Log into the [WorkOS Dashboard](https://dashboard.workos.com)
2. Navigate to **Authentication** → **AuthKit**
3. Click the **Set up AuthKit** button
4. Select **"Use AuthKit's customizable hosted UI"**
5. Click **Begin setup**

### Step 1.3: Configure Redirect URI

During the AuthKit setup wizard, you'll reach step 4: **"Add default redirect endpoint URI"**

Enter this for local development:
```
http://localhost:5173/callback
```

> **What is this?** After a user logs in, WorkOS redirects them back to this URL with an authorization code. Your app exchanges this code for user information.

### Step 1.4: Copy Your Credentials

1. Go to [dashboard.workos.com/get-started](https://dashboard.workos.com/get-started)
2. Under **Quick start**, find and copy:
   - **Client ID** (looks like `client_01XXXXXXXXXXXXXXXXX`)
   
Save this somewhere safe—you'll need it shortly.

---

## 4. Part 2: Configure WorkOS Dashboard

### Step 2.1: Enable CORS

For the React SDK to work, you need to allow your app's domain:

1. Go to **Authentication** → **Sessions** in the WorkOS Dashboard
2. Find **Cross-Origin Resource Sharing (CORS)**
3. Click **Manage**
4. Add your development URL: `http://localhost:5173`
5. Click **Save**

> **Note**: When you deploy to production (e.g., Netlify), add your production domain here too (e.g., `https://markdowncms.netlify.app`).

### Step 2.2: Verify Redirect URI

1. Go to **Redirects** in the WorkOS Dashboard
2. Confirm `http://localhost:5173/callback` is listed
3. If not, add it by clicking **Add redirect**

---

## 5. Part 3: Install Dependencies

Open your terminal in the markdown-site project folder and install the required packages:

```bash
npm install @workos-inc/authkit-react @convex-dev/workos
```

**What these packages do:**

| Package | Purpose |
|---------|---------|
| `@workos-inc/authkit-react` | WorkOS React SDK for handling login/logout |
| `@convex-dev/workos` | Bridges WorkOS auth with Convex backend |

---

## 6. Part 4: Add Environment Variables

### Step 4.1: Update `.env.local`

Open your `.env.local` file (in the project root) and add these lines:

```env
# Existing Convex URL (should already be here)
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# WorkOS AuthKit Configuration (add these)
VITE_WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXX
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
```

Replace `client_01XXXXXXXXXXXXXXXXX` with your actual Client ID from the WorkOS Dashboard.

> **Why `VITE_` prefix?** Vite only exposes environment variables that start with `VITE_` to the browser.

### Step 4.2: Add to `.gitignore` (if not already)

Make sure `.env.local` is in your `.gitignore` to avoid committing secrets:

```
.env.local
.env.production.local
```

---

## 7. Part 5: Configure Convex Auth

Create a new file to tell Convex how to validate WorkOS tokens.

### Step 5.1: Create `convex/auth.config.ts`

Create a new file at `convex/auth.config.ts`:

```typescript
// convex/auth.config.ts
const clientId = process.env.WORKOS_CLIENT_ID;

const authConfig = {
  providers: [
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      algorithm: "RS256",
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};

export default authConfig;
```

### Step 5.2: Add Environment Variable to Convex

The Convex backend needs the Client ID too:

1. Run `npx convex dev` if not already running
2. You'll see an error with a link—click it
3. It takes you to the Convex Dashboard environment variables page
4. Add a new variable:
   - **Name**: `WORKOS_CLIENT_ID`
   - **Value**: Your WorkOS Client ID (e.g., `client_01XXXXXXXXXXXXXXXXX`)
5. Save

After saving, `npx convex dev` should show "Convex functions ready."

---

## 8. Part 6: Update the Main App Entry Point

Now we'll wrap the app with authentication providers—but only where needed.

### Step 6.1: Modify `src/main.tsx`

Replace your current `src/main.tsx` with this:

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import "./styles/global.css";
import App from "./App";

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
      redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  </StrictMode>
);
```

**What changed:**
- Added `AuthKitProvider` wrapper (handles WorkOS authentication state)
- Added `ConvexProviderWithAuthKit` (connects WorkOS auth to Convex)
- Passed the `useAuth` hook to bridge the two

---

## 9. Part 7: Create the Callback Route

When a user logs in via WorkOS, they're redirected to `/callback`. This page handles the authentication response.

### Step 7.1: Create `src/pages/Callback.tsx`

Create a new file at `src/pages/Callback.tsx`:

```tsx
// src/pages/Callback.tsx
import { useEffect } from "react";
import { useAuth } from "@workos-inc/authkit-react";
import { useNavigate } from "react-router-dom";

export default function Callback() {
  const { isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Once authentication is complete, redirect to dashboard
    if (!isLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, user, navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2>Signing you in...</h2>
        <p>Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}
```

**How it works:**
1. User completes login on WorkOS hosted page
2. WorkOS redirects to `/callback?code=...`
3. The `AuthKitProvider` automatically exchanges the code for a session
4. Once authenticated, we redirect to `/dashboard`

---

## 10. Part 8: Create the Protected Dashboard Page

This is where authenticated users will land. We'll protect it so only logged-in users can access it.

### Step 8.1: Create `src/pages/Dashboard.tsx`

Create a new file at `src/pages/Dashboard.tsx`:

```tsx
// src/pages/Dashboard.tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <>
      <AuthLoading>
        <LoadingState />
      </AuthLoading>
      <Unauthenticated>
        <LoginPrompt />
      </Unauthenticated>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
    </>
  );
}

function LoadingState() {
  return (
    <div className="dashboard-container">
      <p>Loading authentication...</p>
    </div>
  );
}

function LoginPrompt() {
  const { signIn } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1>Dashboard</h1>
        <p>You need to sign in to access the dashboard.</p>
        <button onClick={() => signIn()} className="sign-in-button">
          Sign In
        </button>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, signOut } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1>Dashboard</h1>
        <p>
          Welcome, <strong>{user?.firstName || user?.email || "User"}</strong>!
        </p>

        <div className="user-info">
          <h3>Your Account</h3>
          <ul>
            <li>
              <strong>Email:</strong> {user?.email}
            </li>
            <li>
              <strong>Name:</strong> {user?.firstName} {user?.lastName}
            </li>
            <li>
              <strong>User ID:</strong> {user?.id}
            </li>
          </ul>
        </div>

        <div className="dashboard-actions">
          <button onClick={() => signOut()} className="sign-out-button">
            Sign Out
          </button>
          <Link to="/" className="home-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Step 8.2: Add Dashboard Styles

Add these styles to your `src/styles/global.css` file:

```css
/* Dashboard Styles */
.dashboard-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.dashboard-card {
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dashboard-card h1 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.user-info {
  background: var(--bg-primary, #fff);
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 0;
}

.user-info h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.user-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.user-info li {
  padding: 0.25rem 0;
  font-size: 0.9rem;
}

.dashboard-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1.5rem;
}

.sign-in-button,
.sign-out-button {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.sign-in-button:hover,
.sign-out-button:hover {
  background: #4f46e5;
}

.home-link {
  color: var(--text-secondary, #666);
  text-decoration: none;
}

.home-link:hover {
  text-decoration: underline;
}
```

---

## 11. Part 9: Add Dashboard Route to Router

Now we need to add routes for `/callback` and `/dashboard`.

### Step 9.1: Update `src/App.tsx`

Find your router configuration in `src/App.tsx` and add the new routes. Your App.tsx likely uses React Router. Add these imports and routes:

```tsx
// At the top of src/App.tsx, add these imports:
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";

// In your Routes component, add these routes:
<Route path="/callback" element={<Callback />} />
<Route path="/dashboard" element={<Dashboard />} />
```

**Example of what your full App.tsx might look like:**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Post from "./pages/Post";
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";
// ... other imports

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Existing public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/:slug" element={<Post />} />
        
        {/* New auth routes */}
        <Route path="/callback" element={<Callback />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 12. Part 10: Deploy and Test

### Step 10.1: Test Locally

1. Make sure `npx convex dev` is running
2. Start your development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173`
4. Navigate to `http://localhost:5173/dashboard`
5. Click "Sign In" and complete the WorkOS login flow
6. You should be redirected back to the dashboard with your user info displayed

### Step 10.2: Deploy to Production

When you're ready to deploy:

1. **Add production redirect URI to WorkOS:**
   - Go to WorkOS Dashboard → Redirects
   - Add: `https://your-domain.com/callback`

2. **Add production CORS origin:**
   - Go to Authentication → Sessions → CORS
   - Add: `https://your-domain.com`

3. **Update Convex production environment:**
   - Go to Convex Dashboard → Your Project → Production deployment
   - Add `WORKOS_CLIENT_ID` environment variable

4. **Create `.env.production.local`:**
   ```env
   VITE_CONVEX_URL=https://your-production-deployment.convex.cloud
   VITE_WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXX
   VITE_WORKOS_REDIRECT_URI=https://your-domain.com/callback
   ```

5. **Deploy:**
   ```bash
   npx convex deploy
   npm run build
   # Deploy to Netlify or your hosting provider
   ```

---

## 13. Troubleshooting

### "useAuth must be used within AuthKitProvider"

**Cause**: Component is rendered outside the AuthKitProvider wrapper.

**Fix**: Make sure `AuthKitProvider` wraps your entire app in `main.tsx`.

### Login redirects to wrong URL

**Cause**: Redirect URI mismatch.

**Fix**: 
1. Check `VITE_WORKOS_REDIRECT_URI` matches exactly what's in WorkOS Dashboard
2. Include protocol (`http://` or `https://`)
3. Include port number for localhost (`:5173`)

### "isAuthenticated: false" after login

**Cause**: Convex auth config doesn't match WorkOS setup.

**Fix**:
1. Verify `WORKOS_CLIENT_ID` is set in Convex Dashboard
2. Re-run `npx convex dev` to sync configuration
3. Check browser console for specific errors

### CORS errors

**Cause**: Your domain isn't in WorkOS CORS settings.

**Fix**: 
1. Go to WorkOS Dashboard → Authentication → Sessions → CORS
2. Add your exact origin (e.g., `http://localhost:5173`)
3. Don't include trailing slashes

### "Failed to fetch" errors

**Cause**: Network or authentication issues.

**Fix**:
1. Check browser DevTools Network tab for specific errors
2. Verify Convex is running (`npx convex dev`)
3. Check that environment variables are loaded (add `console.log(import.meta.env)`)

---

## 14. Quick Reference

### File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `convex/auth.config.ts` | Create | Tell Convex how to validate WorkOS tokens |
| `src/main.tsx` | Modify | Wrap app with auth providers |
| `src/pages/Callback.tsx` | Create | Handle auth redirect |
| `src/pages/Dashboard.tsx` | Create | Protected dashboard page |
| `src/App.tsx` | Modify | Add routes for callback and dashboard |
| `src/styles/global.css` | Modify | Add dashboard styles |
| `.env.local` | Modify | Add WorkOS credentials |

### Environment Variables

| Variable | Where Used | Example |
|----------|------------|---------|
| `VITE_WORKOS_CLIENT_ID` | Browser (Vite) | `client_01XXXXXXXXX` |
| `VITE_WORKOS_REDIRECT_URI` | Browser (Vite) | `http://localhost:5173/callback` |
| `WORKOS_CLIENT_ID` | Convex Backend | `client_01XXXXXXXXX` |

### Useful Commands

```bash
# Start development
npx convex dev          # In terminal 1
npm run dev             # In terminal 2

# Deploy to production
npx convex deploy       # Deploy Convex functions
npm run build           # Build frontend

# Sync content to production
npm run sync:prod
```

### WorkOS Dashboard Checklist

- [ ] AuthKit enabled and configured
- [ ] Redirect URI added (`http://localhost:5173/callback`)
- [ ] CORS origin added (`http://localhost:5173`)
- [ ] Client ID copied to `.env.local`
- [ ] Production URLs added (when deploying)

---

## Next Steps

Once you have the basic setup working, you can:

1. **Customize the dashboard** - Add Convex queries to show user-specific data
2. **Add more protected routes** - Use the same pattern for other admin pages
3. **Enable social login** - Configure Google, GitHub, etc. in WorkOS Dashboard
4. **Set up organizations** - If you need multi-tenant features
5. **Add role-based access** - Use WorkOS roles and permissions

For more information, see:
- [Convex AuthKit Documentation](https://docs.convex.dev/auth/authkit)
- [WorkOS AuthKit Docs](https://workos.com/docs/authkit)
- [AuthKit React SDK on GitHub](https://github.com/workos/authkit-react)

---

*Last updated: December 2024*
