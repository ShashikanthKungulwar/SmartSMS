package com.mobile.worker

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class SmsCleanWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val deleted = cleanOtpSms()
            Log.d("SmartSMS", "Auto-clean: deleted $deleted OTP messages")
            Result.success()
        } catch (e: Exception) {
            Log.e("SmartSMS", "Auto-clean failed: ${e.message}")
            Result.retry()
        }
    }

    private fun cleanOtpSms(): Int {
        val otpPatterns = listOf(
            Regex("\\b\\d{4,8}\\b"),           // 4-8 digit OTP
            Regex("otp", RegexOption.IGNORE_CASE),
            Regex("one.?time", RegexOption.IGNORE_CASE),
            Regex("verification code", RegexOption.IGNORE_CASE),
            Regex("passcode", RegexOption.IGNORE_CASE),
        )

        val cursor = applicationContext.contentResolver.query(
            Uri.parse("content://sms/inbox"),
            arrayOf("_id", "body", "date"),
            null, null,
            "date DESC"
        ) ?: return 0

        var deletedCount = 0
        val idsToDelete = mutableListOf<String>()

        cursor.use {
            while (it.moveToNext()) {
                val id   = it.getString(it.getColumnIndexOrThrow("_id"))
                val body = it.getString(it.getColumnIndexOrThrow("body")) ?: ""
                val date = it.getLong(it.getColumnIndexOrThrow("date"))

                // Only delete OTPs older than 30 minutes
                val ageMinutes = (System.currentTimeMillis() - date) / 60000
                val isOtp = otpPatterns.any { pattern -> pattern.containsMatchIn(body) }

                if (isOtp && ageMinutes > 30) {
                    idsToDelete.add(id)
                }
            }
        }

        // Delete matched SMS
        idsToDelete.forEach { id ->
            try {
                val deleted = applicationContext.contentResolver.delete(
                    Uri.parse("content://sms/$id"), null, null
                )
                if (deleted > 0) deletedCount++
            } catch (e: Exception) {
                Log.w("SmartSMS", "Could not delete SMS $id: ${e.message}")
            }
        }

        return deletedCount
    }
}