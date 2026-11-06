#!/usr/bin/env bash
# Gera jogo/fuga-neon.apk sem Android SDK.
# Precisa de: JDK 11+, python3 com Pillow, e em android/tools/: android.jar (com.google.android:android:4.1.1.4),
# dx.jar (com.jakewharton.android.repackaged:dalvik-dx:9.0.0_r3) e apksig.jar (com.android.tools.build:apksig:2.3.0),
# todos do Maven Central. O script baixa o que faltar.
set -euo pipefail
cd "$(dirname "$0")"
VERSION_CODE=${VERSION_CODE:-2}
VERSION_NAME=${VERSION_NAME:-1.1}
KEYSTORE=${KEYSTORE:-fuga-neon.p12}
KS_PASS=${KS_PASS:-fuganeon}
M=https://repo1.maven.org/maven2
mkdir -p tools build
[ -f tools/android.jar ] || curl -sSf -o tools/android.jar $M/com/google/android/android/4.1.1.4/android-4.1.1.4.jar
[ -f tools/dx.jar ] || curl -sSf -o tools/dx.jar $M/com/jakewharton/android/repackaged/dalvik-dx/9.0.0_r3/dalvik-dx-9.0.0_r3.jar
[ -f tools/apksig.jar ] || curl -sSf -o tools/apksig.jar $M/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar
rm -rf build/* && mkdir -p build/classes build/stubs build/assets build/signer
# 1) Java -> .class (a anotação JavascriptInterface vem de um stub só para compilar)
javac -nowarn --release 8 -d build/stubs stubs/android/webkit/JavascriptInterface.java
javac -nowarn --release 8 -cp tools/android.jar:build/stubs -d build/classes src/com/fuganeon/app/*.java
# 2) .class -> classes.dex
java -cp tools/dx.jar com.android.dx.command.Main --dex --min-sdk-version=24 --output=build/classes.dex build/classes
# 3) ícone e cópia do jogo (usada quando não há internet)
python3 make_icon.py build/icon.png
cp ../jogo/index.html ../jogo/peerjs.min.js build/assets/
# 4) manifesto, recursos e zip
python3 build_apk.py build/classes.dex build/icon.png build/assets build/unsigned.apk "$VERSION_CODE" "$VERSION_NAME"
# 5) chave de assinatura (mantenha a mesma para as atualizações instalarem por cima)
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -storetype PKCS12 -keystore "$KEYSTORE" -storepass "$KS_PASS" -alias fuganeon -keyalg RSA -keysize 2048 \
    -validity 10000 -dname "CN=Fuga Neon, O=Fuga Neon, C=BR" >/dev/null 2>&1
fi
javac -nowarn -cp tools/apksig.jar -d build/signer tools/Sign.java
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED --add-exports java.base/sun.security.util=ALL-UNNAMED -cp tools/apksig.jar:build/signer Sign "$KEYSTORE" "$KS_PASS" fuganeon build/unsigned.apk ../jogo/pixel-fuga.apk
ls -la ../jogo/pixel-fuga.apk
