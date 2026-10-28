package com.huflit.quanlydoctruyen.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.ChangePasswordRequest
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.UpdateProfileRequest
import com.huflit.quanlydoctruyen.data.toMessage
import com.huflit.quanlydoctruyen.ui.components.Avatar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import kotlin.coroutines.cancellation.CancellationException

// PB04: xem hồ sơ, đổi tên hiển thị, đổi mật khẩu
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(onBack: () -> Unit) {
    val user = SessionManager.user
    if (user == null) {
        LaunchedEffect(Unit) { onBack() }
        return
    }

    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    var avatarMessage by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var uploadingAvatar by remember { mutableStateOf(false) }

    var displayName by rememberSaveable { mutableStateOf(user.displayName) }
    var infoMessage by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var savingInfo by remember { mutableStateOf(false) }

    var current by rememberSaveable { mutableStateOf("") }
    var next by rememberSaveable { mutableStateOf("") }
    var confirm by rememberSaveable { mutableStateOf("") }
    var passMessage by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var savingPass by remember { mutableStateOf(false) }

    // Ảnh đại diện: đọc ảnh đã chọn, gửi multipart (field "file") lên API
    fun uploadAvatar(uri: Uri) {
        avatarMessage = null
        scope.launch {
            uploadingAvatar = true
            try {
                val resolver = context.contentResolver
                val mime = resolver.getType(uri) ?: "image/jpeg"
                val ext = when (mime) {
                    "image/jpeg" -> ".jpg"
                    "image/png" -> ".png"
                    "image/webp" -> ".webp"
                    else -> null
                }
                if (ext == null) {
                    avatarMessage = false to "Chỉ chấp nhận ảnh JPG, PNG, WEBP"
                    return@launch
                }
                val bytes = withContext(Dispatchers.IO) { resolver.openInputStream(uri)?.use { it.readBytes() } }
                if (bytes == null || bytes.isEmpty()) {
                    avatarMessage = false to "Không đọc được ảnh"
                    return@launch
                }
                if (bytes.size > 2 * 1024 * 1024) {
                    avatarMessage = false to "Ảnh đại diện tối đa 2MB"
                    return@launch
                }
                val part = MultipartBody.Part.createFormData("file", "avatar$ext", bytes.toRequestBody(mime.toMediaType()))
                SessionManager.updateUser(ApiClient.api.uploadAvatar(part))
                avatarMessage = true to "Đã đổi ảnh đại diện"
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                avatarMessage = false to e.toMessage("Tải ảnh thất bại")
            } finally {
                uploadingAvatar = false
            }
        }
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) uploadAvatar(uri)
    }

    fun saveInfo() {
        infoMessage = null
        if (displayName.isBlank()) {
            infoMessage = false to "Vui lòng nhập tên hiển thị"
            return
        }
        scope.launch {
            savingInfo = true
            try {
                val updated = ApiClient.api.updateProfile(UpdateProfileRequest(displayName.trim()))
                SessionManager.updateUser(updated)
                infoMessage = true to "Đã cập nhật hồ sơ"
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                infoMessage = false to e.toMessage("Cập nhật thất bại")
            } finally {
                savingInfo = false
            }
        }
    }

    fun savePassword() {
        passMessage = null
        when {
            current.isEmpty() -> { passMessage = false to "Vui lòng nhập mật khẩu hiện tại"; return }
            next.length < 6 -> { passMessage = false to "Mật khẩu mới tối thiểu 6 ký tự"; return }
            next != confirm -> { passMessage = false to "Mật khẩu nhập lại không khớp"; return }
        }
        scope.launch {
            savingPass = true
            try {
                ApiClient.api.changePassword(ChangePasswordRequest(current, next))
                current = ""
                next = ""
                confirm = ""
                passMessage = true to "Đã đổi mật khẩu"
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                passMessage = false to e.toMessage("Đổi mật khẩu thất bại")
            } finally {
                savingPass = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tài khoản") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)
        ) {
            Text("Thông tin cá nhân", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(user.avatarUrl, user.displayName, 72.dp)
                Spacer(Modifier.width(16.dp))
                OutlinedButton(
                    onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    enabled = !uploadingAvatar
                ) {
                    Text(if (uploadingAvatar) "Đang tải..." else "Đổi ảnh đại diện")
                }
            }
            MessageText(avatarMessage)
            Spacer(Modifier.height(12.dp))
            Text("Tên đăng nhập: ${user.username}")
            Text("Email: ${user.email}")
            Text("Vai trò: ${if (user.role == "Admin") "Quản trị viên" else "Thành viên"}")
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Tên hiển thị") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            MessageText(infoMessage)
            Spacer(Modifier.height(12.dp))
            Button(onClick = { saveInfo() }, enabled = !savingInfo, modifier = Modifier.fillMaxWidth()) {
                if (savingInfo) CircularProgressIndicator(Modifier.height(20.dp), strokeWidth = 2.dp)
                else Text("Lưu thay đổi")
            }

            Spacer(Modifier.height(24.dp))
            HorizontalDivider()
            Spacer(Modifier.height(24.dp))

            Text("Đổi mật khẩu", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            PasswordField("Mật khẩu hiện tại", current) { current = it }
            Spacer(Modifier.height(12.dp))
            PasswordField("Mật khẩu mới", next) { next = it }
            Spacer(Modifier.height(12.dp))
            PasswordField("Nhập lại mật khẩu mới", confirm) { confirm = it }
            MessageText(passMessage)
            Spacer(Modifier.height(12.dp))
            Button(onClick = { savePassword() }, enabled = !savingPass, modifier = Modifier.fillMaxWidth()) {
                if (savingPass) CircularProgressIndicator(Modifier.height(20.dp), strokeWidth = 2.dp)
                else Text("Đổi mật khẩu")
            }
        }
    }
}

@Composable
private fun PasswordField(label: String, value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        modifier = Modifier.fillMaxWidth()
    )
}

/** (thành công?, nội dung) */
@Composable
private fun MessageText(message: Pair<Boolean, String>?) {
    if (message == null) return
    Text(
        message.second,
        color = if (message.first) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
        modifier = Modifier.padding(top = 12.dp)
    )
}
