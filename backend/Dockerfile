# Single-stage on purpose: the `prisma` CLI (a devDependency) needs to stay
# available at container start to run `prisma migrate deploy`/`db seed`, and
# keeping build + runtime in the same image sidesteps a Render-native-runtime
# issue where the built dist/ wasn't reliably persisted between its separate
# build and deploy phases for this rootDir-based monorepo setup.
FROM node:20-slim

WORKDIR /app

# Prisma's query engine needs OpenSSL present on Debian-based images.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

# Idempotent: migrate + seed both use upserts, safe to re-run on every start/restart.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main"]
