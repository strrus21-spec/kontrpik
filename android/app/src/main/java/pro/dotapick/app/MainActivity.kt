package pro.dotapick.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

/** DotaPick: сайт dotapick.pro на весь экран. Ссылки на другие сайты открываются в браузере или их приложениях. */
class MainActivity : ComponentActivity() {

    private lateinit var web: WebView
    private lateinit var offline: View
    private lateinit var refresh: SwipeRefreshLayout
    private var pageReady = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        splash.setKeepOnScreenCondition { !pageReady && !offlineShown() }
        setContentView(R.layout.activity_main)

        web = findViewById(R.id.web)
        offline = findViewById(R.id.offline)
        refresh = findViewById(R.id.refresh)
        web.setBackgroundColor(Color.parseColor("#0B0D13"))

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true          // профиль, драфт и звёздочки хранятся в браузере
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = true
            userAgentString = "$userAgentString DotaPickApp/${BuildConfig.VERSION_NAME}"
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                return if (isOwn(url)) false else { openExternal(url); true }
            }

            override fun onPageFinished(view: WebView, url: String) {
                pageReady = true
                refresh.isRefreshing = false
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showOffline(true)
            }
        }

        // потянуть вниз — обновить (только когда страница прокручена в самый верх)
        refresh.setColorSchemeColors(Color.parseColor("#DCB46A"))
        refresh.setProgressBackgroundColorSchemeColor(Color.parseColor("#141722"))
        refresh.setOnChildScrollUpCallback { _, _ -> web.scrollY > 0 }
        refresh.setOnRefreshListener { if (offlineShown()) retry() else web.reload() }

        findViewById<Button>(R.id.retry).setOnClickListener { retry() }

        // «Назад»: сначала по истории сайта (вкладки, разбор), потом выход
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack() && !offlineShown()) web.goBack() else finish()
            }
        })

        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else load(intent?.data?.takeIf { isOwn(it) }?.toString() ?: HOME)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.takeIf { isOwn(it) }?.let { load(it.toString()) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    private fun load(url: String) {
        if (!online()) { showOffline(true); return }
        showOffline(false)
        web.loadUrl(url)
    }

    private fun retry() {
        refresh.isRefreshing = false
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

    private fun isOwn(uri: Uri) = uri.scheme == "https" && uri.host in OWN_HOSTS

    private fun openExternal(uri: Uri) {
        try { startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
        catch (_: ActivityNotFoundException) { /* нет приложения для ссылки — просто остаёмся */ }
    }

    companion object {
        const val HOME = "https://dotapick.pro/"
        val OWN_HOSTS = setOf("dotapick.pro", "www.dotapick.pro")
    }
}
