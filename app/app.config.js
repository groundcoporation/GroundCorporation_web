const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// if (!googleMapsApiKey) {
//   throw new Error(
//     "GOOGLE_MAPS_API_KEY is required. Add it to app/.env.local or EAS environment variables.",
//   );
// }

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
