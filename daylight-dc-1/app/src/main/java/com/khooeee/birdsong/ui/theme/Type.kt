package com.khooeee.birdsong.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val Default = Typography()

/** Material's type scale, a little larger for reading at arm's length on a paper-like screen. */
val Typography = Typography(
    bodyLarge = Default.bodyLarge.copy(fontSize = 17.sp, lineHeight = 25.sp, letterSpacing = 0.2.sp),
    bodyMedium = Default.bodyMedium.copy(fontSize = 15.sp, lineHeight = 21.sp),
    titleMedium = Default.titleMedium.copy(fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
)
