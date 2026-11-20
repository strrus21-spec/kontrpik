plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "pro.dotapick.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "pro.dotapick.app"
        minSdk = 24
        targetSdk = 36
        // номер сборки на GitHub — чтобы новая версия ставилась поверх старой
        versionCode = (System.getenv("VERSION_CODE") ?: System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = System.getenv("VERSION_NAME") ?: ("1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0"))
    }

    // sideload — APK с GitHub (сам проверяет обновления); play — для Google Play (обновляет только магазин).
    flavorDimensions += "store"
    productFlavors {
        create("sideload") { dimension = "store"; buildConfigField("boolean", "SELF_UPDATE", "true") }
        create("play") {
            dimension = "store"
            // пакет для Google Play (разработчик roundcatstudio); у APK с GitHub остаётся pro.dotapick.app
            applicationId = "com.roundcatstudio.dotapick"
            buildConfigField("boolean", "SELF_UPDATE", "false")
        }
    }

    // Ключи подписи: sideload — для APK с GitHub, лежит в репозитории (сборки с GitHub и из Android Studio ставятся поверх друг друга);
    // upload — ключ загрузки Google Play, только из секретов сборки.
    signingConfigs {
        // Ключ загрузки Google Play — только из секретов сборки (в репозитории его нет).
        System.getenv("UPLOAD_KEYSTORE")?.takeIf { it.isNotBlank() && file(it).exists() }?.let { ks ->
            create("upload") {
                storeFile = file(ks)
                storePassword = System.getenv("UPLOAD_STORE_PASSWORD")
                keyAlias = System.getenv("UPLOAD_KEY_ALIAS")
                keyPassword = System.getenv("UPLOAD_KEY_PASSWORD")
            }
        }
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
            // подпись задаёт вариант (sideload / play) ниже
        }
        debug {
            signingConfig = signingConfigs.getByName("sideload")
        }
    }
    // Сборка для Play подписывается ключом загрузки (если он задан), иначе остаётся неподписанной — её подпишет издатель.
    productFlavors.getByName("sideload").signingConfig = signingConfigs.getByName("sideload")
    productFlavors.getByName("play").signingConfig = signingConfigs.findByName("upload")

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
