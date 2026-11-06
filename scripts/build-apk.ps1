param(
  [string]$WorkDir = 'C:\kk-build',
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot

$sdk = $env:ANDROID_HOME
if (-not $sdk) {
  $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not (Test-Path $sdk)) {
  throw "Android SDK nicht gefunden. Setze ANDROID_HOME oder installiere das SDK nach $sdk."
}
if (-not $env:JAVA_HOME) {
  throw 'JAVA_HOME ist nicht gesetzt. Benoetigt wird JDK 17 oder 18.'
}

# Windows begrenzt Pfade standardmaessig auf 260 Zeichen. Die CMake-Objektpfade
# von react-native-worklets und react-native-gesture-handler ueberschreiten das
# im Projektordner. Drei Massnahmen greifen zusammen:
#   1. Der Build laeuft in einem kurzen Arbeitsverzeichnis.
#   2. CMake 3.31+ kuerzt zu lange Objektnamen automatisch per MD5. Das von AGP
#      standardmaessig genutzte CMake 3.22 warnt nur und baut danach nicht.
#   3. AGP uebergibt -DCMAKE_OBJECT_PATH_MAX=1024 und schaltet die Kuerzung
#      damit ab. Der Wert wird auf 250 zurueckgesetzt.
function Ensure-ModernCmake {
  param([string]$Sdk)

  $cmake = Join-Path $Sdk 'cmake\3.31.6\bin\cmake.exe'
  if (Test-Path $cmake) {
    return
  }

  $sdkManager = Join-Path $Sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
  if (-not (Test-Path $sdkManager)) {
    throw 'sdkmanager nicht gefunden. Bitte Android cmdline-tools installieren.'
  }

  Write-Host 'Installiere CMake 3.31.6 (kuerzt lange Objektpfade unter Windows) ...'
  1..20 | ForEach-Object { 'y' } | & $sdkManager "--sdk_root=$Sdk" 'cmake;3.31.6'
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $cmake)) {
    throw 'CMake 3.31.6 konnte nicht installiert werden.'
  }
}

Ensure-ModernCmake -Sdk $sdk

if ($Clean -and (Test-Path $WorkDir)) {
  Remove-Item -Recurse -Force $WorkDir
}

robocopy $project $WorkDir /E /XD node_modules android .data dist dist-test .expo release /XF *.tsbuildinfo /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "Kopieren nach $WorkDir fehlgeschlagen (Robocopy $LASTEXITCODE)."
}

Push-Location $WorkDir
try {
  npm install
  if ($LASTEXITCODE -ne 0) {
    throw 'npm install fehlgeschlagen.'
  }

  npx expo prebuild --platform android --clean
  if ($LASTEXITCODE -ne 0) {
    throw 'Expo Prebuild fehlgeschlagen.'
  }

  # Nach dem Prebuild die CMake-Konfiguration ergaenzen. Die generierte
  # build.gradle wird dabei nur um einen markierten Block erweitert, damit das
  # Skript mehrfach laufen kann.
  $appGradle = Join-Path $WorkDir 'android\app\build.gradle'
  $marker = '// --- build-apk.ps1: Windows path length ---'
  $content = Get-Content $appGradle -Raw
  if ($content -notlike "*$marker*") {
    $block = @"

$marker
android {
    externalNativeBuild {
        cmake {
            version "3.31.6"
        }
    }
}
android.defaultConfig {
    externalNativeBuild {
        cmake {
            arguments "-DCMAKE_OBJECT_PATH_MAX=250"
        }
    }
}
"@
    Add-Content -Path $appGradle -Value $block
  }

  $env:ANDROID_HOME = $sdk
  $env:ANDROID_SDK_ROOT = $sdk
  $env:Path = "$env:JAVA_HOME\bin;$sdk\platform-tools;$env:Path"

  Push-Location (Join-Path $WorkDir 'android')
  try {
    .\gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) {
      throw 'Gradle-Build fehlgeschlagen.'
    }
  } finally {
    Pop-Location
  }

  $apk = Join-Path $WorkDir 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path $apk)) {
    throw "APK nicht gefunden: $apk"
  }

  $release = Join-Path $project 'release'
  New-Item -ItemType Directory -Force $release | Out-Null
  $version = (Get-Content (Join-Path $project 'package.json') -Raw | ConvertFrom-Json).version
  $target = Join-Path $release "KalorienKompass-$version.apk"
  Copy-Item $apk $target -Force

  Write-Host ''
  Write-Host "APK erstellt: $target"
} finally {
  Pop-Location
}
