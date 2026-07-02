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

const iosGoogleMapsApiKey =
  process.env.IOS_GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY ||
  googleMapsApiKey;

const shouldEnableEasUpdates =
  process.env.EAS_BUILD === "true" ||
  process.env.ENABLE_EAS_UPDATES === "true";

const easProjectId = "3d6a4ab8-2046-4626-ad3a-eb1a76df0118";

const iosPaymentUrlSchemes = [
  "ispmobile",
  "kb-acp",
  "liivbank",
  "mpocket.online.ansimclick",
  "hdcardappcardansimclick",
  "shinhan-sr-ansimclick",
  "smshinhanansimclick",
  "cloudpay",
  "nhappcardansimclick",
  "nonghyupcardansimclick",
  "lotteappcard",
  "lottesmartpay",
  "citispay",
  "citicardappkr",
  "hanaskcardmobileportal",
  "wooripay",
  "com.wooricard.wcard",
  "kakaotalk",
  "kakaokompassauth",
  "supertoss",
  "naversearchapp",
  "payco",
  "lpayapp",
  "ssgpay",
];

// if (!googleMapsApiKey) {
//   throw new Error(
//     "GOOGLE_MAPS_API_KEY is required. Add it to app/.env.local or EAS environment variables.",
//   );
// }

module.exports = ({ config }) => {
  const plugins = (config.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "expo-location") {
      return [
        "expo-location",
        {
          ...plugin[1],
          locationWhenInUsePermission:
            "셔틀 운행 및 픽업 위치 확인을 위해 현재 위치 권한이 필요합니다.",
          locationAlwaysAndWhenInUsePermission:
            "셔틀 운행 중 백그라운드에서도 위치를 공유하기 위해 위치 권한이 필요합니다.",
          isIosBackgroundLocationEnabled: true,
        },
      ];
    }

    return plugin;
  });

  const nextConfig = {
    ...config,
    plugins,
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier || "com.goundcorp.ipasscare",
      config: {
        ...config.ios?.config,
        googleMapsApiKey: iosGoogleMapsApiKey,
      },
      infoPlist: {
        ...config.ios?.infoPlist,
        NSLocationWhenInUseUsageDescription:
          "셔틀 운행 및 픽업 위치 확인을 위해 현재 위치 권한이 필요합니다.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "셔틀 운행 중 백그라운드에서도 위치를 공유하기 위해 위치 권한이 필요합니다.",
        NSLocationAlwaysUsageDescription:
          "셔틀 운행 중 백그라운드에서도 위치를 공유하기 위해 위치 권한이 필요합니다.",
        UIBackgroundModes: Array.from(
          new Set([
            ...(config.ios?.infoPlist?.UIBackgroundModes || []),
            "location",
            "remote-notification",
          ]),
        ),
        LSApplicationQueriesSchemes: Array.from(
          new Set([
            ...(config.ios?.infoPlist?.LSApplicationQueriesSchemes || []),
            ...iosPaymentUrlSchemes,
          ]),
        ),
      },
    },
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
  };

  // Local Expo Go sessions should load from Metro, not EAS Update.
  if (shouldEnableEasUpdates) {
    nextConfig.name = "IPASSCARE";
    nextConfig.slug = "app";
    nextConfig.extra = {
      ...nextConfig.extra,
      eas: {
        projectId: easProjectId,
      },
    };
    nextConfig.runtimeVersion = {
      policy: "appVersion",
    };
    nextConfig.updates = {
      enabled: true,
      url: `https://u.expo.dev/${easProjectId}`,
    };
  } else {
    nextConfig.name = "app-local";
    nextConfig.slug = "app-local";
    nextConfig.extra = {
      ...nextConfig.extra,
    };
    delete nextConfig.extra.eas;
    nextConfig.updates = {
      enabled: false,
    };
    delete nextConfig.runtimeVersion;
  }

  return nextConfig;
};
