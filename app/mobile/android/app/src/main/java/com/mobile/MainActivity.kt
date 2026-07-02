package com.mobile

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "mobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

// // gpt

// package com.mobile
// import android.os.Bundle
// import com.facebook.react.ReactActivity
// import com.facebook.react.ReactActivityDelegate
// import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
// import com.facebook.react.defaults.DefaultReactActivityDelegate

// import android.content.Intent
// import android.os.Build
// import android.provider.Telephony


// class MainActivity : ReactActivity() {

//    override fun onCreate(savedInstanceState: Bundle?) {
//     super.onCreate(savedInstanceState)

//     android.util.Log.d("SmartSMS", "MainActivity onCreate")

//     if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
//         val currentDefault = Telephony.Sms.getDefaultSmsPackage(this)
//         android.util.Log.d("SmartSMS", "Current default: $currentDefault")

//         if (currentDefault != packageName) {
//             android.util.Log.d("SmartSMS", "Launching default SMS dialog")

//             val intent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT)
//             intent.putExtra(
//                 Telephony.Sms.Intents.EXTRA_PACKAGE_NAME,
//                 packageName
//             )
//             startActivity(intent)
//         }
//     }
//   }

//     override fun getMainComponentName(): String = "mobile"

//     override fun createReactActivityDelegate(): ReactActivityDelegate =
//         DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
// }