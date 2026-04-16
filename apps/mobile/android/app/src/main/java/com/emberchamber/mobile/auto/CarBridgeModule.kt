package com.emberchamber.mobile.auto

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray

/**
 * React Native native module that lets the JS layer push conversation
 * and message data into [CarDataStore] so the Android Auto screens
 * always have fresh data.
 *
 * Usage from JS/TS (once the module is registered via [CarBridgePackage]):
 *
 * ```ts
 * import { NativeModules } from 'react-native';
 * const { CarBridge } = NativeModules;
 *
 * // Push conversation list (call whenever conversations update)
 * CarBridge.updateConversations([
 *   { id: 'abc', title: 'Alice', lastMessage: 'Hey!' },
 * ]);
 *
 * // Push messages for a conversation
 * CarBridge.updateMessages([
 *   { conversationId: 'abc', senderName: 'Alice', body: 'Hey!', timestampMs: 1234567890 },
 * ]);
 *
 * // Poll for messages queued by the driver via Android Auto
 * const sends = await CarBridge.consumePendingSends();
 * // sends → [{ conversationId: 'abc', body: 'On my way' }]
 * ```
 */
class CarBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CarBridge"

    /**
     * Push a fresh list of conversation summaries from JS.
     *
     * Each element must have keys: id (String), title (String), lastMessage (String).
     */
    @ReactMethod
    fun updateConversations(conversations: ReadableArray) {
        val list = (0 until conversations.size()).map { i ->
            val map = conversations.getMap(i)
            CarDataStore.ConversationSummary(
                id = map.getString("id") ?: "",
                title = map.getString("title") ?: "",
                lastMessage = map.getString("lastMessage") ?: "",
            )
        }
        CarDataStore.updateConversations(list)
    }

    /**
     * Push messages for one or more conversations.
     *
     * Each element must have keys:
     *   conversationId (String), senderName (String),
     *   body (String), timestampMs (Double).
     */
    @ReactMethod
    fun updateMessages(messages: ReadableArray) {
        val list = (0 until messages.size()).map { i ->
            val map = messages.getMap(i)
            CarDataStore.CarMessage(
                conversationId = map.getString("conversationId") ?: "",
                senderName = map.getString("senderName") ?: "",
                body = map.getString("body") ?: "",
                timestampMs = map.getDouble("timestampMs").toLong(),
            )
        }
        CarDataStore.updateMessages(list)
    }

    /**
     * Returns and clears any messages the driver typed or dictated via
     * Android Auto.  The JS layer should call this periodically (or on
     * resume) and send each item through the relay.
     */
    @ReactMethod
    fun consumePendingSends(promise: Promise) {
        val sends: WritableArray = Arguments.createArray()
        CarDataStore.consumeSends().forEach { send ->
            val map = Arguments.createMap()
            map.putString("conversationId", send.conversationId)
            map.putString("body", send.body)
            sends.pushMap(map)
        }
        promise.resolve(sends)
    }
}
