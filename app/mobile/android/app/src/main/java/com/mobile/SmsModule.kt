package com.mobile

import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*

class SmsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "SmsModule"

    @ReactMethod
    fun getSmsFromInbox(maxCount: Int, promise: Promise) {
        try {
            if (ContextCompat.checkSelfPermission(reactContext, android.Manifest.permission.READ_SMS)
                != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "READ_SMS permission not granted")
                return
            }

            val smsList = WritableNativeArray()
            val cursor = reactContext.contentResolver.query(
                Uri.parse("content://sms/inbox"),
                arrayOf("_id", "address", "body", "date", "read"),
                null, null,
                "date DESC LIMIT $maxCount"
            )

            cursor?.use {
                while (it.moveToNext()) {
                    val sms = WritableNativeMap().apply {
                        putString("id",      it.getString(it.getColumnIndexOrThrow("_id")))
                        putString("address", it.getString(it.getColumnIndexOrThrow("address")) ?: "Unknown")
                        putString("body",    it.getString(it.getColumnIndexOrThrow("body")) ?: "")
                        putString("date",    it.getString(it.getColumnIndexOrThrow("date")))
                        putInt("read",       it.getInt(it.getColumnIndexOrThrow("read")))
                    }
                    smsList.pushMap(sms)
                }
            }

            promise.resolve(smsList)
        } catch (e: Exception) {
            promise.reject("SMS_READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun deleteSms(smsId: String, promise: Promise) {
        try {
            val uri = Uri.parse("content://sms/$smsId")
            val deleted = reactContext.contentResolver.delete(uri, null, null)
            if (deleted > 0) promise.resolve(true)
            else promise.reject("DELETE_FAILED", "SMS not found or already deleted")
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", e.message)
        }
    }
}