import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 💡 '오늘 하루 보지 않기' 기록용
import { supabase } from '../../lib/supabase';
import UniformPopup from './UniformPopup';
import NoticePopup from './NoticePopup'; // 💡 공지 팝업 임포트

export default function PopupManager() {
  const [showUniform, setShowUniform] = useState(false);
  const [showNotice, setShowNotice] = useState(false); // 공지 팝업 상태
  const [targetChild, setTargetChild] = useState<any>(null);

  useEffect(() => {
    startPopupFlow();
  }, []);

  // 🚀 [팝업 흐름 제어] 순차적으로 팝업을 체크합니다.
  const startPopupFlow = async () => {
    // 1단계: 유니폼 신청 대상자 체크
    const hasUniformTarget = await checkUniformRequired();
    
    // 💡 만약 유니폼 팝업 대상이 아니라면, 바로 공지사항 체크로 넘어감
    if (!hasUniformTarget) {
      await checkNoticePopup();
    }
  };

  // 📋 [유니폼 로직]
  const checkUniformRequired = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: children } = await supabase.from('children').select('*').eq('parent_id', user.id);
      const needsUniformChild = children?.find(c => c.target_class && !c.uniform_size);

      if (needsUniformChild) {
        setTargetChild(needsUniformChild);
        setShowUniform(true);
        return true; // 대상자 있음
      }
      return false; // 대상자 없음
    } catch (e) {
      return false;
    }
  };

  // 📢 [공지사항 로직]
  const [notices, setNotices] = useState<any[]>([]);

  const checkNoticePopup = async () => {
    try {
      const hideUntil = await AsyncStorage.getItem('hide_notice_until');
      const now = new Date().getTime();
      
      if (hideUntil && now < parseInt(hideUntil)) return;

      // 🚀 Supabase에서 활성화된 공지사항 가져오기
      const { data, error } = await supabase
        .from('popups')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (data && data.length > 0) {
        setNotices(data);
        setShowNotice(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={{ position: 'absolute' }}>
      {/* 유니폼 생략 */}
      <NoticePopup
        isVisible={showNotice}
        notices={notices} // 💡 DB에서 가져온 공지 배열 전달
        onClose={() => setShowNotice(false)}
      />
    </View>
  );
}