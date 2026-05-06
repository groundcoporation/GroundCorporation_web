import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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