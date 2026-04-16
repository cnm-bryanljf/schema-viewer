FROM node:22

WORKDIR /app

# Copy project files (node_modules excluded via .dockerignore)
COPY . .

# Install all deps including devDependencies (needed for vite build + tsx runtime)
RUN npm install --include=dev

# Build the Vite frontend into dist/
RUN npm run build

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/index.ts"]
