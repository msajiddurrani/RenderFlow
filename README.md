# RenderFlow 🎬✨

<p align="center">
  <img src="public/RenderFlow_Logo_1024.png" alt="RenderFlow Logo" width="128" height="128" />
</p>

<p align="center">
  <strong>Turn HTML animations and Markdown slide decks into studio-grade 1080p 60 FPS MP4 videos.</strong>
</p>

<p align="center">
  <a href="https://github.com/msajiddurrani/RenderFlow"><img src="https://img.shields.io/badge/RenderFlow-v1.0.0-4F46E5?style=flat-square" alt="Version"></a>
  <a href="https://github.com/msajiddurrani/RenderFlow/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square" alt="License"></a>
  <a href="https://github.com/msajiddurrani"><img src="https://img.shields.io/badge/GitHub-msajiddurrani-181717?style=flat-square&logo=github" alt="GitHub"></a>
  <a href="https://www.linkedin.com/in/sajiddurrani/"><img src="https://img.shields.io/badge/LinkedIn-sajiddurrani-0A66C2?style=flat-square&logo=linkedin" alt="LinkedIn"></a>
</p>

---

## 🚀 Overview

**RenderFlow** bridges the gap between web motion code and export-ready video files. Without timeline editing software or heavy render pipelines, RenderFlow allows creators, developers, and motion designers to drop in `.html` animations or `.md` presentation slides, inspect them live in an interactive player, and synthesize broadcast-ready MP4 files in seconds.

Dual-engine rendering guarantees RenderFlow works anywhere:
1. **Direct3D11 GPU Node Backend Engine**: Uses headless Chrome and hardware GPU encoding for ultra-fast, frame-accurate 60 FPS renders with audio synchronization.
2. **Client-Side WebCodecs Engine**: Pure in-browser rendering powered by `WebCodecs`, `Canvas`, and `mp4-muxer`. Enables 100% serverless deployments on platforms like **Vercel** with \$0 infrastructure cost and zero timeouts.

---

## ✨ Features

- **⚡ Three-Step Streamlined Pipeline**:
  - **01. Source Ingestion**: Drag-and-drop `.html` or `.md` files or paste source code directly. Automatic duration and timing detection.
  - **02. Real-Time Studio**: Instant 60 FPS canvas preview with playhead scrub, frame playback, and multi-aspect ratio switching (`16:9 Cinema`, `9:16 Reel`, `1:1 Square`).
  - **03. Master Synthesis**: One-click GPU or client-side rendering with live progress HUD, ETA estimator, and instant MP4 download.
- **🎨 Responsive Claymorphic UI**: Light, airy aesthetic featuring 3D morphic illustrations, smooth floating badges, and zero visual clutter.
- **📱 Fully Responsive**: 100% adaptive layouts for mobile viewports (down to 320px), tablets, and ultrawide desktop monitors.
- **📁 Vault & History**: Inspect, download, and delete previous video records with local filesystem and browser storage synchronization.

---

## 🛠️ Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/msajiddurrani/RenderFlow.git
cd RenderFlow
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm start
```
Open **[http://localhost:3333](http://localhost:3333)** in your browser.

---

## 🌐 Deploy to Vercel

RenderFlow is fully configured for instant deployment to **Vercel** using static hosting:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/msajiddurrani/RenderFlow)

1. Push your repository to GitHub: `https://github.com/msajiddurrani/RenderFlow.git`
2. Import the project into your Vercel dashboard.
3. Vercel automatically detects `vercel.json` and serves the production-ready `public/` directory with client-side WebCodecs rendering enabled worldwide.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | Modern Vanilla JS, CSS Glassmorphism / Claymorphism, Responsive Grid & Flexbox |
| **In-Browser Rendering** | WebCodecs API (`VideoEncoder`), Canvas 2D / WebGL, `mp4-muxer`, Web Audio API |
| **Local Studio Backend** | Node.js, Express, Puppeteer (Direct3D11 / SwiftShader), WebSocket, SSE, FFmpeg |
| **Presentation Parser** | `marked.js` markdown compiler with automated slide transitions |

---

## 👤 Author & Connect

**Muhammad Sajid Durrani**

- **GitHub**: [@msajiddurrani](https://github.com/msajiddurrani)
- **LinkedIn**: [in/sajiddurrani](https://www.linkedin.com/in/sajiddurrani/)
- **Repository**: [https://github.com/msajiddurrani/RenderFlow](https://github.com/msajiddurrani/RenderFlow)

---

## 📄 License

Licensed under the [Apache-2.0 License](LICENSE).
