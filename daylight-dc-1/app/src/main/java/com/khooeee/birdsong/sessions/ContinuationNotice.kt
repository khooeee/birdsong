package com.khooeee.birdsong.sessions

import com.khooeee.birdsong.model.Session
import java.text.DateFormat
import java.util.Date

/** When a quota retry will continue the session, if one is scheduled. */
fun continuationNotice(session: Session): String? {
    val at = session.resumeAt ?: return null
    val time = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(at.toLong()))
    return "Continues automatically $time after quota resets"
}
