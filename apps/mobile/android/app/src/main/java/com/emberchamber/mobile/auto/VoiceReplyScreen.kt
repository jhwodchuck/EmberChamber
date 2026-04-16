package com.emberchamber.mobile.auto

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.MessageTemplate
import androidx.car.app.model.Template

/**
 * A minimal screen that Android Auto uses to collect a voice reply.
 *
 * The Car App Library handles microphone access and speech-to-text.
 * Once the user speaks, [screenManager.goBackWithResult] delivers the
 * transcription back to [ChatCarScreen] which then queues the send.
 */
class VoiceReplyScreen(carContext: CarContext) : Screen(carContext) {

    override fun onGetTemplate(): Template =
        MessageTemplate.Builder("Listening… speak your reply.")
            .setHeaderAction(Action.BACK)
            .addAction(
                Action.Builder()
                    .setTitle("Cancel")
                    .setOnClickListener { screenManager.goBackWithResult(null) }
                    .build()
            )
            .build()
}
