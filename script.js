document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const websiteUrlInput = document.getElementById('websiteUrl');
    const appNameInput = document.getElementById('appName');
    const packageNameInput = document.getElementById('packageName');
    const appIconInput = document.getElementById('appIcon');
    const generateBtn = document.getElementById('generateBtn');
    const previewAppName = document.getElementById('previewAppName');

    // Update preview in real-time
    appNameInput.addEventListener('input', function() {
        previewAppName.textContent = this.value || 'App Name';
    });

    // Package name validation
    packageNameInput.addEventListener('input', function() {
        this.value = this.value.toLowerCase().replace(/[^a-z0-9.]/g, '');
    });

    // Generate APK function
    generateBtn.addEventListener('click', async function() {
        // Validate inputs
        if (!validateInputs()) {
            return;
        }

        // Show loading state
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating APK...';
        generateBtn.disabled = true;

        try {
            // Create app configuration
            const appConfig = {
                websiteUrl: websiteUrlInput.value,
                appName: appNameInput.value,
                packageName: packageNameInput.value,
                appIcon: appIconInput.value || 'https://via.placeholder.com/192x192/667eea/ffffff?text=App'
            };

            // Create APK file
            await generateAPK(appConfig);
            
            // Show success message
            alert('✅ APK generated successfully! Check your downloads.');
            
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error generating APK. Please try again.');
        } finally {
            // Reset button
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });

    function validateInputs() {
        const url = websiteUrlInput.value;
        const appName = appNameInput.value;
        const packageName = packageNameInput.value;

        if (!url) {
            alert('Please enter a website URL');
            return false;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            alert('Please enter a valid URL starting with http:// or https://');
            return false;
        }

        if (!appName) {
            alert('Please enter an app name');
            return false;
        }

        if (!packageName) {
            alert('Please enter a package name');
            return false;
        }

        if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[a-z0-9_]$/.test(packageName)) {
            alert('Please enter a valid package name (e.g., com.example.myapp)');
            return false;
        }

        return true;
    }

    async function generateAPK(config) {
        // Create a manifest file for the PWA
        const manifest = {
            "name": config.appName,
            "short_name": config.appName.substring(0, 12),
            "start_url": config.websiteUrl,
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#667eea",
            "icons": [{
                "src": config.appIcon,
                "sizes": "192x192",
                "type": "image/png"
            }]
        };

        // Create HTML template for the WebView app
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.appName}</title>
    <link rel="manifest" href="manifest.json">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        .loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="loading">Loading...</div>
    <iframe src="${config.websiteUrl}" allow="*"></iframe>
    <script>
        document.querySelector('.loading').style.display = 'none';
    </script>
</body>
</html>`;

        // Create a zip file with all necessary files
        const zip = new JSZip();
        
        // Add AndroidManifest.xml
        const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.appName}"
        android:theme="@style/AppTheme">
        <activity
            android:name=".MainActivity"
            android:label="${config.appName}"
            android:theme="@style/AppTheme.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

        // Add MainActivity.java
        const mainActivity = `package ${config.packageName};

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webview);
        webView.setWebViewClient(new WebViewClient());
        webView.getSettings().setJavaScriptEnabled(true);
        webView.loadUrl("${config.websiteUrl}");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}`;

        // Add layout file
        const layout = `<?xml version="1.0" encoding="utf-8"?>
<WebView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/webview"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />`;

        // Add files to zip
        zip.file("index.html", htmlTemplate);
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("AndroidManifest.xml", androidManifest);
        zip.file("src/MainActivity.java", mainActivity);
        zip.file("res/layout/activity_main.xml", layout);
        zip.file("README.txt", `
This is a WebView Android App for ${config.appName}

App Details:
- Package: ${config.packageName}
- Website: ${config.websiteUrl}
- Generated by: Website to APK Converter

To build this app:
1. Open in Android Studio
2. Build -> Build Bundle(s) / APK(s)
3. Install on your device

Note: This is a basic WebView app. For advanced features, 
you may need to modify the code.
        `);

        // Generate zip file
        const content = await zip.generateAsync({type: "blob"});
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${config.appName.replace(/\s+/g, '_')}_source.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Also create a simple HTML file for immediate use
        const htmlBlob = new Blob([htmlTemplate], {type: 'text/html'});
        const htmlLink = document.createElement('a');
        htmlLink.href = URL.createObjectURL(htmlBlob);
        htmlLink.download = `${config.appName.replace(/\s+/g, '_')}.html`;
        document.body.appendChild(htmlLink);
        htmlLink.click();
        document.body.removeChild(htmlLink);
    }

    // Add JSZip library dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(script);

    // Initialize PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
});
