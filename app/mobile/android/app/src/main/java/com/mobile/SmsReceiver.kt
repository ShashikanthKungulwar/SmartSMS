package com.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        messages.forEach { sms ->
            val sender = sms.originatingAddress ?: "Unknown"
            val body   = sms.messageBody ?: ""
            Log.d("SmartSMS", "SMS from: $sender → $body")
            // Event emission handled by SmsModule directly
        }
    }
}