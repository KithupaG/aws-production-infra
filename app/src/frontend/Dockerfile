FROM node:22-alpine AS builder

WORKDIR /usr/src/frontend/

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine AS server

COPY --from=builder /usr/src/frontend/dist/ /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]





