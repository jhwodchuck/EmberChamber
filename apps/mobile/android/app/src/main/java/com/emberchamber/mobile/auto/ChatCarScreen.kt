package com.emberchamber.mobile.auto

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.CarText
import androidx.car.app.model.InputCallback
import androidx.car.app.model.ListTemplate
import androidx.car.app.model.ItemList
import androidx.car.app.model.Row
import androidx.car.app.model.Template

/**
 * Chat screen shown when the driver taps a conversation in
 * [ConversationListCarScreen].
 *
 * Displays recent messages and a voice-input send action.
 * All send actions are forwarded to [CarDataStore.pendingSend] so the
 * React Native layer can pick them up and deliver them via the relay.
 */
class ChatCarScreen(
    carContext: CarContext,
    private val conversationId: String,
    private val conversationTitle: String,
) : Screen(carContext) {

    init {
        CarDataStore.messages.observeForever { invalidate() }
    }

    override fun onGetTemplate(): Template {
        val messages = CarDataStore.messages.value
            ?.filter { it.conversationId == conversationId }
            ?: emptyList()

        val itemListBuilder = ItemList.Builder()

        if (messages.isEmpty()) {
            itemListBuilder.setNoItemsMessage("No messages yet")
        } else {
            // Show most recent 10 messages to stay within template limits.
            messages.takeLast(10).forEach { msg ->
                itemListBuilder.addItem(
                    Row.Builder()
                        .setTitle(msg.senderName)
                        .addText(msg.body)
                        .build()
                )
            }
        }

        val sendAction = Action.Builder()
            .setTitle("Reply")
            .setOnClickListener {
                carContext.requestPermissions(emptyList()) {}
                // Open the voice-input prompt; result delivered via onVoiceReply
                screenManager.pushForResult(VoiceReplyScreen(carContext)) { result ->
                    if (result is String && result.isNotBlank()) {
                        CarDataStore.queueSend(conversationId, result)
                    }
                }
            }
            .build()

        return ListTemplate.Builder()
            .setTitle(conversationTitle)
            .setHeaderAction(Action.BACK)
            .setSingleList(itemListBuilder.build())
            .build()
    }
}
