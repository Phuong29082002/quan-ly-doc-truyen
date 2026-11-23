package com.huflit.quanlydoctruyen.ui.components

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.huflit.quanlydoctruyen.data.SessionManager

/**
 * PB53: đăng nhập bằng vân tay. Dùng BiometricPrompt có sẵn của Android (từ Android 9),
 * không cần thư viện ngoài. Vân tay chỉ mở khóa phiên đăng nhập đã lưu trên máy, mật khẩu không lưu trong app.
 */
object Biometric {
    fun isAvailable(context: Context): Boolean = when {
        Build.VERSION.SDK_INT >= 29 -> // Android 10
            context.getSystemService(BiometricManager::class.java)?.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS
        Build.VERSION.SDK_INT == 28 -> // Android 9
            context.packageManager.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
        else -> false
    }

    fun authenticate(
        context: Context,
        title: String,
        negativeText: String,
        onSuccess: () -> Unit,
        onNegative: () -> Unit,
        onError: (String) -> Unit
    ) {
        if (Build.VERSION.SDK_INT < 28) {
            onError("Máy cần Android 9 trở lên để dùng vân tay")
            return
        }
        val executor = ContextCompat.getMainExecutor(context)
        val prompt = BiometricPrompt.Builder(context)
            .setTitle(title)
            .setSubtitle("Chạm cảm biến vân tay để tiếp tục")
            .setNegativeButton(negativeText, executor) { _, _ -> onNegative() }
            .build()
        prompt.authenticate(CancellationSignal(), executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult?) = onSuccess()

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence?) {
                // Người dùng bấm nút phụ đã được xử lý ở onNegative
                if (errorCode != BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED && errorCode != BiometricPrompt.BIOMETRIC_ERROR_CANCELED) {
                    onError(errString?.toString() ?: "Xác thực thất bại")
                }
            }
        })
    }
}

/** Màn hình khóa khi mở app: phải xác thực vân tay mới vào được phiên đăng nhập đã lưu */
@Composable
fun BiometricGate(content: @Composable () -> Unit) {
    val context = LocalContext.current
    var unlocked by remember {
        mutableStateOf(!(SessionManager.biometricEnabled && SessionManager.user != null && Biometric.isAvailable(context)))
    }
    var message by remember { mutableStateOf<String?>(null) }

    if (unlocked) {
        content()
        return
    }

    val ask = {
        Biometric.authenticate(
            context,
            title = "Mở khóa Đọc Truyện",
            negativeText = "Dùng mật khẩu",
            onSuccess = { unlocked = true },
            // Không dùng vân tay: đăng xuất để đăng nhập lại bằng mật khẩu
            onNegative = { SessionManager.logout(); unlocked = true },
            onError = { message = it }
        )
    }
    LaunchedEffect(Unit) { ask() }

    Surface(Modifier.fillMaxSize()) {
        Column(
            Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("🔒", fontSize = 48.sp)
            Text("Xin chào ${SessionManager.user?.displayName ?: ""}", fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.padding(top = 12.dp))
            Text("Xác thực vân tay để tiếp tục đọc truyện", textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
            message?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp)) }
            Button(onClick = ask, modifier = Modifier.padding(top = 20.dp)) { Text("Mở khóa bằng vân tay") }
            TextButton(onClick = { SessionManager.logout(); unlocked = true }) { Text("Đăng nhập bằng mật khẩu") }
        }
    }
}
