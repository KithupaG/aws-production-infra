FROM node:22-slim

WORKDIR /usr/src/backend/

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]