// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Config plugin to add Android intent queries for linking to phone, SMS, email, and maps apps.
 * Required for Android 11 (API 30) and above to allow opening external apps.
 */
const withAndroidLinkingQueries = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    const TARGET_INTENTS = [
      { action: "android.intent.action.DIAL" },
      { action: "android.intent.action.SENDTO", scheme: "sms" },
      { action: "android.intent.action.SENDTO", scheme: "mailto" },
      { action: "android.intent.action.VIEW", scheme: "geo" },
      { action: "android.intent.action.VIEW", scheme: "http" },
      { action: "android.intent.action.VIEW", scheme: "https" },
    ];

    // Initialize queries array if it doesn't exist
    if (!androidManifest.queries) {
      androidManifest.queries = [];
    }

    const getActionName = (intent) => intent?.action?.[0]?.$?.["android:name"];
    const getDataScheme = (intent) => intent?.data?.[0]?.$?.["android:scheme"];
    const intentMatches = (target, intent) => {
      const actionName = getActionName(intent);
      const scheme = getDataScheme(intent);

      if (actionName !== target.action) {
        return false;
      }

      if (target.scheme) {
        return scheme === target.scheme;
      }

      return scheme == null;
    };

    const hasMatchingQueries = androidManifest.queries.some((entry) => {
      const intents = entry.intent || [];
      return TARGET_INTENTS.every((target) =>
        intents.some((intent) => intentMatches(target, intent)),
      );
    });

    if (!hasMatchingQueries) {
      // Add intent queries for phone, SMS, email, and maps
      androidManifest.queries.push({
        intent: [
          // Phone dialer intent
          {
            action: [{ $: { "android:name": "android.intent.action.DIAL" } }],
          },
          // SMS intent
          {
            action: [{ $: { "android:name": "android.intent.action.SENDTO" } }],
            data: [{ $: { "android:scheme": "sms" } }],
          },
          // Email intent
          {
            action: [{ $: { "android:name": "android.intent.action.SENDTO" } }],
            data: [{ $: { "android:scheme": "mailto" } }],
          },
          // Maps/geo intent
          {
            action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
            data: [{ $: { "android:scheme": "geo" } }],
          },
          // Web/http intent
          {
            action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
            data: [{ $: { "android:scheme": "http" } }],
          },
          // Web/https intent
          {
            action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
            data: [{ $: { "android:scheme": "https" } }],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withAndroidLinkingQueries;
