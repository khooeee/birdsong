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
    val MicNone: ImageVector by lazy {
        icon(
            "MicNone",
            "M12,14c1.66,0 3,-1.34 3,-3V5c0,-1.66 -1.34,-3 -3,-3S9,3.34 9,5v6c0,1.66 1.34,3 3,3zM11,5c0,-0.55 0.45,-1 1,-1" +
                "s1,0.45 1,1v6c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1V5zM17,11c0,2.76 -2.24,5 -5,5s-5,-2.24 -5,-5H5c0,3.53 2.61,6.43 6," +
                "6.92V21h2v-3.08c3.39,-0.49 6,-3.39 6,-6.92h-2z",
        )
    }
    val Mic: ImageVector by lazy {
        icon(
            "Mic",
            "M12,14c1.66,0 2.99,-1.34 2.99,-3L15,5c0,-1.66 -1.34,-3 -3,-3S9,3.34 9,5v6c0,1.66 1.34,3 3,3zM17.3,11c0,3 -2.54," +
                "5.1 -5.3,5.1S6.7,14 6.7,11H5c0,3.41 2.72,6.23 6,6.72V21h2v-3.28c3.28,-0.48 6,-3.3 6,-6.72h-1.7z",
        )
    }
    val MoreHoriz: ImageVector by lazy {
        icon(
            "MoreHoriz",
            "M6,10c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2zM18,10c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2" +
                " -0.9,-2 -2,-2zM12,10c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2z",
        )
    }
    val GraphicEq: ImageVector by lazy {
        icon("GraphicEq", "M7,18h2V6H7v12zM11,22h2V2h-2v20zM3,14h2v-4H3v4zM15,18h2V6h-2v12zM19,10v4h2v-4h-2z")
    }

    private fun icon(name: String, path: String) = ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f)
        .addPath(addPathNodes(path), fill = SolidColor(Color.Black))
        .build()
}
