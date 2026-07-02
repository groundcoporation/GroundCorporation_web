import { supabase } from "../lib/supabase"; // 🚀 본부장님 환경에 맞춘 경로
import dayjs from "dayjs";

// 🚀 [본부장님 기존 타입 + 신규 타입 합체]
export type NotificationType =
  | "ATTENDANCE"
  | "SHUTTLE"
  | "CONSULT"
  | "RESERVATION"
  | "notice"
  | "payment"
  | "attendance";

// =========================================================================
// 1️⃣ 알림 서비스 (DB 저장용)
// =========================================================================
export const NotificationService = {
  // 1. 기초 발송 함수
  async send(
    targetUserId: string,
    title: string,
    message: string,
    type: NotificationType,
  ) {
    try {
      const { error } = await supabase.from("notifications").insert([
        {
          user_id: targetUserId,
          title,
          message,
          type,
          is_read: false,
        },
      ]);
      if (error) throw error;
    } catch (e) {
      console.error("알림 발송 실패:", e);
    }
  },

  // 2. 등하원 알림
  async sendAttendance(
    parentId: string,
    childName: string,
    status: "등원" | "하원",
  ) {
    const title = `🔔 ${status} 알림`;
    const message = `${childName} 학생이 안전하게 ${status}하였습니다.`;
    await this.send(parentId, title, message, "ATTENDANCE");
  },

  // 3. 차량 승하차 알림
  async sendShuttle(
    parentId: string,
    childName: string,
    status: "승차" | "하차",
  ) {
    const title = `🚐 차량 ${status} 알림`;
    const message = `${childName} 학생이 차량에 ${status}하였습니다.`;
    await this.send(parentId, title, message, "SHUTTLE");
  },

  // 4. 상담 신청 알림 (코치용)
  async sendConsultRequest(coachId: string, userName: string) {
    const title = `💬 새 상담 신청`;
    const message = `${userName} 님이 상담을 신청했습니다.`;
    await this.send(coachId, title, message, "CONSULT");
  },
};

// =========================================================================
// 2️⃣ [신규 추가] 엑스포 통신까지 한 방에 처리하는 "진짜 팝업" 배달부 (이게 없어서 에러 났음!)
// =========================================================================
interface SendPushArgs {
  targetBranchId: string | null;
  targetUserId?: string | null; // 🚀 [추가] 특정 학부모 한 명에게만 보낼 때 사용!
  title: string;
  body: string;
  type: string;
  relatedId?: string | null;
}

export const sendGlobalPushNotification = async ({
  targetBranchId,
  targetUserId = null, // 🚀 파라미터 받기
  title,
  body,
  type,
  relatedId = null,
}: SendPushArgs) => {
  try {
    // 1. 대상 유저 중 푸시 토큰이 존재하는 진성 회원만 일차적으로 긁어옵니다.
    let query = supabase.from("users").select("id, push_token");

    // 🚀 [추가 및 수정된 핵심 로직] 콕 집은 유저가 있으면 그 유저만, 아니면 지점 전체!
    if (targetUserId) {
      // 💡 학부모 ID가 넘어왔다면, 지점 전체가 아니라 딱 그 학부모 1명만 검색합니다!
      query = query.eq("id", targetUserId);
    } else if (targetBranchId) {
      // 학부모 ID가 없고 지점 ID만 있다면, 지점 전체 학부모를 검색합니다. (공지사항용)
      query = query.eq("branch_id", targetBranchId);
    }

    // 💡 푸시 토큰이 있는 사람만 최종 필터링
    query = query.not("push_token", "is", null);

    const { data: targetUsers, error: userError } = await query;
    if (userError || !targetUsers || targetUsers.length === 0) {
      console.log(
        "⚠️ [전역 푸시] 알림을 보낼 대상 유저(토큰 보유자)가 없습니다.",
      );
      return;
    }

    // 2. 앱 내 종 모양 배지(리스트)를 보여주기 위한 DB 일괄 주입
    const notificationRows = targetUsers.map((u) => ({
      user_id: u.id,
      title: title,
      message: body.substring(0, 50),
      type: type,
      notice_id: type === "notice" ? relatedId : null,
      reservation_id: type === "RESERVATION" ? relatedId : null,
      is_read: false,
      created_at: dayjs().tz().format("YYYY-MM-DDTHH:mm:ssZ"), // 명시적으로 KST 오프셋 포함
    }));

    
    const { error: notiError } = await supabase
      .from("notifications")
      .insert(notificationRows);
    if (notiError)
      console.log("🚨 [전역 푸시] 알림 DB 저장 실패:", notiError.message);

    // 3. 🔴 엑스포 우체국 서버를 통한 스마트폰 상단바 진짜 팝업 발송
    const validPushTokens = targetUsers
      .filter(
        (u) => u.push_token && u.push_token.startsWith("ExponentPushToken"),
      )
      .map((u) => u.push_token);

    if (validPushTokens.length > 0) {
      const pushMessages = validPushTokens.map((token) => ({
        to: token,
        sound: "default",
        title: title,
        body: body,
        data: { type, relatedId },
        // 🚀 안드로이드 배포 앱 필수 규격 추가
        android: {
          channelId: "default",
        },
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
  method: "POST",
  headers: {
    Accept: "application/json",
    "Accept-encoding": "gzip, deflate",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(pushMessages),
});

const result = await response.json();

console.log("📨 Expo Push API status:", response.status);
console.log("📨 Expo Push API result:", JSON.stringify(result, null, 2));

if (!response.ok || result.errors?.length) {
  console.log("🚨 [전역 푸시 실패] Expo Push API가 요청을 거절했습니다.");
  return;
}

console.log(
  `✅ [전역 푸시 배달부] ${type} 대상 푸시 발송 요청 완료! (발송 인원: ${validPushTokens.length}명)`,
);
    }
  } catch (error) {
    console.log("🚨 [전역 푸시 배달부] 시스템 치명적 에러 발생:", error);
  }
};
