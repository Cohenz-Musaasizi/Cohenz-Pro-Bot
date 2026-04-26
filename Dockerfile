FROM node:20-slim

# Install system packages
RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    curl \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json ./

# Remove problematic packages that cause build failures
RUN sed -i '/"ffmpeg-static"/d' package.json
RUN sed -i '/"mumaker"/d' package.json

# Install Node dependencies
RUN npm install --no-package-lock

# Copy the rest of your project
COPY . .

# Use the port expected by Hugging Face / Render
ENV PORT=7860
EXPOSE 7860

# Health check (pings the /health endpoint every 60 seconds)
HEALTHCHECK --interval=60s --timeout=3s CMD curl -f http://localhost:7860/health || exit 1

# Start the bot
CMD ["npm", "start"]
