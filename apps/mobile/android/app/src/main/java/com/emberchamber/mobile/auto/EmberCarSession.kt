package com.emberchamber.mobile.auto

import android.content.Intent
import androidx.car.app.Screen
import androidx.car.app.Session

/**
 * Lifecycle owner for the Android Auto session.
 *
 * Called once per connection from the head unit.  Creates the root
 * screen (conversation list) and returns it to the Car App host.
 */
class EmberCarSession : Session() {

    override fun onCreateScreen(intent: Intent): Screen =
        ConversationListCarScreen(carContext)
}
