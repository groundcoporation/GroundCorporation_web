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

export default function PurchaseFailScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: "#FEF2F2" }]}>
          <Ionicons name="alert-circle" size={80} color="#EF4444" />
        </View>

        <Text style={styles.title}>결제에 실패했습니다.</Text>
        <Text style={styles.subtitle}>
          한도 초과, 네트워크 오류 또는 결제 취소 등{"\n"}
          예기치 못한 문제가 발생했습니다.
        </Text>

        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: "#F87171" }]}>
            지속적으로 실패할 경우 고객센터로 문의해주세요.
          </Text>
        </View>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: "#EF4444" }]}
          // 다시 결제 화면으로 돌아가 시도하게 합니다.
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>다시 시도하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.replace("Home")}
        >
          <Text style={styles.secondaryButtonText}>홈으로 이동</Text>
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
    backgroundColor: "#F9FAFB",
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
    backgroundColor: "#FFF5F5",
    padding: 15,
    borderRadius: 12,
    width: "100%",
  },
  infoText: { color: "#94A3B8", fontSize: 13, textAlign: "center" },
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