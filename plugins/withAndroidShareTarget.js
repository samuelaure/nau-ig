const {
  withAndroidManifest,
  withDangerousMod,
  withAndroidStyles,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced Share Target Plugin
 * 1. Definitive removal of duplicate icons.
 * 2. Proper Intent handling for CaptureActivity.
 */
function withAndroidShareTarget(config) {
  // 1. Precise Manifest Modification
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];
    const activities = application.activity || [];

    // Find and Clean MainActivity
    const mainActivity = activities.find(
      (a) => a.$['android:name'] === '.MainActivity' || a.$['android:name']?.endsWith('.MainActivity'),
    );

    if (mainActivity) {
      // Ensure it's singleTask
      mainActivity.$['android:launchMode'] = 'singleTask';

      // Aggressively remove all SEND/SEND_MULTIPLE filters from MainActivity
      if (mainActivity['intent-filter']) {
        mainActivity['intent-filter'] = mainActivity['intent-filter'].filter((filter) => {
          const actions = Array.isArray(filter.action) ? filter.action : [filter.action];
          const hasSendAction = actions.some((action) => {
            const name = action?.$?.['android:name'];
            return name === 'android.intent.action.SEND' || name === 'android.intent.action.SEND_MULTIPLE';
          });
          return !hasSendAction;
        });
      }
    }

    // Add or Update CaptureActivity (The Dialog View)
    const captureActivityProps = {
      $: {
        'android:name': '.CaptureActivity',
        'android:label': config.name || '9naŭ IG',
        'android:theme': '@style/AppTheme.CaptureDialog',
        'android:excludeFromRecents': 'true',
        'android:documentLaunchMode': 'always',
        'android:taskAffinity': '', // Important for keeping it separate from Main Task
        'android:exported': 'true',
        'android:windowSoftInputMode': 'adjustResize',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [{ $: { 'android:mimeType': 'text/plain' } }],
        },
      ],
    };

    const existingCaptureIdx = activities.findIndex(
      (a) => a.$['android:name'] === '.CaptureActivity',
    );
    if (existingCaptureIdx > -1) {
      activities[existingCaptureIdx] = captureActivityProps;
    } else {
      activities.push(captureActivityProps);
    }

    return config;
  });

  // 2. Inject Styles (Dialog Theme)
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources.style || [];
    const hasTheme = styles.some((s) => s.$.name === 'AppTheme.CaptureDialog');

    if (!hasTheme) {
      styles.push({
        $: {
          name: 'AppTheme.CaptureDialog',
          parent: '@style/Theme.AppCompat.Light.Dialog',
        },
        item: [
          { $: { name: 'android:windowIsTranslucent' }, _: 'true' },
          { $: { name: 'android:windowBackground' }, _: '@android:color/transparent' },
          { $: { name: 'android:windowContentOverlay' }, _: '@null' },
          { $: { name: 'android:windowNoTitle' }, _: 'true' },
          { $: { name: 'android:windowIsFloating' }, _: 'true' },
          { $: { name: 'android:backgroundDimEnabled' }, _: 'true' },
        ],
      });
    }
    return config;
  });

  // 3. Robust Kotlin File (Handling Intents & React Context)
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android?.package || 'com.nau.ig';
      const packagePath = packageName.replace(/\./g, '/');
      const projectRoot = config.modRequest.projectRoot;
      const filePath = path.join(
        projectRoot,
        'android/app/src/main/java',
        packagePath,
        'CaptureActivity.kt',
      );

      const kotlinCode = `package ${packageName}

import android.os.Bundle
import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class CaptureActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Apply dialog theme before onCreate
        setTheme(R.style.AppTheme_CaptureDialog)
        super.onCreate(savedInstanceState)
    }

    /**
     * Required for expo-share-intent to pick up the intent
     * when the activity is already running or newly created.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    override fun getMainComponentName(): String = "main"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ) {}
        )
    }
}
`;
      if (fs.existsSync(path.join(projectRoot, 'android'))) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, kotlinCode);
      }
      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidShareTarget;
