import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useIsFocused } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_important: boolean;
  branch_id?: string | null;
}

interface NoticeSection {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap | string;
  data: Notice[];
  totalCount: number;
}

export default function NoticeListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { branchId, isAdmin, isStaff } = useAuth();
  const isFocused = useIsFocused();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilterBranch, setSelectedFilterBranch] = useState("all");
  const [branches, setBranches] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (isAdmin) fetchBranches();
  }, [isAdmin]);

  useEffect(() => {
    const handleBackButton = () => {
      if (!isFocused) return false;
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate(isAdmin ? "AdminHome" : "Home");
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackButton,
    );
    return () => backHandler.remove();
  }, [isAdmin, isFocused, navigation]);

  useEffect(() => {
    if (isFocused) fetchNotices();
  }, [branchId, selectedFilterBranch, isFocused]);

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name")
      .order("display_order", { ascending: true });

    if (!error && data) setBranches(data);
  };

  const fetchNotices = async () => {
    try {
      setLoading(true);
      let query = supabase.from("notices").select("*");

      if (isAdmin) {
        if (selectedFilterBranch !== "all") {
          query = query.eq("branch_id", selectedFilterBranch);
        }
      } else {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
      }

      const { data, error } = await query
        .order("is_important", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.log("공지사항 로드 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const noticeSections = useMemo<NoticeSection[]>(() => {
    const important = notices.filter((notice) => notice.is_important);
    const global = notices.filter(
      (notice) => !notice.is_important && notice.branch_id === null,
    );
    const branch = notices.filter(
      (notice) => !notice.is_important && notice.branch_id !== null,
    );

    const sections: Omit<NoticeSection, "totalCount">[] = [
      {
        title: "중요 공지",
        description: "우선 확인이 필요한 안내",
        icon: "alert-circle-outline",
        data: important,
      },
      {
        title: "전체 공지",
        description: "모든 지점에 공통 노출",
        icon: "megaphone-outline",
        data: global,
      },
      {
        title: "지점 공지",
        description: "선택 지점 또는 내 지점 안내",
        icon: "business-outline",
        data: branch,
      },
    ].filter((section) => section.data.length > 0);

    return sections.map((section) => ({
      ...section,
      data: expandedSections[section.title]
        ? section.data
        : section.data.slice(0, 5),
      totalCount: section.data.length,
    }));
  }, [expandedSections, notices]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(isAdmin ? "AdminHome" : "Home");
    }
  };

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const renderSectionHeader = ({ section }: { section: NoticeSection }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons name={section.icon as any} size={18} color="#4F46E5" />
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionDescription}>{section.description}</Text>
      </View>
      {section.totalCount > 5 ? (
        <TouchableOpacity
          style={styles.sectionMoreButton}
          onPress={() => toggleSection(section.title)}
          activeOpacity={0.75}
        >
          <Text style={styles.sectionMoreText}>
            {expandedSections[section.title] ? "접기" : "전체보기"}
          </Text>
          <Ionicons
            name={expandedSections[section.title] ? "chevron-up" : "chevron-down"}
            size={16}
            color="#4F46E5"
          />
        </TouchableOpacity>
      ) : (
        <Text style={styles.sectionCount}>{section.totalCount}</Text>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: Notice }) => {
    const isGlobal = item.branch_id === null;

    return (
      <TouchableOpacity
        style={styles.noticeRow}
        onPress={() => navigation.navigate("NoticeDetail", { notice: item })}
        activeOpacity={0.76}
      >
        <View style={styles.noticeRowBody}>
          <View style={styles.noticeMetaRow}>
            <View style={styles.badgeRow}>
              {item.is_important && (
                <View style={styles.importantBadge}>
                  <Text style={styles.importantBadgeText}>중요</Text>
                </View>
              )}
              {isGlobal && (
                <View style={styles.globalBadge}>
                  <Text style={styles.globalBadgeText}>전체</Text>
                </View>
              )}
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>

          <Text style={styles.noticeTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.noticePreview} numberOfLines={1}>
            {item.content}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.appBarTitle}>공지사항</Text>
          <Text style={styles.appBarSub}>분류별로 빠르게 확인하세요</Text>
        </View>

        {isAdmin ? (
          <View style={styles.filterContainer}>
            <Picker
              selectedValue={selectedFilterBranch}
              onValueChange={(itemValue) => setSelectedFilterBranch(itemValue)}
              style={styles.picker}
              dropdownIconColor="#6366F1"
            >
              <Picker.Item label="전체" value="all" />
              {branches.map((branch) => (
                <Picker.Item
                  key={branch.id}
                  label={branch.name}
                  value={branch.id}
                />
              ))}
            </Picker>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <SectionList
          sections={noticeSections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 112 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
            </View>
          }
        />
      )}

      {isStaff && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 28 + insets.bottom }]}
          onPress={() => navigation.navigate("NoticeEdit")}
          activeOpacity={0.82}
        >
          <Ionicons name="pencil" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginRight: 10,
  },
  titleBlock: { flex: 1 },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  appBarSub: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },
  headerSpacer: { width: 84 },
  filterContainer: {
    width: 112,
    height: 40,
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    color: "#1E293B",
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#1E293B" },
  sectionDescription: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },
  sectionCount: {
    minWidth: 28,
    textAlign: "center",
    color: "#4F46E5",
    fontWeight: "900",
  },
  sectionMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  sectionMoreText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "900",
    marginRight: 2,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  noticeRowBody: { flex: 1, paddingRight: 10 },
  noticeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  importantBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  importantBadgeText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "900",
  },
  globalBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  globalBadgeText: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "900",
  },
  dateText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  noticePreview: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
