package com.minifl.studio;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int CHOOSE_FILE = 21;
    private static final int OPEN_PROJECT = 22;
    private static final int SAVE_FILE = 23;
    private static final int MICROPHONE = 24;
    private static final int MAX_PROJECT_BYTES = 48 * 1024 * 1024;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingAudioPermission;
    private byte[] pendingSave;
    private String pendingMime;
    private final String appOrigin = "https://appassets.androidplatform.net";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView = new WebView(this);
        webView.setBackgroundColor(0xff121b2b);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDefaultTextEncodingName("UTF-8");
        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("appassets.androidplatform.net".equals(url.getHost())) return false;
                Intent external = new Intent(Intent.ACTION_VIEW, url);
                try { startActivity(external); } catch (Exception ex) { showToast("Không mở được liên kết"); }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, CHOOSE_FILE);
                    return true;
                } catch (Exception e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    showToast("Không mở được trình chọn file");
                    return false;
                }
            }
            @Override public void onPermissionRequest(final PermissionRequest request) {
                ui.post(() -> {
                    boolean wantsAudio = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) wantsAudio = true;
                    }
                    Uri origin = request.getOrigin();
                    if (!wantsAudio || origin == null || !"https".equals(origin.getScheme()) || !"appassets.androidplatform.net".equals(origin.getHost())) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        if (pendingAudioPermission != null) pendingAudioPermission.deny();
                        pendingAudioPermission = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE);
                    }
                });
            }
        });
        webView.loadUrl(appOrigin + "/assets/web/index.html");
    }

    private void showToast(String text) {
        ui.post(() -> Toast.makeText(this, text, Toast.LENGTH_SHORT).show());
    }

    private void jsMessage(String text) {
        ui.post(() -> {
            if (webView != null) webView.evaluateJavascript(
                "window.nativeMessage&&window.nativeMessage(" + JSONObject.quote(text) + ")", null);
        });
    }

    private void saveDocument(byte[] data, String filename, String mime) {
        ui.post(() -> {
            if (pendingSave != null) {
                showToast("Đang chọn nơi lưu file trước");
                return;
            }
            pendingSave = data;
            pendingMime = mime;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(mime);
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            try { startActivityForResult(intent, SAVE_FILE); }
            catch (Exception e) { pendingSave = null; showToast("Không thể mở nơi lưu file"); }
        });
    }

    public final class Bridge {
        @JavascriptInterface public void saveProject(String projectJson, String filename) {
            if (projectJson == null || projectJson.length() > MAX_PROJECT_BYTES) {
                jsMessage("Dự án quá lớn để lưu. Giảm dung lượng audio."); return;
            }
            saveDocument(projectJson.getBytes(StandardCharsets.UTF_8), safeFileName(filename, ".minifl"), "application/json");
        }

        @JavascriptInterface public void exportWav(String base64, String filename) {
            if (base64 == null || base64.length() > 110 * 1024 * 1024) {
                jsMessage("File WAV quá lớn"); return;
            }
            try {
                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                saveDocument(data, safeFileName(filename, ".wav"), "audio/wav");
            } catch (Exception e) { jsMessage("Không thể lưu WAV: " + e.getMessage()); }
        }

        @JavascriptInterface public void openProject() {
            ui.post(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try { startActivityForResult(intent, OPEN_PROJECT); }
                catch (Exception e) { showToast("Không chọn được dự án"); }
            });
        }
    }

    private static String safeFileName(String name, String ext) {
        if (name == null || name.isEmpty()) name = "MiniFL" + ext;
        name = name.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_");
        return name.length() > 90 ? name.substring(0, 90 - ext.length()) + ext : name;
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == CHOOSE_FILE) {
            if (fileCallback == null) return;
            Uri[] uris = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    uris = new Uri[count];
                    for (int i=0;i<count;i++) uris[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) uris = new Uri[]{data.getData()};
            }
            fileCallback.onReceiveValue(uris);
            fileCallback = null;
            return;
        }
        if (requestCode == SAVE_FILE) {
            byte[] out = pendingSave;
            pendingSave = null;
            pendingMime = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
            Uri dest = data.getData();
            io.execute(() -> {
                try (OutputStream stream = getContentResolver().openOutputStream(dest, "w")) {
                    if (stream == null) throw new Exception("Không mở được bộ nhớ");
                    stream.write(out);
                    stream.flush();
                    jsMessage("Đã lưu file thành công");
                } catch (Exception e) { jsMessage("Lưu file lỗi: " + e.getMessage()); }
            });
            return;
        }
        if (requestCode == OPEN_PROJECT && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri uri = data.getData();
            io.execute(() -> {
                try (InputStream input = getContentResolver().openInputStream(uri);
                     ByteArrayOutputStream sink = new ByteArrayOutputStream()) {
                    if (input == null) throw new Exception("Không đọc được file");
                    byte[] part = new byte[16384];int len;
                    while ((len = input.read(part)) >= 0) {
                        sink.write(part, 0, len);
                        if (sink.size() > MAX_PROJECT_BYTES) throw new Exception("Dự án vượt quá 48 MB");
                    }
                    String json = sink.toString("UTF-8");
                    ui.post(() -> webView.evaluateJavascript(
                        "window.receiveImportedProject(" + JSONObject.quote(json) + ")", null));
                } catch (Exception e) { jsMessage("Mở file lỗi: " + e.getMessage()); }
            });
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MICROPHONE && pendingAudioPermission != null) {
            PermissionRequest request = pendingAudioPermission;pendingAudioPermission = null;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED)
                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else { request.deny(); showToast("Chưa cấp quyền micro"); }
        }
    }

    @Override public void onBackPressed() {
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript("window.miniGoBack?window.miniGoBack():false", result -> {
            if (!"true".equals(result)) {
                if (webView.canGoBack()) webView.goBack();
                else MainActivity.super.onBackPressed();
            }
        });
    }

    @Override protected void onDestroy() {
        if (pendingAudioPermission != null) pendingAudioPermission.deny();
        if (webView != null) { webView.removeJavascriptInterface("AndroidBridge");webView.destroy();webView=null; }
        io.shutdown();
        super.onDestroy();
    }
}
