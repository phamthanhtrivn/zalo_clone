export default () => ({
  port: parseInt(process.env.PORT!, 10),
  mongoUri: process.env.MONGO_URI,
  access_secret: process.env.JWT_ACCESS_SECRET as string,
  access_expires: process.env.JWT_ACCESS_EXPIRES as string,
  tmp_secret: process.env.JWT_TEMP_SECRET as string,
  tmp_expires: process.env.JWT_TEMP_EXPIRES as string,
  refresh_secret: process.env.JWT_REFRESH_SECRET as string,
  refresh_expires: process.env.JWT_REFRESH_EXPIRES as string,
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!, 10),
  },
});
