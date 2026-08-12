import path from 'node:path';
import { sharedConfig } from './wdio.shared.conf';

// Requiere: adb (Android Platform-Tools) + JDK + appium con el driver instalado:
//   appium driver install uiautomator2
// Funciona tanto contra un celular físico conectado por USB (depuración USB activada
// y autorizada) como contra un emulador corriendo — `udid` abajo distingue cuál usar
// si hay más de un dispositivo conectado (`adb devices -l` para ver el serial real).
//
// El path default se resuelve contra __dirname (no contra cwd): Appium/WebdriverIO
// resuelven paths relativos de capabilities contra el directorio desde el que se
// invoca `wdio run` (cwd), no contra la ubicación de este archivo — sin esto, correrlo
// vía `npm run test:android` desde la raíz del repo apuntaba a una carpeta inexistente.
const APP_PATH = process.env.MOBILE_APP_PATH_ANDROID ?? path.resolve(__dirname, '..', 'apps', 'app-android.apk');
const UDID = process.env.MOBILE_ANDROID_UDID;

// appPackage/appActivity: NO confiar en el flavor inferido del build.gradle del repo
// fuente — la .apk real entregada (mobile/apps/app-android.apk) resultó ser flavor
// "dev" (package 'vetify.cliente.dev', versionCode 7 / versionName 4.0), un flavor
// que ni siquiera existe en `Android/app/build.gradle` de `ike-webapp-mobile` (que solo
// define "prod"/"qa") — probablemente un build local viejo de quien la compiló. Verificado
// con el binario real, no con el repo fuente:
//   "$ANDROID_HOME/build-tools/<ver>/aapt.exe" dump badging mobile/apps/app-android.apk
//   -> package: name='vetify.cliente.dev' ... | launchable-activity: name='com.example.vetify.MainActivity'
// Ver IMP-008 (docs/impedimentos-bloqueos.md) para el detalle completo. Si se reemplaza
// la .apk por un build "qa" real más adelante, volver a correr aapt y actualizar esto
// (o pasar las env vars de abajo) — no asumir que el package sigue siendo el mismo.
const APP_PACKAGE = process.env.MOBILE_ANDROID_APP_PACKAGE ?? 'vetify.cliente.dev';
const APP_ACTIVITY = process.env.MOBILE_ANDROID_APP_ACTIVITY ?? 'com.example.vetify.MainActivity';

export const config: WebdriverIO.Config = {
    ...sharedConfig,
    port: 4723,
    services: [
        [
            'appium',
            {
                command: 'appium',
                // Necesario para interactuar con el contexto WEBVIEW (no solo detectarlo):
                // Appium descarga el chromedriver que matchea la versión de Chrome/System
                // WebView del dispositivo/emulador en vez de fallar con "No Chromedriver found".
                args: { allowInsecure: 'uiautomator2:chromedriver_autodownload' },
            },
        ],
    ],
    capabilities: [
        {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:deviceName': process.env.MOBILE_ANDROID_DEVICE_NAME ?? 'Android Device',
            ...(UDID ? { 'appium:udid': UDID } : {}),
            'appium:app': APP_PATH,
            'appium:appPackage': APP_PACKAGE,
            'appium:appActivity': APP_ACTIVITY,
            'appium:autoGrantPermissions': true,
            'appium:newCommandTimeout': 240,
        },
    ],
};
