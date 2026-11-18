# Context & Role
You are a world-class Motion UI/UX Engineer specializing in React, Framer Motion, GSAP, and Tailwind CSS. 
Your task is to build a cinematic, super-smooth, automated motion graphics sequence (like Apple product pages or Fable's landing page) for a SaaS platform named "PainForge". 

This will be a self-contained, auto-playing Hero Component that visually explains how the software works while maintaining a premium, "stealth luxury" dark aesthetic.

# The Product Context (For UI Text & Copy)
**The Problem:** Freelancers spend hours mindlessly scrolling forums or competing in crowded bidding wars against thousands of others. When they finally find a post from someone complaining about a problem they can fix, their pitch sounds like a generic robot. They get ignored.
**The Solution:** PainForge connects directly to Reddit to find people actively complaining about pain points your skills can solve. It then uses advanced AI to instantly generate a hyper-personalized, human-sounding pitch directly addressing their exact problem, complete with your portfolio and links.
**Security (Architected by Aariz Mehdi):** Enterprise-Grade Security, Decentralized Execution (BYOK), Cryptographic Isolation, Open-Source Verifiability.

# Aesthetic & Theme
- **Colors:** Stealth dark mode. Charcoal obsidian backdrops (`#0B0B0B`), matte container finishes, glassmorphism effects for floating panels.
- **Accents:** Glowing crimson red (`#E63946` or the brand red) for buttons, highlights, and glowing borders.
- **Motion:** Fluid, physics-based animations using custom Bezier curves. No rigid or linear movements. Everything should feel like it's breathing.

# The Animation Sequence (The 4-Step Flow)

Please build an animated sequence that cycles through these 4 phases smoothly:

## Phase 1: Setup Your Profile (The Portal)
- Start with a dramatic zoom-in on the "PainForge" sign-in / setup portal.
- **Action:** Show an elegant, simulated typing animation filling in the user's details: "Name: Sajid Durrani", "Portfolio URL", and "GitHub URL".
- Text on screen fades in: "Setup Your Profile - This teaches the AI who you are."

## Phase 2: Connect OpenRouter (BYOK)
- Smooth camera pan or slide to the API integration step.
- **Action:** A glowing API key (`sk-or-v1-...`) visually generates from an "OpenRouter" icon and gets injected securely into the PainForge dashboard.
- Text on screen fades in: "Bring Your Own Key (BYOK) - Connect OpenRouter to enable the AI reasoning engine."
- Emphasize the "Cryptographic Isolation" aspect with a subtle lock icon animation.

## Phase 3: Target Subreddits (The Hunt)
- The UI morphs into the target selection screen.
- **Action:** Tags pop in with a staggered spring animation: `r/startups`, `r/SaaS`, `r/freelance`. 
- Text on screen fades in: "Target Subreddits - Where your ideal clients hang out."

## Phase 4: Scan & Generate (The Forge)
- The view transitions to a dark dashboard. The cursor clicks a glowing red "Scan" button.
- **Action:** A radar/scanning effect highlights the screen. A high-value post (e.g., "MOD HERE: $400 - AI Movie Clipping") flips into view.
- A glowing, AI-processing gradient border wraps around the card. A "hyper-personalized, human-sounding pitch" types out instantly in a glassmorphism panel.
- Text on screen fades in: "Scan & Generate - The AI analyzes posts, scores intent, and writes your pitch."

# Technical Requirements
1. Use `framer-motion` for sequence orchestration (`AnimatePresence`, `variants`, `layoutId`).
2. Ensure transitions between the 4 phases overlap slightly to create a continuous cinematic video feel, not a PowerPoint slideshow.
3. Build the UI mockups entirely with HTML/CSS/Tailwind. Do not use actual external video files; animate the DOM elements to simulate the app interface.
4. Make the component fully responsive and self-contained so it can be dropped directly into a Next.js App Router project.