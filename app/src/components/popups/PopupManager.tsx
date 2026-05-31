import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage"; // 💡 '오늘 하루 보지 않기' 기록용
import { supabase } from "../../lib/supabase";
import UniformPopup from "./UniformPopup";
import NoticePopup from "./NoticePopup"; // 💡 공지 팝업 임포트

export default function PopupManager() {
  const [showUniform, setShowUniform] = useState(false);
  const [showNotice, setShowNotice] = useState(false); // 공지 팝업 상태
  const [targetChild, setTargetChild] = useState<any>(null);
  const [pendingChildren, setPendingChildren] = useState<any[]>([]); // 🚀 유니폼 대기 자녀 목록

  useEffect(() => {
    console.log("🚀 PopupManager가 마운트되었습니다.");
  }, []);

  useEffect(() => {
    // 🚀 [개선] 세션 상태 변화를 감지하여 유저가 확인되었을 때 팝업 체크를 시작합니다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        console.log("👤 [Auth] 인증 확인됨 (Event):", event);
        startPopupFlow();
      }
    });

    // 이미 세션이 있는 경우를 위한 초기 실행
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        console.log("👤 [Auth] 기존 유저 세션 확인됨:", user.id);
        startPopupFlow();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🚀 [팝업 흐름 제어] 순차적으로 팝업을 체크합니다.
  const startPopupFlow = async () => {
    console.log("🔄 팝업 흐름 체크 시작...");
    const hasUniformTarget = await checkUniformRequired();
    if (!hasUniformTarget) {
      await checkNoticePopup();
    }
  };

  // 📋 [유니폼 로직]
  const checkUniformRequired = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log("⚠️ 유저 정보가 없어 유니폼 체크를 중단합니다.");
        return false;
      }

      const { data: children } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", user.id);

      console.log("📊 [DB] 조회된 자녀 데이터 수:", children?.length || 0);

      if (!children || children.length === 0) {
        return false;
      }

      // 상세 조건 디버깅 로그
      children.forEach((c) => {
        console.log(
          `👶 자녀: ${c.child_name}, 반: ${c.target_class}, 사이즈: ${c.uniform_size}`,
        );
      });

      const needsUniformChildren =
        children?.filter((c) => c.target_class && !c.uniform_size) || [];

      if (needsUniformChildren.length > 0) {
        console.log(
          `👕 [대상 발견] 유니폼 신청이 필요한 자녀: ${needsUniformChildren.length}명`,
        );
        setPendingChildren(needsUniformChildren);
        setTargetChild(needsUniformChildren[0]);
        setShowUniform(true);
        return true; // 대상자 있음
      }
      return false; // 대상자 없음
    } catch (e) {
      console.error("❌ 유니폼 체크 중 오류 발생:", e);
      return false;
    }
  };

  // 📢 [공지사항 로직]
  const [notices, setNotices] = useState<any[]>([]);

  const checkNoticePopup = async () => {
    try {
      const hideUntil = await AsyncStorage.getItem("hide_notice_until");
      const now = new Date().getTime();

      if (hideUntil && now < parseInt(hideUntil)) return;

      // 🚀 Supabase에서 활성화된 공지사항 가져오기
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

  // 🚀 [유니폼 다음 자녀 체크]
  const handleUniformNext = () => {
    const nextList = pendingChildren.slice(1);
    if (nextList.length > 0) {
      setPendingChildren(nextList);
      setTargetChild(nextList[0]);
      // showUniform은 이미 true이므로 targetChild만 바꿔서 계속 띄웁니다.
    } else {
      setShowUniform(false);
      setPendingChildren([]);
      checkNoticePopup(); // 모든 자녀 완료 후 공지 체크로 이동
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 🚀 유니폼 신청 팝업 렌더링 추가 */}
      <UniformPopup
        key={targetChild?.id} // 💡 key를 주어야 다음 자녀로 바뀔 때 입력폼이 리셋됩니다.
        isVisible={showUniform}
        childId={targetChild?.id}
        branchId={targetChild?.branch_id} // 🚀 자녀 정보에서 지점 ID 전달
        childName={targetChild?.child_name} // 🚀 자녀 이름 전달
        childBirth={targetChild?.child_birth} // 🚀 자녀 생년월일 전달
        targetClass={targetChild?.target_class}
        onComplete={handleUniformNext}
        onClose={handleUniformNext}
      />

      <NoticePopup
        isVisible={showNotice}
        notices={notices} // 💡 DB에서 가져온 공지 배열 전달
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
