import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { payKey, amount, branch_id } = await req.json();
    if (!branch_id) throw new Error("지점 정보(branch_id)가 누락되었습니다.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: branch, error: dbError } = await supabaseAdmin
      .from("branches")
      .select("kspay_mid")
      .eq("id", branch_id)
      .single();

    if (dbError || !branch?.kspay_mid) {
      throw new Error(`지점 결제 정보를 찾을 수 없습니다: ${branch_id}`);
    }

    // 🚨 [핵심 수정] 신형 API 서버가 아닌, 전통적인 표준 모듈 서버(kspay.ksnet.to)로 고정합니다!
    const KSNET_API_DOMAIN = "kspay.ksnet.to";
    const kspayApiUrl = `https://${KSNET_API_DOMAIN}/store/KSPayWebV1.4/web_host/recv_post.jsp`;
    const targetMid = branch.kspay_mid;

    console.log(
      `[KSPay 실결제] 승인 요청 도메인: ${KSNET_API_DOMAIN} / 실제 MID: ${targetMid}`,
    );

    const response = await fetch(kspayApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Supabase-Edge-Function",
        Accept: "*/*",
      },
      // KSPay 표준 승인 전문 데이터
      body: `sndStoreid=${targetMid}&sndCommConId=${payKey}&sndAmount=${amount}&sndActionType=1&sndCharSet=UTF-8`,
    });

    const rawText = await response.text();
    const trimmedText = rawText.trim();
    console.log("[KSPay 실결제] 서버 원본 응답:", trimmedText);

    // 🚨 [수정됨] KSNET 응답이 'O' 또는 '`O`' (백틱 포함)로 시작하는지 모두 검사합니다.
    if (!trimmedText.startsWith("O") && !trimmedText.startsWith("`O`")) {
      throw new Error(`결제 승인 실패 (카드사 거절 또는 오류): ${trimmedText}`);
    }

    return new Response(
      JSON.stringify({ rescd: "0000", mid: targetMid, rawText: trimmedText }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("결제 처리 중 에러:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
