package com.mobile

import android.app.role.RoleManager
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "mobile"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestDefaultSmsRole()
        
    }

    private fun requestDefaultSmsRole() {
        // if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        //     val roleManager = getSystemService(RoleManager::class.java)
        //     if (!roleManager.isRoleHeld(RoleManager.ROLE_SMS)) {
        //         val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS)
        //         startActivityForResult(intent, 1)
        //     }
        // }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(RoleManager::class.java)
            android.util.Log.d("SmartSMS", "isRoleHeld: ${roleManager.isRoleHeld(RoleManager.ROLE_SMS)}")
            if (!roleManager.isRoleHeld(RoleManager.ROLE_SMS)) {
                android.util.Log.d("SmartSMS", "Requesting default SMS role...")
                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS)
                startActivityForResult(intent, 1)
            }
        } else {
            android.util.Log.d("SmartSMS", "SDK < Q, skipping role request")
        }

        
    }
}