package com.rajutechie.streamkit.transport

import kotlinx.coroutines.delay
import kotlin.math.min
import kotlin.random.Random

class RetryPolicy(
    private val maxRetries: Int = 3,
    private val baseDelay: Long = 1000L,
    private val maxDelay: Long = 30000L,
    private val jitter: Boolean = true
) {
    suspend fun <T> execute(block: suspend () -> T): T {
        var lastException: Exception? = null

        for (attempt in 0..maxRetries) {
            try {
                return block()
            } catch (e: Exception) {
                lastException = e
                if (attempt >= maxRetries) break

                val exponential = baseDelay * (1L shl attempt)
                val capped = min(exponential, maxDelay)
                val delayMs = if (jitter) (capped * (0.5 + Random.nextDouble() * 0.5)).toLong() else capped
                delay(delayMs)
            }
        }

        throw lastException ?: Exception("Retry exhausted")
    }
}
