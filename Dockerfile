FROM node:20-slim

# Install system packages (ffmpeg, canvas libs, git, etc.)
RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone your repository
RUN git clone https://github.com/Cohenz-Musaasizi/Cohenz-Pro-Bot.git .

# Install Node dependencies
RUN npm install --no-package-lock

# Hugging Face uses port 7860
ENV PORT=7860
EXPOSE 7860

# Start the bot (the Express server inside index.js will handle health checks)
CMD ["npm", "start"]
