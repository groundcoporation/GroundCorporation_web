import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext"; // 🚀 지점/권한 관리를 위한 Context

export default function ManageSpotsScreen({ navigation }: any) {
  const { branchId, role, setBranch } = useAuth(); // 🚀 현재 지점과 권한 가져오기
  const insets = useSafeAreaInsets();
  const [spots, setSpots] = useState<any[]>([]);
  const [newSpotName, setNewSpotName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const isDeveloper = role === "admin" || userRole === "admin";

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) setUserRole(profile.role);
    };
    init();
  }, []);

  // 🚀 지점이 바뀔 때마다 해당 지점의 픽업지 불러오기
  useEffect(() => {
    if (branchId) fetchSpots(branchId);
  }, [branchId]);

  const fetchSpots = async (bId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pickup_spots")
      .select("*")
      .eq("branch_id", bId)
      .order("created_at", { ascending: false });

    if (!error) setSpots(data || []);
    setLoading(false);
  };

  const handleAddSpot = async () => {
    if (!newSpotName.trim() || !branchId) return;

    const { error } = await supabase.from("pickup_spots").insert({
      name: newSpotName,
      branch_id: branchId,
    });

    if (error) {
      Alert.alert("에러", "등록에 실패했습니다.");
    } else {
      setNewSpotName("");
      fetchSpots(branchId);
    }
  };

  const handleDeleteSpot = async (id: string) => {
    Alert.alert("삭제", "정말 삭제하시겠습니까?", [
      { text: "취소" },
      {
        text: "삭제",
        onPress: async () => {
          await supabase.from("pickup_spots").delete().eq("id", id);
          if (branchId) fetchSpots(branchId);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🚀 헤더: 관리자는 지점 스왑, 코치는 현재 지점 표시 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>픽업지 관리</Text>

        {isDeveloper ? (
          <TouchableOpacity
            style={styles.branchSwitcher}
            onPress={() =>
              setBranch(branchId === "branch_1" ? "branch_2" : "branch_1")
            }
          >
            <Text style={styles.branchText}>
              {branchId === "branch_1" ? "시흥본점" : "영종도점"}
            </Text>
            <Ionicons
              name="swap-horizontal"
              size={16}
              color="#6366F1"
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.branchBadge}>
            <Text style={styles.branchText}>
              {branchId === "branch_1" ? "시흥본점" : "영종도점"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="새 픽업지(정류장) 이름"
          value={newSpotName}
          onChangeText={setNewSpotName}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddSpot}>
          <Text style={styles.addBtnText}>등록</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={spots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <View style={styles.spotItem}>
              <Text style={styles.spotName}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteSpot(item.id)}>
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    padding: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "bold" },
  branchSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    padding: 8,
    borderRadius: 12,
  },
  branchBadge: { backgroundColor: "#F1F5F9", padding: 8, borderRadius: 12 },
  branchText: { fontSize: 13, fontWeight: "800", color: "#6366F1" },
  inputSection: { flexDirection: "row", padding: 20, gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
  },
  addButton: { backgroundColor: "#6366F1", padding: 12, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "bold" },
  spotItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  spotName: { fontSize: 16 },
});
