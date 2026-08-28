const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAppBlockingService(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Ensure service list exists
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    // Check if the service already exists
    const hasService = mainApplication.service.some(
      (s) => s.$ && s.$['android:name'] === '.AppBlockingService'
    );

    if (!hasService) {
      mainApplication.service.push({
        $: {
          'android:name': '.AppBlockingService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'specialUse',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'Pomodoro app-blocking service to help users focus on studies by preventing access to banned apps.',
            },
          },
        ],
      });
      console.log('[ConfigPlugin] Added AppBlockingService to AndroidManifest.xml');
    }

    return config;
  });
};
