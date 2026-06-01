import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function AdminMemberDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { userId } = route.params;
  const [activeTab, setActiveTab] = useState("package");
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [liveClassList, setLiveClassList] = useState<string[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<any[]>([]);

  // 🚀 날짜 수정을 위한 상태 추가
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState<"created_at" | "expiry_date">(
    "created_at",
  );
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    fetchMemberDetail();
    fetchReservations();
    fetchLiveClasses();
  }, [userId]);

  const fetchLiveClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("class_schedules")
        .select("target_class");
      if (error) throw error;
      const uniqueClasses = Array.from(
        new Set(data.map((item) => item.target_class)),
      ).filter((c) => c);
      setLiveClassList(uniqueClasses as string[]);
    } catch (e: any) {
      console.error("수업 목록 로드 실패:", e.message);
    }
  };

  const fetchMemberDetail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id, name, phone, role, target_class, branch_id,
          children!fk_children_parent (id, child_name, target_class),
          user_packages!fk_user_packages_user (id, package_name, remaining_count, total_count, created_at, expiry_date)
        `,
        )
        .eq("id", userId)
        .single();
      if (error) throw error;
      setMember(data);
    } catch (e: any) {
      Alert.alert("오류", "회원 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select(
          `
          *,
          class_schedules ( target_class, start_time, end_time ),
          branches ( name )
        `,
        )
        .eq("user_id", userId)
        .order("class_date", { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (e: any) {
      console.error("예약 로드 실패");
    }
  };

  const openPackageModal = async () => {
    try {
      const { data, error } = await supabase.from("package_options").select(`
          id, label, total_count, price,
          packages!fk_package_option_parent ( id, name )
        `);
      if (error) throw error;
      setAvailableOptions(data || []);
      setModalVisible(true);
    } catch (e: any) {
      Alert.alert("오류", "수강권 목록 로드 실패");
    }
  };

  const handleGrantPackage = async (option: any) => {
    try {
      const fullPackageName = `${option.packages?.name || "수강권"} - ${option.label}`;
      const { error } = await supabase.from("user_packages").insert({
        user_id: userId,
        package_id: option.packages?.id,
        option_id: option.id,
        package_name: fullPackageName,
        total_count: option.total_count || 0,
        remaining_count: option.total_count || 0,
        status: "active",
        branch_id: member.branch_id,
        expiry_date: dayjs().endOf("month").format("YYYY-MM-DD"),
      });
      if (error) throw error;
      Alert.alert("완료", "수강권이 부여되었습니다.");
      setModalVisible(false);
      fetchMemberDetail();
    } catch (e: any) {
      Alert.alert("부여 실패", e.message);
    }
  };

  // 🚀 이용권 횟수 업데이트 핸들러
  const handleUpdateRemainingCount = async (
    packageId: string,
    currentCount: number,
    delta: number,
  ) => {
    const newCount = currentCount + delta;
    if (newCount < 0) {
      Alert.alert("알림", "0회 미만으로 감소시킬 수 없습니다.");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_packages")
        .update({ remaining_count: newCount })
        .eq("id", packageId);

      if (error) throw error;

      // UI 즉시 반영을 위해 로컬 상태 업데이트
      setMember((prev: any) => ({
        ...prev,
        user_packages: prev.user_packages.map((pkg: any) =>
          pkg.id === packageId ? { ...pkg, remaining_count: newCount } : pkg,
        ),
      }));
    } catch (e: any) {
      Alert.alert("오류", "횟수 수정에 실패했습니다.");
    }
  };

  // 🚀 이용권 삭제 핸들러
  const handleDeletePackage = async (
    packageId: string,
    packageName: string,
  ) => {
    Alert.alert(
      "이용권 삭제",
      `[${packageName}]을(를) 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("user_packages")
                .delete()
                .eq("id", packageId);

              if (error) throw error;

              // UI 즉시 반영을 위해 로컬 상태 업데이트
              setMember((prev: any) => ({
                ...prev,
                user_packages: prev.user_packages.filter(
                  (pkg: any) => pkg.id !== packageId,
                ),
              }));
              Alert.alert("성공", "이용권이 삭제되었습니다.");
            } catch (e: any) {
              Alert.alert("오류", "이용권 삭제에 실패했습니다.");
            }
          },
        },
      ],
    );
  };

  // 🚀 이용권 날짜 업데이트 핸들러
  const handleUpdateDate = async (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (event.type === "set" && selectedDate && selectedPkgId) {
      try {
        const formattedDate = dayjs(selectedDate).toISOString();
        const updatePayload = { [dateType]: formattedDate };

        const { error } = await supabase
          .from("user_packages")
          .update(updatePayload)
          .eq("id", selectedPkgId);

        if (error) throw error;

        // UI 즉시 반영을 위해 로컬 상태 업데이트
        setMember((prev: any) => ({
          ...prev,
          user_packages: prev.user_packages.map((pkg: any) =>
            pkg.id === selectedPkgId ? { ...pkg, ...updatePayload } : pkg,
          ),
        }));

        Alert.alert("성공", "날짜가 정상적으로 수정되었습니다.");
      } catch (e: any) {
        console.error("날짜 수정 에러:", e.message);
        Alert.alert("오류", "날짜 수정에 실패했습니다.");
      }
    }
  };

  const saveAllInfo = async () => {
    try {
      await supabase
        .from("users")
        .update({
          name: member.name,
          phone: member.phone,
          target_class: member.target_class,
        })
        .eq("id", userId);
      if (member.children && member.children.length > 0) {
        for (const child of member.children) {
          await supabase
            .from("children")
            .update({ target_class: child.target_class })
            .eq("id", child.id);
        }
      }
      Alert.alert("성공", "정보가 저장되었습니다.");
      fetchMemberDetail();
    } catch (e: any) {
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  if (loading || !member)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 디자인 개선 (상단 겹침 방지) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원 정보 관리</Text>
        <TouchableOpacity onPress={saveAllInfo} style={styles.saveBtn}>
          <Text style={styles.saveText}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{member.name?.[0]}</Text>
          </View>
          <Text style={styles.profileName}>
            {member.name} {member.role === "admin" ? "관리자" : "회원"}
          </Text>
          <Text style={styles.profileSub}>{member.phone}</Text>
        </View>

        <View style={styles.tabContainer}>
          {[
            { id: "package", label: "수강권" },
            { id: "log", label: "예약내역" },
            { id: "info", label: "정보수정" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                activeTab === tab.id && styles.activeTabItem,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contentSection}>
          {activeTab === "package" && (
            <View>
              {member.user_packages.length === 0 ? (
                <Text style={styles.emptyText}>
                  보유 중인 수강권이 없습니다.
                </Text>
              ) : (
                member.user_packages.map((pkg: any) => (
                  <View key={pkg.id} style={styles.packageCard}>
                    <View style={{ marginBottom: 12 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={styles.packageName}>
                          {pkg.package_name}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            handleDeletePackage(pkg.id, pkg.package_name)
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flexWrap: "wrap",
                          marginTop: 4,
                        }}
                      >
                        {/* 시작 날짜(구매일) 수정 버튼 */}
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedPkgId(pkg.id);
                            setDateType("created_at");
                            setTempDate(new Date(pkg.created_at));
                            setShowDatePicker(true);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginRight: 10,
                          }}
                        >
                          <Text
                            style={[styles.packageDateText, { marginTop: 0 }]}
                          >
                            구매일: {dayjs(pkg.created_at).format("YYYY.MM.DD")}
                          </Text>
                          <Ionicons
                            name="create-outline"
                            size={12}
                            color="#6366F1"
                            style={{ marginLeft: 4 }}
                          />
                        </TouchableOpacity>

                        <Text
                          style={[
                            styles.packageDateText,
                            { marginTop: 0, marginRight: 10 },
                          ]}
                        >
                          |
                        </Text>

                        {/* 마감일 수정 버튼 */}
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedPkgId(pkg.id);
                            setDateType("expiry_date");
                            setTempDate(
                              pkg.expiry_date
                                ? new Date(pkg.expiry_date)
                                : new Date(),
                            );
                            setShowDatePicker(true);
                          }}
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Text
                            style={[styles.packageDateText, { marginTop: 0 }]}
                          >
                            마감일:{" "}
                            {pkg.expiry_date
                              ? dayjs(pkg.expiry_date).format("YYYY.MM.DD")
                              : "기한없음"}
                          </Text>
                          <Ionicons
                            name="create-outline"
                            size={12}
                            color="#6366F1"
                            style={{ marginLeft: 4 }}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.countControlRow}>
                      <Text style={styles.countNum}>
                        {pkg.remaining_count}{" "}
                        <Text style={{ fontSize: 14, color: "#94A3B8" }}>
                          / {pkg.total_count}회
                        </Text>
                      </Text>
                      <View style={styles.countBtns}>
                        <TouchableOpacity
                          onPress={() =>
                            handleUpdateRemainingCount(
                              pkg.id,
                              pkg.remaining_count,
                              -1,
                            )
                          }
                          style={styles.minusBtn}
                        >
                          <Ionicons name="remove" size={20} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            handleUpdateRemainingCount(
                              pkg.id,
                              pkg.remaining_count,
                              1,
                            )
                          }
                          style={styles.plusBtn}
                        >
                          <Ionicons name="add" size={20} color="#6366F1" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={openPackageModal}
              >
                <Text style={styles.addBtnText}>+ 신규 수강권 부여</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 💡 예약내역 탭 - 스케줄 페이지 데이터 실시간 연동 */}
          {activeTab === "log" && (
            <View>
              {reservations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>예약 내역이 없습니다.</Text>
                </View>
              ) : (
                reservations.map((item) => {
                  // 1. 예약 상태 정의 (status)
                  const resStatusLabel =
                    item.status === "cancel_requested"
                      ? "취소대기"
                      : item.status === "canceled"
                        ? "취소확정"
                        : "예약확정";
                  const resStatusColor =
                    item.status === "cancel_requested"
                      ? "#F59E0B"
                      : item.status === "canceled"
                        ? "#EF4444"
                        : "#10B981";

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.logCard,
                        item.attendance_status === "등원" && {
                          borderLeftColor: "#6366F1",
                          borderLeftWidth: 5,
                        },
                        item.attendance_status === "결석" && {
                          borderLeftColor: "#EF4444",
                          borderLeftWidth: 5,
                        },
                      ]}
                    >
                      <View style={styles.logInfo}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          <Text style={styles.logDate}>{item.class_date}</Text>
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: resStatusColor },
                            ]}
                          >
                            {resStatusLabel}
                          </Text>
                        </View>

                        <Text style={styles.logClass}>
                          {item.class_schedules?.target_class || "수업"} |{" "}
                          {item.class_schedules?.start_time?.slice(0, 5)}
                        </Text>
                        <Text style={styles.logChild}>
                          대상: {item.child_name || "본인"}
                        </Text>
                        <Text style={styles.logBranch}>
                          {item.branches?.name || "시흥본점"}
                        </Text>

                        {/* 🚀 출결 상태가 있을 때만 하단에 별도 표시 */}
                        {item.attendance_status &&
                          item.attendance_status !== "확인전" && (
                            <View
                              style={{
                                marginTop: 12,
                                paddingVertical: 8,
                                borderTopWidth: 1,
                                borderTopColor: "#F1F5F9",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: "#6366F1",
                                  fontWeight: "800",
                                }}
                              >
                                📍 출결 현황: {item.attendance_status}
                              </Text>
                            </View>
                          )}
                        {(item.status === "makeup" ||
                          item.attendance_status === "보강") && (
                          <View style={styles.makeupTag}>
                            <Text style={styles.makeupTagText}>보강</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeTab === "info" && (
            <View style={styles.infoForm}>
              <Text style={styles.inputLabel}>회원 연락처</Text>
              <TextInput
                style={styles.input}
                value={member.phone}
                onChangeText={(t) => setMember({ ...member, phone: t })}
                keyboardType="phone-pad"
              />
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>수업반 배정 관리</Text>
              {member.children && member.children.length > 0 ? (
                member.children.map((child: any, idx: number) => (
                  <View key={child.id} style={styles.childSelectBox}>
                    <Text style={styles.childLabel}>
                      {child.child_name} 학생
                    </Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={child.target_class}
                        onValueChange={(val: string) => {
                          const newChildren = [...member.children];
                          newChildren[idx].target_class = val;
                          setMember({ ...member, children: newChildren });
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="수업반 선택" value="" />
                        {liveClassList.map((cls) => (
                          <Picker.Item key={cls} label={cls} value={cls} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.childSelectBox}>
                  <Text style={styles.childLabel}>{member.name} (본인)</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={member.target_class}
                      onValueChange={(val: string) =>
                        setMember({ ...member, target_class: val })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="수업반 선택" value="" />
                      {liveClassList.map((cls) => (
                        <Picker.Item key={cls} label={cls} value={cls} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 수강권 부여 모달 */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>부여할 수강권 선택</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {availableOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.optionItem}
                  onPress={() => handleGrantPackage(opt)}
                >
                  <View>
                    <Text style={styles.optParent}>{opt.packages?.name}</Text>
                    <Text style={styles.optLabel}>
                      {opt.label} ({opt.total_count}회)
                    </Text>
                  </View>
                  <Text style={styles.optPrice}>
                    {opt.price?.toLocaleString()}원
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 날짜 선택 휠 (iOS/Android) */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleUpdateDate}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  saveText: { color: "#6366F1", fontWeight: "800", fontSize: 16 },
  backBtn: { padding: 5 },
  saveBtn: { padding: 5 },

  profileSection: {
    paddingVertical: 30,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#6366F1" },
  profileName: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  profileSub: { fontSize: 14, color: "#94A3B8", marginTop: 4 },

  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabItem: { flex: 1, paddingVertical: 15, alignItems: "center" },
  activeTabItem: { borderBottomWidth: 3, borderBottomColor: "#6366F1" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#94A3B8" },
  activeTabText: { color: "#6366F1", fontWeight: "800" },

  contentSection: { padding: 20, backgroundColor: "#F8FAFC", flex: 1 },
  packageCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  packageName: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  packageDateText: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  countControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countBtns: { flexDirection: "row", gap: 10 },
  minusBtn: { backgroundColor: "#F1F5F9", padding: 8, borderRadius: 10 },
  plusBtn: { backgroundColor: "#EEF2FF", padding: 8, borderRadius: 10 },
  countNum: { fontSize: 26, fontWeight: "900", color: "#1E293B" },
  addBtn: {
    backgroundColor: "#6366F1",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  addBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },

  logCard: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  logInfo: { flex: 1 },
  logDate: { fontSize: 12, color: "#94A3B8", fontWeight: "700" },
  logClass: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 4,
  },
  logChild: { fontSize: 13, color: "#6366F1", fontWeight: "700" },
  logBranch: { fontSize: 11, color: "#94A3B8", marginTop: 2 },

  logStatusSide: { alignItems: "flex-end" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: "800" },
  bgIn: { backgroundColor: "#EEF2FF" },
  textIn: { color: "#6366F1" },
  bgAbsent: { backgroundColor: "#FEF2F2" },
  textAbsent: { color: "#EF4444" },
  bgYet: { backgroundColor: "#F1F5F9" },
  textYet: { color: "#94A3B8" },
  makeupTag: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 5,
  },
  makeupTagText: { color: "#FFF", fontSize: 10, fontWeight: "800" },

  infoForm: { backgroundColor: "#FFF", padding: 20, borderRadius: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 10,
    color: "#1E293B",
  },
  divider: { height: 25 },
  childSelectBox: { marginBottom: 20 },
  childLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  picker: { height: 50, width: "100%" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  optParent: { fontSize: 11, color: "#6366F1", fontWeight: "700" },
  optLabel: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  optPrice: { fontSize: 15, fontWeight: "800", color: "#10B981" },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
});
