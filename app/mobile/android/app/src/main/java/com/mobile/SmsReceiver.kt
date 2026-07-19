package com.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val isDeliver  = intent.action == Telephony.Sms.Intents.SMS_DELIVER_ACTION
        val isReceived = intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION
        if (!isDeliver && !isReceived) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        messages.forEach { sms ->
            val sender = sms.originatingAddress ?: "Unknown"
            val body   = sms.messageBody ?: ""
            if (BuildConfig.DEBUG) Log.d("SmartSMS", "SMS from: $sender → $body")

            // As default SMS app, WE must write the SMS to the inbox
            if (isDeliver) {
                val values = android.content.ContentValues().apply {
                    put("address", sender)
                    put("body", body)
                    put("date", System.currentTimeMillis())
                    put("read", 0)
                }
                context.contentResolver.insert(
                    android.net.Uri.parse("content://sms/inbox"), values
                )
                if (BuildConfig.DEBUG) Log.d("SmartSMS", "SMS written to inbox")
            }

            emitSmsReceivedEvent(context, sender, body)
        }
    }

    // App may not be running (or may be bridgeless with no JS context yet) when
    // a message arrives, so this must never throw back into the broadcast dispatch.
    private fun emitSmsReceivedEvent(context: Context, sender: String, body: String) {
        try {
            val reactApplication = context.applicationContext as? ReactApplication ?: return
            val reactContext = reactApplication.reactHost?.currentReactContext ?: return
            val params = Arguments.createMap().apply {
                putString("sender", sender)
                putString("body", body)
            }
            reactContext.emitDeviceEvent("onSmsReceived", params)
        } catch (e: Exception) {
            Log.w("SmartSMS", "Could not emit onSmsReceived: ${e.message}")
        }
    }
}