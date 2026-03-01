plugins {
    id("com.android.library") version "8.8.0"
    id("org.jetbrains.kotlin.android") version "2.0.21"
    id("maven-publish")
}

android {
    namespace = "com.rajutechie.streamkit.sdk"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    lint {
        targetSdk = 34
    }

    testOptions {
        targetSdk = 34
    }

    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.11.0")
    implementation("io.socket:socket.io-client:2.1.0")
    implementation("io.github.webrtc-sdk:android:125.6422.07")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
}

afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                from(components["release"])
                groupId = "com.rajutechie"
                artifactId = "streamkit-sdk"
                version = "1.0.0"

                pom {
                    name.set("Rajutechie StreamKit Android SDK")
                    description.set("Android SDK for the Rajutechie StreamKit real-time communication platform")
                    url.set("https://github.com/rajutechie/streamkit")
                    licenses {
                        license {
                            name.set("MIT License")
                            url.set("https://opensource.org/licenses/MIT")
                        }
                    }
                }
            }
        }
        repositories {
            maven {
                name = "local"
                url = uri("${rootProject.projectDir}/../maven-local")
            }
        }
    }
}
