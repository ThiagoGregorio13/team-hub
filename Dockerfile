FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production

COPY tsconfig.json ./
COPY src ./src

CMD ["bun", "run", "src/index.ts"]
