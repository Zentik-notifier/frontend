import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

const withAndroidManifestFix: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    try {
      const androidManifest = config.modResults as any;
      console.log('AndroidManifestFix: Starting manifest processing...');

      // Ensure manifest has proper structure
      if (!androidManifest?.manifest) {
        console.warn('AndroidManifestFix: No manifest found, skipping...');
        return config;
      }

      // Ensure attributes object exists and add tools namespace correctly
      if (!androidManifest.manifest.$) {
        androidManifest.manifest.$ = {};
      }

      // Add tools namespace as a proper attribute: xmlns:tools
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      console.log('AndroidManifestFix: Added xmlns:tools namespace');

      // Find the application tag safely
      const applications = androidManifest.manifest.application;
      if (!applications || !Array.isArray(applications) || applications.length === 0) {
        console.warn('AndroidManifestFix: No application tag found, skipping...');
        return config;
      }

      const application = applications[0];
      if (!application) {
        console.warn('AndroidManifestFix: No application tag found, skipping...');
        return config;
      }

      // Ensure meta-data array exists so we can add entries if missing
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }

      // Process meta-data entries safely
      const metaDataArray = Array.isArray(application['meta-data'])
        ? application['meta-data']
        : [application['meta-data']];

      console.log('AndroidManifestFix: Found', metaDataArray.length, 'meta-data entries');

      let modified = false;
      metaDataArray.forEach((metaData: any, index: number) => {
        if (metaData?.$?.name) {
          const name = metaData.$.name;
          console.log('AndroidManifestFix: Processing meta-data', index, ':', name);
          
          if (name === 'com.google.firebase.messaging.default_notification_channel_id') {
            // Ensure we can override conflicts with other manifests
            metaData.$['tools:replace'] = 'android:value';
            modified = true;
            console.log('AndroidManifestFix: Added tools:replace for notification_channel_id');
          } else if (name === 'com.google.firebase.messaging.default_notification_color') {
            metaData.$['tools:replace'] = 'android:resource';
            modified = true;
            console.log('AndroidManifestFix: Added tools:replace for notification_color');
          } else if (name === 'com.google.firebase.messaging.default_notification_icon') {
            metaData.$['tools:replace'] = 'android:resource';
            modified = true;
            console.log('AndroidManifestFix: Added tools:replace for notification_icon');
          }
        }
      });

      // Helper to check if a meta-data entry exists by android:name
      const hasMetaData = (metaName: string) =>
        metaDataArray.some((m: any) => m?.$?.name === metaName || m?.$?.['android:name'] === metaName);

      // Helper to push a new meta-data entry
      const pushMetaData = (entry: any) => {
        if (Array.isArray(application['meta-data'])) {
          application['meta-data'].push(entry);
        } else {
          application['meta-data'] = [application['meta-data'], entry];
        }
      };

      // Ensure FCM meta-data exist with tools:replace so manifest merger won't fail
      if (!hasMetaData('com.google.firebase.messaging.default_notification_channel_id')) {
        pushMetaData({
          $: {
            'android:name': 'com.google.firebase.messaging.default_notification_channel_id',
            'android:value': 'default',
            'tools:replace': 'android:value',
          },
        });
        modified = true;
        console.log('AndroidManifestFix: Injected missing default_notification_channel_id meta-data');
      }

      if (!hasMetaData('com.google.firebase.messaging.default_notification_color')) {
        pushMetaData({
          $: {
            'android:name': 'com.google.firebase.messaging.default_notification_color',
            'android:resource': '@color/notification_icon_color',
            'tools:replace': 'android:resource',
          },
        });
        modified = true;
        console.log('AndroidManifestFix: Injected missing default_notification_color meta-data');
      }

      if (!hasMetaData('com.google.firebase.messaging.default_notification_icon')) {
        pushMetaData({
          $: {
            'android:name': 'com.google.firebase.messaging.default_notification_icon',
            'android:resource': '@drawable/notification_icon',
            'tools:replace': 'android:resource',
          },
        });
        modified = true;
        console.log('AndroidManifestFix: Injected missing default_notification_icon meta-data');
      }

      // Force the manifest to be updated
      if (modified) {
        config.modResults = androidManifest;
        console.log('AndroidManifestFix: Forced manifest update');
      }

      if (modified) {
        console.log('AndroidManifestFix: Manifest modified successfully');
      } else {
        console.log('AndroidManifestFix: No modifications needed, manifest already correct');
      }

      // Debug: show final manifest structure
      console.log('AndroidManifestFix: Final manifest structure:', JSON.stringify(androidManifest.manifest, null, 2));

    } catch (error) {
      console.error('AndroidManifestFix: Error processing manifest:', error);
    }

    return config;
  });
};

export default withAndroidManifestFix;
