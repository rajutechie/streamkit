package com.rajutechie.streamkit.transport

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class HttpClient(
    @PublishedApi internal val baseUrl: String,
    @PublishedApi internal val apiKey: String
) {
    @PublishedApi internal val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    @PublishedApi internal val gson = Gson()
    @PublishedApi internal val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    private var token: String? = null

    fun setToken(token: String?) {
        this.token = token
    }

    suspend inline fun <reified T> get(path: String, params: Map<String, String> = emptyMap()): T {
        val urlBuilder = StringBuilder("$baseUrl$path")
        if (params.isNotEmpty()) {
            urlBuilder.append("?")
            urlBuilder.append(params.entries.joinToString("&") { "${it.key}=${it.value}" })
        }

        val request = buildRequest(urlBuilder.toString()).get().build()
        return execute(request)
    }

    suspend inline fun <reified T> post(path: String, body: Any? = null): T {
        val jsonBody = body?.let { gson.toJson(it).toRequestBody(jsonMediaType) }
        val request = buildRequest("$baseUrl$path").post(jsonBody ?: "".toRequestBody(jsonMediaType)).build()
        return execute(request)
    }

    suspend inline fun <reified T> patch(path: String, body: Any? = null): T {
        val jsonBody = body?.let { gson.toJson(it).toRequestBody(jsonMediaType) }
        val request = buildRequest("$baseUrl$path").patch(jsonBody ?: "".toRequestBody(jsonMediaType)).build()
        return execute(request)
    }

    suspend inline fun <reified T> delete(path: String): T {
        val request = buildRequest("$baseUrl$path").delete().build()
        return execute(request)
    }

    fun buildRequest(url: String): Request.Builder {
        val builder = Request.Builder().url(url).header("X-API-Key", apiKey)
        token?.let { builder.header("Authorization", "Bearer $it") }
        return builder
    }

    suspend inline fun <reified T> execute(request: Request): T = withContext(Dispatchers.IO) {
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            throw RajutechieStreamKitApiException(response.code, response.body?.string() ?: "Unknown error")
        }
        val body = response.body?.string() ?: throw RajutechieStreamKitApiException(500, "Empty response")
        gson.fromJson<T>(body, object : TypeToken<T>() {}.type)
    }
}

class RajutechieStreamKitApiException(val code: Int, message: String) : Exception("HTTP $code: $message")
