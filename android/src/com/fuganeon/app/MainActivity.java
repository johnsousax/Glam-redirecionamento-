package com.fuganeon.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Fuga Neon: abre o jogo publicado (sempre a versão mais nova) e, sem internet,
 * cai para a cópia que vem dentro do app (modos sozinho e 2 no mesmo celular).
 */
public class MainActivity extends Activity {
    static final String REMOTE = "https://fuga-neon.vercel.app/";
    static final String LOCAL = "file:///android_asset/index.html";
    private WebView web;
    private boolean usingLocal = false;

    public class Bridge {
        @JavascriptInterface
        public void exit() {
            runOnUiThread(new Runnable() { public void run() { finish(); } });
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        web = new WebView(this);
        web.setBackgroundColor(0xff0b0820);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setUserAgentString(s.getUserAgentString() + " FugaNeonApp/1");
        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url.startsWith("file:") || url.startsWith(REMOTE)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { }
                return true;
            }
            @Override
            public void onReceivedError(WebView v, int code, String desc, String url) {
                // sem internet ao abrir: usa a cópia do jogo que vem no app
                if (!usingLocal && url != null && url.startsWith(REMOTE)) {
                    usingLocal = true;
                    v.loadUrl(LOCAL);
                }
            }
        });
        setContentView(web);
        hideBars();
        String start = REMOTE;
        Intent it = getIntent();
        if (it != null && it.getData() != null && it.getData().toString().startsWith(REMOTE)) start = it.getData().toString();
        web.loadUrl(start);
    }

    private void hideBars() {
        if (Build.VERSION.SDK_INT >= 19) {
            // IMMERSIVE_STICKY | HIDE_NAVIGATION | FULLSCREEN | LAYOUT_*
            getWindow().getDecorView().setSystemUiVisibility(0x1000 | 0x2 | 0x4 | 0x100 | 0x200 | 0x400);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    @Override
    public void onBackPressed() {
        web.loadUrl("javascript:void((window.__fneonBack&&window.__fneonBack())||AndroidApp.exit())");
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); hideBars(); }
}
