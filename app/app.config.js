const fs = require("fs");
const path = require("path");

const readEnvFileValue = (fileName, key) => {
  const envPath = path.join(__dirname, fileName);
  if (!fs.existsSync(envPath)) {
    return undefined;
  }

  const prefix = `${key}=`;
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(prefix));

  if (!line) {
    return undefined;
  }

  return line
    .trim()
    .slice(prefix.length)
    .replace(/^['"]|['"]$/g, "");
};

const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  readEnvFileValue(".env.local", "GOOGLE_MAPS_API_KEY") ||
  readEnvFileValue(".env", "GOOGLE_MAPS_API_KEY");

if (!googleMapsApiKey) {
  throw new Error(
    "GOOGLE_MAPS_API_KEY is required. Add it to app/.env.local or EAS environment variables.",
  );
}

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        ...config.android?.config?.googleMaps,
        apiKey: googleMapsApiKey,
      },
    },
  },
});
