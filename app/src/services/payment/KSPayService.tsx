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
  const [isPayStarted, setIsPayStarted] = useState(false);

  // 컴포넌트 마운트 로그
  useEffect(() => {
    if (isVisible) {
      console.log("[KSPay] 🚀 결제 서비스 모달 활성화");
      console.log("[KSPay] 📊 주입 데이터 요약:", {
        MID: paymentData.kspay_mid,
        Amount: paymentData.amount,
        Product: paymentData.packageName,
      });
      // 🚀 [디버깅] 환경변수 실제 값을 확인합니다.
      console.log("[KSPay] 디버그 - 환경변수 URL:", process.env.EXPO_PUBLIC_KSPAY_URL);
    }
  }, [isVisible]);

  const handleInternalClose = (success: boolean, payKey?: string) => {
    console.log(
      `[KSPay] 🏁 최종 종료 처리 - 결과: ${success ? "성공" : "실패/취소"}, PayKey: ${payKey || "없음"}`,
    );
    setIsDead(true);
    onClose(success, payKey);
  };

  const handleAppLink = async (url: string) => {
    console.log(`[KSPay] 📱 외부 앱(카드사) 호출 시도: ${url}`);
    try {
      let finalUrl = url;
      if (Platform.OS === "android" && url.startsWith("intent:")) {
        const splittedUrl = url.split("#Intent;");
        const schemePart = splittedUrl[1]
          ?.split(";")
          .find((s) => s.startsWith("scheme="));
        if (schemePart) {
          const actualScheme = schemePart.replace("scheme=", "");
          const actualPath = url.replace(/intent:\/\/|#Intent;.*/g, "");
          finalUrl = `${actualScheme}://${actualPath}`;
          console.log(`[KSPay] 🤖 안드로이드 인텐트 변환 완료: ${finalUrl}`);
        }
      }

      const canOpen = await Linking.canOpenURL(finalUrl);
      if (canOpen) {
        await Linking.openURL(finalUrl);
      } else {
        console.warn(`[KSPay] ⚠️ 앱 실행 불가 (미설치): ${finalUrl}`);
        Alert.alert(
          "앱 미설치",
          "결제를 진행할 카드사 앱이 설치되어 있지 않습니다.",
        );
      }
    } catch (e) {
      console.error("[KSPay] ❌ 앱 실행 중 예외 발생:", e);
    }
  };

  if (isDead) return null;

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
            source={{
              uri: process.env.EXPO_PUBLIC_KSPAY_URL || "",
            }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            // 🚀 [디버그] 상세 로그들 유지
            onLoadStart={(e) => console.log("[KSPay] 로드 시작:", e.nativeEvent.url)}
            onHttpError={(e) => console.error("[KSPay] HTTP 에러:", e.nativeEvent.statusCode, e.nativeEvent.description)}
            onShouldStartLoadWithRequest={(request) => {
              const { url } = request;
              console.log("[KSPay] 🌐 URL 감시(Navigation):", url);

              // 외부 앱 스키마 감지
              if (
                !url.startsWith("http://") &&
                !url.startsWith("https://") &&
                !url.startsWith("about:blank")
              ) {
                handleAppLink(url);
                return false;
              }

              // 결제 완료/인증 성공 키 추출 로직
              const getPayKey = (targetUrl: string) => {
                const params = [
                  "reCommConId=",
                  "tx_key=",
                  "pg_token=",
                  "payKey=",
                  "r_conid=",
                ];
                for (const p of params) {
                  if (targetUrl.includes(p))
                    return targetUrl.split(p)[1]?.split("&")[0];
                }
                return null;
              };

              const payKey = getPayKey(url);
              if (
                payKey &&
                (url.includes("rs_o2") ||
                  url.includes("result") ||
                  url.includes("reCommConId"))
              ) {
                console.log(
                  "[KSPay] ✨ 결제 인증 키 추출 성공 - 복귀 주소에서 감지:",
                  payKey,
                );
                handleInternalClose(true, payKey);
                return false;
              }

              return true;
            }}
            onLoadEnd={(e) => {
              const currentUrl = e.nativeEvent.url;
              console.log("[KSPay] 📄 페이지 로드 완료:", currentUrl);

              if (currentUrl.includes("sapp.jsp") && !isPayStarted) {
                console.log("[KSPay] 📥 KSNET 스크립트 주입 시작...");
                setLoading(false);

                const injectCode = `
                  (function() {
                    try {
                      if (typeof requestPay === 'function') {
                        console.log('KSNET requestPay 실행 준비 완료');
                        requestPay({
                          callbackfunction: 'window.kspayCallback',
                          mid: '${paymentData.kspay_mid}',
                          paymethod: 'card',
                          ordernumb: 'ORD_${Date.now()}',
                          productname: '${paymentData.packageName}',
                          username: '${paymentData.userName}',
                          userphonenumb: '${paymentData.userPhone}',
                          payamount: ${paymentData.amount}
                        });
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STARTED' }));
                      } else {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'requestPay 함수를 찾을 수 없습니다. (라이브러리 로드 지연 가능성)' }));
                      }
                    } catch (e) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: '주입 스크립트 실행 중 예외: ' + e.message }));
                    }
                  })();
                  true;
                `;

                // 라이브러리 로딩을 위해 500ms 지연 후 주입
                setTimeout(() => {
                  console.log("[KSPay] 💉 JavaScript 주입 명령 전송");
                  webViewRef.current?.injectJavaScript(injectCode);
                }, 500);
              }
            }}
            injectedJavaScript={`
              window.kspayCallback = function(data) {
                console.log("KSNET Callback 수신");
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
              };
              true;
            `}
            onMessage={(event) => {
              try {
                const res = JSON.parse(event.nativeEvent.data);
                console.log("📩 [KSPay] 수신 데이터:", res);

                // 1. 결제창 실행 시작 신호
                if (res.type === "STARTED") {
                  setIsPayStarted(true);
                  console.log("[KSPay] 🚀 결제창 실행 성공 (STARTED)");
                  return;
                }

                // 2. 내부 에러 신호
                if (res.type === "ERROR") {
                  console.error(
                    "[KSPay] ❌ 웹뷰 내부 에러 리포트:",
                    res.message,
                  );
                  Alert.alert("결제 오류", "초기화 중 에러가 발생했습니다.");
                  handleInternalClose(false);
                  return;
                }

                // 3. 중간 상태(INIT/진행중) 필터링 - 여기서 종료되지 않게 return
                if (
                  res.successYn === "S" ||
                  res.callbackReason === "INIT" ||
                  res.callbackPos === "S"
                ) {
                  console.log("[KSPay] ⏳ 중간 단계 신호 무시 (진행중)");
                  return;
                }

                // 4. 최종 결과 처리
                if (res.successYn === "Y" && res.payKey) {
                  console.log("[KSPay] ✅ 결제 인증 완료 - 데이터 일치");
                  handleInternalClose(true, res.payKey);
                } else if (
                  res.successYn === "N" ||
                  res.successYn === "cancel"
                ) {
                  console.log(
                    "[KSPay] 🚫 결제 취소/실패 사유:",
                    res.resmsg || "사용자 취소",
                  );
                  handleInternalClose(false);
                }
              } catch (err) {
                console.error("[KSPay] ❌ 메시지 파싱 중 중대 에러:", err);
              }
            }}
            onError={(e) => {
              console.error(
                "[KSPay] ❌ 웹뷰 로드 실패(Network Error):",
                e.nativeEvent,
              );
              Alert.alert(
                "통신 오류",
                "결제 페이지를 불러올 수 없습니다. 네트워크를 확인해주세요.",
              );
              handleInternalClose(false);
            }}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text
                style={{ marginTop: 10, color: "#6366F1", fontWeight: "600" }}
              >
                보안 결제 모듈을 불러오는 중...
              </Text>
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
    backgroundColor: "#fff",
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