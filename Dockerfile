FROM node:20-alpine

# Install system packages (Alpine uses apk, not apt)
RUN apk add --no-cache \
    git \
    ffmpeg \
    curl \
    python3 make g++ \
    cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

WORKDIR /app

# Copy package.json first for better layer caching
COPY package.json ./

# Remove problematic packages that cause build failures
RUN sed -i '/"ffmpeg-static"/d' package.json
RUN sed -i '/"mumaker"/d' package.json

# Install dependencies (clean cache to reduce image size)
RUN npm install --no-package-lock && npm cache clean --force

# Copy the rest of the project
COPY . .

ENV PORT=7860
EXPOSE 7860

# Health check – keeps the container alive
HEALTHCHECK --interval=60s --timeout=3s CMD curl -f http://localhost:7860/health || exit 1

CMD ["npm", "start"]
