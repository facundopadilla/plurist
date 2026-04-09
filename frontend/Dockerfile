FROM node:22-slim
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
# Match lockfile's @playwright/test; install to a shared path because runtime USER is node (not root).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN mkdir -p /ms-playwright && pnpm exec playwright install chromium --with-deps && chmod -R a+rX /ms-playwright
COPY . .
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host"]
