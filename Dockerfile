# RenderFlow Cloud GPU Engine — Hugging Face Spaces & Docker Container
FROM node:20-slim

# Install system dependencies for Chromium, FFmpeg and Unicode Fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-ipafont-gothic \
    fonts-freefont-ttf \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer and Cloud execution
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=7860

# Create non-root user (Hugging Face Spaces runs as user UID 1000)
RUN useradd -m -u 1000 user
WORKDIR /app

# Copy package files first for optimal build cache
COPY --chown=user:user package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY --chown=user:user . .

# Ensure storage directories exist with write permissions
RUN mkdir -p /app/uploads /app/uploads/previews /app/output /app/public && \
    chown -R user:user /app

# Switch to non-root user
USER user

# Expose Hugging Face default port
EXPOSE 7860

# Start RenderFlow Studio Server
CMD ["node", "src/preview-server.js"]
