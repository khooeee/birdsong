package com.khooeee.birdsong.sessions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.model.SessionList
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.network.EventSubscription
import com.khooeee.birdsong.network.RemoteEvent
import com.khooeee.birdsong.notify.TurnNotifications
import com.khooeee.birdsong.transcript.Drafts
import com.khooeee.birdsong.ui.UserAlert
import com.khooeee.birdsong.voice.VoiceController
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * The desktop rail, live, and which session is open beside it. The open session is kept read, here and on the Mac,
 * and alerts for sessions read anywhere come down.
 */
class MainViewModel(
    val client: BirdsongClient,
    private val notifications: TurnNotifications,
    /** The app's voice, shared by every session's mic. */
    val voice: VoiceController,
) : ViewModel() {
    private val mutableList = MutableStateFlow<SessionList?>(null)
    val list: StateFlow<SessionList?> = mutableList.asStateFlow()

    private val mutableSelected = MutableStateFlow<String?>(null)
    val selectedId: StateFlow<String?> = mutableSelected.asStateFlow()

    private val mutableAlert = MutableStateFlow<UserAlert?>(null)
    val alert: StateFlow<UserAlert?> = mutableAlert.asStateFlow()

    val actions = SessionActions(client, viewModelScope, onStarted = { select(it.id) }, onAlert = ::showAlert)

    /** Unsent prompts, kept across session switches. */
    val drafts = Drafts()

    private val subscription = EventSubscription(client, listOf("events"), viewModelScope) { event ->
        if (event is RemoteEvent.Sessions) apply(event.list)
    }
    val connection = subscription.state

    /** Marked unread while open: left unread until another session is picked. */
    private var keepUnread: String? = null

    /** Most recent non-Home session opened, so Ctrl+1 can jump back from Home. */
    private var lastNonHomeId: String? = null

    /** Unread writes go one at a time, so an automatic read can't land after the user's explicit unread. */
    private val unreadWrites = Mutex()

    /** While the app is in the foreground. Closed otherwise, so the Mac knows to send alerts. */
    fun start() = subscription.start()

    fun stop() = subscription.stop()

    fun activeSession(): Session? {
        val id = mutableSelected.value ?: return null
        return mutableList.value?.all?.firstOrNull { it.id == id }
    }

    /** Opens a session, from the rail, an alert, or one just started; it shows once the rail lists it. */
    fun select(id: String) {
        if (mutableList.value?.all?.firstOrNull { it.id == id }?.isHome != true) lastNonHomeId = id
        mutableSelected.value = id
        keepUnread = null
        notifications.cancel(id)
        mutableList.value?.let { mutableList.value = keptRead(it) }
    }

    fun toggleHome() {
        val current = mutableList.value ?: return
        SessionNavigation.homeToggleTarget(current, mutableSelected.value, lastNonHomeId)?.let(::select)
    }

    fun stepSession(delta: Int, filter: String) {
        val current = mutableList.value ?: return
        SessionNavigation.stepTarget(current, mutableSelected.value, delta, filter)?.let(::select)
    }

    fun togglePinActive() {
        val current = mutableList.value ?: return
        val session = activeSession() ?: return
        if (session.isHome) return
        val isPinned = current.pinned.any { it.id == session.id }
        actions.setPinned(!isPinned, session.id)
    }

    fun toggleUnreadActive() {
        val session = activeSession() ?: return
        setUnread(!(session.isUnread || keepUnread == session.id), session)
    }

    fun stopActive() {
        val session = activeSession()?.takeIf { it.status == Session.Status.Running } ?: return
        viewModelScope.launch {
            try {
                client.cancel(session.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                showAlert(UserAlert("Couldn't stop agent", e.message.orEmpty()))
            }
        }
    }

    fun setUnread(unread: Boolean, session: Session) {
        // Only the open session is held unread; marking it read again lets the next update read it.
        if (session.id == mutableSelected.value) keepUnread = if (unread) session.id else null
        viewModelScope.launch {
            try {
                unreadWrites.withLock { client.setUnread(unread, session.id) }
            } catch (e: Exception) {
                val title = if (unread) "Couldn't mark as unread" else "Couldn't mark as read"
                showAlert(UserAlert(title, e.message.orEmpty()))
            }
        }
    }

    fun showAlert(alert: UserAlert) {
        mutableAlert.value = alert
    }

    fun dismissAlert() {
        mutableAlert.value = null
    }

    private fun apply(next: SessionList) {
        val selected = next.all.firstOrNull { it.id == mutableSelected.value }
        if (selected != null) {
            if (selected.isHome) {
                if (lastNonHomeId == selected.id) lastNonHomeId = null
            } else {
                lastNonHomeId = selected.id
            }
        }
        mutableList.value = keptRead(next)
        // The stream only runs in the foreground, where the rail itself shows what's unread.
        notifications.keepOnly(next.all.filter { it.isUnread }.map { it.id }.toSet())
    }

    /** The open session shown read at once, and the Mac told; a failed call is retried by the next rail update. */
    private fun keptRead(list: SessionList): SessionList {
        val id = mutableSelected.value ?: return list
        if (id == keepUnread || list.all.none { it.id == id && it.isUnread }) return list
        viewModelScope.launch {
            // Checked again once it holds the lock: the user may have marked it unread while this waited.
            runCatching { unreadWrites.withLock { if (id != keepUnread) client.setUnread(false, id) } }
        }
        val read = { session: Session -> if (session.id == id) session.copy(unread = false) else session }
        return SessionList(list.pinned.map(read), list.unpinned.map(read))
    }
}
