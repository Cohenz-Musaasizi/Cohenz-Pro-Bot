FROM node:20-slim

# Install system packages
RUN apt-get update && apt-set install -y \
    git \
    ffmpeg \
    curl \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone your repository (ensures latest code on Northflank)
RUN git clone https://github.com/Cohenz-Musaasizi/Cohenz-Pro-Bot.git .

# Remove problematic packages that cause build failures
RUN sed -i '/"ffmpeg-static"/d' package.json
RUN sed -i '/"mumaker"/d' package.json

# Install Node dependencies
RUN npm install --no-package-lock

# Use port 7860
ENV PORT=7860
EXPOSE 7860

# Health check
HEALTHCHECK --interval=60s --timeout=3s CMD curl -f http://localhost:7860/health || exit 1

# Start the bot
CMD ["npm", "start"]
