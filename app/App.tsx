import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications'; // 🔔 전역 푸시 핸들링을 위해 추가


import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Seoul");

// =========================================================================
// 🚀 [추가됨: 앱 사용 중(포그라운드) 팝업 강제 노출 설정]
// 유저가 앱을 켜놓고 화면을 보고 있을 때도 카톡처럼 무조건 상단에 배너가 떨어지게 만듭니다.
// 휴대폰 기본 설정에 따라 소리 모드면 소리가, 진동 모드면 진동이 자연스럽게 작동합니다!
// =========================================================================
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // 💡 앱 켜놔도 화면 위에 배너 툭 떨어지게 강제!
    shouldPlaySound: true,   // 💡 폰 설정에 맞춰 소리/진동 허용
    shouldSetBadge: false,   // 💡 앱 아이콘 배지 숫자 업데이트
    shouldShowBanner: true,  // 🚀 [신규 추가] 최신 Expo 필수값 (상단 배너 노출)
    shouldShowList: true,    // 🚀 [신규 추가] 최신 Expo 필수값 (알림 센터 목록 노출)
  }),
});
// =========================================================================

// 🚀 [전역 상태 관리] 지점 및 권한 관리를 위한 Provider 임포트
import { AuthProvider } from "./src/context/AuthContext";

// 🚀 [인증 및 홈 화면]
import LoginScreen from "./src/screens/login/LoginScreen";
import SignUpScreen from "./src/screens/login/SignUpScreen";
import FindAuthScreen from "./src/screens/login/FindAuthScreen";
import HomeScreen from "./src/screens/home/HomeScreen";

//로그인관련 슈퍼베이스 연결
import { supabase } from "./src/lib/supabase";

// 💳 [이용권 및 결제 관련]
import PassPurchaseScreen from "./src/screens/pass/PassPurchaseScreen"; 
import KSPayService from "./src/services/payment/KSPayService"; 
import MyPackageScreen from "./src/screens/pass/MyPackageScreen"; 

// 📅 [예약 관련 시스템]
import ReservationScreen from "./src/screens/reservation/ReservationScreen"; 
import ReservationSuccessScreen from "./src/screens/reservation/ReservationSuccessScreen";
import ReservationFailScreen from "./src/screens/reservation/ReservationFailScreen";

//이용권 구매 성공/실패 화면
import PurchaseSuccessScreen from "./src/screens/pass/PurchaseSuccessScreen";
import PurchaseFailScreen from "./src/screens/pass/PurchaseFailScreen";

// 👤 [마이페이지 관련]
import MyPageScreen from "./src/screens/mypage/MyPageScreen"; 
import ProfileEditScreen from "./src/screens/mypage/ProfileEditScreen"; 
import ChildManagementScreen from "./src/screens/mypage/ChildManagementScreen"; 
import ReservationListScreen from "./src/screens/reservation/ReservationListScreen";

// 📢 [공지사항 관련]
import NoticeListScreen from "./src/screens/notice/NoticeListScreen";
import NoticeDetailScreen from "./src/screens/notice/NoticeDetailScreen";
import NoticeEditScreen from "./src/screens/notice/NoticeEditScreen";

// 🚌 [출석 및 등하원(픽업) 관련] 
import AttendanceScreen from "./src/screens/attendance/AttendanceScreen";
import PickupMainScreen from "./src/screens/pickup/PickupMainScreen"; // 👈 추가된 픽업 메인
import PickupApplyScreen from "./src/screens/pickup/PickupApplyScreen"; // 👈 추가된 픽업 신청/수정
import RealtimeMapScreen from "./src/screens/pickup/RealtimeMapScreen"; // 👈 추가된 실시간 지도

// 🚐 [차량운행 관리 시스템 - 기사님/관리자용] // 👈 새로 추가된 섹션!
import DriverDashboardScreen from "./src/screens/driver/DriverDashboardScreen"; // 경로를 실제에 맞게 확인해주세요!

// 📸 [갤러리(사진첩) 관련]
import GalleryListScreen from "./src/screens/gallery/GalleryListScreen";
import GalleryUploadScreen from "./src/screens/gallery/GalleryUploadScreen";
import GalleryDetailScreen from "./src/screens/gallery/GalleryDetailScreen";
import GalleryEditScreen from "./src/screens/gallery/GalleryEditScreen";

// 🛠️ [관리자 대시보드 시스템 - 코치/원장용] // 👈 9번 섹션 추가!
import AdminHomeScreen from "./src/screens/admin/AdminHomeScreen";
import AdminConsultationScreen from "./src/screens/admin/AdminConsultationScreen";
import AdminMemberScreen from "./src/screens/admin/AdminMemberScreen";
import AdminScheduleScreen from "./src/screens/admin/AdminScheduleScreen";
import AdminSettingScreen from "./src/screens/admin/AdminSettingScreen";
import AdminMemberDetailScreen from "./src/screens/admin/AdminMemberDetailScreen"; // 관리자페이지 회원 상세 화면

const Stack = createNativeStackNavigator();

