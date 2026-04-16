package com.emberchamber.mobile.auto

import androidx.lifecycle.MutableLiveData

/**
 * In-process data store shared between the React Native bridge module
 * ([CarBridgeModule]) and the car screens.
 *
 * LiveData is used so screens observe updates and call invalidate()
 * automatically when data changes from the JS layer.
 */
object CarDataStore {

    data class ConversationSummary(
        val id: String,
        val title: String,
        val lastMessage: String,
    )

    data class CarMessage(
        val conversationId: String,
        val senderName: String,
        val body: String,
        val timestampMs: Long,
    )

    data class PendingSend(
        val conversationId: String,
        val body: String,
    )

    val conversations: MutableLiveData<List<ConversationSummary>> =
        MutableLiveData(emptyList())

    val messages: MutableLiveData<List<CarMessage>> =
        MutableLiveData(emptyList())

    /** Called by the native bridge; the JS layer polls or uses an event emitter to consume. */
    val pendingSends: MutableLiveData<List<PendingSend>> =
        MutableLiveData(emptyList())

    fun updateConversations(list: List<ConversationSummary>) {
        conversations.postValue(list)
    }

    fun updateMessages(list: List<CarMessage>) {
        messages.postValue(list)
    }

    fun queueSend(conversationId: String, body: String) {
        val current = pendingSends.value?.toMutableList() ?: mutableListOf()
        current.add(PendingSend(conversationId, body))
        pendingSends.postValue(current)
    }

    fun consumeSends(): List<PendingSend> {
        val current = pendingSends.value ?: emptyList()
        pendingSends.postValue(emptyList())
        return current
    }
}
