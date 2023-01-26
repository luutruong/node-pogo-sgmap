ARG IMAGE=node:18.11-alpine

FROM ${IMAGE} AS deps

WORKDIR /app

COPY package.json .
COPY yarn.lock .

RUN yarn install --frozen-lockfile --ignore-scripts

FROM ${IMAGE} AS runner

WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules

CMD ["yarn", "start"]