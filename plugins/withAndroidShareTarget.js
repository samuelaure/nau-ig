const {
    withAndroidManifest,
    withDangerousMod,
    withAndroidStyles,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Industry-standard plugin to enable Dialog-themed share intents.
 * 1. Configures AndroidManifest with a dedicated CaptureActivity.
 * 2. Automatically manages CaptureActivity.kt source code.
 * 3. Injects custom AppCompat Dialog themes into styles.xml.
 */
function withAndroidShareTarget(config) {
    // 1. Manifest Modification
    config = withAndroidManifest(config, (config) => {
        const manifest = config.modResults.manifest;
        const application = manifest.application[0];
        const mainActivity = application.activity.find((a) => a.$['android:name'] === '.MainActivity');

        if (mainActivity) {
            mainActivity.$['android:launchMode'] = 'singleTask';

            // Remove general SEND from Main Activity to prevent deep-linking issues
            if (mainActivity['intent-filter']) {
                mainActivity['intent-filter'] = mainActivity['intent-filter'].filter((filter) => {
                    const hasSendAction = filter.action?.some(
                        (action) => action.$['android:name'] === 'android.intent.action.SEND',
                    );
                    return !hasSendAction;
                });
            }
        }

        // Add or Update CaptureActivity (The Dialog View)
        const captureActivity = {
            $: {
                'android:name': '.CaptureActivity',
                'android:label': config.name || '9naŭ IG',
                'android:theme': '@style/AppTheme.CaptureDialog',
                'android:excludeFromRecents': 'true',
                'android:documentLaunchMode': 'always',
                'android:taskAffinity': '',
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

        const existingCapture = application.activity.find(
            (a) => a.$['android:name'] === '.CaptureActivity',
        );
        if (!existingCapture) {
            application.activity.push(captureActivity);
        } else {
            Object.assign(existingCapture.$, captureActivity.$);
            existingCapture['intent-filter'] = captureActivity['intent-filter'];
        }

        return config;
    });

    // 2. Inject Styles (Theme definition)
    config = withAndroidStyles(config, (config) => {
        const styles = config.modResults.resources.style || [];
        const hasTheme = styles.some((s) => s.$.name === 'AppTheme.CaptureDialog');

        if (!hasTheme) {
            styles.push({
                $: {
                    name: 'AppTheme.CaptureDialog',
                    parent: 'Theme.AppCompat.Light.Dialog.NoActionBar',
                },
                item: [
                    { $: { name: 'android:windowIsTranslucent' }, _: 'true' },
                    {
                        $: { name: 'android:windowBackground' },
                        _: '@android:color/transparent',
                    },
                    { $: { name: 'android:windowContentOverlay' }, _: '@null' },
                    { $: { name: 'android:windowNoTitle' }, _: 'true' },
                    { $: { name: 'android:windowIsFloating' }, _: 'true' },
                    { $: { name: 'android:backgroundDimEnabled' }, _: 'true' },
                ],
            });
        }
        config.modResults.resources.style = styles;
        return config;
    });

    // 3. Inject Kotlin File (Self-Healing Source Management)
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
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class CaptureActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme_CaptureDialog)
        super.onCreate(null)
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
            // Only write if the android folder exists
            if (fs.existsSync(path.join(projectRoot, 'android'))) {
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(filePath, kotlinCode);
            }
            return config;
        },
    ]);

    return config;
}

module.exports = withAndroidShareTarget;
