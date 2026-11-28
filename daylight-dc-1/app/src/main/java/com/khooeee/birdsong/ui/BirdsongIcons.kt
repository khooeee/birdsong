package com.khooeee.birdsong.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/** Material glyphs that material-icons-core leaves out. */
object BirdsongIcons {
    val Copy: ImageVector by lazy {
        icon(
            "Copy",
            "M16,1H4C2.9,1 2,1.9 2,3v14h2V3h12V1zM19,5H8C6.9,5 6,5.9 6,7v14c0,1.1 0.9,2 2,2h11c1.1,0 2,-0.9 2,-2V7" +
                "C21,5.9 20.1,5 19,5zM19,21H8V7h11V21z",
        )
    }
    val Stop: ImageVector by lazy { icon("Stop", "M6,6h12v12H6z") }
    /** Material "Speed": the Usage button. */
    val Usage: ImageVector by lazy {
        icon(
            "Usage",
            "M20.38,8.57l-1.23,1.85a8,8 0,0 1,-0.22 7.58H5.07A8,8 0,0 1,15.58 6.85l1.85,-1.23A10,10 0,0 0,3.35 19" +
                "a2,2 0,0 0,1.72 1h13.85a2,2 0,0 0,1.74 -1,10 10,0 0,0 -0.27,-10.44zM10.59,15.41a2,2 0,0 0,2.83 0" +
                "l5.66,-8.49 -8.49,5.66a2,2 0,0 0,0 2.83z",
        )
    }
    val ArrowUp: ImageVector by lazy { icon("ArrowUp", "M4,12l1.41,1.41L11,7.83V20h2V7.83l5.58,5.59L20,12l-8,-8 -8,8z") }

    private fun icon(name: String, path: String) = ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f)
        .addPath(addPathNodes(path), fill = SolidColor(Color.Black))
        .build()
}
