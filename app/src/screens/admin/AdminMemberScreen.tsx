import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 20;

const ROLE_FILTERS = [
  { label: "전체", value: "all" },
  { label: "회원", value: "user" },
  { label: "관리자", value: "admin" },
  { label: "코치", value: "coach" },
  { label: "기사", value: "driver" },
];

const sanitizeSearchTerm = (value: string) =>
  value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();

export default function AdminMemberScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name")
      .order("display_order", { ascending: true, nullsFirst: false });

    if (!error) setBranches(data || []);
  };

  const fetchMatchingChildParentIds = async (keyword: string) => {
    if (!keyword) return [];

    const { data, error } = await supabase
      .from("children")
      .select("parent_id")
      .or(`child_name.ilike.%${keyword}%,child_phone.ilike.%${keyword}%`)
      .limit(500);

    if (error || !data) return [];

    return Array.from(
      new Set(data.map((child: any) => child.parent_id).filter(Boolean)),
    );
  };

  const fetchMembers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const keyword = debouncedSearch.trim();
        const parentIds = await fetchMatchingChildParentIds(keyword);

        let query = supabase
          .from("users")
          .select(
            `
            id,
            username,
            email,
            name,
            phone,
            role,
            branch_id,
            target_class,
            branches (
              name
            ),
            children (
              id,
              child_name,
              target_class
            ),
            user_packages!fk_user_packages_user (
              id,
              package_name,
              remaining_count,
              total_count,
              status
            )
          `,
            { count: "exact" },
          );

        if (branchFilter !== "all") {
          query = query.eq("branch_id", branchFilter);
        }

        if (roleFilter !== "all") {
          query = query.eq("role", roleFilter);
        }

        if (keyword) {
          const searchFilters = [
            `name.ilike.%${keyword}%`,
            `phone.ilike.%${keyword}%`,
            `username.ilike.%${keyword}%`,
            `email.ilike.%${keyword}%`,
          ];

          if (parentIds.length > 0) {
            searchFilters.push(`id.in.(${parentIds.join(",")})`);
          }

          query = query.or(searchFilters.join(","));
        }

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error, count } = await query
          .order("name", { ascending: true, nullsFirst: false })
          .range(from, to);

        if (error) throw error;

        setMembers(data || []);
        setTotalCount(count || 0);
      } catch (e: any) {
        console.error("회원 목록 로드 오류:", e.message);
        Alert.alert("오류", "회원 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchFilter, debouncedSearch, page, roleFilter],
  );

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(sanitizeSearchTerm(searchQuery));
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateBranchFilter = (value: string) => {
    setBranchFilter(value);
    setPage(1);
  };

  const updateRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const renderFilterChip = (
    label: string,
    value: string,
    activeValue: string,
    onPress: (value: string) => void,
  ) => {
    const isActive = value === activeValue;

    return (
      <TouchableOpacity
        key={value}
        style={[styles.filterChip, isActive && styles.activeFilterChip]}
        onPress={() => onPress(value)}
      >
        <Text
          style={[
            styles.filterChipText,
            isActive && styles.activeFilterChipText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMember = ({ item: member }: any) => {
    const displayChildren =
      member.children && member.children.length > 0
        ? member.children
        : [
            {
              id: `self_${member.id}`,
              child_name: member.name,
              target_class: member.target_class,
              isAdult: true,
            },
          ];

    const activePackage =
      member.user_packages?.find((pkg: any) => pkg.status === "active") ||
      member.user_packages?.[0];

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() =>
          navigation.navigate("AdminMemberDetail", {
            userId: member.id,
          })
        }
      >
        <View style={styles.cardContent}>
          <View style={styles.leftInfo}>
            <View style={styles.parentRow}>
              <View style={styles.nameLine}>
                <Text style={styles.parentNameText}>
                  {member.name || "이름 없음"}
                </Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {member.role || "user"}
                  </Text>
                </View>
              </View>
              <Text style={styles.phoneText}>{member.phone || "연락처 없음"}</Text>
              <Text style={styles.branchText}>
                {member.branches?.name || member.branch_id || "지점 미지정"}
              </Text>
            </View>

            <View style={styles.childList}>
              {displayChildren.map((child: any) => (
                <View key={child.id} style={styles.childBriefCard}>
                  <View style={styles.childNameSection}>
                    <Text style={styles.childNameText}>
                      {child.child_name || "이름 없음"}
                      {child.isAdult ? " (본인)" : ""}
                    </Text>
                    <View style={styles.miniBadge}>
                      <Text style={styles.miniBadgeText}>
                        {child.target_class || "반 미배정"}
                      </Text>
                    </View>
                  </View>

                  {activePackage ? (
                    <View style={styles.miniPackageInfo}>
                      <Text style={styles.miniPackageName} numberOfLines={1}>
                        {activePackage.package_name || "수강권"}
                      </Text>
                      <Text style={styles.miniPackageCount}>
                        {activePackage.remaining_count}/
                        {activePackage.total_count}회
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noPackageMini}>수강권 없음</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <View>
      <View style={styles.listHeader}>
        <Text style={styles.listCount}>
          총 {totalCount.toLocaleString()}명
        </Text>
        <Text style={styles.pageText}>
          {page} / {totalPages} 페이지
        </Text>
      </View>
    </View>
  );

  const renderListFooter = () => (
    <View style={[styles.paginationBar, { marginBottom: insets.bottom + 20 }]}>
      <TouchableOpacity
        style={[styles.pageButton, page <= 1 && styles.disabledPageButton]}
        disabled={page <= 1}
        onPress={() => setPage((prev) => Math.max(1, prev - 1))}
      >
        <Ionicons name="chevron-back" size={18} color="#475569" />
        <Text style={styles.pageButtonText}>이전</Text>
      </TouchableOpacity>

      <Text style={styles.pageIndicator}>
        {page} / {totalPages}
      </Text>

      <TouchableOpacity
        style={[
          styles.pageButton,
          page >= totalPages && styles.disabledPageButton,
        ]}
        disabled={page >= totalPages}
        onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
      >
        <Text style={styles.pageButtonText}>다음</Text>
        <Ionicons name="chevron-forward" size={18} color="#475569" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원 및 수강권 관리</Text>
        <TouchableOpacity
          onPress={() => fetchMembers(true)}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh-outline" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="이름, 아이디, 전화번호, 자녀명 검색"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: "all", name: "전체 지점" }, ...branches]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) =>
            renderFilterChip(
              item.name,
              item.id,
              branchFilter,
              updateBranchFilter,
            )
          }
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ROLE_FILTERS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) =>
            renderFilterChip(
              item.label,
              item.value,
              roleFilter,
              updateRoleFilter,
            )
          }
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>회원 목록 로딩 중...</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => fetchMembers(true)}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  refreshBtn: { padding: 5 },

  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "500",
    color: "#1E293B",
  },
  filterRow: { paddingTop: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeFilterChip: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  activeFilterChipText: { color: "#4F46E5" },

  listContent: { padding: 20, flexGrow: 1 },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#94A3B8", fontWeight: "600" },
  emptyBox: { alignItems: "center", paddingVertical: 80 },
  emptyText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingLeft: 5,
  },
  listCount: { fontSize: 14, fontWeight: "800", color: "#334155" },
  pageText: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },

  memberCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  cardContent: { flexDirection: "row", alignItems: "center" },
  leftInfo: { flex: 1 },

  parentRow: { marginBottom: 12 },
  nameLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  parentNameText: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  roleBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  roleBadgeText: { color: "#4F46E5", fontSize: 10, fontWeight: "800" },
  phoneText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 3,
    fontWeight: "600",
  },
  branchText: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 2,
    fontWeight: "700",
  },

  childList: { marginTop: 4 },
  childBriefCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 14,
    marginBottom: 6,
  },
  childNameSection: { flex: 1, flexDirection: "row", alignItems: "center" },
  childNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginRight: 6,
  },
  miniBadge: {
    backgroundColor: "#FFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  miniBadgeText: { fontSize: 10, fontWeight: "700", color: "#64748B" },

  miniPackageInfo: { maxWidth: 120, alignItems: "flex-end", marginLeft: 8 },
  miniPackageName: { fontSize: 10, color: "#6366F1", fontWeight: "700" },
  miniPackageCount: { fontSize: 12, fontWeight: "800", color: "#1E293B" },
  noPackageMini: { fontSize: 11, color: "#CBD5E1", fontWeight: "600" },

  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  disabledPageButton: { opacity: 0.4 },
  pageButtonText: { color: "#475569", fontSize: 13, fontWeight: "800" },
  pageIndicator: { color: "#64748B", fontSize: 13, fontWeight: "800" },
});
