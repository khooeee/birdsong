package com.khooeee.birdsong.pairing

import android.content.Context
import androidx.core.content.edit
import com.khooeee.birdsong.network.ServerConfig

/** The pairing link (it holds the token), encrypted with a keystore key. */
class PairingStore(context: Context) {
    private val prefs = context.getSharedPreferences("pairing", Context.MODE_PRIVATE)
    private val cipher = LinkCipher()

    fun load(): ServerConfig? {
        val sealed = prefs.getString(KEY, null) ?: return null
        return cipher.decrypt(sealed)?.let(ServerConfig::parse)
    }

    fun save(config: ServerConfig) {
        prefs.edit { putString(KEY, cipher.encrypt(config.link)) }
    }

    private companion object {
        const val KEY = "link"
    }
}
