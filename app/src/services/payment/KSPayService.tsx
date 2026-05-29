import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

export default function KSPayService({ isVisible, onClose, paymentData }: any) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [isDead, setIsDead] = useState(false);

  useEffect(() => {
    if (isVisible) {
      console.log("[KSPay] 🚀 결제 모달 활성화 / DB 데이터:", paymentData);
      setLoading(true);
      setIsDead(false);
    }
  }, [isVisible]);

  const handleInternalClose = (success: boolean, payKey?: string) => {
    setIsDead(true);
    onClose(success, payKey);
  };

  const handleAppLink = async (url: string) => {
    try {
      let finalUrl = url;
      if (Platform.OS === "android" && url.startsWith("intent:")) {
        const splittedUrl = url.split("#Intent;");
        const schemePart = splittedUrl[1]
          ?.split(";")
          .find((s) => s.startsWith("scheme="));
        if (schemePart) {
          finalUrl = `${schemePart.replace("scheme=", "")}://${url.replace(/intent:\/\/|#Intent;.*/g, "")}`;
        }
      }
      try {
        await Linking.openURL(finalUrl);
      } catch (err) {
        if (url.includes("package=")) {
          const packageName = url.split("package=")[1]?.split(";")[0];
          if (packageName)
            Linking.openURL(`market://details?id=${packageName}`);
          return;
        }
        Alert.alert("앱 미설치", "결제 앱이 설치되어 있지 않습니다.");
      }
    } catch (e) {
      console.error("[KSPay] ❌ 앱 실행 중 에러:", e);
    }
  };

  if (isDead) return null;

  // 🚀 1. 환경에 따른 도메인 분기 (이 부분이 고정되어 있어서 에러가 났었습니다)
  // __DEV__ 가 true면 로컬 개발(Expo Go 등), false면 실제 빌드(운영)입니다.
  const KSNET_DOMAIN = "kspay.ksnet.to";
  const kspayUrl = `https://${KSNET_DOMAIN}/store/KSPayMobileV1.4/KSPayPWeb.jsp`;
  const dummyCallbackUrl = `https://${KSNET_DOMAIN}/success-callback-dummy`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body onload="document.getElementById('kspayForm').submit();">
        <div style="text-align: center; margin-top: 50px;"><h3>안전 결제창 연결중...</h3></div>
        
        <form id="kspayForm" action="${kspayUrl}" method="POST" accept-charset="utf-8">
          
          <input type="hidden" name="sndCharSet" value="utf-8">
          
          <input type="hidden" name="sndPaymethod" value="1000000000">
          <input type="hidden" name="sndStoreid" value="${paymentData.kspay_mid}">
          <input type="hidden" name="sndOrdernumber" value="ORD_${Date.now().toString().slice(-10)}">
          <input type="hidden" name="sndGoodname" value="${paymentData.packageName?.substring(0, 15) || "상품결제"}">
          <input type="hidden" name="sndAmount" value="${paymentData.amount}">
          <input type="hidden" name="sndOrdername" value="${paymentData.userName || "고객"}">
          <input type="hidden" name="sndReply" value="${dummyCallbackUrl}">
        </form>
      </body>
    </html>
  `;

  // 🚀 2. 백엔드 없이 POST 데이터를 가로채기 위한 자바스크립트 주입 코드
  const INJECTED_JAVASCRIPT = `
    (function() {
      // 1) 버튼 클릭 등으로 발생하는 submit 이벤트 가로채기
      window.addEventListener('submit', function(e) {
        if (e.target && e.target.action && e.target.action.includes('/success-callback-dummy')) {
          e.preventDefault(); // 페이지 이동 멈춤!
          var formData = new FormData(e.target);
          var reCommConId = formData.get('reCommConId');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'KSPAY_SUCCESS', payKey: reCommConId }));
        }
      }, true);

      // 2) JS 내부에서 form.submit()을 직접 호출할 때 가로채기 (KSNET이 주로 씀)
      var originalSubmit = HTMLFormElement.prototype.submit;
      HTMLFormElement.prototype.submit = function() {
        if (this.action && this.action.includes('/success-callback-dummy')) {
          var formData = new FormData(this);
          var reCommConId = formData.get('reCommConId');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'KSPAY_SUCCESS', payKey: reCommConId }));
          return; // 원래 submit 실행 안 함! (페이지 이동 멈춤)
        }
        originalSubmit.apply(this, arguments);
      };
    })();
    true;
  `;

  return (
    <Modal visible={isVisible} animationType="none" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => handleInternalClose(false)}>
            <Ionicons name="close" size={28} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카드 결제</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent, baseUrl: `https://${KSNET_DOMAIN}` }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            // 🚀 만들어둔 자바스크립트를 웹뷰에 주입합니다.
            injectedJavaScript={INJECTED_JAVASCRIPT}
            onLoadEnd={(e) => {
              if (!e.nativeEvent.url.includes("about:blank")) setLoading(false);
            }}
            // 🚀 주입된 자바스크립트가 데이터를 낚아채서 보내면 여기서 받습니다.
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === "KSPAY_SUCCESS") {
                  console.log("[KSPay] 🎉 가로채기 성공! 인증키:", data.payKey);
                  if (data.payKey) {
                    handleInternalClose(true, data.payKey);
                  } else {
                    Alert.alert("오류", "결제 인증 키를 찾을 수 없습니다.");
                    handleInternalClose(false);
                  }
                }
              } catch (err) {
                console.error("[KSPay] 메시지 파싱 에러:", err);
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              const { url } = request;

              // 외부 앱(카드사) 실행 로직
              if (
                !url.startsWith("http://") &&
                !url.startsWith("https://") &&
                !url.startsWith("about:blank")
              ) {
                handleAppLink(url);
                return false;
              }

              // 가짜 콜백 URL로 페이지가 진짜 넘어가려고 하면 막아줍니다.
              if (url.includes("/success-callback-dummy")) {
                return false;
              }

              return true;
            }}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
