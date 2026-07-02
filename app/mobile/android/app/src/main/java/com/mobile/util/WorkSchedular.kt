package com.mobile.util

import android.content.Context
import androidx.work.*
import com.mobile.worker.SmsCleanWorker
import java.util.concurrent.TimeUnit

object WorkScheduler {

    private const val WORK_NAME = "SmartSMS_AutoClean"

    fun schedule(context: Context, intervalHours: Long = 1) {
        val constraints = Constraints.Builder()
            .setRequiresBatteryNotLow(true)   // don't run on low battery
            .build()

        val request = PeriodicWorkRequestBuilder<SmsCleanWorker>(
            intervalHours, TimeUnit.HOURS
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,   // don't replace if already scheduled
            request
        )

        android.util.Log.d("SmartSMS", "WorkManager scheduled every $intervalHours hour(s)")
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    }

    fun runNow(context: Context) {
        // One-time immediate run for testing
        val request = OneTimeWorkRequestBuilder<SmsCleanWorker>().build()
        WorkManager.getInstance(context).enqueue(request)
    }
}