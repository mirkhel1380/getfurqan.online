package online.getfurqan.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

/** Serve only the byte-identical, independently licensed v18 font locally. */
public final class InstalledFontWebViewClient extends BridgeWebViewClient {
    private static final String SOURCE = "https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2";
    private final Bridge appBridge;
    private final boolean installedStudy;

    public InstalledFontWebViewClient(Bridge bridge) {
        super(bridge); appBridge = bridge;
        boolean present;
        try (InputStream manifest = bridge.getContext().getAssets().open("public/installed-quranenc/manifest.json")) { present = manifest.read() >= 0; }
        catch (IOException legacySharedBundle) { present = false; }
        installedStudy = present;
    }

    @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (!installedStudy || !"GET".equals(request.getMethod()) || !SOURCE.equals(request.getUrl().toString())) {
            return super.shouldInterceptRequest(view, request);
        }
        try {
            return new WebResourceResponse("font/woff2", null, 200, "OK",
                Collections.singletonMap("Access-Control-Allow-Origin", "*"),
                appBridge.getContext().getAssets().open("public/installed-quranenc/uthmanic-hafs18.woff2"));
        } catch (IOException missing) {
            return new WebResourceResponse("font/woff2", null, 503, "Installed font unavailable",
                Collections.singletonMap("Access-Control-Allow-Origin", "*"), new ByteArrayInputStream(new byte[0]));
        }
    }
}
