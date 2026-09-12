FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV REQUEST_TIMEOUT=5000
ENV REPORTS_DIR=/app/reports

VOLUME ["/app/reports"]

ENTRYPOINT ["node", "src/index.js"]