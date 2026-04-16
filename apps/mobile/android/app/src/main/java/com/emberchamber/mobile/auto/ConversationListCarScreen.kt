package com.emberchamber.mobile.auto

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.ConversationItem
import androidx.car.app.model.MessageItem
import androidx.car.app.model.Template
import androidx.car.app.messaging.model.ConversationCallbackDelegate
import androidx.car.app.messaging.model.ConversationItem as CarConversationItem
import androidx.car.app.model.ListTemplate
import androidx.car.app.model.ItemList
import androidx.car.app.model.CarText
import androidx.car.app.model.Row

/**
 * Root car screen.  Displays the list of active conversations fetched
 * from [CarDataStore], which is updated by the React Native bridge
 * whenever the JS layer has new data.
 *
 * Tapping a conversation row navigates to [ChatCarScreen].
 */
class ConversationListCarScreen(carContext: CarContext) : Screen(carContext) {

    init {
        // Observe data changes so the screen re-renders when messages arrive.
        CarDataStore.conversations.observeForever { invalidate() }
    }

    override fun onGetTemplate(): Template {
        val conversations = CarDataStore.conversations.value ?: emptyList()

        val itemListBuilder = ItemList.Builder()

        if (conversations.isEmpty()) {
            itemListBuilder.setNoItemsMessage("No conversations yet")
        } else {
            conversations.forEach { convo ->
                itemListBuilder.addItem(
                    Row.Builder()
                        .setTitle(convo.title)
                        .addText(convo.lastMessage.ifBlank { "No messages yet" })
                        .setOnClickListener {
                            screenManager.push(ChatCarScreen(carContext, convo.id, convo.title))
                        }
                        .build()
                )
            }
        }

        return ListTemplate.Builder()
            .setTitle("EmberChamber")
            .setHeaderAction(Action.APP_ICON)
            .setSingleList(itemListBuilder.build())
            .build()
    }
}
