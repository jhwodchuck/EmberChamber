package com.emberchamber.mobile.auto

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers [CarBridgeModule] with React Native so it is available as
 * NativeModules.CarBridge in the JS layer.
 *
 * Add this package to MainApplication.kt:
 *
 *   packageList =
 *     PackageList(this).packages.apply {
 *       add(CarBridgePackage())
 *     }
 */
class CarBridgePackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
        listOf(CarBridgeModule(context))

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
