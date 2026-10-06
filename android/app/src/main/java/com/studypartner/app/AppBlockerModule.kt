package com.studypartner.app

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import java.util.ArrayList

class AppBlockerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppBlocker"
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val packages = pm.getInstalledPackages(PackageManager.GET_META_DATA)
            val list = Arguments.createArray()

            for (packageInfo in packages) {
                val appInfo = packageInfo.applicationInfo ?: continue
                
                // Skip system apps or studypartner itself
                val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                if (isSystem || packageInfo.packageName == reactApplicationContext.packageName) {
                    continue
                }

                val appName = appInfo.loadLabel(pm).toString()
                val appMap = Arguments.createMap()
                appMap.putString("name", appName)
                appMap.putString("packageName", packageInfo.packageName)
                list.pushMap(appMap)
            }
            promise.resolve(list)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isUsageStatsPermissionGranted(promise: Promise) {
        try {
            val context = reactApplicationContext
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            } else {
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            }
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestUsageStatsPermission() {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun isOverlayPermissionGranted(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestOverlayPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + reactApplicationContext.packageName)
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun startBlockingService(blockedPackages: ReadableArray) {
        try {
            val list = ArrayList<String>()
            for (i in 0 until blockedPackages.size()) {
                val pkg = blockedPackages.getString(i)
                if (pkg != null) {
                    list.add(pkg)
                }
            }

            val serviceIntent = Intent(reactApplicationContext, AppBlockingService::class.java)
            serviceIntent.putStringArrayListExtra("blockedPackages", list)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopBlockingService() {
        try {
            val serviceIntent = Intent(reactApplicationContext, AppBlockingService::class.java)
            reactApplicationContext.stopService(serviceIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
