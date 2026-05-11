import { supabase } from "../lib/supabase";

export type NotificationType = 'ATTENDANCE' | 'SHUTTLE' | 'CONSULT' | 'RESERVATION';

export const NotificationService = {
  // 1. 기초 발송 함수
  async send(targetUserId: string, title: string, message: string, type: NotificationType) {
    try {
      const { error } = await supabase
        .from("notifications")
        .insert([{
          user_id: targetUserId,
          title,
          message,
          type,
          is_read: false,
        }]);
      if (error) throw error;
    } catch (e) {
      console.error("알림 발송 실패:", e);
    }
  },

  // 2. 등하원 알림
  async sendAttendance(parentId: string, childName: string, status: '등원' | '하원') {
    const title = `🔔 ${status} 알림`;
    const message = `${childName} 학생이 안전하게 ${status}하였습니다.`;
    await this.send(parentId, title, message, 'ATTENDANCE');
  },

  // 3. 차량 승하차 알림
  async sendShuttle(parentId: string, childName: string, status: '승차' | '하차') {
    const title = `🚐 차량 ${status} 알림`;
    const message = `${childName} 학생이 차량에 ${status}하였습니다.`;
    await this.send(parentId, title, message, 'SHUTTLE');
  },

  // 4. 상담 신청 알림 (코치용)
  async sendConsultRequest(coachId: string, userName: string) {
    const title = `💬 새 상담 신청`;
    const message = `${userName} 님이 상담을 신청했습니다.`;
    await this.send(coachId, title, message, 'CONSULT');
  }
};