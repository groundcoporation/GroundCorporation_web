import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// 보관소에 담길 데이터의 타입 정의
interface AuthContextType {
  user: any | null;
  role: string | null;
  branchId: string | null;
  isLoading: boolean;
  setBranch: (id: string) => void; // 관리자용 지점 변경 함수
  refreshAuth: () => Promise<void>; // 권한 정보 새로고침
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      branchId, 
      isLoading, 
      setBranch, 
      refreshAuth: initializeAuth 
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