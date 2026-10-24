package com.checkinhousing.saltojustin

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SaltoJustinModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SaltoJustin"

    @ReactMethod
    fun isSdkLinked(promise: Promise) {
        promise.resolve(false)
    }

    @ReactMethod
    fun unlock(hexDigitalKey: String, promise: Promise) {
        promise.reject(
            "SALTO_SDK_NOT_INSTALLED",
            "Copy salto-justinmobile-sdk.aar into packages/react-native-salto-justin/android/libs/ then rebuild.",
        )
    }
}
