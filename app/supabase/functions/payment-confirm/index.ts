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

    // 💡 본부장님이 설정하신 이름 'SB_SERVICE_ROLE_KEY'로 변경했습니다!
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "",
    );

    // DB에서 지점의 MID 정보를 가져옵니다.
    const { data: branch, error: dbError } = await supabaseAdmin
      .from("branches")
      .select("kspay_mid")
      .eq("id", branch_id)
      .single();

    if (dbError || !branch?.kspay_mid) {
      throw new Error(`지점 결제 정보를 찾을 수 없습니다: ${branch_id}`);
    }

    // 실제 결제 승인 요청 (sndStoreid에 DB에서 가져온 MID를 넣습니다)
    const response = await fetch(
      // "https://kspay.ksnet.co.kr/store/KSPayWebV1.4/web_host/recv_post.jsp",
      "https://kspay.ksnet.co.kr/store/KSPayWebV1.4/web_host/recv_post.jsp",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `sndStoreid=${branch.kspay_mid}&sndCommConId=${payKey}&sndAmount=${amount}&sndActionType=1&sndCharSet=UTF-8`,
      },
    );

    const rawText = await response.text();

    return new Response(
      JSON.stringify({ rescd: "0000", mid: branch.kspay_mid, rawText }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