// 🔔 [알림 전역 제어 전용] 화면이 뜨기 전 컴포넌트 밖에서도 네비게이션을 컨트롤할 수 있는 마법의 참조키 생성
const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<"Login" | "Home">("Login");

  useEffect(() => {
    async function initializeAuth() {
      try {
        // 1. 자동 로그인 설정값 확인
        const autoLoginEnabled = await AsyncStorage.getItem("auto_login");
        
        // 2. 💡 [핵심] Supabase에 실제 로그인된 세션이 있는지 확인
        const { data: { session } } = await supabase.auth.getSession();

        // 자동로그인이 켜져있고 + 실제로 세션도 살아있어야만 Home으로 보냄
        if (autoLoginEnabled === "true" && session) {
          setInitialRoute("Home");
        } else {
          setInitialRoute("Login");
        }
      } catch (error) {
        console.error("인증 초기화 중 에러:", error);
        setInitialRoute("Login");
      } finally {
        setIsLoading(false);
      }
    }
    initializeAuth();
  }, []);

  // =========================================================================
  // 🔔 [전역 알림 수신 및 교통정리 시스템] - 나중에 화면 이동만 수정할 수 있게 완전 격리 완료!
  // =========================================================================
  useEffect(() => {
    // 1. 앱이 켜져 있을 때 진짜 알림이 오면 반응하는 센서
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📲 앱이 켜진 상태에서 실시간 알림 수신됨:', notification);
    });

    // 2. 학부모가 스마트폰 상단바 알림을 '클릭(터치)'해서 앱에 들어올 때 반응하는 핵심 센서
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Supabase에서 쏠 때 심어둔 데이터(type, notice_id 등)를 안전하게 꺼냅니다.
      const data = response.notification.request.content.data;
      
      if (!data) return;
      
      const type = data.type;
      console.log(`🎯 알림 클릭됨! 감지된 카테고리 타입: [${type}]`);

      // 네비게이션이 완전히 준비되었는지 확인 후 교통정리 시작
      if (navigationRef.isReady()) {
        // 💡 [나중에 수정할 곳] 본부장님 기획에 맞춰 목적지 화면 이름만 싹 바꿔주시면 됩니다!
        if (type === "notice") {
          // 공지사항 타입이면 공지 상세 보기 화면으로 하이패스 점프!
          navigationRef.navigate("NoticeDetail", { notice: data.noticeData }); 
        } else if (type === "payment") {
          // 나중에 결제 알림이면 마이페이지 혹은 전용 화면으로 슥 이동
          navigationRef.navigate("MyPage");
        } else if (type === "attendance") {
          // 출결 알림이면 출석 화면으로 슥 이동
          navigationRef.navigate("Attendance");
        }
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);
  // =========================================================================
  // 🔔 [전역 알림 시스템 영역 끝]
  // =========================================================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    // 💡 방금 만든 AuthProvider로 전체 앱을 감싸줍니다.
    <AuthProvider>
      {/* 🔔 알림에서 스크린을 강제 핸들링할 수 있도록 navigationRef를 연결해줍니다. */}
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        >
          {/* 1. 인증 및 메인 */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="FindAuth" component={FindAuthScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          
          {/* 2. 이용권 및 결제 프로세스 */}
          <Stack.Screen name="Pass" component={PassPurchaseScreen} />
          <Stack.Screen name="MyPackage" component={MyPackageScreen} />
          
          {/* <Stack.Screen 
            name="KSPay" 
            component={KSPayService} 
            options={{ 
              animation: "slide_from_bottom", 
              presentation: "modal" 
            }} 
          /> */}
          
          {/* 3. 예약 프로세스 */}
          <Stack.Screen name="Reservation" component={ReservationScreen} /> 
          <Stack.Screen name="ReservationSuccess" component={ReservationSuccessScreen} />
          <Stack.Screen name="ReservationFail" component={ReservationFailScreen} /> 

          {/* 이용권 구매 관련  */}
          <Stack.Screen name="PurchaseSuccess" component={PurchaseSuccessScreen} />
          <Stack.Screen name="PurchaseFail" component={PurchaseFailScreen} />

          {/* 4. 마이페이지 프로세스 */}
          <Stack.Screen name="MyPage" component={MyPageScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="ChildManagement" component={ChildManagementScreen} />
          <Stack.Screen name="ReservationList" component={ReservationListScreen} />

          {/* 5. 공지사항 프로세스 */}
          <Stack.Screen name="NoticeList" component={NoticeListScreen} />
          <Stack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
          <Stack.Screen name="NoticeEdit" component={NoticeEditScreen} />

          {/* 6. 출석 및 픽업 프로세스 (부모님용) */}
          <Stack.Screen name="Attendance" component={AttendanceScreen} />
          <Stack.Screen name="PickupMain" component={PickupMainScreen} />
          <Stack.Screen name="PickupApply" component={PickupApplyScreen} />
          <Stack.Screen name="RealtimeMap" component={RealtimeMapScreen} />

          {/* 7. 차량운행 관리 프로세스 (기사님/관리자용) 👈 추가된 부분! */}
          <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />

          {/* 8. 갤러리(사진첩) 프로세스 */}
          <Stack.Screen name="GalleryList" component={GalleryListScreen} />
          <Stack.Screen name="GalleryUpload" component={GalleryUploadScreen} />
          <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
          <Stack.Screen name="GalleryEdit" component={GalleryEditScreen} />

          {/* 9. 관리자 대시보드 프로세스 (코치/원장용) */}
          <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
          <Stack.Screen name="AdminConsultation" component={AdminConsultationScreen} />
          <Stack.Screen name="AdminMember" component={AdminMemberScreen} />
          <Stack.Screen name="AdminSchedule" component={AdminScheduleScreen} />
          <Stack.Screen name="AdminSetting" component={AdminSettingScreen} />
          <Stack.Screen name="AdminMemberDetail" component={AdminMemberDetailScreen} />

        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#ffffff" 
  },
});