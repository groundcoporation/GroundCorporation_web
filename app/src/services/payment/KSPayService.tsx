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
  const [isPayStarted, setIsPayStarted] = useState(false); // 중복 실행 방지

  const handleInternalClose = (success: boolean, payKey?: string) => {
    console.log(
      `[KSPay] 종료 처리 - 성공: ${success}, PayKey: ${payKey || "없음"}`,
    );
    setIsDead(true);
    onClose(success, payKey);
  };

  const handleAppLink = async (url: string) => {
    try {
      let finalUrl = url;

      // 안드로이드 Intent 스키마 처리
      if (Platform.OS === "android" && url.startsWith("intent:")) {
        const splittedUrl = url.split("#Intent;");
        const schemePart = splittedUrl[1]
          ?.split(";")
          .find((s) => s.startsWith("scheme="));

        if (schemePart) {
          // 💡 intent 주소에서 실제 앱 스키마(kb-acp, ispmobile, kakaotalk 등)를 추출
          const actualScheme = schemePart.replace("scheme=", "");
          const actualPath = url.replace(/intent:\/\/|#Intent;.*/g, "");
          finalUrl = `${actualScheme}://${actualPath}`;
        } else {
          // scheme 정의가 없는 경우 (예: 바로 package 명으로 호출하는 경우)
          // package 정보를 찾아 매핑하거나 기본 처리
          const packagePart = splittedUrl[1]
            ?.split(";")
            .find((s) => s.startsWith("package="));
          if (packagePart && url.includes("pay")) {
            // 특정 앱에 대한 예외 처리가 필요할 수 있음
          }
        }
      }

      console.log("[KSPay] 최종 호출 URL:", finalUrl);

      const canOpen = await Linking.canOpenURL(finalUrl);
      if (canOpen) {
        await Linking.openURL(finalUrl);
      } else {
        // 앱이 없을 경우 스토어로 이동 (선택 사항)
        Alert.alert(
          "앱 미설치",
          "결제를 진행할 카드사 앱이 설치되어 있지 않습니다.",
        );
      }
    } catch (e) {
      console.log("[KSPay] 앱 실행 실패 상세:", e);
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
              uri: `https://pgdev.ksnet.co.kr/store/KSPayMobileV1.4/mall/app/sapp.jsp`,
            }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onShouldStartLoadWithRequest={(request) => {
              const { url } = request;
              console.log("[KSPay] URL 감시:", url);

              // 1. 외부 앱 실행 (카드사 앱 호출)
              if (
                !url.startsWith("http://") &&
                !url.startsWith("https://") &&
                !url.startsWith("about:blank")
              ) {
                handleAppLink(url);
                return false;
              }

              // 2. 💡 [핵심] 모든 카드사 결제 완료 파라미터 통합 감지
              // 각 카드사/은행마다 파라미터 명칭이 다르므로 주요 키워드를 모두 체크합니다.
              const getPayKey = (targetUrl: string) => {
                const params = [
                  "reCommConId=", // 일반 신용카드/ISP
                  "tx_key=", // 카카오페이 등 간편결제
                  "pg_token=", // 카카오페이 토큰
                  "payKey=", // 기타 결제
                  "r_conid=", // 일부 은행/계좌이체
                ];

                for (const p of params) {
                  if (targetUrl.includes(p)) {
                    return targetUrl.split(p)[1]?.split("&")[0];
                  }
                }
                return null;
              };

              const payKey = getPayKey(url);

              // 💡 특정 결과 처리 페이지(rs_o2, result, success 등)에 접근하면서 키가 존재하는 경우
              if (
                payKey &&
                (url.includes("rs_o2") ||
                  url.includes("result") ||
                  url.includes("reCommConId"))
              ) {
                console.log(
                  "[KSPay] 결제 인증 키 추출 성공! 앱으로 복귀:",
                  payKey,
                );
                handleInternalClose(true, payKey);
                return false; // 하얀 창(결제 완료 웹페이지)이 뜨기 전에 차단
              }

              // 3. 결제 시작 후 초기화 루프 방지
              if (isPayStarted && url.includes("sapp.jsp")) {
                return false;
              }

              return true;
            }}
            onLoadEnd={(e) => {
              if (e.nativeEvent.url.includes("sapp.jsp") && !isPayStarted) {
                setLoading(false);
                console.log("[KSPay] 결제 스크립트 주입");
                webViewRef.current?.injectJavaScript(`
                  (function() {
                    if (typeof requestPay === 'function') {
                      requestPay({
                        callbackfunction: 'window.kspayCallback',
                        mid: '${paymentData.storeId || "2999199999"}',
                        paymethod: 'card',
                        ordernumb: 'ORD_${Date.now()}',
                        productname: '${paymentData.packageName}',
                        username: '${paymentData.userName}',
                        userphonenumb: '${paymentData.userPhone}',
                        payamount: ${paymentData.amount}
                      });
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STARTED' }));
                    }
                  })();
                  true;
                `);
              }
            }}
            injectedJavaScript={`
              window.kspayCallback = function(data) {
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
              };
              true;
            `}
            onMessage={(event) => {
              try {
                const res = JSON.parse(event.nativeEvent.data);
                if (res.type === "STARTED") {
                  setIsPayStarted(true);
                  return;
                }
                // successYn이 S이거나 INIT인 것은 무시 (로그에 찍히는 반복 신호)
                if (res.successYn === "S" || res.callbackReason === "INIT")
                  return;

                if (res.successYn === "Y" && res.payKey) {
                  handleInternalClose(true, res.payKey);
                } else if (
                  res.successYn === "N" ||
                  res.successYn === "cancel"
                ) {
                  handleInternalClose(false);
                }
              } catch (err) {}
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
    paddingTop: 50,
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
