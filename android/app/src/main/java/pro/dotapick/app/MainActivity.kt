package pro.dotapick.app

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowInsetsControllerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * DotaPick: сайт dotapick.pro на весь экран.
 * Без интернета показывает последнее сохранённое (OfflineCache); ссылки на другие сайты — в браузере/их приложениях.
 */
class MainActivity : ComponentActivity() {

    private lateinit var web: WebView
    private lateinit var offline: View
    private lateinit var refresh: SwipeRefreshLayout
    private lateinit var cache: OfflineCache
    private var pageReady = false
    private var netCallback: ConnectivityManager.NetworkCallback? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        splash.setKeepOnScreenCondition { !pageReady && !offlineShown() }
        setContentView(R.layout.activity_main)

        web = findViewById(R.id.web)
        offline = findViewById(R.id.offline)
        refresh = findViewById(R.id.refresh)
        cache = OfflineCache(this).also { it.online = online() }
        web.setBackgroundColor(Color.parseColor("#0B0D13"))

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true          // профиль, драфт и звёздочки хранятся в браузере
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = true
            // по этой метке сайт понимает, что открыт в приложении (нижнее меню, кнопки «Поделиться» и т. п.)
            userAgentString = "$userAgentString DotaPickApp/${BuildConfig.VERSION_NAME}"
        }
        web.addJavascriptInterface(Bridge(), "DotaPickApp")

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                cache.handle(request)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                return if (isOwn(url)) false else { openExternal(url); true }
            }

            override fun onPageFinished(view: WebView, url: String) {
                pageReady = true
                refresh.isRefreshing = false
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                // экран «Нет подключения» — только если страницу не удалось взять ни из сети, ни из сохранённого
                if (request.isForMainFrame) showOffline(true)
            }
        }

        // потянуть вниз — обновить (только когда страница прокручена в самый верх)
        refresh.setColorSchemeColors(Color.parseColor("#DCB46A"))
        refresh.setProgressBackgroundColorSchemeColor(Color.parseColor("#141722"))
        refresh.setOnChildScrollUpCallback { _, _ -> web.scrollY > 0 }
        refresh.setOnRefreshListener { if (offlineShown()) retry() else web.reload() }

        findViewById<Button>(R.id.retry).setOnClickListener { retry() }

        // «Назад» как в приложениях с нижним меню: закрыть открытое окно → на главную → выйти.
        // Решает сайт (window.dpBack); если сайт не ответил — выходим.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (offlineShown()) { finish(); return }
                web.evaluateJavascript("(window.dpBack && window.dpBack()) ? 'site' : 'exit'") { r ->
                    if (r?.contains("site") != true) finish()
                }
            }
        })

        watchNetwork()

        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else load(intent?.data?.takeIf { isOwn(it) }?.toString() ?: HOME)

        checkUpdate()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.takeIf { isOwn(it) }?.let { load(it.toString()) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onDestroy() {
        netCallback?.let { getSystemService(ConnectivityManager::class.java)?.unregisterNetworkCallback(it) }
        super.onDestroy()
    }

    private fun load(url: String) {
        showOffline(false)
        web.loadUrl(url)
    }

    private fun retry() {
        refresh.isRefreshing = false
        cache.online = online()
        load(web.url?.takeIf { it.startsWith("https://") } ?: HOME)
    }

    private fun showOffline(show: Boolean) {
        offline.visibility = if (show) View.VISIBLE else View.GONE
        refresh.visibility = if (show) View.GONE else View.VISIBLE
        refresh.isRefreshing = false
    }

    private fun offlineShown() = ::offline.isInitialized && offline.visibility == View.VISIBLE

    private fun online(): Boolean {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return true
        val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /** Следим за сетью: сайт узнаёт о ней через navigator.onLine и показывает плашку «Нет интернета». */
    private fun watchNetwork() {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) = setOnline(true)
            override fun onLost(network: Network) = setOnline(online())
        }
        try { cm.registerDefaultNetworkCallback(cb); netCallback = cb } catch (_: Exception) { }
        setOnline(online())
    }

    private fun setOnline(on: Boolean) = runOnUiThread {
        cache.online = on
        web.setNetworkAvailable(on)
        if (on && offlineShown()) retry()
    }

    private fun isOwn(uri: Uri) = uri.scheme == "https" && uri.host in OfflineCache.OWN

    private fun openExternal(uri: Uri) {
        try { startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
        catch (_: ActivityNotFoundException) { /* нет приложения для ссылки — остаёмся */ }
    }

    /** Новая версия приложения: version.json лежит в релизе android-latest на GitHub. */
    private fun checkUpdate() = thread(isDaemon = true) {
        try {
            val c = URL(VERSION_URL).openConnection() as HttpURLConnection
            c.connectTimeout = 5000; c.readTimeout = 8000; c.instanceFollowRedirects = true
            val j = JSONObject(c.inputStream.bufferedReader().use { it.readText() })
            val latest = j.optInt("versionCode", 0)
            if (latest > BuildConfig.VERSION_CODE) runOnUiThread {
                if (isFinishing) return@runOnUiThread
                AlertDialog.Builder(this)
                    .setTitle(R.string.update_title)
                    .setMessage(getString(R.string.update_text, j.optString("versionName", "")))
                    .setPositiveButton(R.string.update_go) { _, _ -> openExternal(Uri.parse(APK_URL)) }
                    .setNegativeButton(R.string.update_later, null)
                    .show()
            }
        } catch (_: Exception) { /* без интернета — молча пропускаем */ }
    }

    /** Мост для сайта: window.DotaPickApp.share(...), saveImage(...), setTheme(...). */
    inner class Bridge {
        @JavascriptInterface fun share(text: String, url: String) = runOnUiThread {
            val body = listOf(text, url).filter { it.isNotBlank() }.joinToString("\n")
            startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, body), null))
        }

        /** Картинка-итог матча: сохранить в «Галерея → Pictures/DotaPick» и сразу предложить отправить. */
        @JavascriptInterface fun saveImage(base64: String, fileName: String) {
            val bytes = Base64.decode(base64.substringAfter(","), Base64.DEFAULT)
            val name = fileName.replace(Regex("[^A-Za-z0-9._-]"), "_").ifEmpty { "dotapick.png" }
            var saved = false
            if (Build.VERSION.SDK_INT >= 29) try {
                val v = ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, name)
                    put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                    put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/DotaPick")
                }
                contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v)?.let { uri ->
                    contentResolver.openOutputStream(uri)?.use { it.write(bytes) }; saved = true
                }
            } catch (_: Exception) { }
            val f = File(cacheDir, "share/$name").apply { parentFile?.mkdirs(); writeBytes(bytes) }
            val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.files", f)
            runOnUiThread {
                if (saved) Toast.makeText(this@MainActivity, R.string.saved_to_gallery, Toast.LENGTH_SHORT).show()
                startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("image/png")
                    .putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION), null))
            }
        }

        /** Цвет системных панелей под тему сайта (вечер/день). */
        @JavascriptInterface fun setTheme(theme: String) = runOnUiThread {
            val light = theme == "light"
            val color = Color.parseColor(if (light) "#F3EEE5" else "#0B0D13")
            @Suppress("DEPRECATION") window.statusBarColor = color
            @Suppress("DEPRECATION") window.navigationBarColor = color
            findViewById<View>(R.id.root).setBackgroundColor(color)
            WindowInsetsControllerCompat(window, window.decorView).apply {
                isAppearanceLightStatusBars = light; isAppearanceLightNavigationBars = light
            }
        }

        @JavascriptInterface fun version(): String = BuildConfig.VERSION_NAME
    }

    companion object {
        const val HOME = "https://dotapick.pro/"
        const val APK_URL = "https://github.com/strrus21-spec/kontrpik/releases/download/android-latest/DotaPick.apk"
        const val VERSION_URL = "https://github.com/strrus21-spec/kontrpik/releases/download/android-latest/version.json"
    }
}
