plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "pro.dotapick.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "pro.dotapick.app"
        minSdk = 24
        targetSdk = 35
        // номер сборки на GitHub — чтобы новая версия ставилась поверх старой
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
    }

    // Ключ подписи для установки APK напрямую (не для Google Play).
    // Лежит в репозитории, чтобы сборки с GitHub и из Android Studio ставились поверх друг друга.
    // Для Google Play будет отдельный секретный ключ.
    signingConfigs {
        create("sideload") {
            storeFile = file("../sideload.keystore")
            storePassword = "dotapick"
            keyAlias = "dotapick"
            keyPassword = "dotapick"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("sideload")
        }
        debug {
            signingConfig = signingConfigs.getByName("sideload")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}
