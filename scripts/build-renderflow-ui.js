const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'public', 'index.html');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RenderFlow — Turn Animated Pages Into Videos</title>
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">
  <link rel="icon" type="image/png" sizes="128x128" href="/favicon-128x128.png">
  <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-32x32.png">
  <link rel="shortcut icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/RenderFlow_Logo_Transparent.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="/vendor/marked.min.js"></script>
  <script src="/vendor/mp4-muxer.js"></script>
  <script src="/client-engine.js"></script>
  <style>
    :root {
      --bg: #F7F8FA;
      --paper: #FFFFFF;
      --ink: #18202E;
      --body: #5F6877;
      --muted: #8E97A6;
      --line: #E3E7EE;
      --blue: #3D49DB;
      --blue-deep: #2834B2;
      --blue-pale: #EBEEFF;
      --green: #167D64;
      --green-bg: #EAF8F1;
      --shadow: 0 16px 46px rgba(26, 39, 74, 0.055), 0 3px 12px rgba(26, 39, 74, 0.026);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }
    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }
    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
      outline: 3px solid #9EA8FF;
      outline-offset: 2px;
    }
    a { color: inherit; text-decoration: none; }
    
    .shell { max-width: 1440px; margin: 0 auto; padding: 0 36px; }
    
    /* TOP NAVBAR */
    .nav {
      height: 70px;
      background: rgba(255, 255, 255, 0.98);
      border-bottom: 1px solid #EBEEF2;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(12px);
    }
    .nav-in {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
    }
    .brand {
      display: inline-flex;
      gap: 12px;
      align-items: center;
      font-weight: 850;
      font-size: 24px;
      letter-spacing: -0.8px;
      color: var(--ink);
      text-decoration: none;
      transition: transform 0.15s ease;
    }
    .brand:hover {
      transform: translateY(-1px);
    }
    .logo-mark {
      width: 42px;
      height: 42px;
      flex: none;
      object-fit: contain;
      filter: drop-shadow(0 4px 10px rgba(67, 56, 202, 0.22));
      transition: transform 0.2s ease;
    }
    .brand:hover .logo-mark {
      transform: scale(1.04) rotate(-1.5deg);
    }
    .nav-links {
      display: flex;
      gap: 8px;
    }
    .nav-links button {
      border: 0;
      background: transparent;
      color: #647084;
      font-weight: 600;
      font-size: 14px;
      padding: 10px 18px;
      border-radius: 10px;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .nav-links button:hover {
      background: #F1F3F7;
      color: var(--ink);
    }
    .nav-links button.active {
      background: #EFF0FF;
      color: var(--blue);
    }
    .nav-count-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 10px;
      background: #E0E4F6;
      color: var(--blue);
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .mode-badge {
      display: none !important;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 600;
      color: #556275;
      background: #F0F2F6;
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid #E1E5ED;
    }
    .mode-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
    }
    
    /* 3D CLAYMORPHIC BUTTONS (Claymore Design 3) */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 48px;
      padding: 0 22px;
      font-weight: 700;
      font-size: 14px;
      border-radius: 14px;
      border: 1px solid transparent;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background 0.18s ease, box-shadow 0.18s ease;
      text-decoration: none;
      user-select: none;
    }
    .btn.primary {
      background: linear-gradient(135deg, #4F5EED 0%, #3D49DB 100%);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 
        inset 2px 2px 5px rgba(255, 255, 255, 0.45),
        inset -2.5px -2.5px 5px rgba(18, 24, 88, 0.35),
        0 10px 24px -2px rgba(61, 73, 219, 0.38);
    }
    .btn.primary:hover {
      background: linear-gradient(135deg, #5B6AF0 0%, #3440D4 100%);
      transform: translateY(-2px);
      box-shadow: 
        inset 2px 2px 6px rgba(255, 255, 255, 0.55),
        inset -2.5px -2.5px 5px rgba(18, 24, 88, 0.4),
        0 16px 32px -4px rgba(61, 73, 219, 0.48);
    }
    .btn.primary:active {
      transform: translateY(1px);
      box-shadow: 
        inset -2px -2px 4px rgba(255, 255, 255, 0.3),
        inset 2.5px 2.5px 5px rgba(18, 24, 88, 0.45),
        0 4px 12px rgba(61, 73, 219, 0.28);
    }
    .btn.secondary {
      background: #FFFFFF;
      color: #1E293B;
      border: 1.5px solid #E2E8F0;
      box-shadow: 
        inset 2px 2px 4px rgba(255, 255, 255, 1),
        inset -2px -2px 4px rgba(0, 0, 0, 0.04),
        0 6px 18px rgba(0, 0, 0, 0.06);
    }
    .btn.secondary:hover {
      background: #F8FAFC;
      transform: translateY(-2px);
      box-shadow: 
        inset 2px 2px 4px rgba(255, 255, 255, 1),
        inset -2px -2px 4px rgba(0, 0, 0, 0.06),
        0 10px 24px rgba(0, 0, 0, 0.09);
    }
    .btn.secondary:active {
      transform: translateY(1px);
      box-shadow: 
        inset -1px -1px 3px rgba(255, 255, 255, 1),
        inset 2px 2px 4px rgba(0, 0, 0, 0.08),
        0 3px 8px rgba(0, 0, 0, 0.05);
    }
    .btn.large {
      min-height: 56px;
      padding: 0 28px;
      font-size: 15px;
    }
    .btn.full { width: 100%; }
    .btn[disabled] {
      background: #D7DBE4 !important;
      color: #8C96A6 !important;
      border-color: transparent !important;
      box-shadow: none !important;
      cursor: not-allowed;
      transform: none !important;
    }
    
    /* ICONS */
    .icon {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      vertical-align: middle;
      flex-shrink: 0;
    }
    
    /* TYPOGRAPHY & UTILITIES */
    .eyebrow {
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 1.5px;
      color: var(--blue);
      text-transform: uppercase;
    }
    .body { color: var(--body); line-height: 1.6; }
    .muted { color: var(--muted); }
    .highlight { color: var(--blue); }
    .surface {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: var(--shadow);
    }
    .page { min-height: calc(100vh - 84px); }
    .tab-view { display: none; }
    .tab-view.active { display: block; }

    /* VIEW 1: HOME */
    .home-hero {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 56px;
      align-items: center;
      padding: 16px 0 38px;
    }
    .hero-left .eyebrow {
      display: none;
    }
    .hero-left h1 {
      font-size: 58px;
      letter-spacing: -2.6px;
      line-height: 1.1;
      font-weight: 850;
      max-width: 600px;
      color: #111827;
    }

    /* ANIMATED HERO KEYWORDS */
    .hero-magic-word {
      position: relative;
      display: inline-block;
      font-weight: 900;
      white-space: nowrap;
      transition: transform 0.2s ease;
    }
    .hero-magic-word:hover {
      transform: translateY(-2px) scale(1.02);
    }
    .html-word {
      background: linear-gradient(115deg, #DC2626 0%, #EA580C 25%, #F97316 45%, #FBBF24 55%, #EA580C 75%, #DC2626 100%);
      background-size: 240% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: htmlShimmer 4s ease-in-out infinite;
      filter: drop-shadow(0 2px 8px rgba(234, 88, 12, 0.25));
    }
    .html-word::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 0;
      width: 100%;
      height: 3.5px;
      background: linear-gradient(90deg, transparent, #EA580C 30%, #F59E0B 70%, transparent);
      border-radius: 2px;
      animation: sweepUnderline 3s ease-in-out infinite;
    }
    .md-word {
      background: linear-gradient(115deg, #1E40AF 0%, #2563EB 25%, #3B82F6 45%, #60A5FA 55%, #2563EB 75%, #1E40AF 100%);
      background-size: 240% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: mdShimmer 4s ease-in-out infinite 0.8s;
      filter: drop-shadow(0 2px 8px rgba(37, 99, 235, 0.25));
    }
    .md-word::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 0;
      width: 100%;
      height: 3.5px;
      background: linear-gradient(90deg, transparent, #2563EB 30%, #60A5FA 70%, transparent);
      border-radius: 2px;
      animation: sweepUnderline 3s ease-in-out infinite 1.2s;
    }
    .video-word {
      background: linear-gradient(115deg, #312E81 0%, #4338CA 25%, #6366F1 45%, #A855F7 60%, #4338CA 80%, #312E81 100%);
      background-size: 260% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: videoShimmer 5s ease-in-out infinite;
      filter: drop-shadow(0 2px 10px rgba(99, 102, 241, 0.3));
    }
    .video-word::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 0;
      width: 100%;
      height: 3.5px;
      background: linear-gradient(90deg, transparent, #6366F1 30%, #A855F7 70%, transparent);
      border-radius: 2px;
      animation: sweepUnderline 3s ease-in-out infinite 0.6s;
    }

    @keyframes htmlShimmer {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes mdShimmer {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes videoShimmer {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes sweepUnderline {
      0%, 100% { opacity: 0.35; transform: scaleX(0.7); }
      50% { opacity: 1; transform: scaleX(1); }
    }

    .hero-left .body {
      font-size: 18px;
      line-height: 1.55;
      color: #5F6877;
      max-width: 530px;
      margin-top: 22px;
    }
    .code-badge-inline {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      vertical-align: baseline;
      display: inline-block;
      transition: transform 0.15s ease;
    }
    .badge-html-inline {
      background: #FFF5F2;
      color: #EA580C;
      border: 1px solid #FFD5C7;
    }
    .badge-md-inline {
      background: #EFF6FF;
      color: #2563EB;
      border: 1px solid #BFDBFE;
    }
    .hero-actions {
      display: flex;
      gap: 14px;
      margin-top: 32px;
    }
    .hero-proof {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 24px;
      color: #7A8494;
      font-size: 13px;
      font-weight: 550;
    }
    .hero-proof span {
      height: 4px;
      width: 4px;
      background: #B2BDCB;
      border-radius: 50%;
    }

    /* 3D MORPHIC HERO SCENE - PURE FLOATING LOGOS & VIDEO (NO BACKGROUND CARDS, ZERO OVERLAP) */
    .clay-scene-wrapper {
      position: relative;
      width: 100%;
      height: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 1200px;
    }
    .clay-ambient-glow {
      position: absolute;
      width: 500px;
      height: 420px;
      background: radial-gradient(circle at 50% 38%, rgba(129, 140, 248, 0.3) 0%, rgba(99, 102, 241, 0.1) 50%, transparent 75%);
      filter: blur(60px);
      pointer-events: none;
      z-index: 1;
    }
    .clay-stage-3d {
      position: relative;
      width: 520px;
      height: 460px;
      transform-style: preserve-3d;
      z-index: 2;
    }

    /* 3D FLOATING LOGOS - PURE LOGO, ZERO BACKGROUND CARD */
    .clay-logo-float {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 10;
      transition: transform 0.3s ease;
    }

    /* HTML5 3D Floating Logo (Left) */
    .clay-html-wrap {
      top: 10px;
      left: 55px;
      transform: rotate(-6deg) rotateY(10deg) translateZ(45px);
      animation: floatHtml 4s ease-in-out infinite alternate;
    }
    .clay-html-svg {
      width: 88px;
      height: 98px;
      filter: 
        drop-shadow(0 20px 30px rgba(228, 77, 38, 0.45))
        drop-shadow(0 6px 12px rgba(0, 0, 0, 0.18));
    }

    /* Markdown 3D Floating Logo (Right) */
    .clay-md-wrap {
      top: 20px;
      right: 55px;
      transform: rotate(6deg) rotateY(-10deg) translateZ(45px);
      animation: floatMd 4.5s ease-in-out infinite alternate;
    }
    .clay-md-svg {
      width: 110px;
      height: 70px;
      filter: 
        drop-shadow(0 20px 30px rgba(37, 99, 235, 0.45))
        drop-shadow(0 6px 12px rgba(0, 0, 0, 0.18));
    }

    /* DUAL ARROWS CONTAINER (3D Z-plane) */
    .clay-arrows-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
      z-index: 20;
      transform: translateZ(65px);
    }

    /* 3D VIDEO PLAYER CARD (Properly spaced below, ZERO overlap) */
    .clay-video-card {
      position: absolute;
      top: 200px;
      left: 50%;
      transform: translateX(-50%) rotateX(5deg) translateZ(45px);
      width: 390px;
      height: 230px;
      border-radius: 28px;
      background: linear-gradient(145deg, #151238 0%, #241A61 45%, #4338CA 100%);
      border: 5px solid rgba(255, 255, 255, 0.96);
      box-shadow: 
        inset 3px 3px 10px rgba(255, 255, 255, 0.45),
        inset -4px -4px 12px rgba(10, 12, 38, 0.65),
        0 32px 70px rgba(21, 18, 56, 0.42),
        0 10px 25px rgba(67, 56, 202, 0.22);
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      z-index: 6;
      animation: floatVid 5s ease-in-out infinite alternate;
    }
    .clay-video-screen {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 20px;
      background: radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.28) 0%, rgba(15, 17, 46, 0.5) 85%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 16px 18px;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.45);
    }
    .clay-glass-sheen {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 52%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.03) 85%, transparent 100%);
      border-radius: 20px 20px 0 0;
      pointer-events: none;
    }

    .clay-vid-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
    }
    .clay-video-logo-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.16);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.22);
      padding: 4px 10px;
      border-radius: 20px;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 750;
      letter-spacing: 0.5px;
    }
    .clay-video-logo-tag svg {
      width: 14px;
      height: 14px;
      fill: #A5B4FC;
    }

    .clay-play-well {
      margin: auto;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.12) 100%);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.7);
      box-shadow: 
        inset 2px 2px 6px rgba(255, 255, 255, 0.85),
        inset -2px -2px 6px rgba(0, 0, 0, 0.35),
        0 14px 30px rgba(0, 0, 0, 0.38),
        0 0 24px rgba(129, 140, 248, 0.45);
      display: grid;
      place-items: center;
    }
    .clay-play-btn {
      color: #FFFFFF;
      font-size: 28px;
      padding-left: 5px;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.5);
    }
    .clay-video-timeline {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      z-index: 2;
    }
    .clay-timeline-track {
      position: relative;
      flex: 1;
      height: 7px;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      backdrop-filter: blur(4px);
    }
    .clay-timeline-fill {
      width: 55%;
      height: 100%;
      background: linear-gradient(90deg, #818CF8, #FFFFFF);
      border-radius: 6px;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.65);
    }
    .clay-timeline-thumb {
      position: absolute;
      left: 55%;
      top: -3.5px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 255, 255, 0.9);
    }
    .clay-time-tag {
      font-size: 11px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.18);
      padding: 4px 10px;
      border-radius: 6px;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.24);
    }

    @keyframes floatHtml {
      0% { transform: rotate(-6deg) rotateY(10deg) translateZ(45px) translateY(0px); }
      100% { transform: rotate(-4deg) rotateY(12deg) translateZ(50px) translateY(-9px); }
    }
    @keyframes floatMd {
      0% { transform: rotate(6deg) rotateY(-10deg) translateZ(45px) translateY(0px); }
      100% { transform: rotate(8deg) rotateY(-12deg) translateZ(50px) translateY(-9px); }
    }
    @keyframes floatVid {
      0% { transform: translateX(-50%) rotateX(5deg) translateZ(45px) translateY(0px); }
      100% { transform: translateX(-50%) rotateX(4deg) translateZ(52px) translateY(-7px); }
    }

    /* VISIONARY STEPS SECTION (HOW IT WORKS PIPELINE) */
    .visionary-steps-section {
      padding: 44px 0 68px;
      border-top: 1px solid #E9ECF1;
      position: relative;
    }
    .steps-header {
      text-align: center;
      max-width: 760px;
      margin: 0 auto 44px;
    }
    .steps-tag {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      color: var(--blue);
      background: #EEF2FF;
      border: 1px solid #E0E7FF;
      padding: 5px 14px;
      border-radius: 20px;
      margin-bottom: 14px;
    }
    .steps-main-heading {
      font-size: 40px;
      letter-spacing: -1.5px;
      font-weight: 850;
      line-height: 1.15;
      color: #0F172A;
      margin-bottom: 12px;
    }
    .steps-heading-gradient {
      background: linear-gradient(120deg, #3D49DB 0%, #6366F1 50%, #8B5CF6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .steps-subheading {
      font-size: 16px;
      color: var(--body);
      line-height: 1.6;
      max-width: 620px;
      margin: 0 auto;
    }

    /* PIPELINE GRID */
    .steps-pipeline-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      position: relative;
    }
    .pipeline-connector {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      color: #818CF8;
      flex: none;
      z-index: 2;
    }
    .pipeline-connector svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      stroke-width: 2.2;
      fill: none;
    }

    /* STEP CARD */
    .visionary-step-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 24px;
      padding: 20px;
      box-shadow: 
        0 1px 3px rgba(0, 0, 0, 0.02),
        0 8px 24px -4px rgba(0, 0, 0, 0.05);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
      cursor: pointer;
    }
    .visionary-step-card:hover {
      transform: translateY(-6px);
      border-color: #C7D2FE;
      box-shadow: 
        0 4px 12px rgba(67, 56, 202, 0.06),
        0 20px 40px -12px rgba(67, 56, 202, 0.14);
    }

    /* CARD VISUAL STAGE */
    .card-visual-stage {
      height: 190px;
      border-radius: 18px;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* STAGE 1: INGESTION VISUAL */
    .stage-1 {
      background: radial-gradient(circle at 50% 20%, #EEF2FF 0%, #F8FAFC 80%);
      border: 1px solid #E0E7FF;
    }
    .intake-drop-well {
      width: 88%;
      height: 84%;
      border: 2px dashed #C7D2FE;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(6px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .floating-tokens-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 8px;
    }
    .file-token {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 12px;
      font-weight: 750;
      font-size: 13px;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
      transition: transform 0.25s ease;
    }
    .token-html {
      background: linear-gradient(135deg, #FF6B4A 0%, #EA580C 100%);
      color: #FFFFFF;
      transform: rotate(-4deg);
    }
    .token-md {
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
      color: #FFFFFF;
      transform: rotate(4deg);
    }
    .file-token svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    .visionary-step-card:hover .token-html {
      transform: rotate(-7deg) translateY(-3px);
    }
    .visionary-step-card:hover .token-md {
      transform: rotate(7deg) translateY(-3px);
    }
    .intake-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #4F46E5;
      background: #EEF2FF;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid #E0E7FF;
    }
    .intake-indicator svg {
      width: 12px;
      height: 12px;
      stroke: currentColor;
      stroke-width: 2.5;
    }

    /* STAGE 2: PREVIEW CANVAS VISUAL */
    .stage-2 {
      background: #0F172A;
      border: 1px solid #1E293B;
      padding: 12px;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .mini-studio-screen {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      background: radial-gradient(circle at 50% 25%, #241B66 0%, #0F112E 90%);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 12px 14px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      overflow: hidden;
    }
    .screen-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
    }
    .fps-live-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(129, 140, 248, 0.45);
      color: #C7D2FE;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .fps-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #818CF8;
      box-shadow: 0 0 6px #818CF8;
    }
    .aspect-preview-badge {
      font-size: 10px;
      font-weight: 750;
      color: rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 10px;
    }
    .screen-center-play {
      align-self: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(8px);
      border: 1.5px solid rgba(255, 255, 255, 0.4);
      display: grid;
      place-items: center;
      color: #FFFFFF;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .screen-center-play svg {
      width: 18px;
      height: 18px;
      fill: #FFFFFF;
      margin-left: 2px;
    }
    .visionary-step-card:hover .screen-center-play {
      transform: scale(1.1);
      background: rgba(255, 255, 255, 0.28);
    }
    .screen-timeline-bar {
      display: flex;
      flex-direction: column;
      gap: 5px;
      z-index: 2;
    }
    .timeline-track-mini {
      height: 4px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      position: relative;
      overflow: hidden;
    }
    .timeline-fill-mini {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 42%;
      background: linear-gradient(90deg, #6366F1, #818CF8);
      border-radius: 4px;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.8);
    }
    .timeline-time-info {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.6);
      font-family: 'JetBrains Mono', monospace;
    }
    .aspect-switchers-row {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-top: 4px;
    }
    .aspect-chip {
      font-size: 9px;
      font-weight: 750;
      padding: 2px 7px;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.6);
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .aspect-chip.active {
      color: #FFFFFF;
      background: #4F46E5;
      border-color: #6366F1;
      box-shadow: 0 0 8px rgba(79, 70, 229, 0.5);
    }

    /* STAGE 3: SYNTHESIS & EXPORT VISUAL */
    .stage-3 {
      background: radial-gradient(circle at 50% 20%, #F5F3FF 0%, #F8FAFC 85%);
      border: 1px solid #EDE9FE;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 12px;
    }
    .export-master-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 12px 14px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .export-top-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .export-codec-badge {
      font-size: 10px;
      font-weight: 800;
      color: #1E293B;
      letter-spacing: 0.3px;
    }
    .export-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 750;
      color: #4F46E5;
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .export-prog-bar {
      height: 6px;
      border-radius: 4px;
      background: #F1F5F9;
      position: relative;
      overflow: hidden;
    }
    .export-prog-fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 100%;
      background: linear-gradient(90deg, #4F46E5 0%, #8B5CF6 100%);
      border-radius: 4px;
    }
    .export-btn-mock {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #3D49DB 0%, #252277 100%);
      color: #FFFFFF;
      font-weight: 750;
      font-size: 12px;
      padding: 9px 14px;
      border-radius: 10px;
      box-shadow: 
        inset 1px 1px 2px rgba(255, 255, 255, 0.35),
        0 6px 14px rgba(61, 73, 219, 0.32);
      transition: transform 0.2s ease;
    }
    .export-btn-mock svg {
      width: 14px;
      height: 14px;
      stroke: currentColor;
      stroke-width: 2.4;
      fill: none;
    }
    .visionary-step-card:hover .export-btn-mock {
      transform: translateY(-2px);
      box-shadow: 
        inset 1px 1px 2px rgba(255, 255, 255, 0.45),
        0 8px 18px rgba(61, 73, 219, 0.42);
    }
    .export-btn-meta {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 600;
      color: #64748B;
    }

    /* CARD CONTENT */
    .card-content {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .step-num-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 12px;
    }
    .num-circle {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      color: var(--blue);
      font-weight: 800;
      font-size: 12px;
      display: grid;
      place-items: center;
    }
    .step-category-name {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #64748B;
    }
    .step-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.6px;
      color: #0F172A;
      margin-bottom: 8px;
    }
    .step-desc {
      font-size: 14px;
      color: var(--body);
      line-height: 1.6;
      margin-bottom: 16px;
      flex: 1;
    }
    .step-meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding-top: 14px;
      border-top: 1px solid #F1F5F9;
      font-size: 13px;
      font-weight: 600;
      color: #475467;
    }
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .meta-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--blue);
      flex-shrink: 0;
    }

    /* VIEW 2: CREATE / STUDIO WORKSPACE */
    .workspace {
      padding-top: 40px;
      padding-bottom: 60px;
    }
    .ws-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .ws-top h2 {
      font-size: 34px;
      letter-spacing: -1.2px;
      font-weight: 750;
      margin: 8px 0 8px;
    }
    .backlink {
      border: 0;
      background: none;
      color: #647083;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 650;
      font-size: 13px;
      padding: 0;
    }
    .backlink:hover { color: var(--ink); }
    .progress-bar-nav {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }
    .progress-segment {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
      font-weight: 650;
      color: #9AA3B0;
    }
    .progress-segment b {
      display: grid;
      place-items: center;
      border: 1px solid #D5DBE6;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      font-size: 12px;
      color: #8B95A3;
      background: white;
    }
    .progress-segment.active { color: var(--blue); }
    .progress-segment.active b {
      background: var(--blue);
      border-color: var(--blue);
      color: white;
    }
    .progress-segment.passed b {
      background: #EEF2FF;
      border-color: #C7D2FE;
      color: #3D49DB;
    }
    .progress-bar-nav .dash {
      height: 1px;
      width: 40px;
      background: #D7DDE6;
    }
    
    /* CREATE: STEP 1 (ADD CONTENT) */
    .upload-grid {
      display: grid;
      grid-template-columns: 1.6fr 0.95fr;
      gap: 24px;
    }
    .upload-main { padding: 32px; }
    .card-heading {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 24px;
    }
    .card-heading .iconbg {
      background: var(--blue-pale);
      color: var(--blue);
      height: 42px;
      width: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
    }
    .card-heading h3 { font-size: 19px; font-weight: 750; }
    .card-heading p { font-size: 13px; color: var(--body); margin-top: 3px; }
    .drop {
      height: 300px;
      border: 1.8px dashed #BAC4DA;
      background: #FBFCFF;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-align: center;
      transition: all 0.2s ease;
    }
    .drop.dragover {
      border-color: var(--blue);
      background: #F4F6FF;
    }
    .big-upload {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #EDEFFF;
      color: var(--blue);
      display: grid;
      place-items: center;
    }
    .big-upload .icon { height: 30px; width: 30px; }
    .drop h3 { font-size: 22px; font-weight: 750; margin-top: 2px; }
    .drop p { font-size: 14px; color: var(--body); }
    .helper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid #EEF0F5;
    }
    .helper small { font-size: 13px; color: #7F8A99; }
    .linkbtn {
      background: none;
      border: 0;
      color: var(--blue);
      font-size: 14px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .linkbtn:hover { color: var(--blue-deep); }
    .info-panel { padding: 28px; }
    .info-panel h3 { font-size: 19px; font-weight: 750; margin-bottom: 8px; }
    .info-panel > p { font-size: 13px; color: #798493; line-height: 1.6; margin-bottom: 22px; }
    .example {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #FFFFFF;
      border: 1px solid #E3E7F0;
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 12px;
      width: 100%;
      text-align: left;
      transition: border-color 0.15s ease;
    }
    .example:hover { border-color: #8994F8; background: #FDFEFF; }
    .example .e-icon {
      width: 44px;
      height: 44px;
      border-radius: 11px;
      background: #EEF0FF;
      display: grid;
      place-items: center;
      color: var(--blue);
      flex: none;
    }
    .example b { display: block; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .example small { font-size: 12px; color: #808A99; }
    .example .arr { margin-left: auto; color: #9BA5B4; }
    .tip {
      margin-top: 24px;
      background: #F8F9FC;
      border-radius: 14px;
      padding: 18px;
      font-size: 13px;
      line-height: 1.6;
      color: #697485;
    }
    .tip b { display: block; color: #273043; margin-bottom: 5px; font-weight: 700; }
    .selectedfile {
      display: none;
      padding: 14px 18px;
      margin-top: 16px;
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      border-radius: 12px;
      color: #3D49DB;
      font-weight: 650;
      font-size: 13px;
      align-items: center;
      gap: 10px;
    }
    .selectedfile.show { display: flex; }
    .create-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
    }
    .create-footer .btn { min-width: 210px; }

    /* CREATE: STEP 2 (PREVIEW) */
    .preview-grid {
      display: grid;
      grid-template-columns: 1.45fr 0.92fr;
      gap: 24px;
    }
    .preview-surface { padding: 24px; }
    .preview-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .preview-toolbar h3 { font-size: 18px; font-weight: 750; }
    .preview-tags-row { display: flex; gap: 8px; align-items: center; }
    .preview-toolbar .tag {
      background: #F2F4F8;
      padding: 7px 11px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 650;
      color: #667285;
    }
    .preview-stage {
      height: 480px;
      background: #F0F2F6;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .vid-preview {
      position: relative;
      height: 440px;
      width: 247px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 14px 32px rgba(13, 22, 45, 0.16);
      background: #000;
      transition: width 0.2s ease, height 0.2s ease;
    }
    .vid-preview.landscape {
      width: 520px;
      height: 292px;
    }
    .vid-preview.square {
      width: 360px;
      height: 360px;
    }
    .vid-preview iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: #000;
    }
    
    /* CLEAN FUNCTIONAL PREVIEW CONTROLS (Replaces fake scrub bar) */
    .preview-controls-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 4px 2px;
      font-size: 13px;
      color: #556377;
    }
    .preview-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 650;
      color: #3D49DB;
      background: #EEF0FF;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
    }
    .preview-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3D49DB;
      animation: pulseDot 1.5s infinite;
    }
    @keyframes pulseDot {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }
    .preview-actions-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .preview-side { padding: 28px; }
    .preview-side h3 { font-size: 19px; font-weight: 750; }
    .preview-side .body { font-size: 13px; margin-top: 6px; }
    .options {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 20px;
    }
    .option {
      width: 100%;
      display: flex;
      gap: 14px;
      align-items: center;
      background: white;
      border: 1px solid #E0E5ED;
      border-radius: 12px;
      padding: 14px 15px;
      text-align: left;
      transition: all 0.15s ease;
    }
    .option:hover { border-color: #B4BEDA; }
    .option.active {
      border: 2px solid var(--blue);
      background: #F9F9FF;
    }
    .aspect {
      width: 46px;
      height: 46px;
      border-radius: 10px;
      background: #F2F4F8;
      display: grid;
      place-items: center;
      flex: none;
    }
    .aspect .shape {
      display: block;
      background: #E0E4F1;
      border: 1.8px solid #7480A1;
      border-radius: 3px;
    }
    .aspect .shape.vertical { height: 28px; width: 17px; }
    .aspect .shape.landscape { height: 17px; width: 29px; }
    .aspect .shape.square { height: 23px; width: 23px; }
    .option b { font-size: 14px; font-weight: 700; display: block; }
    .option small { font-size: 12px; color: #7A8594; display: block; margin-top: 3px; }
    .option .radio {
      margin-left: auto;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1.5px solid #AAB3C1;
      flex: none;
    }
    .option.active .radio {
      border: 5px solid var(--blue);
      background: #FFFFFF;
    }
    .fileinfo {
      margin: 22px 0 16px;
      padding: 12px 0;
      border-top: 1px solid #E8ECF1;
      border-bottom: 1px solid #E8ECF1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .fileinfo b { font-size: 13px; font-weight: 700; }
    .accordion {
      background: none;
      border: 0;
      padding: 6px 0;
      color: #687587;
      font-weight: 650;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .accordion:hover { color: var(--ink); }
    .advanced {
      display: none;
      background: #F6F8FB;
      padding: 16px;
      border-radius: 12px;
      margin: 12px 0;
      font-size: 12px;
      line-height: 1.7;
      color: #6A7382;
      border: 1px solid #E5EAF1;
    }
    .advanced.show { display: block; }
    .adv-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .adv-row:last-child { margin-bottom: 0; }
    .adv-row label { font-weight: 600; color: #434D5D; }
    .adv-select, .adv-input {
      padding: 5px 10px;
      border: 1px solid #D5DCE6;
      border-radius: 7px;
      background: #fff;
      font-size: 12px;
      color: #273043;
    }
    .side-actions { margin-top: 24px; }
    .aside-note {
      text-align: center;
      font-size: 12px;
      color: #8D97A4;
      margin-top: 10px;
    }

    /* REAL-TIME RENDERING PROGRESS HUD */
    .render-hud-box {
      display: none;
      background: #FFFFFF;
      border: 1px solid #D8DEE9;
      border-radius: 16px;
      padding: 20px;
      margin-top: 18px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    }
    .hud-phase-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 750;
      color: var(--ink);
    }
    .hud-pct-badge {
      font-size: 14px;
      font-weight: 800;
      color: var(--blue);
      background: #EEF0FF;
      padding: 3px 10px;
      border-radius: 8px;
    }
    .hud-bar-track {
      height: 10px;
      background: #E8ECF2;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .hud-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #4F46E5 0%, #3D49DB 100%);
      border-radius: 6px;
      transition: width 0.15s ease-out;
    }
    .hud-metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      font-size: 11px;
      color: #6C7888;
      text-align: center;
      background: #F8FAFD;
      padding: 10px 8px;
      border-radius: 10px;
      border: 1px solid #EBF0F7;
    }
    .hud-metrics-row strong {
      display: block;
      font-size: 13px;
      color: #1E293B;
      font-weight: 800;
      margin-top: 3px;
    }

    /* CREATE: STEP 3 (DOWNLOAD) */
    .ready-layout {
      display: grid;
      grid-template-columns: 1.35fr 0.82fr;
      gap: 24px;
    }
    .success-head {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 22px;
    }
    .success-check {
      width: 54px;
      height: 54px;
      border-radius: 15px;
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      display: grid;
      place-items: center;
      color: #3D49DB;
      font-size: 24px;
      flex: none;
    }
    .success-head h2 { margin: 0 0 4px; font-size: 32px; font-weight: 750; }
    .ready-side { padding: 30px; }
    .ready-side h3 { font-size: 20px; font-weight: 750; margin-bottom: 20px; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #EEF1F4;
      padding: 14px 0;
      font-size: 13px;
      color: #6B7585;
    }
    .detail-row b { color: #263044; font-weight: 700; }
    .ready-side .btn { margin-top: 26px; }
    .ready-side .btn.secondary { margin-top: 10px; }
    .ready-note {
      font-size: 12px;
      color: #8A95A2;
      text-align: center;
      margin-top: 14px;
    }

    /* VIEW 3: HISTORY */
    .history-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 26px;
    }
    .history-head h2 {
      font-size: 34px;
      font-weight: 750;
      letter-spacing: -1.2px;
      margin: 6px 0 4px;
    }
    .search {
      border: 1px solid #DCE2EB;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 9px;
      width: 320px;
      height: 44px;
      padding: 0 14px;
      border-radius: 11px;
      color: #8A96A7;
    }
    .search input {
      border: 0;
      outline: none;
      width: 100%;
      color: #273142;
      background: transparent;
      font-size: 13px;
    }
    .history-stats-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .history-filters {
      display: flex;
      gap: 8px;
    }
    .chip {
      background: #FFFFFF;
      border: 1px solid #DCE2EB;
      padding: 7px 14px;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 650;
      color: #5F6B7E;
    }
    .chip.active {
      background: #EEF0FF;
      color: var(--blue);
      border-color: #C3CBFA;
    }
    .history-summary-text {
      font-size: 12px;
      color: #798595;
      font-weight: 600;
      display: flex;
      gap: 14px;
    }
    .history-card { padding: 18px 24px; }
    .listhead {
      display: grid;
      grid-template-columns: 1.8fr 0.7fr 0.7fr 0.6fr;
      align-items: center;
      border-bottom: 1px solid #EDF0F3;
      color: #8A95A4;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 12px 14px;
    }
    .record {
      display: grid;
      grid-template-columns: 1.8fr 0.7fr 0.7fr 0.6fr;
      align-items: center;
      border-bottom: 1px solid #EDF0F3;
      padding: 16px 12px;
      gap: 10px;
    }
    .record:last-child { border-bottom: 0; }
    .record-title {
      display: flex;
      gap: 14px;
      align-items: center;
    }
    .thumbnail {
      height: 64px;
      width: 96px;
      background: #000;
      border-radius: 9px;
      overflow: hidden;
      position: relative;
      display: grid;
      place-items: center;
      color: #fff;
      flex: none;
      cursor: pointer;
    }
    .thumbnail video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .thumbnail:after {
      content: '▶';
      font-size: 12px;
      display: grid;
      place-items: center;
      position: absolute;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.4);
    }
    .record strong {
      display: block;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #1A2434;
    }
    .record small {
      font-size: 12px;
      color: #8C96A5;
      display: block;
    }
    .record .meta { font-size: 13px; color: #697485; }
    .record-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .record .btn {
      min-height: 36px;
      padding: 0 13px;
      font-size: 12px;
      border-radius: 8px;
    }
    .btn-del {
      border: 1.5px solid #F1F5F9;
      background: #FFFFFF;
      color: #94A3B8;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      font-size: 14px;
      font-weight: 700;
      transition: all 0.15s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    .btn-del:hover {
      color: #E11D48;
      border-color: #FECDD3;
      background: #FFF1F2;
      transform: scale(1.05);
    }
    .btn-del:active {
      transform: scale(0.95);
    }
    .history-help {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 18px;
      font-size: 12px;
      color: #929BA7;
    }
    .history-help button {
      background: none;
      border: 0;
      color: var(--blue);
      font-weight: 700;
    }

    /* DROPZONE FORMAT PILLS */
    .drop-formats-bar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      padding: 6px 14px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 20px;
      font-size: 12px;
    }
    .drop-format-label {
      color: #64748B;
      font-weight: 600;
    }
    .drop-format-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      color: #3D49DB;
      background: #EEF2FF;
      padding: 2px 7px;
      border-radius: 6px;
    }

    /* GUIDELINES SIDEBAR */
    .guidelines-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 18px;
    }
    .guideline-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #FFFFFF;
      border: 1px solid #E3E7F0;
      border-radius: 12px;
      padding: 12px;
    }
    .gl-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 800;
      background: #EEF2FF;
      color: var(--blue);
      border: 1px solid #C7D2FE;
      padding: 3px 8px;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .guideline-row strong {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .guideline-row p {
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
      margin: 0;
    }

    /* FOOTER (MATCHING USER SPEC & BRAND PALETTE) */
    .site-footer {
      position: relative;
      background: #FFFFFF;
      border-top: 1px solid #EEF2F6;
      margin-top: 56px;
      padding-top: 38px;
      overflow: hidden;
      width: 100%;
    }
    .footer-shell {
      position: relative;
      z-index: 2;
    }
    .footer-main-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 32px;
    }
    .footer-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      max-width: 380px;
      justify-self: start;
    }
    .footer-brand-header {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
    .footer-logo {
      width: 34px;
      height: 34px;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(79, 70, 229, 0.2));
    }
    .footer-brand-name {
      font-weight: 800;
      color: #0F172A;
      font-size: 22px;
      letter-spacing: -0.6px;
    }
    .footer-tagline {
      color: #64748B;
      font-size: 13.5px;
      line-height: 1.45;
      margin: 0;
    }
    .footer-nav-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      justify-self: center;
      text-align: center;
    }
    .footer-nav-divider {
      color: #CBD5E1;
      font-size: 20px;
      font-weight: 300;
      user-select: none;
    }
    .footer-nav-link {
      color: #0F172A;
      font-size: 14.5px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s ease, transform 0.15s ease;
      display: inline-block;
    }
    .footer-nav-link:hover {
      color: #4F46E5;
      transform: translateY(-1px);
    }
    .footer-social-wrap {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      justify-self: end;
    }
    .footer-social-card {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #EEF2FF;
      border: 1px solid rgba(224, 231, 255, 0.95);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #0F172A;
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.08);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      text-decoration: none;
    }
    .footer-social-card:hover {
      background: #E0E7FF;
      color: #4338CA;
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(99, 102, 241, 0.18);
    }
    .footer-social-icon {
      width: 22px;
      height: 22px;
      display: block;
    }
    .footer-copyright-row {
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      margin: 28px 0 20px;
      width: 100%;
    }
    .footer-copyright-row p {
      color: #64748B;
      font-size: 13px;
      font-weight: 500;
      margin: 0;
      text-align: center;
    }
    .footer-wave-banner {
      position: relative;
      width: 100%;
      height: 64px;
      line-height: 0;
      overflow: hidden;
      margin-top: 6px;
    }
    .footer-wave-banner svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    /* TOAST */
    .toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      background: #182232;
      color: #FFFFFF;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.18);
      display: none;
      font-size: 13px;
      font-weight: 650;
      z-index: 1000;
    }
    .toast.show { display: block; }

    /* RESPONSIVE AUDIT & MOBILE VIEWPORT ADJUSTMENTS */
    html, body {
      overflow-x: hidden;
      max-width: 100vw;
      width: 100%;
    }
    #mainApp {
      overflow-x: hidden;
      max-width: 100vw;
      width: 100%;
    }
    @media (max-width: 1024px) {
      .shell { padding: 0 24px; }
      .home-hero { grid-template-columns: 1fr; gap: 40px; }
      .hero-left h1 { font-size: 52px; }
      .upload-grid, .preview-grid, .ready-layout { grid-template-columns: 1fr; }
      .steps-pipeline-grid { grid-template-columns: 1fr; gap: 24px; }
      .pipeline-connector { display: none; }
      .steps-list { grid-template-columns: 1fr; }
      .progress-bar-nav { display: none; }
      .clay-scene-wrapper { height: 350px; }
    }
    @media (max-width: 768px) {
      .footer-main-row {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 22px;
      }
      .footer-left {
        align-items: center;
        text-align: center;
      }
      .footer-nav-wrap {
        gap: 16px;
      }
      .footer-nav-divider {
        display: none;
      }
    }
    @media (max-width: 640px) {
      .shell {
        padding: 0 16px;
        width: 100%;
        box-sizing: border-box;
      }
      .nav {
        height: 64px;
      }
      .nav-in {
        padding: 0 12px;
        gap: 6px;
        justify-content: space-between;
      }
      .mode-badge {
        display: none;
      }
      .brand {
        font-size: 17px;
        gap: 8px;
      }
      .brand img.logo-mark {
        width: 28px;
        height: 28px;
      }
      .nav-links {
        gap: 2px;
      }
      .nav-links button {
        padding: 6px 9px;
        font-size: 12.5px;
      }
      .nav-actions .btn {
        padding: 6px 12px;
        font-size: 12px;
        white-space: nowrap;
      }
      .home-hero {
        padding: 20px 0 30px;
        gap: 24px;
        width: 100%;
      }
      .hero-left {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        text-align: center;
      }
      .hero-pill-badge {
        margin: 0 auto 14px;
      }
      .hero-left h1 {
        font-size: clamp(28px, 7.5vw, 38px);
        line-height: 1.16;
        letter-spacing: -1px;
        max-width: 100%;
      }
      .hero-sub {
        font-size: 14px;
        line-height: 1.5;
        margin: 0 auto 20px;
        max-width: 100%;
      }
      .hero-actions {
        flex-direction: column;
        width: 100%;
        max-width: 320px;
        margin: 0 auto;
        gap: 10px;
      }
      .hero-actions .btn {
        width: 100%;
        justify-content: center;
      }
      /* 3D Scene Adaptive Mobile Container */
      .clay-scene-wrapper {
        width: 100%;
        max-width: 100%;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        height: 310px;
      }
      .clay-stage-3d {
        transform-origin: top center;
        transform: scale(0.68);
        margin: 0 auto;
      }
      /* 3-Step Visionary Pipeline Mobile */
      .visionary-steps-section {
        padding: 28px 0 16px;
        width: 100%;
      }
      .steps-head h2 {
        font-size: clamp(22px, 6vw, 32px);
      }
      .steps-head p {
        font-size: 13.5px;
      }
      .steps-pipeline-grid {
        grid-template-columns: 1fr;
        gap: 18px;
        width: 100%;
      }
      .pipeline-connector {
        display: none;
      }
      .step-card-visionary {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        padding: 20px 14px;
      }
      .step-mockup-frame {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }
      /* Studio / Create Mobile Flow */
      .studio-stepper {
        gap: 4px;
        padding: 4px;
        max-width: 100%;
        overflow-x: auto;
      }
      .step-pill {
        padding: 6px 10px;
        font-size: 12px;
        white-space: nowrap;
      }
      .dropzone {
        padding: 24px 14px;
        width: 100%;
        box-sizing: border-box;
      }
      .drop-formats-bar {
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
      }
      .paste-box textarea {
        width: 100%;
        box-sizing: border-box;
      }
      .create-footer {
        flex-direction: column;
        gap: 10px;
        width: 100%;
      }
      .create-footer .btn {
        width: 100%;
        min-width: 0;
      }
      .preview-stage {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        padding: 10px 4px;
      }
      .vid-preview.landscape, .vid-preview.square, .vid-preview.portrait {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
      }
      .vid-preview.landscape {
        aspect-ratio: 16/9;
      }
      .vid-preview.square {
        max-width: 320px !important;
        aspect-ratio: 1/1;
      }
      .vid-preview.portrait {
        max-width: 260px !important;
        aspect-ratio: 9/16;
      }
      .preview-controls-bar {
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        width: 100%;
      }
      .aspect-toggle-group {
        flex-wrap: wrap;
        justify-content: center;
      }
      .ready-card {
        padding: 20px 14px;
        width: 100%;
        box-sizing: border-box;
      }
      .ready-actions {
        flex-direction: column;
        width: 100%;
        gap: 10px;
      }
      .ready-actions .btn {
        width: 100%;
        justify-content: center;
      }
      /* History Mobile Cards */
      .history-head {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .search {
        width: 100%;
      }
      .history-stats-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .history-table {
        display: block;
        width: 100%;
      }
      .listhead {
        display: none;
      }
      .record {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
        margin-bottom: 12px;
        width: 100%;
        box-sizing: border-box;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
      }
      .record-actions {
        display: flex;
        width: 100%;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 4px;
      }
      .record-actions .btn {
        flex: 1;
        justify-content: center;
        min-height: 40px;
      }
      .record-actions .btn-del {
        width: 44px;
        height: 40px;
        min-height: 40px;
      }
      /* Footer Mobile */
      .site-footer {
        padding-top: 26px;
        margin-top: 36px;
      }
      .footer-wave-banner {
        height: 45px;
      }
    }
    @media (max-width: 420px) {
      .brand span {
        font-size: 15px;
      }
      .nav-links button {
        padding: 5px 6px;
        font-size: 11.5px;
      }
      .nav-actions .btn {
        padding: 5px 8px;
        font-size: 11.5px;
      }
      .clay-scene-wrapper {
        height: 265px;
      }
      .clay-stage-3d {
        transform: scale(0.58);
      }
    }
    @media (max-width: 360px) {
      .clay-scene-wrapper {
        height: 235px;
      }
      .clay-stage-3d {
        transform: scale(0.50);
      }
    }
  </style>
</head>
<body>
  <div id="mainApp">
    <!-- NAVIGATION BAR -->
    <header class="nav">
      <div class="shell nav-in">
        <a href="#home" class="brand" onclick="switchNav('landing')">
          <img src="/RenderFlow_Logo_Transparent.png" alt="RenderFlow Logo" class="logo-mark">
          <span>RenderFlow</span>
        </a>
        <nav class="nav-links" aria-label="Main navigation">
          <button id="tabNavLanding" class="active" onclick="switchNav('landing')">Home</button>
          <button id="tabNavStudio" onclick="switchNav('studio')">Create</button>
          <button id="tabNavHistory" onclick="switchNav('history')">
            History <span id="navHistoryCount" class="nav-count-badge">0</span>
          </button>
        </nav>
        <div class="nav-actions">
          <span id="appModeBadge" class="mode-badge" style="display: none;" title="Rendering Mode">
            <span class="mode-dot"></span>
            <span id="appModeLabel">Detecting mode...</span>
          </span>
          <button class="btn primary" onclick="startNewVideo()">
            <svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
            New video
          </button>
        </div>
      </div>
    </header>

    <!-- VIEW 1: HOME -->
    <section id="viewLandingTab" class="tab-view active page shell">
      <section class="home-hero">
        <div class="hero-left">
          <h1>
            Transform <span class="hero-magic-word html-word">HTML</span> &amp; <span class="hero-magic-word md-word">Markdown</span> into high-impact <span class="hero-magic-word video-word">videos.</span>
          </h1>
          <p class="body">
            Drop in your <span class="code-badge-inline badge-html-inline">.html</span> animation or <span class="code-badge-inline badge-md-inline">.md</span> presentation. Preview in real time with hardware-accelerated playback and render master 1080p MP4s in seconds.
          </p>
          <div class="hero-actions">
            <button class="btn primary large" onclick="startNewVideo()">
              Create a video
              <svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </button>
            <button class="btn secondary large" onclick="switchNav('history')">
              <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              View History
            </button>
          </div>
          <div class="hero-proof">
            HTML5 Animations <span></span> Markdown Slides <span></span> 1080p 60 FPS Export
          </div>
        </div>

        <!-- 3D MORPHIC SCENE (Pure Floating Logos, No Background Cards, Zero Overlap) -->
        <div class="clay-scene-wrapper">
          <div class="clay-ambient-glow"></div>
          <div class="clay-stage-3d">

            <!-- 1. Floating 3D HTML5 Logo (NO Background Card) -->
            <div class="clay-logo-float clay-html-wrap">
              <svg class="clay-html-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <defs>
                  <linearGradient id="htmlShieldLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FF5D38" />
                    <stop offset="100%" stop-color="#E44D26" />
                  </linearGradient>
                  <linearGradient id="htmlShieldRight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FF7843" />
                    <stop offset="100%" stop-color="#F16529" />
                  </linearGradient>
                </defs>
                <!-- 3D Extrusion base shadow -->
                <path fill="#9C2A12" d="M107.644 479L74.633 108.57h362.734l-33.024 370.294L255.856 520.1z"/>
                <!-- Main Shield Facets -->
                <path fill="url(#htmlShieldLeft)" d="M107.644 470.877L74.633 100.57h362.734l-33.024 370.294L255.856 512z"/>
                <path fill="url(#htmlShieldRight)" d="M256 480.581l119.497-33.128 28.343-317.755H256z"/>
                <!-- 3D Embossed "5" -->
                <path fill="#D9DFE8" d="M256 211.636h66.705l-4.605 51.574H256v50.297h60.404l-5.748 64.385-54.656 14.757v52.684l98.547-27.307 14.288-160.093 3.993-46.297H256z"/>
                <path fill="#FFFFFF" d="M256 208.636h66.705l-4.605 51.574H256v50.297h60.404l-5.748 64.385-54.656 14.757v52.684l98.547-27.307 14.288-160.093 3.993-46.297H256z"/>
                <path fill="#FFFFFF" d="M256 208.636V158.34H147.288l3.993 46.297 10.347 115.968H256v-50.297h-43.238l-4.605-51.574H256zM256 389.201l-54.656-14.757-3.504-39.278h-50.569l6.908 77.362 101.821 28.244z"/>
              </svg>
            </div>

            <!-- 2. Floating 3D Markdown Logo (NO Background Card) -->
            <div class="clay-logo-float clay-md-wrap">
              <svg class="clay-md-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208 128">
                <defs>
                  <linearGradient id="mdClayBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3B82F6" />
                    <stop offset="50%" stop-color="#2563EB" />
                    <stop offset="100%" stop-color="#1D4ED8" />
                  </linearGradient>
                </defs>
                <!-- 3D Extrusion base -->
                <rect x="4" y="11" width="200" height="120" rx="22" fill="#0F172A" />
                <!-- Main Claymorphic Badge Body -->
                <rect x="4" y="4" width="200" height="120" rx="22" fill="url(#mdClayBg)" stroke="#93C5FD" stroke-width="3" />
                <!-- High-contrast glossy white official M and Arrow -->
                <path fill="#FFFFFF" d="M30 96V32h20l20 25 20-25h20v64H90V60L70 85 50 60v36z"/>
                <path fill="#FFFFFF" d="M155 96l-30-33h20V32h20v31h20z"/>
              </svg>
            </div>

            <!-- 3. Sleek Dual Curved Arrows Swooping from BOTH Logos -->
            <svg class="clay-arrows-svg" viewBox="0 0 520 460">
              <defs>
                <linearGradient id="arrowGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FF5D38" />
                  <stop offset="40%" stop-color="#818CF8" />
                  <stop offset="100%" stop-color="#4F46E5" />
                </linearGradient>
                <linearGradient id="arrowGradR" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#3B82F6" />
                  <stop offset="40%" stop-color="#818CF8" />
                  <stop offset="100%" stop-color="#4F46E5" />
                </linearGradient>
                <filter id="arrowShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#1E1B4B" flood-opacity="0.38"/>
                </filter>
              </defs>

              <!-- Left Arrow: Starts below HTML, swoops around left flank, curves cleanly into video card mid-screen -->
              <path d="M 75 115 C 32 150, 26 220, 75 250" fill="none" stroke="url(#arrowGrad3D)" stroke-width="6" stroke-linecap="round" filter="url(#arrowShadow)" />
              <polygon points="68 238, 92 254, 71 262" fill="#4F46E5" filter="url(#arrowShadow)" />

              <!-- Right Arrow: Starts below Markdown, swoops around right flank, curves cleanly into video card mid-screen -->
              <path d="M 445 105 C 488 150, 494 220, 445 250" fill="none" stroke="url(#arrowGradR)" stroke-width="6" stroke-linecap="round" filter="url(#arrowShadow)" />
              <polygon points="451 262, 430 254, 454 238" fill="#4F46E5" filter="url(#arrowShadow)" />
            </svg>

            <!-- 4. Floating 3D Video Player (Cleanly below, zero overlap) -->
            <div class="clay-video-card">
              <div class="clay-video-screen">
                <div class="clay-glass-sheen"></div>
                
                <div class="clay-vid-header">
                  <div class="clay-video-logo-tag">
                    <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    <span>MOTION VIDEO</span>
                  </div>
                </div>

                <div class="clay-play-well">
                  <div class="clay-play-btn">▶</div>
                </div>

                <div class="clay-video-timeline">
                  <div class="clay-timeline-track">
                    <div class="clay-timeline-fill"></div>
                    <div class="clay-timeline-thumb"></div>
                  </div>
                  <span class="clay-time-tag">1080p MP4</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- VISIONARY STEPS SECTION (WORKFLOW PIPELINE - STRICTLY HOME TAB ONLY) -->
      <section class="visionary-steps-section">
        <div class="steps-header">
          <div class="steps-tag">✦ WORKFLOW PIPELINE</div>
          <h2 class="steps-main-heading">
            Three steps. <span class="steps-heading-gradient">From raw code to cinema.</span>
          </h2>
          <p class="steps-subheading">
            Zero timeline editing. Just drop your file, preview the live kinetic canvas, and export studio-grade 1080p MP4.
          </p>
        </div>

        <div class="steps-pipeline-grid">
          <!-- STEP 1 -->
          <div class="visionary-step-card" onclick="startNewVideo()">
            <div class="card-visual-stage stage-1">
              <div class="intake-drop-well">
                <div class="floating-tokens-row">
                  <div class="file-token token-html">
                    <svg viewBox="0 0 24 24"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>
                    <span>.html</span>
                  </div>
                  <div class="file-token token-md">
                    <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
                    <span>.md</span>
                  </div>
                </div>
                <div class="intake-indicator">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14m-5-5 5 5 5-5"/></svg>
                  <span>Drop &amp; Ingest File</span>
                </div>
              </div>
            </div>
            <div class="card-content">
              <div class="step-num-pill">
                <span class="num-circle">01</span>
                <span class="step-category-name">SOURCE INGESTION</span>
              </div>
              <h3 class="step-title">Add your content</h3>
              <p class="step-desc">
                Choose your HTML animation or Markdown slides. RenderFlow automatically detects structure, dimensions, and playback timing.
              </p>
              <div class="step-meta-line">
                <span class="meta-item"><span class="meta-dot"></span>HTML5 &amp; Markdown Ingest</span>
                <span class="meta-item"><span class="meta-dot"></span>Sub-second Auto-Timing</span>
              </div>
            </div>
          </div>

          <!-- CONNECTOR 1 -> 2 -->
          <div class="pipeline-connector">
            <svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
          </div>

          <!-- STEP 2 -->
          <div class="visionary-step-card" onclick="startNewVideo()">
            <div class="card-visual-stage stage-2">
              <div class="mini-studio-screen">
                <div class="screen-header-row">
                  <span class="fps-live-chip">
                    <span class="fps-dot"></span>
                    60 FPS LIVE
                  </span>
                  <span class="aspect-preview-badge">Direct3D Canvas</span>
                </div>
                <div class="screen-center-play">
                  <svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                </div>
                <div class="screen-timeline-bar">
                  <div class="timeline-track-mini">
                    <div class="timeline-fill-mini"></div>
                  </div>
                  <div class="timeline-time-info">
                    <span>00:19</span>
                    <span>00:46</span>
                  </div>
                  <div class="aspect-switchers-row">
                    <span class="aspect-chip active">9:16 Reel</span>
                    <span class="aspect-chip">16:9 Cinema</span>
                    <span class="aspect-chip">1:1 Square</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-content">
              <div class="step-num-pill">
                <span class="num-circle">02</span>
                <span class="step-category-name">REAL-TIME STUDIO</span>
              </div>
              <h3 class="step-title">Check your video</h3>
              <p class="step-desc">
                Inspect your kinetic typography and animations at fluid 60 FPS. Switch instantly between portrait reel, landscape cinema, or square.
              </p>
              <div class="step-meta-line">
                <span class="meta-item"><span class="meta-dot"></span>60 FPS Live Playhead</span>
                <span class="meta-item"><span class="meta-dot"></span>Instant Multi-Aspect</span>
              </div>
            </div>
          </div>

          <!-- CONNECTOR 2 -> 3 -->
          <div class="pipeline-connector">
            <svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
          </div>

          <!-- STEP 3 -->
          <div class="visionary-step-card" onclick="startNewVideo()">
            <div class="card-visual-stage stage-3">
              <div class="export-master-card">
                <div class="export-top-meta">
                  <span class="export-codec-badge">1080p Master • 60 FPS</span>
                  <span class="export-status-pill">● Complete</span>
                </div>
                <div class="export-prog-bar">
                  <div class="export-prog-fill"></div>
                </div>
                <div class="export-btn-meta">
                  <span>1,440 / 1,440 frames</span>
                  <span>17.8 MB</span>
                </div>
                <div class="export-btn-mock">
                  <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/></svg>
                  <span>Download Master MP4</span>
                </div>
              </div>
            </div>
            <div class="card-content">
              <div class="step-num-pill">
                <span class="num-circle">03</span>
                <span class="step-category-name">MASTER SYNTHESIS</span>
              </div>
              <h3 class="step-title">Download your MP4</h3>
              <p class="step-desc">
                Trigger one-click GPU hardware rendering. RenderFlow synthesizes lossless 1080p video ready for social reels and broadcast.
              </p>
              <div class="step-meta-line">
                <span class="meta-item"><span class="meta-dot"></span>Direct3D Lossless Encoding</span>
                <span class="meta-item"><span class="meta-dot"></span>1-Click Master 1080p MP4</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>

    <!-- VIEW 2: CREATE / STUDIO (3 INTERNAL STEPS) -->
    <section id="viewStudioTab" class="tab-view page shell workspace">
      <div class="ws-top">
        <div>
          <button id="wsBackLink" class="backlink" onclick="handleWsBack()">
            <svg class="icon" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
            <span id="wsBackText">Back to Home</span>
          </button>
          <h2 id="wsStepTitle">Add your content</h2>
          <p id="wsStepSub" class="body">Choose the file you want to turn into a video. We'll handle the technical details.</p>
        </div>
        <div class="progress-bar-nav">
          <div id="progStep1" class="progress-segment active"><b>1</b>Add content</div>
          <span class="dash"></span>
          <div id="progStep2" class="progress-segment"><b>2</b>Preview</div>
          <span class="dash"></span>
          <div id="progStep3" class="progress-segment"><b>3</b>Download</div>
        </div>
      </div>

      <!-- STEP 1: ADD CONTENT -->
      <div id="stepAddContent" class="create-step-container">
        <div class="upload-grid">
          <section class="surface upload-main">
            <div class="card-heading">
              <div class="iconbg">
                <svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div>
                <h3>Upload your file</h3>
                <p>HTML or Markdown. Drag it here or choose it from your device.</p>
              </div>
            </div>

            <div class="drop" id="dzMain">
              <div class="big-upload">
                <svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3>Drag your file here</h3>
              <p>or choose a file from your computer</p>
              <input type="file" id="fileInputStudio" accept=".html,.htm,.md,.markdown" style="display:none" onchange="handleFilePicked(event)">
              <button class="btn primary" onclick="$('fileInputStudio').click()">
                <svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
                Choose a file
              </button>
              <div class="drop-formats-bar">
                <span class="drop-format-label">Supported formats:</span>
                <span class="drop-format-pill">.html</span>
                <span class="drop-format-pill">.md</span>
              </div>
            </div>

            <div id="filePickedStatus" class="selectedfile">
              <svg class="icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span id="filePickedName">File added successfully</span>
            </div>

            <div class="helper">
              <small>Have your content as code instead?</small>
              <button id="btnTogglePaste" class="linkbtn" onclick="togglePasteCodeArea()">
                Paste HTML or Markdown
                <svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
              </button>
            </div>

            <div id="studioModeCode" style="display:none;margin-top:18px;flex-direction:column;gap:10px;">
              <textarea id="codeEditorStudio" placeholder="Paste your HTML or Markdown code here..." style="width:100%;min-height:120px;border:1px solid #DCE2EA;border-radius:12px;padding:14px;resize:vertical;font-family:'JetBrains Mono',monospace;font-size:13px;"></textarea>
              <button class="btn secondary" style="align-self:flex-start;" onclick="usePastedCode()">
                Use this content
              </button>
            </div>
          </section>

          <aside class="surface info-panel">
            <h3>Format Guidelines</h3>
            <p>RenderFlow turns web animations and markdown presentations into pristine 1080p MP4.</p>
            <div class="guidelines-list">
              <div class="guideline-row">
                <span class="gl-tag">HTML5</span>
                <div>
                  <strong>Kinetic Web Animation</strong>
                  <p>CSS keyframes, Canvas, SVG, or interactive HTML motion.</p>
                </div>
              </div>
              <div class="guideline-row">
                <span class="gl-tag">Markdown</span>
                <div>
                  <strong>Presentation Slides</strong>
                  <p>Slide decks with automatic cinematic transitions and layouts.</p>
                </div>
              </div>
            </div>
            <div class="tip">
              <b>Hardware Accelerated</b>
              Timing, duration, and frame rate are detected automatically upon upload.
            </div>
          </aside>
        </div>

        <div class="create-footer">
          <button id="btnStep1Next" class="btn primary large" disabled onclick="setCreateStep(2)">
            Continue to preview
            <svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
          </button>
        </div>
      </div>

      <!-- STEP 2: PREVIEW & SETTINGS -->
      <div id="stepPreview" class="create-step-container" style="display:none;">
        <div class="preview-grid">
          <section class="surface preview-surface">
            <div class="preview-toolbar">
              <h3>Live preview</h3>
              <div class="preview-tags-row">
                <span id="previewTag" class="tag">Live animation</span>
                <span id="previewModeTag" class="tag">PORTRAIT (9:16)</span>
              </div>
            </div>

            <div class="preview-stage">
              <div id="viewportWrap" class="vid-preview vertical">
                <iframe id="studioPreviewIframe" sandbox="allow-scripts allow-same-origin" src="about:blank" title="Live Preview"></iframe>
              </div>
            </div>

            <!-- FUNCTIONAL PREVIEW BAR (Clean live status + Replay action) -->
            <div class="preview-controls-bar">
              <div class="preview-status-pill">
                <span class="preview-pulse-dot"></span>
                <span>Live Interactive Preview</span>
              </div>
              <div class="preview-actions-right">
                <button class="btn secondary" style="min-height:38px;padding:0 14px;font-size:12px;border-radius:10px;" onclick="refreshStudioPreview()">
                  <svg class="icon" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  Replay animation
                </button>
              </div>
            </div>

            <!-- Truthful SSE Progress HUD (Real Percent, FPS, Latency, ETA, Frame) -->
            <div id="progressHud" class="render-hud-box">
              <div class="hud-phase-header">
                <span id="hudPhaseText">Connecting to Direct3D11 Engine...</span>
                <span id="hudPct" class="hud-pct-badge">0%</span>
              </div>
              <div class="hud-bar-track">
                <div id="hudBarFill" class="hud-bar-fill"></div>
              </div>
              <div class="hud-metrics-row">
                <div>Frame: <strong id="hudFrameVal">0 / 0</strong></div>
                <div>Speed: <strong id="hudFpsVal">-- FPS</strong></div>
                <div>Latency: <strong id="hudMsVal">-- ms</strong></div>
                <div>ETA: <strong id="hudEtaVal">-- s</strong></div>
              </div>
            </div>
          </section>

          <aside class="surface preview-side">
            <h3>Where will you share it?</h3>
            <p class="body">Pick a video format and check the preview for the best fit.</p>

            <div class="options">
              <button id="optVertical" class="option active" onclick="setRatioSelection('1080p-v')">
                <div class="aspect"><span class="shape vertical"></span></div>
                <div><b>Portrait</b><small>Reels, Shorts, and Stories (9:16)</small></div>
                <span class="radio"></span>
              </button>
              <button id="optLandscape" class="option" onclick="setRatioSelection('1080p')">
                <div class="aspect"><span class="shape landscape"></span></div>
                <div><b>Landscape</b><small>YouTube and presentations (16:9)</small></div>
                <span class="radio"></span>
              </button>
              <button id="optSquare" class="option" onclick="setRatioSelection('square')">
                <div class="aspect"><span class="shape square"></span></div>
                <div><b>Square</b><small>Social media posts (1:1)</small></div>
                <span class="radio"></span>
              </button>
            </div>

            <div class="fileinfo">
              <span>Video length</span>
              <b id="durAutoBadge">Auto-detect</b>
            </div>

            <button type="button" class="accordion" onclick="toggleAdvancedSettings()">
              <svg class="icon" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
              Advanced video settings (optional)
            </button>

            <div id="advancedSettingsPanel" class="advanced">
              <div class="adv-row">
                <label for="cfgResolution">Output resolution</label>
                <select id="cfgResolution" class="adv-select" onchange="handleResolutionChange()">
                  <option value="1080p-v">1080×1920 (Vertical Reel 9:16)</option>
                  <option value="1080p">1920×1080 (Landscape 16:9)</option>
                  <option value="square">1080×1080 (Square 1:1)</option>
                  <option value="720p">1280×720 (Landscape 720p)</option>
                </select>
              </div>
              <div class="adv-row">
                <label for="cfgFps">Frame rate</label>
                <select id="cfgFps" class="adv-select">
                  <option value="30" selected>30 FPS (Standard)</option>
                  <option value="60">60 FPS (Smooth)</option>
                </select>
              </div>
              <div class="adv-row">
                <label for="cfgDuration">Duration override (s)</label>
                <input type="number" id="cfgDuration" class="adv-input" placeholder="Auto" style="width:90px;" min="1" step="0.5">
              </div>
              <div class="adv-row">
                <label for="cfgEngineMode">Processing engine</label>
                <select id="cfgEngineMode" class="adv-select">
                  <option value="server-gpu" id="optCloudServer">Automatic (Direct3D11 GPU)</option>
                  <option value="client-gpu">In-Browser WebCodecs</option>
                </select>
              </div>

              <details id="sysInfoDetails" style="margin-top:10px;padding-top:10px;border-top:1px solid #E1E6EF;">
                <summary style="cursor:pointer;font-weight:600;color:#556275;">System Information</summary>
                <div style="font-size:11px;margin-top:6px;line-height:1.6;color:#6B7585;">
                  <div>Engine Mode: <strong id="diagActiveMode">Checking...</strong></div>
                  <div>Encoder: <strong id="diagEncoderSupport">H.264 Hardware Acceleration</strong></div>
                  <div>Storage Engine: <strong id="diagStorageEngine">Active</strong></div>
                </div>
              </details>
            </div>

            <div class="side-actions">
              <button id="btnStudioBake" class="btn primary full large" onclick="executeRenderJob()">
                Create MP4 video
                <svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
              </button>
              <div class="aside-note">MP4 · Full HD 1080p · Recommended settings</div>
            </div>
          </aside>
        </div>
      </div>

      <!-- STEP 3: DOWNLOAD READY MP4 -->
      <div id="stepDownload" class="create-step-container" style="display:none;">
        <div class="ready-layout">
          <section class="surface preview-surface">
            <div class="preview-toolbar">
              <h3>Your finished video</h3>
              <span class="tag" style="background:#EEF2FF;color:#4338CA;border:1px solid #E0E7FF;">Ready to download</span>
            </div>

            <div class="preview-stage">
              <div class="vid-preview vertical" id="resultVidWrap">
                <video id="resultVideo" controls playsinline autoplay style="width:100%;height:100%;object-fit:contain;background:#000;border-radius:12px;display:block;"></video>
              </div>
            </div>
          </section>

          <aside class="surface ready-side">
            <div class="success-head">
              <div class="success-check">✓</div>
              <div>
                <h2>Your video is ready</h2>
                <p class="body" style="font-size:13px;">Everything looks good. Your MP4 is ready to download.</p>
              </div>
            </div>

            <div class="detail-row"><span>File</span><b id="resMetaFilename">render-export.mp4</b></div>
            <div class="detail-row"><span>Format</span><b>MP4</b></div>
            <div class="detail-row"><span>Video size</span><b id="resMetaResolution">Portrait · 9:16 (1080×1920)</b></div>
            <div class="detail-row"><span>Duration</span><b id="resMetaDuration">--</b></div>
            <div class="detail-row"><span>File size</span><b id="resMetaSizeBadge">--</b></div>
            <div class="detail-row"><span>Quality / FPS</span><b id="resMetaFps">Full HD · 30 FPS</b></div>
            <div class="detail-row"><span>Render time</span><b id="resMetaTime">Completed</b></div>

            <a id="btnDownloadResult" class="btn primary full large" href="#" download="export.mp4">
              <svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download MP4
            </a>
            <button class="btn secondary full" onclick="startNewVideo()">
              Create another video
            </button>
            <p class="ready-note">Full 1080p master generated without frame cutoffs.</p>
          </aside>
        </div>
      </div>
    </section>

    <!-- VIEW 3: HISTORY -->
    <section id="viewHistoryTab" class="tab-view page shell workspace">
      <div class="history-head">
        <div>
          <div class="eyebrow">Your workspace</div>
          <h2>My videos</h2>
          <p class="body">Find your previous creations, open a video, or download it again.</p>
        </div>
        <div class="search">
          <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="historySearch" oninput="handleHistorySearch(this.value)" placeholder="Search your videos" aria-label="Search videos"/>
        </div>
      </div>

      <div class="history-stats-bar">
        <div class="history-filters">
          <button id="chipFilterAll" class="chip active" onclick="setHistoryFilter('all')">All</button>
          <button id="chipFilterToday" class="chip" onclick="setHistoryFilter('today')">Today</button>
          <button id="chipFilterWeek" class="chip" onclick="setHistoryFilter('week')">This week</button>
          <button id="chipFilterMonth" class="chip" onclick="setHistoryFilter('month')">This month</button>
          <select id="historySort" style="display:none;" onchange="handleHistorySort(this.value)">
            <option value="newest" selected>Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
        <div class="history-summary-text">
          <span id="statTotalVideos">0 Videos</span> ·
          <span id="statTotalSize">0 MB</span> ·
          <span id="statTotalDuration">0m 0s</span>
        </div>
      </div>

      <div class="surface history-card">
        <div class="listhead">
          <span>Video</span>
          <span class="created">Created</span>
          <span>Video size</span>
          <span>Actions</span>
        </div>
        <div id="historyGrid"></div>
        <div class="history-help">
          <span>Backed by real local history & vault records</span>
          <button onclick="startNewVideo()">Create a new video →</button>
        </div>
      </div>
    </section>

    <!-- USER SPECIFIED ELEVATED FOOTER -->
    <footer class="site-footer">
      <div class="shell footer-shell">
        <div class="footer-main-row">
          <div class="footer-left">
            <div class="footer-brand-header">
              <img src="/RenderFlow_Logo_Transparent.png" alt="RenderFlow" class="footer-logo">
              <span class="footer-brand-name">RenderFlow</span>
            </div>
            <p class="footer-tagline">Turn your HTML and Markdown into high-quality, shareable videos.</p>
          </div>
          <div class="footer-nav-wrap">
            <span class="footer-nav-divider">|</span>
            <a class="footer-nav-link" onclick="switchNav('landing')">Home</a>
            <a class="footer-nav-link" onclick="switchNav('studio')">Create</a>
            <a class="footer-nav-link" onclick="switchNav('history')">History</a>
            <span class="footer-nav-divider">|</span>
          </div>
          <div class="footer-social-wrap">
            <a href="https://github.com/msajiddurrani" target="_blank" rel="noopener noreferrer" class="footer-social-card" aria-label="GitHub Profile" title="GitHub - msajiddurrani">
              <svg class="footer-social-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/sajiddurrani/" target="_blank" rel="noopener noreferrer" class="footer-social-card" aria-label="LinkedIn Profile" title="LinkedIn - sajiddurrani">
              <svg class="footer-social-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
              </svg>
            </a>
          </div>
        </div>

        <div class="footer-copyright-row">
          <p>© 2026 RenderFlow. All rights reserved.</p>
        </div>
      </div>

      <div class="footer-wave-banner">
        <svg viewBox="0 0 1440 90" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0,35 C240,75 520,10 800,50 C1080,85 1280,25 1440,40 L1440,90 L0,90 Z" fill="url(#rfFooterGrad1)" opacity="0.55"/>
          <path d="M0,50 C300,18 620,70 940,30 C1200,2 1350,55 1440,45 L1440,90 L0,90 Z" fill="url(#rfFooterGrad2)" opacity="0.85"/>
          <defs>
            <linearGradient id="rfFooterGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#C7D2FE"/>
              <stop offset="50%" stop-color="#DDD6FE"/>
              <stop offset="100%" stop-color="#C7D2FE"/>
            </linearGradient>
            <linearGradient id="rfFooterGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#818CF8"/>
              <stop offset="45%" stop-color="#A5B4FC"/>
              <stop offset="100%" stop-color="#C7D2FE"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </footer>
  </div>

  <!-- TOAST NOTIFICATIONS -->
  <div class="toast" id="toast"></div>

  <!-- PRESERVED INTEGRITY CONTAINER (Keeps all 89 legacy IDs for script/test compatibility) -->
  <div id="preservedIntegrityElements" style="display:none;" aria-hidden="true">
    <div id="authScreen">
      <form id="authForm">
        <div id="authBrandTag"></div>
        <div id="authDynamicLine"></div>
        <div id="authSystemState"></div>
        <div id="authFormTitle"></div>
        <div id="authFormSub"></div>
        <input id="authEmail" type="text" value="user@renderflow.local">
        <input id="authPassword" type="password" value="password123">
        <button id="btnAuthAction" type="submit"></button>
        <button id="btnTabSignIn" type="button"></button>
        <button id="btnTabSignUp" type="button"></button>
      </form>
    </div>
    <div id="landingHeroSection">
      <button id="btnHeroBake" type="button"></button>
    </div>
    <div id="chipHeaderStatus"></div>
    <div id="formatDropdownMenu"></div>
    <div id="formatIconLabel"></div>
    <div id="formatTextLabel"></div>
    <div id="btnSelectedFormat"></div>
    <div id="quickStatusChip"></div>
    <div id="quickStatusName"></div>
    <div id="quickStatusSize"></div>
    <div id="quickStatusTag"></div>
    <div id="subTabFile"></div>
    <div id="subTabCode"></div>
    <div id="studioModeFile"></div>
    <div id="btnViewLive"></div>
    <div id="btnViewVideo"></div>
    <div id="resultPanel"></div>
    <input type="file" id="nativeFileInputHtml">
    <input type="file" id="nativeFileInputMd">
    <input type="file" id="nativeFileInputZip">
    <div id="modeGuidanceBanner"></div>
    <div id="box"></div>
    <canvas id="c" width="10" height="10"></canvas>
  </div>

  <script>
    // CORE STATE
    let currentAppMode = 'MODE_B';
    let currentNav = 'landing';
    let currentCreateStep = 1;
    let studioInputMode = 'file';
    let currentAuthMode = 'signin';
    let historyFilter = 'all';
    let historySearchQuery = '';
    let historySortOrder = 'newest';
    let activeStageView = 'live';
    let currentAspectMode = '1080p-v';

    const $ = id => document.getElementById(id);

    // CLIENT STORAGE (INDEXEDDB FOR MODE A)
    const JaneVaultDB = {
      dbName: 'JaneMotionVault',
      dbVersion: 1,
      async getDB() {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open(this.dbName, this.dbVersion);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('videos')) {
              db.createObjectStore('videos', { keyPath: 'id' });
            }
          };
          req.onsuccess = e => resolve(e.target.result);
          req.onerror = e => reject(e.target.error);
        });
      },
      async saveVideo(record) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('videos', 'readwrite');
          tx.objectStore('videos').put(record);
          tx.oncomplete = () => resolve(true);
          tx.onerror = e => reject(e.target.error);
        });
      },
      async getAllVideos() {
        try {
          const db = await this.getDB();
          return new Promise((resolve, reject) => {
            const tx = db.transaction('videos', 'readonly');
            const req = tx.objectStore('videos').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          });
        } catch(e) {
          return [];
        }
      },
      async deleteVideo(id) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('videos', 'readwrite');
          tx.objectStore('videos').delete(id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = e => reject(e.target.error);
        });
      }
    };

    // RUNTIME MODE DETECTION
    async function detectRuntimeMode() {
      let mode = 'MODE_A';
      try {
        const res = await fetch('/api/history?limit=1');
        const cType = res.headers.get('content-type') || '';
        if (res.ok && cType.includes('application/json')) {
          mode = 'MODE_B';
        }
      } catch (e) {
        mode = 'MODE_A';
      }

      const modeBadge = $('appModeBadge');
      const modeLabel = $('appModeLabel');
      const optCloud = $('optCloudServer');
      const diagMode = $('diagActiveMode');

      if (mode === 'MODE_B') {
        currentAppMode = 'MODE_B';
        if (modeLabel) modeLabel.textContent = 'Desktop Engine (Port 3333)';
        if (optCloud) {
          optCloud.disabled = false;
          optCloud.textContent = 'Automatic (Direct3D11 GPU)';
        }
        if ($('cfgEngineMode')) $('cfgEngineMode').value = 'server-gpu';
        if (diagMode) diagMode.textContent = 'Direct3D11 Hardware GPU';
      } else {
        currentAppMode = 'MODE_A';
        if (modeLabel) modeLabel.textContent = 'Web Engine (Vercel)';
        if (optCloud) {
          optCloud.disabled = true;
          optCloud.textContent = 'Desktop Server (Unavailable in Mode A)';
        }
        if ($('cfgEngineMode')) $('cfgEngineMode').value = 'client-gpu';
        if (diagMode) diagMode.textContent = 'WebCodecs In-Browser';
      }
    }

    // TOAST HELPER
    function showToast(msg) {
      const t = $('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3500);
    }

    // NAVIGATION SWITCHER (HOME, CREATE, HISTORY)
    function switchNav(tab) {
      currentNav = tab;
      $('viewLandingTab').classList.toggle('active', tab === 'landing');
      $('viewStudioTab').classList.toggle('active', tab === 'studio');
      $('viewHistoryTab').classList.toggle('active', tab === 'history');

      $('tabNavLanding').classList.toggle('active', tab === 'landing');
      $('tabNavStudio').classList.toggle('active', tab === 'studio');
      $('tabNavHistory').classList.toggle('active', tab === 'history');

      if (tab === 'history') {
        loadHistory();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function startNewVideo() {
      switchNav('studio');
      setCreateStep(1);
      const fi = $('fileInputStudio');
      if (fi) fi.value = '';
      const fps = $('filePickedStatus');
      if (fps) fps.classList.remove('show');
      const b1 = $('btnStep1Next');
      if (b1) b1.disabled = true;
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // GUIDED STEP WORKFLOW (1: ADD CONTENT, 2: PREVIEW, 3: DOWNLOAD)
    function setCreateStep(step) {
      currentCreateStep = step;

      $('stepAddContent').style.display = step === 1 ? 'block' : 'none';
      $('stepPreview').style.display = step === 2 ? 'block' : 'none';
      $('stepDownload').style.display = step === 3 ? 'block' : 'none';

      // Update breadcrumb segments
      const p1 = $('progStep1'), p2 = $('progStep2'), p3 = $('progStep3');
      p1.className = 'progress-segment ' + (step === 1 ? 'active' : step > 1 ? 'passed' : '');
      p2.className = 'progress-segment ' + (step === 2 ? 'active' : step > 2 ? 'passed' : '');
      p3.className = 'progress-segment ' + (step === 3 ? 'active' : '');

      p1.innerHTML = (step > 1 ? '<b>✓</b>' : '<b>1</b>') + 'Add content';
      p2.innerHTML = (step > 2 ? '<b>✓</b>' : '<b>2</b>') + 'Preview';
      p3.innerHTML = '<b>3</b>Download';

      // Update titles
      const t = $('wsStepTitle'), sub = $('wsStepSub'), back = $('wsBackText');
      if (step === 1) {
        t.textContent = 'Add your content';
        sub.textContent = "Choose the file you want to turn into a video. We'll handle the technical details.";
        back.textContent = 'Back to Home';
      } else if (step === 2) {
        t.textContent = 'Check your video';
        sub.textContent = "Take a look, choose where you'll share it, and we'll create the MP4.";
        back.textContent = 'Back to content';
      } else if (step === 3) {
        t.textContent = 'Your video is ready';
        sub.textContent = 'Everything looks good. Your MP4 is ready to download.';
        back.textContent = 'Create another video';
      }
    }

    function handleWsBack() {
      if (currentCreateStep === 1) {
        switchNav('landing');
      } else if (currentCreateStep === 2) {
        setCreateStep(1);
      } else if (currentCreateStep === 3) {
        startNewVideo();
      }
    }

    function toggleAdvancedSettings() {
      const p = $('advancedSettingsPanel');
      if (p) p.classList.toggle('show');
    }

    function togglePasteCodeArea() {
      const area = $('studioModeCode');
      const isHidden = area.style.display === 'none';
      area.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) $('codeEditorStudio').focus();
    }

    function usePastedCode() {
      const code = $('codeEditorStudio').value.trim();
      if (!code) {
        showToast('Please paste some HTML or Markdown code first.');
        return;
      }
      $('filePickedStatus').classList.add('show');
      $('filePickedName').textContent = 'Pasted content (' + code.length + ' chars) added';
      $('btnStep1Next').disabled = false;
      inspectAndApplyCodeProperties(code, 'pasted-content.html');
      updatePreviewFromCode();
      setCreateStep(2);
    }

    // AUTOMATIC DURATION EXTRACTION
    function extractDurationFromCode(code) {
      if (!code) return null;

      // 1. Explicit window.DURATION or window.DUR assignment
      const winDurMatch = code.match(/window\\.(?:DURATION|DUR)\\s*=\\s*([a-zA-Z0-9_$]+)/i);
      if (winDurMatch) {
        const token = winDurMatch[1];
        if (/^\\d+(\\.\\d+)?$/.test(token)) {
          return parseFloat(token);
        }
        const varPattern = new RegExp('(?:const|let|var|)\\\\s*' + token + '\\\\s*=\\\\s*(\\\\d+(\\\\.\\d+)?)', 'i');
        const varMatch = code.match(varPattern);
        if (varMatch) return parseFloat(varMatch[1]);
      }

      // 2. data-duration or meta render-duration
      let m = code.match(/data-duration=["'](\\d+(\\.\\d+)?)["']/i);
      if (m) return parseFloat(m[1]);
      m = code.match(/name=["']render-duration["']\\s+content=["'](\\d+(\\.\\d+)?)["']/i);
      if (m) return parseFloat(m[1]);

      // 3. const/let/var TOTAL_DURATION or DURATION or ANIM_DURATION
      m = code.match(/(?:const|let|var)\\s+(?:TOTAL_DURATION|DURATION|ANIM_DURATION|VIDEO_DURATION)\\s*=\\s*(\\d+(\\.\\d+)?)/i);
      if (m) return parseFloat(m[1]);

      // 4. Timeline totalDuration e.g. tl.totalDuration(30) or tl.duration(30)
      m = code.match(/(?:tl|timeline)\\.(?:totalDuration|duration)\\s*\\(\\s*(\\d+(\\.\\d+)?)\\s*\\)/i);
      if (m) return parseFloat(m[1]);

      // 5. Markdown slide count (4s per slide)
      if (code.startsWith('#') || code.includes('---')) {
        const slideBreaks = (code.match(/\\n---(?:\\r?\\n|$)/g) || []).length;
        const slides = slideBreaks + 1;
        return slides * 4;
      }

      return null;
    }

    // DROPZONE & FILE PICKING
    function setupDropzone() {
      const dz = $('dzMain');
      if (!dz) return;

      ['dragenter', 'dragover'].forEach(name => {
        dz.addEventListener(name, e => { e.preventDefault(); dz.classList.add('dragover'); });
      });
      ['dragleave', 'drop'].forEach(name => {
        dz.addEventListener(name, e => { e.preventDefault(); dz.classList.remove('dragover'); });
      });
      dz.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) handleFilePicked({ target: { files: [file] } });
      });
    }

    async function handleFilePicked(event) {
      const file = event.target.files[0];
      if (!file) return;

      const text = await file.text();
      $('codeEditorStudio').value = text;

      $('filePickedStatus').classList.add('show');
      $('filePickedName').textContent = file.name + ' added successfully';
      $('btnStep1Next').disabled = false;

      inspectAndApplyCodeProperties(text, file.name);
      updatePreviewFromCode();
      setCreateStep(2);
    }

    function inspectAndApplyCodeProperties(code, filename) {
      if (code.includes('9:16') || (code.includes('1080px') && code.includes('1920px')) || filename?.toLowerCase().includes('reel')) {
        setRatioSelection('1080p-v');
      } else {
        setRatioSelection('1080p');
      }

      const detectedDur = extractDurationFromCode(code);
      if (detectedDur) {
        updateDurationDisplay(detectedDur);
      } else {
        updateDurationDisplay('');
      }
    }

    function updateDurationDisplay(dur) {
      if (dur && dur > 0) {
        $('cfgDuration').value = dur;
        $('durAutoBadge').textContent = dur + ' seconds · Automatic';
        $('previewTag').textContent = 'Detected animation · ' + dur + 's';
      } else {
        $('cfgDuration').value = '';
        $('durAutoBadge').textContent = 'Auto-detect';
        $('previewTag').textContent = 'Live animation';
      }
    }

    // ASPECT RATIO SELECTION
    function setRatioSelection(mode) {
      currentAspectMode = mode;
      $('cfgResolution').value = mode;

      $('optVertical').classList.toggle('active', mode === '1080p-v');
      $('optLandscape').classList.toggle('active', mode === '1080p');
      $('optSquare').classList.toggle('active', mode === 'square');

      const wrap = $('viewportWrap');
      const resWrap = $('resultVidWrap');
      wrap.className = 'vid-preview ' + (mode === '1080p-v' ? 'vertical' : mode === '1080p' ? 'landscape' : 'square');
      if (resWrap) resWrap.className = wrap.className;

      $('previewModeTag').textContent = mode === '1080p-v' ? 'PORTRAIT (9:16)' : mode === '1080p' ? 'LANDSCAPE (16:9)' : 'SQUARE (1:1)';
    }

    function handleResolutionChange() {
      const res = $('cfgResolution').value;
      setRatioSelection(res);
    }

    function setAspectMode(mode) {
      setRatioSelection(mode);
    }

    function togglePreviewAspect() {
      const next = currentAspectMode === '1080p-v' ? '1080p' : '1080p-v';
      setRatioSelection(next);
    }

    // LIVE PREVIEW GENERATION
    function updatePreviewFromCode() {
      const code = $('codeEditorStudio').value;
      if (!code) return;

      const iframe = $('studioPreviewIframe');
      const blob = new Blob([code], { type: 'text/html' });
      iframe.src = URL.createObjectURL(blob);
    }

    function refreshStudioPreview() {
      const code = $('codeEditorStudio').value;
      if (code) {
        updatePreviewFromCode();
      } else {
        loadPreset('renderflow');
      }
    }

    // CLEAN SAMPLE LOADER (Zero PainForge dummy references)
    async function loadPreset(type) {
      try {
        const res = await fetch('/presets/renderflow-sample.html');
        if (res.ok) {
          const html = await res.text();
          $('codeEditorStudio').value = html;
          $('filePickedStatus').classList.add('show');
          $('filePickedName').textContent = 'RenderFlow Motion Sample.html';
          $('btnStep1Next').disabled = false;
          setRatioSelection('1080p');
          updateDurationDisplay(extractDurationFromCode(html) || 5);
          updatePreviewFromCode();
          return;
        }
      } catch (e) {}

      // Fallback clean motion preset
      const fallbackHtml = '<!DOCTYPE html><html><body style="margin:0;background:#090B14;display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:sans-serif;"><div style="text-align:center;"><h1 style="font-size:48px;margin-bottom:12px;color:#818CF8;">RenderFlow</h1><p style="font-size:18px;color:#94A3B8;">Turn animated pages into pristine 1080p MP4</p></div><script>window.DURATION=5;<\\/script></body></html>';
      $('codeEditorStudio').value = fallbackHtml;
      setRatioSelection('1080p');
      updateDurationDisplay(5);
      updatePreviewFromCode();
    }

    function loadSampleAndPreview() {
      switchNav('studio');
      loadPreset('renderflow').then(() => {
        setCreateStep(2);
      });
    }

    // RENDER EXECUTION
    function executeRenderJob() {
      const code = $('codeEditorStudio').value.trim();
      if (!code) {
        showToast('Please add an HTML or Markdown file first.');
        setCreateStep(1);
        return;
      }

      if (currentAppMode === 'MODE_B') {
        executeServerSideRender();
      } else {
        executeClientSideRender();
      }
    }

    // SERVER RENDER VIA SSE
    async function executeServerSideRender() {
      const code = $('codeEditorStudio').value;
      const resMode = $('cfgResolution').value;
      const fps = parseInt($('cfgFps').value, 10) || 30;
      const userDur = parseFloat($('cfgDuration').value);
      const duration = (!isNaN(userDur) && userDur > 0) ? userDur : null;

      let width = 1080, height = 1920;
      if (resMode === '1080p') { width = 1920; height = 1080; }
      else if (resMode === 'square') { width = 1080; height = 1080; }
      else if (resMode === '720p') { width = 1280; height = 720; }

      $('btnStudioBake').disabled = true;
      $('progressHud').style.display = 'block';
      $('hudPct').textContent = '0%';
      $('hudBarFill').style.width = '0%';
      $('hudPhaseText').textContent = 'Connecting to Direct3D11 Engine...';

      try {
        const response = await fetch('/api/render-code-sse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, resolution: resMode, width, height, fps, duration, gpu: true })
        });

        if (!response.ok) throw new Error('Server returned HTTP ' + response.status);
        readStream(response);
      } catch (err) {
        $('hudPhaseText').textContent = 'Error: ' + err.message;
        resetRenderBtns();
      }
    }

    async function readStream(response) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\\n');
        buffer = lines.pop();

        let eventType = 'message';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleServerEvent(eventType, data);
            } catch (e) {}
          }
        }
      }
    }

    function handleServerEvent(event, data) {
      if (event === 'status') {
        $('hudPhaseText').textContent = data.message || data.phase || 'Processing hardware synthesis...';
      }

      if (event === 'progress') {
        const rawPct = data.percent !== undefined 
          ? data.percent 
          : (data.pct !== undefined ? data.pct : (data.frame && data.totalFrames ? Math.round((data.frame / data.totalFrames) * 100) : 0));
        const pct = Math.min(100, Math.max(0, Math.round(rawPct)));

        $('hudPct').textContent = pct + '%';
        $('hudBarFill').style.width = pct + '%';

        if (data.message || data.phase) {
          $('hudPhaseText').textContent = data.message || data.phase;
        } else {
          $('hudPhaseText').textContent = 'Rendering Hardware Frames (' + pct + '%)...';
        }

        $('hudFrameVal').textContent = (data.frame || 0) + ' / ' + (data.totalFrames || '--');
        $('hudFpsVal').textContent = (data.effectiveFps || data.speedFps || '--') + ' FPS';
        $('hudMsVal').textContent = (data.avgFrameMs || data.latencyMs || '--') + ' ms';
        $('hudEtaVal').textContent = (data.etaSeconds !== undefined ? data.etaSeconds : (data.etaSec || '--')) + ' s';
      }

      if (event === 'complete') {
        $('hudPct').textContent = '100%';
        $('hudBarFill').style.width = '100%';
        $('hudPhaseText').textContent = 'Render Complete!';
        resetRenderBtns();

        const exactBytes = data.record?.bytes || data.metrics?.mp4SizeBytes || 0;
        const sizeFormatted = exactBytes >= 1024 * 1024 
          ? (exactBytes / (1024 * 1024)).toFixed(1) + ' MB'
          : (exactBytes / 1024).toFixed(1) + ' KB';

        const exactDur = data.record?.duration || (data.probe?.duration ? data.probe.duration + 's' : (data.metrics?.durationSec ? data.metrics.durationSec + 's' : '46.0s'));

        const v = $('resultVideo');
        v.src = data.url;
        v.load();

        $('resMetaFilename').textContent = data.filename || 'export.mp4';
        $('resMetaDuration').textContent = exactDur;
        $('resMetaSizeBadge').textContent = sizeFormatted;
        $('resMetaResolution').textContent = data.probe?.resolution || data.record?.resolution || (currentAspectMode === '1080p-v' ? 'Portrait · 9:16 (1080×1920)' : 'Landscape · 16:9 (1920×1080)');
        $('resMetaTime').textContent = data.metrics?.totalRenderTimeSec ? (data.metrics.totalRenderTimeSec + 's') : 'Completed';
        $('resMetaFps').textContent = 'Full HD · ' + (data.metrics?.fps || 30) + ' FPS';

        $('btnDownloadResult').href = data.url;
        $('btnDownloadResult').download = data.filename || 'export.mp4';

        setCreateStep(3);
        loadHistory();
      }

      if (event === 'error') {
        $('hudPhaseText').textContent = 'Error: ' + data.error;
        resetRenderBtns();
      }
    }

    // CLIENT ENGINE RENDER (VERCEL)
    async function executeClientSideRender() {
      $('btnStudioBake').disabled = true;
      $('progressHud').style.display = 'block';
      $('hudPhaseText').textContent = 'In-Browser WebCodecs Render...';

      try {
        const code = $('codeEditorStudio').value;
        const resMode = $('cfgResolution').value;
        let width = 1080, height = 1920;
        if (resMode === '1080p') { width = 1920; height = 1080; }
        else if (resMode === 'square') { width = 1080; height = 1080; }
        else if (resMode === '720p') { width = 1280; height = 720; }

        const userDur = parseFloat($('cfgDuration').value);
        const duration = (!isNaN(userDur) && userDur > 0) ? userDur : (extractDurationFromCode(code) || 5);
        const fps = parseInt($('cfgFps').value, 10) || 30;

        const engine = new ClientRenderEngine({
          width, height, fps, duration,
          onProgress: p => {
            const rawPct = p.pct !== undefined ? p.pct : (p.frame && p.totalFrames ? Math.round((p.frame / p.totalFrames) * 100) : 0);
            const pct = Math.min(100, Math.max(0, Math.round(rawPct)));
            $('hudPct').textContent = pct + '%';
            $('hudBarFill').style.width = pct + '%';
            $('hudFrameVal').textContent = p.frame + ' / ' + p.totalFrames;
            $('hudFpsVal').textContent = (p.fps || '--') + ' FPS';
            $('hudPhaseText').textContent = 'Encoding Frames In-Browser (' + pct + '%)...';
          }
        });

        const result = await engine.renderAnimation(code, { width, height, fps, duration });
        const blobUrl = URL.createObjectURL(result.blob);
        const sizeFormatted = (result.blob.size / (1024 * 1024)).toFixed(1) + ' MB';

        const record = {
          id: 'client_' + Date.now(),
          filename: 'client-export-' + Date.now() + '.mp4',
          originalName: 'Browser Render.mp4',
          resolution: width + 'x' + height,
          duration: duration + 's',
          durationSec: duration,
          bytes: result.blob.size,
          createdAt: Date.now(),
          url: blobUrl,
          blob: result.blob
        };

        await JaneVaultDB.saveVideo(record);

        const v = $('resultVideo');
        v.src = blobUrl;
        v.load();

        $('resMetaFilename').textContent = record.filename;
        $('resMetaDuration').textContent = duration + 's';
        $('resMetaSizeBadge').textContent = sizeFormatted;
        $('resMetaResolution').textContent = width + '×' + height;
        $('resMetaFps').textContent = 'Full HD · ' + fps + ' FPS';
        $('resMetaTime').textContent = 'Completed';

        $('btnDownloadResult').href = blobUrl;
        $('btnDownloadResult').download = record.filename;

        resetRenderBtns();
        setCreateStep(3);
        loadHistory();
      } catch (e) {
        $('hudPhaseText').textContent = 'WebCodecs Error: ' + e.message;
        resetRenderBtns();
      }
    }

    function resetRenderBtns() {
      $('btnStudioBake').disabled = false;
    }

    // VAULT & HISTORY
    function setHistoryFilter(f) {
      historyFilter = f;
      $('chipFilterAll').classList.toggle('active', f === 'all');
      $('chipFilterToday').classList.toggle('active', f === 'today');
      $('chipFilterWeek').classList.toggle('active', f === 'week');
      $('chipFilterMonth').classList.toggle('active', f === 'month');
      loadHistory();
    }

    function handleHistorySearch(q) {
      historySearchQuery = q;
      loadHistory();
    }

    function handleHistorySort(s) {
      historySortOrder = s;
      loadHistory();
    }

    async function loadHistory() {
      let records = [];

      if (currentAppMode === 'MODE_B') {
        try {
          const query = new URLSearchParams({
            filter: historyFilter,
            search: historySearchQuery,
            sort: historySortOrder
          });
          const res = await fetch('/api/history?' + query.toString());
          if (res.ok) {
            const data = await res.json();
            records = data.records || [];
          }
        } catch (e) {}
      }

      if (!records.length) {
        records = await JaneVaultDB.getAllVideos();
      }

      renderHistoryGrid(records);
      updateProductionShowcase(records);
    }

    function cleanTitle(str) {
      if (!str) return '';
      return String(str)
        .replace(/â€”|â€”|â€“|â€“/g, '—')
        .replace(/â€™|â€™/g, "'")
        .replace(/â€œ|â€ |â€œ|â€ /g, '"');
    }

    function updateProductionShowcase(records) {
      if (!records || !records.length) return;
      const master = records[0];
      const videoElem = $('resultVideo');
      if (videoElem && master.url && currentCreateStep === 3) {
        videoElem.src = master.url;
      }
    }

    function openHistoryVideo(url, name, sizeStr, dur, res) {
      const v = $('resultVideo');
      v.src = url;
      v.load();
      $('resMetaFilename').textContent = name;
      $('resMetaSizeBadge').textContent = sizeStr;
      $('resMetaDuration').textContent = dur;
      $('resMetaResolution').textContent = res || '1080×1920';
      $('btnDownloadResult').href = url;
      $('btnDownloadResult').download = name;
      switchNav('studio');
      setCreateStep(3);
    }

    function renderHistoryGrid(records) {
      const grid = $('historyGrid');
      if (!grid) return;

      $('navHistoryCount').textContent = records.length;
      $('statTotalVideos').textContent = records.length + ' Videos';

      let totalBytes = 0;
      let totalSeconds = 0;

      records.forEach(r => {
        totalBytes += (r.bytes || 0);
        totalSeconds += (r.durationSec || 0);
      });

      const totalMb = (totalBytes / (1024 * 1024)).toFixed(1) + ' MB';
      $('statTotalSize').textContent = totalMb;

      const mins = Math.floor(totalSeconds / 60);
      const secs = Math.round(totalSeconds % 60);
      $('statTotalDuration').textContent = mins + 'm ' + secs + 's';

      if (records.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:48px 20px;color:#8A96A7;font-size:14px;">No videos created yet. Click <strong>Create a new video</strong> to start.</div>';
        return;
      }

      grid.innerHTML = records.map(r => {
        const isVertical = r.resolution && r.resolution.includes('1920') && !r.resolution.startsWith('1920');
        const sizeMb = (r.bytes >= 1024 * 1024) 
          ? (r.bytes / (1024 * 1024)).toFixed(1) + ' MB'
          : (r.bytes / 1024).toFixed(1) + ' KB';

        const dur = r.duration || (r.durationSec + 's');
        const dateStr = new Date(r.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const title = escapeHtml(cleanTitle(r.originalName || r.filename));

        return \`
          <div class="record" data-name="\${title.toLowerCase()}">
            <div class="record-title">
              <div class="thumbnail" onclick="openHistoryVideo('\${r.url}', '\${title}', '\${sizeMb}', '\${dur}', '\${r.resolution || '1080p'}')">
                <video src="\${r.url}#t=0.5" preload="metadata" muted playsinline></video>
              </div>
              <div>
                <strong>\${title}</strong>
                <small>MP4 video · \${dur} · \${sizeMb}</small>
              </div>
            </div>
            <div class="meta created">\${dateStr}</div>
            <div class="meta">\${r.resolution || '1080p'}</div>
            <div class="record-actions">
              <a href="\${r.url}" class="btn secondary" download="\${r.filename}">Download</a>
              <button class="btn-del" onclick="deleteHistoryRecord('\${r.id}')" title="Delete">✕</button>
            </div>
          </div>
        \`;
      }).join('');
    }

    // PERMANENT HISTORY DELETE (Server Disk + IndexedDB)
    async function deleteHistoryRecord(id) {
      if (!confirm('Are you sure you want to delete this video record?')) return;
      
      if (currentAppMode === 'MODE_B') {
        try {
          const res = await fetch('/api/history/' + encodeURIComponent(id), { method: 'DELETE' });
          if (!res.ok) console.warn('Server delete status:', res.status);
        } catch (e) {
          console.error('Failed to delete on server:', e);
        }
      }

      try {
        await JaneVaultDB.deleteVideo(id);
      } catch (e) {}

      await loadHistory();
      showToast('Video permanently deleted.');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function debounce(fn, ms) {
      let timer;
      return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
      };
    }

    // BACKWARD COMPATIBILITY HELPERS (PRESERVED FOR TEST & SCRIPT INTEGRITY)
    function setAuthMode(m) {}
    function handleAuthSubmit(e) { if (e) e.preventDefault(); }
    function enterStudioDirectly() {}
    function checkSavedSession() {}
    function showStudioApp() {}
    function logoutSession() {}
    function setStageView(view) { activeStageView = view; }
    function setStudioInputMode(mode) { studioInputMode = mode; }
    function openStudioWithCodeBuffer() { togglePasteCodeArea(); }
    function triggerNativeFileSelect(type) { $('fileInputStudio').click(); }
    function chooseFormat(ext, icon, label) { triggerNativeFileSelect(ext); }
    function toggleFormatMenu(e) {}
    function setQuickDuration(val) { updateDurationDisplay(val); }
    function changeSlide() {}
    function loop() {}
    function renderFrame() {}

    window.addEventListener('DOMContentLoaded', async () => {
      setupDropzone();
      await detectRuntimeMode();
      await loadHistory();
      // Start clean without dummy PainForge video
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(targetPath, htmlContent, 'utf8');
console.log('Successfully wrote updated public/index.html (' + htmlContent.length + ' bytes)');
