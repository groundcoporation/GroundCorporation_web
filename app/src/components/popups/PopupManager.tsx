import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import UniformPopup from "./UniformPopup"; // 🚀 MultiUniformPopup으로 변경! (경로 확인 필수)
import NoticePopup from "./NoticePopup";

// 🚀 UniformPopup에서 요구하는 자녀 데이터 타입에 맞춤
interface ChildData {
  id: string;
  name: string;
  birth?: string;
  targetClass?: string;
}

// 🚀 HomeScreen에서 branchId와 childrenData를 받도록 Props 정의
interface PopupManagerProps {
  branchId?: string | null;
  childrenData?: any[];
}

export default function PopupManager({
  branchId,
  childrenData = [],
}: PopupManagerProps) {
  const [showUniform, setShowUniform] = useState(false);
  const [showNotice, setShowNotice] = useState(false);

  // 🚀 유니폼 신청 대상 자녀 리스트 (ChildData 타입 형태)
  const [targetChildren, setTargetChildren] = useState<ChildData[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    // 🚀 branchId나 childrenData가 로드되면 팝업 체크 시작
    if (branchId && childrenData.length > 0) {
      startPopupFlow();
    }
  }, [branchId, childrenData]);

  // 순차적으로 팝업을 체크
  const startPopupFlow = async () => {
    const hasUniformTarget = await checkUniformRequired();
    if (!hasUniformTarget) {
      await checkNoticePopup();
    }
  };

  // 📋 [유니폼 로직 - 다자녀 한 번에 추출]
  const checkUniformRequired = async () => {
    try {
      // 🚀 조건: 반(target_class)이 배정되었으나, 유니폼 사이즈(uniform_size)가 없는 아이들
      const needsUniform = childrenData.filter(
        (c) => c.target_class && !c.uniform_size,
      );

      if (needsUniform.length > 0) {
        // MultiUniformPopup이 요구하는 형식으로 데이터 가공
        const mappedChildren: ChildData[] = needsUniform.map((c) => ({
          id: c.id,
          name: c.child_name || c.name,
          birth: c.child_birth || c.birth_date,
          targetClass: c.target_class,
        }));

        setTargetChildren(mappedChildren);
        setShowUniform(true);
        return true; // 대상자 있음
      }
      return false; // 대상자 없음
    } catch (e) {
      console.error("❌ 유니폼 체크 중 오류:", e);
      return false;
    }
  };

  // 📢 [공지사항 로직]
  const checkNoticePopup = async () => {
    try {
      const hideUntil = await AsyncStorage.getItem("hide_notice_until");
      const now = new Date().getTime();

      if (hideUntil && now < parseInt(hideUntil)) return;

      const { data, error } = await supabase
        .from("popups")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (data && data.length > 0) {
        setNotices(data);
        setShowNotice(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 🚀 [유니폼 완료 후 처리]
  const handleUniformComplete = () => {
    setShowUniform(false);
    // 유니폼 팝업 닫히면 바로 공지사항 체크 진행
    checkNoticePopup();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 🚀 다자녀 통합 유니폼 팝업 렌더링 */}
      <UniformPopup
        isVisible={showUniform}
        branchId={branchId || null}
        childrenData={targetChildren} // 🚀 한 번에 배열을 넘김!
        onComplete={handleUniformComplete}
        onClose={handleUniformComplete}
      />

      <NoticePopup
        isVisible={showNotice}
        notices={notices}
        onClose={() => setShowNotice(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999, // 다른 UI 요소보다 위에 표시
  },
});
