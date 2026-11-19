package pro.dotapick.app

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.File
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Офлайн-режим: приложение само загружает запросы к dotapick.pro, OpenDota и картинкам Valve,
 * сохраняет ответы на устройстве и отдаёт сохранённое, когда интернета нет.
 * Если сохранённого нет — берёт копию сайта, вшитую в APK (assets/site, собирается на GitHub).
 */
class OfflineCache(private val ctx: Context) {

    private val dir = File(ctx.filesDir, "webcache").apply { mkdirs() }
    @Volatile var online = true

    fun handle(req: WebResourceRequest): WebResourceResponse? {
        if (req.method != "GET") return null
        val url = req.url
        val host = url.host ?: return null
        return when {
            host in OWN -> own(req, url)
            host == "api.opendota.com" -> api(url)
            host in IMG_HOSTS -> image(url)
            else -> null                                     // остальное (Twitch, Cloudflare и т. п.) — как обычно
        }
    }

    // --- dotapick.pro: файлы со хешем — сначала с устройства; страницы и данные — сначала из сети
    private fun own(req: WebResourceRequest, url: Uri): WebResourceResponse? {
        val path = url.path.orEmpty().ifEmpty { "/" }
        val navigate = req.isForMainFrame || (!path.substringAfterLast('/').contains('.') && path != "/sw.js")
        val key = if (navigate) shellFor(path) else path
        val immutable = path.startsWith("/assets/") || path.startsWith("/heroes/") || path.startsWith("/icons/")
        if (immutable) cached(key)?.let { return it }
        if (online) fetch(url.toString(), mimeFor(key))?.let { (bytes, mime) -> save(key, bytes, mime); return response(bytes, mime) }
        return cached(key) ?: bundled(key)
    }

    // --- OpenDota: свежие данные из сети, без интернета — последние сохранённые (разборы, мои игры, профиль)
    private fun api(url: Uri): WebResourceResponse? {
        val key = "/_api/" + hash(url.toString())
        if (online) fetch(url.toString(), "application/json")?.let { (bytes, mime) -> save(key, bytes, mime); return response(bytes, mime, cors = true) }
        return cached(key, cors = true)
    }

    // --- иконки предметов и способностей Valve: один раз скачали — дальше с устройства
    private fun image(url: Uri): WebResourceResponse? {
        val key = "/_img/" + hash(url.toString())
        cached(key)?.let { return it }
        if (!online) return null
        return fetch(url.toString(), mimeFor(url.path.orEmpty()))?.let { (bytes, mime) -> save(key, bytes, mime); response(bytes, mime) }
    }

    /** Все страницы сайта (/, /hero/…, /match/…) — одна оболочка, как в service worker сайта. */
    private fun shellFor(path: String) = when {
        path.startsWith("/overlay/") -> "/overlay/index.html"
        path.startsWith("/vote/") -> "/vote/index.html"
        else -> "/index.html"
    }

    private fun fetch(url: String, fallbackMime: String): Pair<ByteArray, String>? = try {
        val c = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 5000; readTimeout = 15000
            setRequestProperty("User-Agent", "DotaPickApp")
        }
        try {
            if (c.responseCode in 200..299) {
                val bytes = c.inputStream.use { it.readBytes() }
                val mime = c.contentType?.substringBefore(';')?.trim()?.ifEmpty { null } ?: fallbackMime
                bytes to mime
            } else null
        } finally { c.disconnect() }
    } catch (_: Exception) { null }                         // нет ответа — берём сохранённое

    private fun save(key: String, bytes: ByteArray, mime: String) {
        try {
            val f = fileFor(key); f.parentFile?.mkdirs()
            val tmp = File(f.path + ".tmp"); tmp.writeBytes(bytes); tmp.renameTo(f)
            File(f.path + ".mime").writeText(mime)
        } catch (_: Exception) { }
    }

    private fun cached(key: String, cors: Boolean = false): WebResourceResponse? {
        val f = fileFor(key); if (!f.exists()) return null
        val mime = File(f.path + ".mime").takeIf { it.exists() }?.readText() ?: mimeFor(key)
        return response(f.inputStream(), mime, cors)
    }

    private fun bundled(key: String): WebResourceResponse? = try {
        response(ctx.assets.open("site" + key), mimeFor(key))
    } catch (_: Exception) { null }

    private fun fileFor(key: String) = File(dir, key.trimStart('/').replace("..", "_").ifEmpty { "index.html" })

    private fun response(bytes: ByteArray, mime: String, cors: Boolean = false) = response(ByteArrayInputStream(bytes), mime, cors)
    private fun response(input: InputStream, mime: String, cors: Boolean = false): WebResourceResponse {
        val textual = mime.startsWith("text/") || mime.contains("json") || mime.contains("javascript") || mime.contains("xml")
        return WebResourceResponse(mime, if (textual) "utf-8" else null, input).apply {
            responseHeaders = if (cors) mapOf("Access-Control-Allow-Origin" to "*") else emptyMap()
        }
    }

    private fun hash(s: String) = MessageDigest.getInstance("SHA-1").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

    companion object {
        val OWN = setOf("dotapick.pro", "www.dotapick.pro")
        val IMG_HOSTS = setOf("cdn.cloudflare.steamstatic.com", "steamcdn-a.akamaihd.net", "avatars.steamstatic.com", "avatars.akamai.steamstatic.com")
        fun mimeFor(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
            "html", "" -> "text/html"; "js" -> "text/javascript"; "css" -> "text/css"; "json", "webmanifest" -> "application/json"
            "svg" -> "image/svg+xml"; "png" -> "image/png"; "jpg", "jpeg" -> "image/jpeg"; "webp" -> "image/webp"
            "woff2" -> "font/woff2"; "woff" -> "font/woff"; "ico" -> "image/x-icon"; else -> "application/octet-stream"
        }
    }
}
