import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import dayjs from "https://esm.sh/dayjs@1.11.10";
import timezone from "https://esm.sh/dayjs@1.11.10/plugin/timezone";
import utc from "https://esm.sh/dayjs@1.11.10/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. 한국 시간 기준 대상 날짜 계산 (오늘 기준 +1, +3일)
    const todayKst = dayjs().tz("Asia/Seoul").startOf("day");
    const target3Days = todayKst.add(3, "day").format("YYYY-MM-DD");
    const target1Day = todayKst.add(1, "day").format("YYYY-MM-DD");

    console.log(`[감지기준] 3일전: ${target3Days}, 1일전: ${target1Day}`);

    // 2. 활성 이용권 중 푸시 토큰이 있는 유저 조회
    const { data: expiringPackages, error: dbError } = await supabaseAdmin
      .from("user_packages")
      .select(
        `
       id, 
        package_name, 
       expiry_date, 
        user_id,
        users!fk_user_packages_user ( push_token )
        `,
      )
      .eq("status", "active")
      .not("users.push_token", "is", null);

    if (dbError) throw dbError;

    const notifications = [];
    const dbLogs = [];

    for (const pkg of expiringPackages || []) {
      if (!pkg.expiry_date || !pkg.users?.push_token) continue;

      const expiryStr = dayjs(pkg.expiry_date)
        .tz("Asia/Seoul")
        .format("YYYY-MM-DD");
      let daysLeft = 0;

      if (expiryStr === target3Days) daysLeft = 3;
      else if (expiryStr === target1Day) daysLeft = 1;

      if (daysLeft > 0) {
        const title = "🎫 이용권 만료 안내";
        const body =
          daysLeft === 1
            ? `이용권 '${pkg.package_name}'이 내일 만료됩니다. 서둘러 사용해 주세요!`
            : `이용권 '${pkg.package_name}' 만료 3일 전입니다.`;

        notifications.push({
          to: pkg.users.push_token,
          sound: "default",
          title,
          body,
          data: { type: "notice", relatedId: pkg.id },
          android: { channelId: "default" },
        });

        dbLogs.push({
          user_id: pkg.user_id,
          title,
          message: body.substring(0, 50),
          type: "notice",
          is_read: false,
          created_at: dayjs().tz("Asia/Seoul").format(),
        });
      }
    }

    // 3. Expo 푸시 발송 및 DB 기록
    if (notifications.length > 0) {
      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });
      const expoResult = await expoRes.json();
      console.log(`[결과] ${notifications.length}건 발송 시도:`, expoResult);

      const { error: logError } = await supabaseAdmin
        .from("notifications")
        .insert(dbLogs);
      if (logError) console.error("DB 기록 실패:", logError.message);
    }

    return new Response(
      JSON.stringify({ success: true, sent_count: notifications.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("에러:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
