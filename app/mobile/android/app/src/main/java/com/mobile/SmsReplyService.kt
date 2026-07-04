package com.mobile

import android.app.Service
import android.content.Intent
import android.os.IBinder

// Minimal stub — required by Android for default SMS app eligibility
class SmsReplyService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null
}