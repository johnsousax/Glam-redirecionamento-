import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

/** Assina (esquema v2, Android 7+) e confere o APK. Uso: Sign <keystore.p12> <senha> <alias> <entrada.apk> <saida.apk> */
public class Sign {
    public static void main(String[] a) throws Exception {
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(a[0])) { ks.load(in, a[1].toCharArray()); }
        PrivateKey key = (PrivateKey) ks.getKey(a[2], a[1].toCharArray());
        X509Certificate cert = (X509Certificate) ks.getCertificate(a[2]);
        ApkSigner.SignerConfig sc = new ApkSigner.SignerConfig.Builder("FUGANEON", key, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(sc)).setInputApk(new File(a[3])).setOutputApk(new File(a[4]))
            .setV1SigningEnabled(false).setV2SigningEnabled(true).build().sign();
        ApkVerifier.Result r = new ApkVerifier.Builder(new File(a[4])).build().verify();
        System.out.println("verificado=" + r.isVerified() + " v1=" + r.isVerifiedUsingV1Scheme() + " v2=" + r.isVerifiedUsingV2Scheme());
        for (Object e : r.getErrors()) System.out.println("ERRO " + e);
        for (Object w : r.getWarnings()) System.out.println("aviso " + w);
        if (!r.isVerified()) System.exit(1);
    }
}
