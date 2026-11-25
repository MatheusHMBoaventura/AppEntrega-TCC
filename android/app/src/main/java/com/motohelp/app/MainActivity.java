package com.motohelp.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private String pendingOAuthUrl = null;
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Pede GPS e câmera ao abrir o app, para o mapa, o SOS e o leitor de QR
        // funcionarem na primeira vez. O WebChromeClient do Capacitor é mantido.
        requestAppPermissions();

        // Registrar a interface de banco de dados do SQLite no WebView
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new DatabaseBridge(this), "AndroidDatabase");
        }

        handleIntent(getIntent());
    }

    private void requestAppPermissions() {
        String[] permissions = new String[]{
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.CAMERA
        };
        for (String perm : permissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);
                return;
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data != null && ("appentrega".equalsIgnoreCase(data.getScheme()) || "motohelp".equalsIgnoreCase(data.getScheme()))) {
            final String url = data.toString();
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        String escaped = url.replace("'", "\\'");
                        String js = "if (window.handleOAuthRedirect) { window.handleOAuthRedirect('" + escaped + "'); } else { window._pendingOAuthUrl = '" + escaped + "'; }";
                        bridge.getWebView().evaluateJavascript(js, null);
                    }
                });
            } else {
                pendingOAuthUrl = url;
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pendingOAuthUrl != null && this.bridge != null && this.bridge.getWebView() != null) {
            final String url = pendingOAuthUrl;
            pendingOAuthUrl = null;
            this.bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    String escaped = url.replace("'", "\\'");
                    String js = "if (window.handleOAuthRedirect) { window.handleOAuthRedirect('" + escaped + "'); } else { window._pendingOAuthUrl = '" + escaped + "'; }";
                    bridge.getWebView().evaluateJavascript(js, null);
                }
            });
        }
    }
}

