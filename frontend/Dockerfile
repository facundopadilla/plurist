FROM node:22-slim
RUN npm install -g pnpm
RUN pnpm dlx playwright install chromium --with-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install
COPY . .
RUN chown -R node:node /app
# Drop root privileges before running the dev server
USER node
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host"]
