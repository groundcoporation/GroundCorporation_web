import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { supabase } from "../../lib/supabase";

export default function PickupApplyScreen({ navigation }: any) {
  // 💡 [추가] 다자녀 관리를 위한 자녀 상태
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const [area, setArea] = useState("");
  const [detailLocation, setDetailLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 [추가] 현재 부모님의 지점 아이디 저장 상태
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  // 💡 정류장 목록 DB 연동 (코치들이 만든 공식 정류장만 들어옴)
  const [spots, setSpots] = useState<any[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<any>(null); // 선택된 정류장 객체 {id, name}
  const [showSpotDropdown, setShowSpotDropdown] = useState(false);

  // 💡 탑승지 변경 감지를 위한 기존 ID 저장 상태
  const [originalSpotId, setOriginalSpotId] = useState<string | null>(null);

  // 💡 컴포넌트가 켜질 때 내 자녀 목록과 공식 정류장 목록을 가져옵니다.
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingSpots(true);

      // 1. 현재 접속한 부모님 정보 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 🚀 1-1. 부모님의 지점 정보(branch_id) 가져오기
      const { data: profile } = await supabase
        .from("users")
        .select("branch_id")
        .eq("id", user.id)
        .single();
      
      if (profile?.branch_id) {
        setUserBranchId(profile.branch_id);
      }

      // 2. 내 자녀 목록 가져오기
      const { data: kidsData } = await supabase
        .from("children")
        .select("id, child_name")
        .eq("parent_id", user.id);

      if (kidsData && kidsData.length > 0) {
        setChildrenList(kidsData);
        setSelectedChildId(kidsData[0].id); // 기본으로 첫째 선택
      }

      // 3. 공식 정류장 목록 가져오기 (코치 지정)
      // 🚀 내 지점의 정류장만 가져오도록 쿼리 수정
      let spotQuery = supabase.from("pickup_spots").select("id, name");
      if (profile?.branch_id) {
        spotQuery = spotQuery.eq("branch_id", profile.branch_id);
      }
      
      const { data: spotData, error: spotError } = await spotQuery;

      if (!spotError && spotData) {
        setSpots(spotData);
      }

      setLoadingSpots(false);
    };

    fetchInitialData();
  }, []);

  // 💡 [추가] 선택된 자녀가 바뀔 때마다, 그 아이의 픽업 정보를 불러옵니다.
  useEffect(() => {
    if (!selectedChildId || spots.length === 0) return;

    const fetchChildPickupSettings = async () => {
      // 자녀 바뀔 때 폼 초기화
      setArea("");
      setDetailLocation("");
      setSelectedSpot(null);
      setOriginalSpotId(null);

      const { data: existingData } = await supabase
        .from("pickup_settings")
        .select("*")
        .eq("child_id", selectedChildId)
        .single();

      if (existingData) {
        setArea(existingData.area);
        setDetailLocation(existingData.detail_location);
        setOriginalSpotId(existingData.pickup_spot_id);

        // spots 배열에서 id가 일치하는 정류장 찾아서 매칭
        const matchedSpot = spots.find(
          (s) => s.id === existingData.pickup_spot_id,
        );
        if (matchedSpot) {
          setSelectedSpot(matchedSpot);
        } else {
          // 혹시 정류장이 삭제되었을 경우를 대비한 폴백
          setSelectedSpot({
            id: existingData.pickup_spot_id,
            name: existingData.apartment,
          });
        }
      }
    };

    fetchChildPickupSettings();
  }, [selectedChildId, spots]);

  // 💡 저장 실행 함수
  const executeSave = async () => {
    if (!selectedChildId) {
      Alert.alert("에러", "자녀 정보가 없습니다.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.from("pickup_settings").upsert({
        child_id: selectedChildId, // 🚀 하드코딩 제거! 실제 선택된 자녀 ID 꽂기
        branch_id: userBranchId, // 🚀 [추가] 부모님의 지점 ID 자동 저장
        area: area,
        pickup_spot_id: selectedSpot.id,
        apartment: selectedSpot.name, // 💡 DB의 공식 정류장 이름 저장
        detail_location: detailLocation,
        is_active: true,
        updated_at: dayjs().tz().format("YYYY-MM-DDTHH:mm:ssZ"), // 명시적으로 KST 오프셋 포함
      });

      if (error) throw error;

      Alert.alert("저장 완료", "픽업 정보가 안전하게 변경되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error("저장 실패:", error.message);
      Alert.alert("에러", "정보 저장 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    // 💡 유효성 검사 빡세게 강제! (공식 정류장 선택 안 하면 못 넘어감)
    if (!area || !selectedSpot || !detailLocation) {
      Alert.alert(
        "알림",
        "공식 정류장과 상세 위치를 모두 입력해야 기사님이 찾으실 수 있어요!",
      );
      return;
    }

    // 🚀 지점 정보 없을 시 방어 로직 추가
    if (!userBranchId) {
      Alert.alert("알림", "소속 지점 정보가 없습니다. 다시 로그인해 주세요.");
      return;
    }

    // 💡 기존에 등록된 정류장이 있고, 새로 선택한 정류장이 다를 경우 팝업 노출
    if (originalSpotId && originalSpotId !== selectedSpot.id) {
      Alert.alert(
        "탑승지 변경 알림",
        "갑작스러운 승하차 위치 변경은 배차 동선에 지장을 줄 수 있습니다. 정말 변경하시겠습니까?",
        [
          { text: "취소", style: "cancel" },
          { text: "변경 동의", onPress: () => executeSave() },
        ],
      );
    } else {
      executeSave();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>픽업 정보 설정</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 🚀 [추가] 다자녀 선택 탭 */}
          {childrenList.length > 0 && (
            <View style={styles.childSelectSection}>
              <Text style={styles.label}>누구의 픽업 장소인가요?</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.childChipScroll}
              >
                {childrenList.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[
                      styles.childChip,
                      selectedChildId === child.id && styles.activeChildChip,
                    ]}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <Text
                      style={[
                        styles.childChipText,
                        selectedChildId === child.id &&
                          styles.activeChildChipText,
                      ]}
                    >
                      {child.child_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.topInfo}>
            <Text style={styles.topInfoTitle}>📍 어디서 탑승하나요?</Text>
            <Text style={styles.topInfoSub}>
              공식 셔틀 정류장을 선택하고 상세 위치를 적어주세요.
            </Text>
          </View>

          {/* 지역 선택 */}
          <View style={styles.section}>
            <Text style={styles.label}>지역 선택</Text>
            <View style={styles.chipGroup}>
              {["배곧동", "정왕동", "월곶동", "기타"].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, area === item && styles.activeChip]}
                  onPress={() => setArea(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      area === item && styles.activeChipText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 💡 공식 정류장 드롭다운 선택 (텍스트 입력 불가, 무조건 선택) */}
          <View style={styles.section}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={[styles.label, { marginBottom: 0 }]}>
                공식 셔틀 정류장 선택{" "}
              </Text>
              <Text style={styles.requiredBadge}>필수</Text>
            </View>

            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() => setShowSpotDropdown(!showSpotDropdown)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="business-outline"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    !selectedSpot && { color: "#94A3B8" },
                  ]}
                >
                  {loadingSpots
                    ? "정류장 목록 불러오는 중..."
                    : selectedSpot
                      ? selectedSpot.name
                      : "목록에서 공식 정류장을 선택해주세요"}
                </Text>
              </View>
              <Ionicons
                name={showSpotDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>

            {/* 드롭다운 리스트 */}
            {showSpotDropdown && (
              <View style={styles.dropdownListContainer}>
                {spots.length === 0 && !loadingSpots ? (
                  <Text style={styles.dropdownEmptyText}>
                    등록된 공식 정류장이 없습니다.
                  </Text>
                ) : (
                  spots.map((spot) => (
                    <TouchableOpacity
                      key={spot.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedSpot(spot);
                        setShowSpotDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{spot.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          {/* 상세 위치 입력 (주관식) */}
          <View style={styles.section}>
            <Text style={styles.label}>상세 탑승 위치 (직접 입력)</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="location-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="예: 101동 필로티 벤치 앞"
                value={detailLocation}
                onChangeText={setDetailLocation}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        </ScrollView>

        {/* 하단 저장 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!area || !selectedSpot || !detailLocation) && styles.disabledBtn,
            ]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>픽업 정보 저장하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 24 },

  // 🚀 다자녀 선택 탭 스타일
  childSelectSection: {
    marginBottom: 25,
    paddingBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  childChipScroll: { flexDirection: "row" },
  childChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeChildChip: { backgroundColor: "#1E293B", borderColor: "#1E293B" },
  childChipText: { fontSize: 15, color: "#64748B", fontWeight: "800" },
  activeChildChipText: { color: "#FFFFFF" },

  topInfo: { marginBottom: 30 },
  topInfoTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  topInfoSub: { fontSize: 15, color: "#64748B", lineHeight: 22 },
  section: { marginBottom: 32 },
  label: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
  },
  requiredBadge: {
    backgroundColor: "#FEF2F2",
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },

  chipGroup: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    marginRight: 10,
    marginBottom: 10,
  },
  activeChip: { backgroundColor: "#6366F1" },
  chipText: { fontSize: 14, color: "#64748B", fontWeight: "700" },
  activeChipText: { color: "#FFFFFF" },

  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownText: { fontSize: 15, color: "#1E293B", fontWeight: "600", flex: 1 },
  dropdownListContainer: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemText: { fontSize: 15, color: "#1E293B", fontWeight: "500" },
  dropdownEmptyText: { padding: 16, color: "#94A3B8", textAlign: "center" },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "600",
  },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  saveBtn: {
    backgroundColor: "#6366F1",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  disabledBtn: { backgroundColor: "#CBD5E1" },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});