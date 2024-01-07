# Crawl adstransparency.google.com

## Run development server

- Setup

```bash
npm install

cp .env.example .env # and edit

# Start cronicle
docker compose -f compose-dev.yaml up cronicle

# Login to cronicle to create API key (http://localhost:3012), default user/pass: admin/admin

# Init cronicle events
API_KEY=xxx CRAWLER_HOST=http://host.docker.internal:3000 ./init-cronicle_events.sh

# Update .env file: CRONICLE_CRAWL_EVENT_ID, CRONICLE_API_KEY

```

- Start development server

```bash
docker compose -f compose-dev.yaml up -d
npm run start
```

## Run production server

- Setup and run

```bash
cp .env.example .env

# Start cronicle
docker compose -f compose-prod.yaml up cronicle

# Login to cronicle to create API key (http://localhost:3012), default user/pass: admin/admin

# Init cronicle events
API_KEY=xxx ./init-cronicle_events.sh

# Update .env file: CRONICLE_CRAWL_EVENT_ID, CRONICLE_API_KEY and database details

# Start production server
docker compose -f compose-prod.yaml up -d
```
