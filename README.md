# LUMA — Frontend Application
> **Secure Social Architecture & Private Expression Vault**  
> *Undergraduate / Academic Project Submission*

[![Vercel Deployment](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org)
[![CSS3](https://img.shields.io/badge/CSS3-Enterprise%20Design%20System-1572B6?style=for-the-badge&logo=css3)](https://developer.mozilla.org)
[![HTML5](https://img.shields.io/badge/HTML5-Semantic%20Markup-E34F26?style=for-the-badge&logo=html5)](https://developer.mozilla.org)

---

## 🌟 Executive Overview
**LUMA** is an enterprise-grade social networking and private expression architecture. Built to resolve the privacy paradox in conventional social platforms (such as Instagram and X), LUMA bifurcates interactions into two distinct environments:
1. **Public Community Stream**: Verified publications, multimedia records, and interactive discussions.
2. **LUMA Private Vault**: Zero-knowledge encrypted records, time-locked memory capsules, and cryptographic audit logging.

This repository hosts the **complete standalone frontend client**, designed with zero external build tool dependencies (no Node bundling required) and configured for 1-click serverless deployment on **Vercel**.

---

## 🛠️ Architecture & Technology Stack
- **Structure**: Semantic HTML5 with accessible ARIA modals, SVG iconography, and responsive layout grids.
- **Styling**: Modular CSS3 (`style.css` design system, `components.css` component catalog) with dark-mode palette, custom glassmorphism, and responsive breakpoints.
- **Client Logic**: Vanilla ES6+ JavaScript split into clean concern modules:
  - `api.js`: Unified REST client with automatic JWT token management and cloud endpoint abstraction.
  - `auth.js`: Authentication state, session storage, and demo account switching.
  - `feed.js`: Community stream rendering, reaction toggles, commenting, location tagger, and full-screen lightbox.
  - `vault.js`: PIN-gated zero-knowledge private vault partition, encrypted record commits, and audit log rendering.
  - `openwhen.js`: Time-locked capsules with client-side countdown synchronization.
  - `profile.js`: User identity display, follower metrics, and saved bookmarks.
  - `notifications.js`: Activity notifications center with background polling.
  - `app.js`: Master router, modal dispatchers, toast system, and global search.

---

## 🚀 1-Click Deployment to Vercel
This repository includes a production-ready `vercel.json` pre-configured with security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`) and clean URL rewrites.

### Steps to Deploy:
1. Sign in to your account at [vercel.com](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Import your `luma-frontend` GitHub repository.
4. Keep the Framework Preset as **"Other"** (Root Directory `./`).
5. Click **"Deploy"**.
6. Within seconds, your live project will be active at:
   ```
   https://<your-project-name>.vercel.app
   ```

---

## 🔗 Connecting with the Backend
By default, the frontend performs relative requests (`/api/*`). When deploying the frontend to Vercel with a backend hosted on Render or Railway, simply specify the backend URL:
- Set `window.LUMA_BACKEND_URL = "https://your-backend.onrender.com"` in `js/api.js`, or
- Enter `localStorage.setItem('luma_backend_url', 'https://your-backend.onrender.com')` in the browser console.

---

## 👤 Developed By
**Hari Chandhana**  
*Department of Computer Science & Engineering*
