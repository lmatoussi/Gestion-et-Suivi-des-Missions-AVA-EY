FROM node:20-alpine AS build
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all files and build the project
COPY . .
RUN npm run build -- --configuration=production

# Use nginx to serve the built Angular app
FROM nginx:alpine
COPY --from=build /app/dist/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# When the container starts, start nginx
CMD ["nginx", "-g", "daemon off;"]
