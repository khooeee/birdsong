package com.khooeee.birdsong.network

import com.khooeee.birdsong.model.RemoteTurn
import com.khooeee.birdsong.model.Session
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RemoteEventTest {
    @Test
    fun decodesSessionsLeniently() {
        val data = """{"pinned":[{"id":"a","title":"Home","agent":"claude","cwd":"/x","status":"warp","createdAt":1,
            |"home":true,"extra":1}],"unpinned":[{"id":"b","title":"T","agent":"codex","cwd":"/y","status":"running",
            |"createdAt":2,"unread":true,"modelConfig":{"model":"M"}}]}""".trimMargin()
        val list = (RemoteEvent.decode("sessions", data) as RemoteEvent.Sessions).list
        assertEquals(Session.Status.Idle, list.pinned[0].status)
        assertTrue(list.pinned[0].isHome)
        assertTrue(list.unpinned[0].isUnread && list.unpinned[0].isWorking)
        assertEquals("M", list.unpinned[0].modelConfig?.model)
    }

    @Test
    fun decodesTurnsAndResets() {
        val turn = RemoteEvent.decode("turn", """{"turn":{"id":"t","at":5,"status":"running","user":"hi","assistant":null}}""")
        assertEquals(RemoteTurn.Status.Running, (turn as RemoteEvent.Turn).turn.status)
        val reset = RemoteEvent.decode("reset", """{"turns":[{"id":"t","at":5,"status":"complete","user":"hi","assistant":"yo"}]}""")
        assertEquals("yo", (reset as RemoteEvent.Reset).turns.single().assistant)
        assertEquals(RemoteEvent.TurnGone, RemoteEvent.decode("turnGone", "{}"))
        assertNull(RemoteEvent.decode("somethingNew", "{}"))
    }
}
