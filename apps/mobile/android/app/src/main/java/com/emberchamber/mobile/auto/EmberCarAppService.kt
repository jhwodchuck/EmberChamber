package com.emberchamber.mobile.auto

import androidx.car.app.CarAppService
import androidx.car.app.Session
import androidx.car.app.validation.HostValidator

/**
 * Entry-point for the Android Auto car app.
 *
 * Declared in AndroidManifest under the category
 * androidx.car.app.category.MESSAGING, which enables the messaging
 * template set in Android Auto.
 */
class EmberCarAppService : CarAppService() {

    /**
     * Allow all hosts during development. In production switch to the
     * official Android Auto host allowlist:
     *   return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR
     * or build a list via HostValidator.Builder().
     */
    override fun createHostValidator(): HostValidator =
        HostValidator.ALLOW_ALL_HOSTS_VALIDATOR

    override fun onCreateSession(): Session = EmberCarSession()
}
