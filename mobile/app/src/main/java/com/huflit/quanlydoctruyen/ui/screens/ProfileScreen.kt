package com.huflit.quanlydoctruyen.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.huflit.quanlydoctruyen.data.ApiClient
import com.huflit.quanlydoctruyen.data.ChangePasswordRequest
import com.huflit.quanlydoctruyen.data.SessionManager
import com.huflit.quanlydoctruyen.data.UpdateProfileRequest
import com.huflit.quanlydoctruyen.data.toMessage
import kotlinx.coroutines.launch
import retrofit2.HttpException
import kotlin.coroutines.cancellation.CancellationException

// PB04: xem, cập nhật hồ sơ và đổi mật khẩu
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(onBack: () -> Unit) {
    val user = SessionManager.user
    val scope = rememberCoroutineScope()

    // Đăng xuất (hoặc token hết hạn) thì quay về màn hình trước
    LaunchedEffect(user) {
        if (user == null) onBack()
    }
    if (user == null) return

    var displayName by remember { mutableStateOf(user.displayName) }
    var profileMsg by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var savingProfile by remember { mutableStateOf(false) }

    var current by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var passMsg by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var savingPass by remember { mutableStateOf(false) }

    fun saveProfile() {
        val name = displayName.trim()
        if (name.isEmpty()) {
            profileMsg = false to "Vui lòng nhập tên hiển thị"
            return
        }
        scope.launch {
            savingProfile = true
            profileMsg = null
            try {
                SessionManager.updateUser(ApiClient.api.updateProfile(UpdateProfileRequest(name)))
                profileMsg = true to "Đã cập nhật tên hiển thị"
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                profileMsg = false to e.toMessage("Cập nhật thất bại")
            } finally {
                savingProfile = false
            }
        }
    }

    fun changePassword() {
        passMsg = when {
            current.isEmpty() || newPass.isEmpty() -> false to "Vui lòng nhập đầy đủ mật khẩu"
            newPass.length < 6 -> false to "Mật khẩu mới tối thiểu 6 ký tự"
            newPass != confirm -> false to "Xác nhận mật khẩu không khớp"
            else -> null
        }
        if (passMsg != null) return
        scope.launch {
            savingPass = true
            try {
                val res = ApiClient.api.changePassword(ChangePasswordRequest(current, newPass))
                if (!res.isSuccessful) throw HttpException(res)
                current = ""
                newPass = ""
                confirm = ""
                passMsg = true to "Đổi mật khẩu thành công"
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                passMsg = false to e.toMessage("Đổi mật khẩu thất bại")
            } finally {
                savingPass = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tài khoản của tôi") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹ Quay lại") } }
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)
        ) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(user.displayName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Tên đăng nhập: ${user.username}", style = MaterialTheme.typography.bodyMedium)
                    Text("Email: ${user.email}", style = MaterialTheme.typography.bodyMedium)
                }
            }

            SectionTitle("Thông tin cá nhân")
            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Tên hiển thị") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Message(profileMsg)
            Button(onClick = { saveProfile() }, enabled = !savingProfile, modifier = Modifier.padding(top = 8.dp)) {
                Text(if (savingProfile) "Đang lưu..." else "Lưu thay đổi")
            }

            HorizontalDivider(Modifier.padding(vertical = 20.dp))

            SectionTitle("Đổi mật khẩu")
            PasswordField("Mật khẩu hiện tại", current) { current = it }
            PasswordField("Mật khẩu mới", newPass) { newPass = it }
            PasswordField("Nhập lại mật khẩu mới", confirm) { confirm = it }
            Message(passMsg)
            Button(onClick = { changePassword() }, enabled = !savingPass, modifier = Modifier.padding(top = 8.dp)) {
                Text(if (savingPass) "Đang đổi..." else "Đổi mật khẩu")
            }

            Spacer(Modifier.height(28.dp))
            OutlinedButton(onClick = { SessionManager.logout() }, modifier = Modifier.fillMaxWidth()) {
                Text("Đăng xuất")
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(top = 20.dp, bottom = 8.dp)
    )
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
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
    )
}

/** first = true: thành công (xanh), false: lỗi (đỏ) */
@Composable
private fun Message(msg: Pair<Boolean, String>?) {
    if (msg == null) return
    Text(
        msg.second,
        color = if (msg.first) Color(0xFF15803D) else MaterialTheme.colorScheme.error,
        modifier = Modifier.padding(top = 4.dp)
    )
}
