package com.rotarapida.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private String pendingOAuthUrl = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Registrar a interface de banco de dados do SQLite no WebView
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new DatabaseBridge(this), "AndroidDatabase");
        }

        handleIntent(getIntent());
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
        if (data != null && "appentrega".equalsIgnoreCase(data.getScheme())) {
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
