export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '86400', 10),
  },
  africasTalking: {
    username: process.env.AFRICAS_TALKING_USERNAME || undefined,
    apiKey: process.env.AFRICAS_TALKING_API_KEY || undefined,
  },
});
