import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
// 경고 제거 및 일관성을 위해 react-native-safe-area-context 사용
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ReservationFailScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      {/* 1. 실패 메시지 영역 */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          {/* 예약 실패를 의미하는 경고/닫기 아이콘으로 변경 */}
          <Ionicons name="close-circle-outline" size={80} color="#EF4444" />
        </View>

        <Text style={styles.title}>예약에 실패했습니다</Text>
        <Text style={styles.subtitle}>
          선택하신 수업의 정원이 방금 마감되었거나,{"\n"}
          이용권 잔여 횟수가 부족할 수 있습니다.
        </Text>

        <View style={styles.errorDetailBox}>
          <Text style={styles.errorDetailText}>
            이용권 현황을 확인하시거나{"\n"}
            다른 수업 시간을 선택해 주세요.
          </Text>
        </View>
      </View>

      {/* 2. 하단 버튼 영역 */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.retryButton}
          // 이전 화면(수업 선택 화면)으로 돌아가서 다시 선택하게 합니다.
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>다른 수업 선택하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          // 메인으로 돌아가서 상황을 재확인하도록 합니다.
          onPress={() => navigation.replace("Home")}
        >
          <Text style={styles.homeButtonText}>확인 후 홈으로 이동</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
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
    backgroundColor: "#FEF2F2",
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
  errorDetailBox: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 12,
    width: "100%",
  },
  errorDetailText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  buttonGroup: {
    padding: 20,
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 8 : 10,
  },
  retryButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  homeButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  homeButtonText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "700",
  },
});