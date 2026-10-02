package com.huflit.quanlydoctruyen.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.huflit.quanlydoctruyen.ui.screens.*

@Composable
fun AppNavigation() {
    val nav = rememberNavController()

    Scaffold { padding ->
        NavHost(nav, startDestination = "home", modifier = Modifier.padding(padding)) {
            composable("home") {
                HomeScreen(
                    onOpenStory = { id -> nav.navigate("story/$id") },
                    onLogin = { nav.navigate("login") }
                )
            }
            composable(
                "story/{id}",
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { entry ->
                val id = entry.arguments?.getInt("id") ?: 0
                StoryDetailScreen(
                    storyId = id,
                    onRead = { number -> nav.navigate("story/$id/chapter/$number") },
                    onBack = { nav.popBackStack() }
                )
            }
            composable(
                "story/{id}/chapter/{number}",
                arguments = listOf(
                    navArgument("id") { type = NavType.IntType },
                    navArgument("number") { type = NavType.IntType }
                )
            ) { entry ->
                ReadChapterScreen(
                    storyId = entry.arguments?.getInt("id") ?: 0,
                    number = entry.arguments?.getInt("number") ?: 1,
                    onBack = { nav.popBackStack() }
                )
            }
            composable("login") { LoginScreen(onBack = { nav.popBackStack() }) }
        }
    }
}