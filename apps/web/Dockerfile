FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Truyền biến môi trường URL Backend lúc build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve với Nginx siêu nhẹ
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy file cấu hình custom của Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]