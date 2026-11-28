package com.khooeee.birdsong.root

import android.view.KeyEvent

/**
 * Window-level key interceptor owned by [com.khooeee.birdsong.MainActivity] so global shortcuts work even before
 * any view inside the main screen holds focus.
 */
class WindowKeyDispatcher {
    var handler: ((KeyEvent) -> Boolean)? = null

    fun dispatch(event: KeyEvent): Boolean = handler?.invoke(event) == true
}
