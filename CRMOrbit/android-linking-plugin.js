// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Config plugin to add Android intent queries for linking to phone, SMS, email, and maps apps.
 * Required for Android 11 (API 30) and above to allow opening external apps.
 */
const withAndroidLinkingQueries = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // Initialize queries array if it doesn't exist
    if (!androidManifest.queries) {
      androidManifest.queries = [];
    }

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
      ],
    });

    return config;
  });
};

module.exports = withAndroidLinkingQueries;
