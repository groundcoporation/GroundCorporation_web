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

  useEffect(() => {
    if (!isVisible) {
      setIsProcessing(false);
      setIsPayStarted(false);
    }
  }, [isVisible]);

  const approvePayment = async (payKey: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(
        "https://pgdev.ksnet.co.kr/store/KSPayMobileV1.4/web_host/recv_jpost.jsp",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `sndCommConId=${payKey}&sndAmount=${paymentData.amount}&sndActionType=1&sndCharSet=UTF-8`,
        },
      );

      if (response.ok) {
        const expiryDate = new Date();
        expiryDate.setDate(
          expiryDate.getDate() + (paymentData.durationInDays || 30),
        );

        const { error: dbError } = await supabase.from("user_packages").insert([
          {
            user_id: paymentData.userId,
            package_id: paymentData.packageId,
            package_name: paymentData.packageName,
            total_count: paymentData.totalSessions, 
          // 🛠️ 수정: remaining_sessions -> remaining_count
            remaining_count: paymentData.totalSessions,
            expiry_date: expiryDate.toISOString(),
            branch_id: paymentData.branchId,
            child_id: paymentData.childId,
            child_name: paymentData.childName,
            price: paymentData.amount,
            status: "active",
          },
        ]);

        if (dbError) throw dbError;
        onClose(true);
      } else {
        throw new Error("승인 서버 오류");
      }
    } catch (e: any) {
      Alert.alert("결제 오류", e.message);
      onClose(false);
    }
  };

  const processExternalLink = (url: string) => {
    if (!url.startsWith("http") && !url.startsWith("about:blank")) {
      console.log("[KSPay] 외부 앱 스키마 가로채기:", url);

      // 안드로이드 Intent 스키마 처리
      if (Platform.OS === "android" && url.startsWith("intent:")) {
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
            .replace(
              /intent:\/\/[^#]*/,
              `${scheme}://` + url.split("://")[1].split("#")[0],
            )
            .split("#Intent;")[0];

          Linking.canOpenURL(finalUrl)
            .then((supported) => {
              if (supported) {
                Linking.openURL(finalUrl);
              } else if (packagePart) {
                const packageName = packagePart.replace("package=", "");
                Linking.openURL(`market://details?id=${packageName}`);
              }
            })
            .catch(() => {});
          return true;
        }
      }

      // 일반 앱 스키마 처리
      Linking.openURL(url).catch(() => {
        Alert.alert("알림", "결제 앱을 실행할 수 없습니다.");
      });
      return true;
    }
    return false;
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onClose(false)}>
            <Ionicons name="close" size={28} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카드 결제</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={{ flex: 1 }}>
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
                console.error("데이터 파싱 에러:", err);
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              const handled = processExternalLink(request.url);
              return !handled;
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={["*"]}
            // 에러가 발생했던 속성을 제거하거나 올바른 명칭으로 수정
            // 최신 버전에서는 아래 속성 없이도 동작합니다.
            mixedContentMode="always"
          />

          {isProcessing && (
            <View style={styles.fullOverlay}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>결제 승인 처리 중...</Text>
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
});
