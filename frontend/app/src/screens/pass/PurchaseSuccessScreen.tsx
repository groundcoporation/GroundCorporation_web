import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PurchaseSuccessScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          {/* 결제 성공을 의미하는 카드/체크 아이콘 */}
          <Ionicons name="card" size={80} color="#4F46E5" />
        </View>

        <Text style={styles.title}>결제가 완료되었습니다! 🎉</Text>
        <Text style={styles.subtitle}>
          이용권 구매가 정상적으로 처리되었습니다.{"\n"}
          지금 바로 아이의 수업 스케줄을 예약해보세요!
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            구매하신 이용권 내역 및 잔여 횟수는{"\n"}
            마이페이지에서 상시 확인 가능합니다.
          </Text>
        </View>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.primaryButton}
          // 결제 후 바로 예약을 유도하여 이탈률을 줄입니다.
          onPress={() => navigation.navigate("Reservation")}
        >
          <Text style={styles.primaryButtonText}>바로 수업 예약하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.replace("Home")}
        >
          <Text style={styles.secondaryButtonText}>확인 후 홈으로 이동</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 15,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  infoBox: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 12,
    width: "100%",
  },
  infoText: { color: "#94A3B8", fontSize: 13, textAlign: "center", lineHeight: 18 },
  buttonGroup: {
    padding: 20,
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 20 : 10,
  },
  primaryButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  secondaryButton: {
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
  },
  secondaryButtonText: { color: "#475569", fontSize: 15, fontWeight: "700" },
});