import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

interface KSPayProps {
  isVisible: boolean;
  onClose: (success: boolean) => void;
  paymentData: any;
}

export default function KSPayService({
  isVisible,
  onClose,
  paymentData,
}: KSPayProps) {
  const webViewRef = useRef<WebView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPayStarted, setIsPayStarted] = useState(false);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isVisible) {
      setIsProcessing(false);
      setIsPayStarted(false);
    }
  }, [isVisible]);

  const approvePayment = async (payKey: string) => {
    console.log("[KSPay] 최종 승인 요청 시작. PayKey:", payKey);
    setIsProcessing(true); // 즉시 로딩 오버레이 활성화

    try {
      // 1. 서버 승인 요청 (타임아웃 15초 설정)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        "https://pgdev.ksnet.co.kr/store/KSPayMobileV1.4/web_host/recv_jpost.jsp",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `sndCommConId=${payKey}&sndAmount=${paymentData.amount}&sndActionType=1&sndCharSet=UTF-8`,
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      const responseData = await response.text();
      console.log("[KSPay] 서버 승인 응답:", responseData);

      if (response.ok) {
        const expiryDate = new Date();
        expiryDate.setDate(
          expiryDate.getDate() + (paymentData.durationInDays || 30),
        );

        console.log("[KSPay] DB 저장 중...");
        const { error: dbError } = await supabase.from("user_packages").insert([
          {
            user_id: paymentData.userId,
            package_id: paymentData.packageId,
            package_name: paymentData.packageName,
            total_sessions: paymentData.totalSessions,
            remaining_sessions: paymentData.totalSessions,
            expiry_date: expiryDate.toISOString(),
            branch_id: paymentData.branchId,
            child_id: paymentData.childId,
            child_name: paymentData.childName,
            price: paymentData.amount,
            status: "active",
          },
        ]);

        if (dbError) throw dbError;

        console.log("[KSPay] 완료. onClose(true) 호출");
        onClose(true);
      } else {
        throw new Error("서버 응답이 올바르지 않습니다.");
      }
    } catch (e: any) {
      console.error("[KSPay] 에러 발생:", e.message);
      Alert.alert(
        "결제 오류",
        "승인 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
      );
      onClose(false);
    }
  };

  const processIntentUrl = (url: string) => {
    if (Platform.OS === "android" && url.startsWith("intent://")) {
      const parts = url.split("#Intent;");
      const schemePart = parts[1]
        ?.split(";")
        .find((s) => s.startsWith("scheme="));
      const packagePart = parts[1]
        ?.split(";")
        .find((s) => s.startsWith("package="));

      if (schemePart) {
        const scheme = schemePart.replace("scheme=", "");
        const finalUrl = url
          .replace("intent://", `${scheme}://`)
          .split("#Intent;")[0];

        Linking.canOpenURL(finalUrl).then((supported) => {
          if (supported) {
            Linking.openURL(finalUrl);
          } else if (packagePart) {
            const packageName = packagePart.replace("package=", "");
            Linking.openURL(`market://details?id=${packageName}`);
          }
        });
        return true;
      }
    }
    return false;
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onClose(false)}>
            <Ionicons name="close" size={28} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카드 결제</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={{ flex: 1 }}>
          {/* WebView 렌더링 */}
          <WebView
            ref={webViewRef}
            source={{
              uri: "https://pgdev.ksnet.co.kr/store/KSPayMobileV1.4/mall/app/sapp.jsp",
            }}
            onMessage={(event) => {
              try {
                const res = JSON.parse(event.nativeEvent.data);
                if (res.callbackReason === "INIT" || res.successYn === "S")
                  return;

                if (res.successYn === "Y" && res.payKey) {
                  approvePayment(res.payKey);
                } else if (res.successYn === "N") {
                  onClose(false);
                }
              } catch (err) {
                console.error(err);
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              if (
                !request.url.startsWith("http") &&
                !request.url.startsWith("about:blank")
              ) {
                processIntentUrl(request.url);
                return false;
              }
              return true;
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={["*"]}
            onLoadEnd={() => {
              if (!isPayStarted) {
                const jsCode = `
                  window.kspayCallback = function(data) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(data));
                  };
                  if (typeof requestPay === 'function') {
                    requestPay({
                      callbackfunction: 'window.kspayCallback',
                      mid: '2999199999',
                      paymethod: 'card',
                      ordernumb: 'ORD_${Date.now()}',
                      productname: '${paymentData.packageName}',
                      username: '${paymentData.userName}',
                      userphonenumb: '${paymentData.userPhone}',
                      payamount: ${paymentData.amount}
                    });
                  }
                `;
                webViewRef.current?.injectJavaScript(jsCode);
                setIsPayStarted(true);
              }
            }}
          />

          {/* 승인 프로세스 시작 시 전체 화면을 덮는 오버레이 */}
          {isProcessing && (
            <View style={styles.fullOverlay}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>결제 승인 완료 확인 중...</Text>
              <Text style={styles.subText}>
                화면을 닫지 말고 잠시만 기다려주세요.
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
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    zIndex: 9999,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  subText: { marginTop: 5, color: "#6B7280", fontSize: 13 },
});
