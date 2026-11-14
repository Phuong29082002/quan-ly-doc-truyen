package com.huflit.quanlydoctruyen.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalUriHandler
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.huflit.quanlydoctruyen.data.PaymentStart
import com.huflit.quanlydoctruyen.ui.screens.HomeScreen
import com.huflit.quanlydoctruyen.ui.screens.LibraryScreen
import com.huflit.quanlydoctruyen.ui.screens.LoginScreen
import com.huflit.quanlydoctruyen.ui.screens.PackagesScreen
import com.huflit.quanlydoctruyen.ui.screens.PaymentScreen
import com.huflit.quanlydoctruyen.ui.screens.ProfileScreen
import com.huflit.quanlydoctruyen.ui.screens.ReadChapterScreen
import com.huflit.quanlydoctruyen.ui.screens.ReadingListScreen
import com.huflit.quanlydoctruyen.ui.screens.RegisterScreen
import com.huflit.quanlydoctruyen.ui.screens.StoryDetailScreen

private const val STORY_ROUTE = "story/{id}"
private const val READ_ROUTE = "story/{id}/chapter/{number}"
private const val PAYMENT_ROUTE = "payment/{txId}?provider={provider}"

@Composable
fun AppNavigation() {
    val nav = rememberNavController()
    val uriHandler = LocalUriHandler.current

    // PB19, PB21, PB45: giao dịch đã tạo -> VNPay thì mở trình duyệt, rồi vào màn hình thanh toán / chờ kết quả
    val onPaymentStarted: (PaymentStart) -> Unit = { start ->
        val url = start.paymentUrl
        if (url != null) uriHandler.openUri(url)
        nav.navigate("payment/${start.transactionId}?provider=${start.provider}")
    }
    val toLogin: () -> Unit = { nav.navigate("login") }
    val toPackages: () -> Unit = { nav.navigate("packages") }

    NavHost(nav, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onOpenStory = { id -> nav.navigate("story/$id") },
                onLogin = toLogin,
                onProfile = { nav.navigate("profile") },
                onOpenPackages = toPackages,
                onOpenReading = { nav.navigate("reading") }
            )
        }

        // PB04: hồ sơ cá nhân
        composable("profile") {
            ProfileScreen(onBack = { nav.popBackStack() }, onOpenLibrary = { nav.navigate("library") })
        }

        // PB25: gói đang dùng, truyện đã mua, lịch sử thanh toán
        composable("library") {
            LibraryScreen(
                onOpenStory = { id -> nav.navigate("story/$id") },
                onOpenPayment = { txId -> nav.navigate("payment/$txId?provider=Pending") },
                onBack = { nav.popBackStack() }
            )
        }

        // PB27: truyện đang đọc
        composable("reading") {
            ReadingListScreen(
                onContinue = { storyId, chapter -> nav.navigate("story/$storyId/chapter/$chapter") },
                onOpenStory = { id -> nav.navigate("story/$id") },
                onBack = { nav.popBackStack() }
            )
        }

        // PB18, PB19, PB20: gói đọc
        composable("packages") {
            PackagesScreen(onNeedLogin = toLogin, onPaymentStarted = onPaymentStarted, onBack = { nav.popBackStack() })
        }

        composable(
            PAYMENT_ROUTE,
            arguments = listOf(
                navArgument("txId") { type = NavType.IntType },
                navArgument("provider") { type = NavType.StringType; defaultValue = "Mock" }
            )
        ) { entry ->
            PaymentScreen(
                transactionId = entry.arguments?.getInt("txId") ?: 0,
                provider = entry.arguments?.getString("provider") ?: "Mock",
                // Mở lại trang truyện mới để cập nhật nhãn "Đã mở khóa" (bỏ các màn hình cũ của truyện đó)
                onOpenStory = { id ->
                    nav.navigate("story/$id") {
                        popUpTo(STORY_ROUTE) { inclusive = true }
                    }
                },
                onOpenLibrary = {
                    nav.navigate("library") {
                        popUpTo("home")
                    }
                },
                onBack = { nav.popBackStack() }
            )
        }

        composable(STORY_ROUTE, arguments = listOf(navArgument("id") { type = NavType.IntType })) { entry ->
            val id = entry.arguments?.getInt("id") ?: 0
            StoryDetailScreen(
                storyId = id,
                onRead = { number -> nav.navigate("story/$id/chapter/$number") },
                onBack = { nav.popBackStack() },
                onOpenPackages = toPackages,
                onNeedLogin = toLogin,
                onPaymentStarted = onPaymentStarted
            )
        }

        composable(
            READ_ROUTE,
            arguments = listOf(
                navArgument("id") { type = NavType.IntType },
                navArgument("number") { type = NavType.IntType }
            )
        ) { entry ->
            val id = entry.arguments?.getInt("id") ?: 0
            ReadChapterScreen(
                storyId = id,
                number = entry.arguments?.getInt("number") ?: 1,
                // Chuyển chương: thay màn hình đọc hiện tại, bấm Quay lại sẽ về mục lục
                onGoTo = { n ->
                    nav.navigate("story/$id/chapter/$n") {
                        popUpTo(READ_ROUTE) { inclusive = true }
                    }
                },
                onLogin = toLogin,
                onBack = { nav.popBackStack() },
                onOpenPackages = toPackages,
                onPaymentStarted = onPaymentStarted
            )
        }

        composable("login") {
            LoginScreen(
                onSuccess = { nav.popBackStack() },
                onRegister = { nav.navigate("register") },
                onBack = { nav.popBackStack() }
            )
        }

        composable("register") {
            RegisterScreen(
                onSuccess = { nav.popBackStack("home", inclusive = false) },
                onBack = { nav.popBackStack() }
            )
        }
    }
}
