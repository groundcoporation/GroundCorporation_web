import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// 🚀 [추가] 푸시 알림 토큰 수집을 위한 패키지 임포트
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 보관소에 담길 데이터의 타입 정의
interface AuthContextType {
  // --- 👤 기본 유저 정보 ---
  user: any | null;
  isLoading: boolean;
  refreshAuth: () => Promise<void>; // 권한 정보 새로고침

  // --- 📍 지점 관련 ---
  branchId: string | null;
  setBranch: (id: string) => void; // 관리자용 지점 변경 함수

  // --- 👑 권한(Role) 관련 ---
  role: string | null; // DB에 적힌 원래 글자 (예: 'admin', 'coach')
  
  // 💡 [나중에 권한을 추가할 때 만지는 곳 1단계] 여기에 사용할 스위치 이름을 등록하세요!
  isAdmin: boolean;  // 어드민인가?
  isStaff: boolean;  // 직원(어드민 또는 코치)인가?
  isDriver: boolean; // 기사님인가?
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- 🔔 푸시 알림 (Push Token) 관련 ---
  // 💡 앱 진입 시 기기의 푸시 토큰을 발급받아 Supabase에 저장하는 함수
  const registerAndSavePushToken = async (userId: string) => {
    // 1. 시뮬레이터가 아닌 실제 기기인지 확인
    if (!Device.isDevice) {
      console.log('푸시 알림은 실제 스마트폰에서만 작동합니다.');
      return;
    }

    // 2. 안드로이드 알림 채널 설정 (안드로이드 필수 규격)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 3. 알림 권한 확인 및 요청
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // 권한 거부 시 종료 (학부모가 알림 거부한 경우)
    if (finalStatus !== 'granted') {
      console.log('푸시 알림 권한이 거부되었습니다.');
      return;
    }

    // 4. 토큰 발급 및 DB 저장
    try {
      // Expo 고유 푸시 토큰 발급
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      console.log("📲 [발급된 푸시 토큰]:", token);

      // Supabase users 테이블의 push_token 칸에 업데이트!
      const { error } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) throw error;
      console.log("✅ [DB 저장 성공] 푸시 토큰이 업데이트되었습니다.");

    } catch (error) {
      console.error("푸시 토큰 발급/저장 에러:", error);
    }
  };
  // ------------------------------------

  // 세션 정보와 DB 정보를 동기화하는 핵심 함수
  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        
        // 💡 [지점 갈라치기의 핵심] DB에서 유저의 권한과 지점 정보를 가져옴
        const { data: profile } = await supabase
          .from('users')
          .select('role, branch_id')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setRole(profile.role);
          setBranchId(profile.branch_id);
        }

        // 🚀 [추가] 로그인이 성공적으로 확인되었으므로 푸시 토큰을 수집하여 DB에 저장합니다!
        registerAndSavePushToken(session.user.id);

      } else {
        setUser(null);
        setRole(null);
        setBranchId(null);
      }
    } catch (error) {
      console.error('Auth 초기화 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();

    // 로그인/로그아웃 상태 변화 감지 리스너
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        initializeAuth();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setBranchId(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 관리자가 지점을 변경할 때 사용할 함수
  const setBranch = (id: string) => {
    setBranchId(id);
    console.log(`[Context] 지점이 ${id}로 변경되었습니다.`);
  };

  // --- 👑 권한(Role) 스위치 정의 ---
  // 💡 [나중에 권한을 추가할 때 만지는 곳 2단계] 여기서 조건을 설정하세요!
  // 예: const isHeadCoach = role === 'head_coach';
  const isAdmin = role === 'admin';
  const isStaff = role === 'admin' || role === 'coach';
  const isDriver = role === 'driver';

  return (
    <AuthContext.Provider value={{ 
      // --- 👤 기본 유저 정보 ---
      user, 
      isLoading, 
      refreshAuth: initializeAuth,
      
      // --- 📍 지점 관련 ---
      branchId, 
      setBranch, 
      
      // --- 👑 권한(Role) 관련 ---
      role, 
      // 💡 [나중에 권한을 추가할 때 만지는 곳 3단계] 위에서 만든 스위치를 밖으로 내보냅니다!
      isAdmin,
      isStaff,
      isDriver
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 다른 파일에서 Context를 편하게 쓰기 위한 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};