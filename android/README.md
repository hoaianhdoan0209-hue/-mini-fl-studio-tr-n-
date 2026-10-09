# Mini FL Studio Android (APK)

Android WebView wrapper around the **bundled local web app**, using AndroidX WebViewAssetLoader and the secure origin `https://appassets.androidplatform.net/assets/web/index.html`.

Supports:
- offline instrument playback from bundled .js encoded MP3 banks, piano roll, audio clip importing and recording
- Microphone permission on Android 8+ when user taps Record; system user approval required
- Android native document picker and saving `.minifl` and `.wav` via ACTION_CREATE_DOCUMENT
- audio projects stored in WebView IndexedDB on device

## Building
GitHub Actions workflow `.github/workflows/android-apk.yml` packages current web files into the Android assets, then runs `gradle -p android --no-daemon assembleDebug`. The **debug APK** can be installed for personal testing; it is not Play Store signed release. Download the APK under workflow artifacts.

For local Android Studio: open `android/` as a Gradle project, copy web files listed in the workflow into `android/app/src/main/assets/web/`, place `icon-192.png` as `android/app/src/main/res/drawable/minifl_icon.png`, then build.

Before future public distribution, use your own release keystore and Google Play policies. GitHub builds use the default Android debug signature.
