package com.checkinhousing.saltojustin

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.saltosystems.justinmobile.sdk.ble.JustinBle
import com.saltosystems.justinmobile.sdk.ble.unlock
import com.saltosystems.justinmobile.sdk.model.ConfigurationParams
import com.saltosystems.justinmobile.sdk.model.DigitalKey
import com.saltosystems.justinmobile.sdk.model.TechnologyVersion
import com.saltosystems.justinmobile.sdk.model.UnlockingParams

class SaltoJustinModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SaltoJustin"

    @ReactMethod
    fun isSdkLinked(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun unlock(hexDigitalKey: String, promise: Promise) {
        try {
            val key = DigitalKey(hexDigitalKey)
            val appContext = reactApplicationContext.applicationContext
            JustinBle.getInstance(appContext).configure(ConfigurationParams(TechnologyVersion.V1))
            JustinBle.getInstance(appContext).unlock(
                unlockingParams = UnlockingParams(),
                digitalKeyRetriever = { key },
                onDeviceFound = {},
                onSuccess = { promise.resolve(null) },
                onFailure = { ex -> promise.reject("SALTO_UNLOCK_FAILED", ex.message, ex) },
            )
        } catch (ex: Exception) {
            promise.reject("SALTO_UNLOCK_FAILED", ex.message, ex)
        }
    }
}
