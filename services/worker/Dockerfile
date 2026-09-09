FROM node:20-alpine AS base

# Install ffmpeg, ffprobe, and sharp native dependencies
RUN apk add --no-cache ffmpeg vips-dev

WORKDIR /app

# Copy root workspace configurations
COPY package.json turbo.json ./
COPY packages ./packages
COPY services/worker ./services/worker

# Install dependencies
RUN npm install

WORKDIR /app/services/worker
RUN npx prisma generate
RUN npm run build

CMD ["npm", "run", "start"]
