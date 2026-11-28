package com.khooeee.birdsong.model

import com.khooeee.birdsong.network.BirdsongJson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ConfigPickersTest {
    @Test
    fun groupsPlainChoicesAndKeepsNamedGroups() {
        val json = """{"options":[{"id":"model","name":"Model","category":"model","currentValue":"b","options":[
            |{"value":"a","name":"A"},{"value":"b","name":"B","description":"fast"},
            |{"name":"Legacy","options":[{"value":"c","name":"C"}]},{"value":"d","name":"D"}]}],
            |"modelConfig":{"model":"B","effort":"high"}}""".trimMargin()
        val pickers = BirdsongJson.decodeFromString<ConfigPickers.Wire>(json).toPickers()
        val groups = pickers.options.single().groups
        assertEquals(listOf(null, "Legacy", null), groups.map { it.name })
        assertEquals(listOf("a", "b"), groups[0].choices.map { it.value })
        assertEquals("fast", groups[0].choices[1].description)
        assertNull(groups[0].choices[0].description)
        assertEquals(listOf("d"), groups[2].choices.map { it.value })
        assertEquals("high", pickers.modelConfig?.effort)
    }
}
