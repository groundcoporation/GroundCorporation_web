"use client";

/* Supabase의 중첩 관계 응답은 런타임 스키마에 따라 단일 객체/배열이 될 수 있습니다. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Clock3, CreditCard, Download, Loader2, LogOut, Search, ShieldAlert, TicketCheck, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import BranchHeader from "@/components/BranchHeader";

const MAX_SLOTS = 20;
type Tab = "payments" | "attendance" | "schedule";
type Profile = { id: string; name: string | null; role: "admin" | "coach"; branch_id: string | null };
type Branch = { id: string; name: string };
type PaymentProduct = { package_name: string | null; price: number | null; total_count: number | null };
type Payment = { id: string; created_at: string; total_amount: number | null; final_amount: number | null; payment_method: string | null; status: string | null; pg_tid: string | null; users: { name: string | null; email: string | null } | null; products: PaymentProduct[] };
type AttendanceRow = { id: string; childId: string; childName: string; parentName: string; packageName: string; weekly: number | null; total: number; used: number; remaining: number; dates: string[] };
type ClassSchedule = { id: string; branch_id: string | null; target_class: string; day_of_week: string; start_time: string; end_time: string; max_people: number | null; branches: { name: string } | null };
type ScheduleReservation = { id: string; schedule_id: string; class_date: string; status: string | null; attendance_status: string | null; child_id: string | null; user_id: string | null; children: { child_name: string | null } | null; users: { name: string | null; phone: string | null } | null };

const won = new Intl.NumberFormat("ko-KR");
const firstJoined = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;
const weeklyCount = (name: string | null) => Number(name?.match(/주\s*(\d+)\s*회/)?.[1]) || null;
const excluded = (status: string | null) => /결석|보강/.test((status ?? "").replace(/\s/g, ""));
const rangeOf = (month: string) => ({ from: `${month}-01`, to: `${month}-${String(new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate()).padStart(2, "0")}` });
const moveMonth = (month: string, amount: number) => { const date = new Date(+month.slice(0, 4), +month.slice(5, 7) - 1 + amount, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; };
const mondayOf = (date: Date) => { const result = new Date(date); const day = result.getDay(); result.setHours(0, 0, 0, 0); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); return result; };
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const statusText = (status: string | null) => ({ paid: "결제 완료", success: "결제 완료", pending_payment: "입금 대기", failed: "결제 실패", cancelled: "취소", canceled: "취소", refunded: "환불" }[status ?? ""] ?? status ?? "미확인");
const paymentDetail = (method: string | null, pgTid: string | null) => {
  if (method === "VBANK") { const [bank, account] = (pgTid ?? "").split(":"); return account ? `${bank || "가상계좌"} · ${account}` : "가상계좌"; }
  if (method === "BANK") return "계좌이체";
  if (method === "POINT") return "포인트 결제";
  if (method === "CARD") return "신용·체크카드";
  return method ?? "결제수단 미확인";
};

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<Tab>("payments");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [scheduleReservations, setScheduleReservations] = useState<ScheduleReservation[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));

  // 🚀 카드 결제 취소/환불 관련 상태 정의 및 헬퍼 함수
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelAmountStr, setCancelAmountStr] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // 결제건의 누적 환불금 및 남은 취소 가능 잔액 계산 헬퍼 함수
  const getRefundInfo = (item: any) => {
    if (!item || !item.pg_tid) return { refunded: 0, remaining: item ? (item.final_amount ?? item.total_amount ?? 0) : 0 };
    
    // payments 상태 배열에서 해당 거래번호의 환불용 마이너스 결제행 필터링
    const refundRows = payments.filter(
      (p) => p.pg_tid === `${item.pg_tid}_REFUND` || p.pg_tid === `${item.pg_tid}-REFUND`
    );
    
    const refunded = refundRows.reduce((sum, p) => sum + Math.abs(p.final_amount ?? p.total_amount ?? 0), 0);
    const originalAmount = item.final_amount ?? item.total_amount ?? 0;
    const remaining = Math.max(0, originalAmount - refunded);
    
    return { refunded, remaining };
  };

  const handleCancelPayment = async () => {
    if (!cancelTarget) return;
    const { remaining } = getRefundInfo(cancelTarget);
    const amt = cancelAmountStr.trim() ? Number(cancelAmountStr) : remaining;
    if (isNaN(amt) || amt <= 0 || amt > remaining) {
      alert(`올바른 취소 금액을 입력해 주세요. (최대 ${remaining.toLocaleString()}원)`);
      return;
    }

    if (!confirm(`정말 이 결제 건을 취소하시겠습니까?\n취소 금액: ${amt.toLocaleString()}원`)) {
      return;
    }

    setCancelLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch("https://wsdyrercgbvwlssntwvy.supabase.co/functions/v1/kspay-cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_id: cancelTarget.id,
          cancel_amount: amt,
          cancel_reason: cancelReason || "관리자 페이지 취소"
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "취소 요청 중 오류가 발생했습니다.");
      }

      alert("결제 취소가 완료되었습니다.");
      setCancelTarget(null);
      setCancelAmountStr("");
      setCancelReason("");
      void loadPayments();
    } catch (err: any) {
      alert(err.message || "취소 처리에 실패했습니다.");
    } finally {
      setCancelLoading(false);
    }
  };

  // 🚀 [출결표 단순 수동 출석 관리용 상태 및 API 구현]
  const [attendanceModal, setAttendanceModal] = useState<{ childId: string; childName: string } | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [actionLoading, setActionLoading] = useState(false);

  const handleManualAttendance = async () => {
    if (!attendanceModal || !profile) return;
    setActionLoading(true);
    const { childId } = attendanceModal;
    const dateStr = attendanceDate;
    const branchId = profile.role === "coach" ? profile.branch_id : branchFilter === "all" ? null : branchFilter;

    try {
      // 1. 해당 지점 정보 특정 (코치 지점 -> 필터링 지점 -> 기본 지점 순)
      const targetBranch = branchId || profile.branch_id || "branch_1";

      // 2. 등원 로그 등록 (attendance_logs) - 중복 삽입 방지
      const { data: existingLog } = await (supabase as any)
        .from("attendance_logs")
        .select("id")
        .eq("child_id", childId)
        .eq("date", dateStr)
        .maybeSingle();

      if (!existingLog) {
        const { error: logError } = await (supabase as any)
          .from("attendance_logs")
          .insert({
            child_id: childId,
            date: dateStr,
            branch_id: targetBranch,
            status: "출석",
            check_in: new Date().toISOString()
          });
        if (logError) throw logError;
      }

      // 3. 수강권 잔여 횟수가 있다면 횟수 차감 및 사용로그 연동 생성
      const { data: activePackages, error: pkgError } = await (supabase as any)
        .from("user_packages")
        .select("id, remaining_count")
        .eq("child_id", childId)
        .eq("status", "active")
        .gt("remaining_count", 0)
        .order("created_at", { ascending: true });

      if (pkgError) throw pkgError;

      if (activePackages && activePackages.length > 0) {
        const pkg = activePackages[0] as any;
        
        // 3-1. 사용 대장(package_usage_logs) 기록 추가
        const { error: usageError } = await (supabase as any)
          .from("package_usage_logs")
          .insert({
            user_package_id: pkg.id,
            child_id: childId,
            quantity: 1,
            consumed_at: new Date(dateStr + "T12:00:00Z").toISOString(),
            status: "consumed",
            branch_id: targetBranch
          });
        if (usageError) throw usageError;

        // 3-2. 남은 횟수 1 차감 업데이트
        const { error: updateError } = await (supabase as any)
          .from("user_packages")
          .update({ remaining_count: Math.max(0, pkg.remaining_count - 1) })
          .eq("id", pkg.id);
        if (updateError) throw updateError;
      }

      alert("출석 처리가 완료되었습니다.");
      setAttendanceModal(null);
      void loadAttendance();
    } catch (err: any) {
      alert(err.message || "출석 처리에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAttendance = async (childId: string, dateStr: string) => {
    if (!profile) return;
    if (!confirm(`${dateStr} 날짜의 출석을 취소하시겠습니까?\n이미 차감된 수강권이 있다면 자동으로 +1회 복구됩니다.`)) return;

    setLoading(true);
    try {
      // 1. 단순 등원 로그(attendance_logs) 삭제
      const { error: logError } = await (supabase as any)
        .from("attendance_logs")
        .delete()
        .eq("child_id", childId)
        .eq("date", dateStr);
      if (logError) throw logError;

      // 2. 해당 날짜에 소비된 package_usage_logs 조회 및 취소 복구
      const startOfDay = `${dateStr}T00:00:00.000Z`;
      const endOfDay = `${dateStr}T23:59:59.999Z`;
      const { data: usages, error: usageError } = await (supabase as any)
        .from("package_usage_logs")
        .select("id, user_package_id, quantity")
        .eq("child_id", childId)
        .eq("status", "consumed")
        .gte("consumed_at", startOfDay)
        .lte("consumed_at", endOfDay);

      if (usageError) throw usageError;

      if (usages && usages.length > 0) {
        for (const usage of usages) {
          // 2-1. 사용 대장 기록 삭제
          const { error: delError } = await (supabase as any)
            .from("package_usage_logs")
            .delete()
            .eq("id", usage.id);
          if (delError) throw delError;

          // 2-2. 수강권 복구 (+1)
          const { data: pkg, error: pkgError } = await (supabase as any)
            .from("user_packages")
            .select("id, remaining_count, total_count")
            .eq("id", usage.user_package_id)
            .maybeSingle();

          if (pkgError) throw pkgError;

          if (pkg) {
            const typedPkg = pkg as any;
            const nextCount = Math.min(typedPkg.total_count || 100, (typedPkg.remaining_count || 0) + (usage.quantity || 1));
            const { error: updateError } = await (supabase as any)
              .from("user_packages")
              .update({ remaining_count: nextCount })
              .eq("id", typedPkg.id);
            if (updateError) throw updateError;
          }
        }
      }

      alert("출석 취소와 수강권 복구가 안전하게 완료되었습니다.");
      void loadAttendance();
    } catch (err: any) {
      alert(err.message || "출석 취소 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/auth/login");
      const { data, error: profileError } = await supabase.from("users").select("id,name,role,branch_id").eq("id", auth.user.id).maybeSingle();
      if (!active) return;
      const candidate = data as unknown as Profile | null;
      if (profileError || !candidate || !["admin", "coach"].includes(candidate.role)) setForbidden(true);
      else setProfile(candidate);
      setAuthLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    let query = supabase
      .from("branches")
      .select("id,name")
      .order("display_order", { ascending: true });
    if (profile.role === "coach" && profile.branch_id) query = query.eq("id", profile.branch_id);
    void query
      .then(({ data, error: branchError }) => {
        if (branchError) setError(branchError.message);
        else setBranches((data ?? []) as Branch[]);
      });
  }, [profile]);

  const loadPayments = useCallback(async () => {
    if (!profile) return;
    setLoading(true); setError("");
    try {
      let query = supabase.from("payments").select("id,created_at,total_amount,final_amount,payment_method,status,pg_tid,branch_id,users(name,email)").order("created_at", { ascending: false });
      const selectedBranch = profile.role === "coach" ? profile.branch_id : branchFilter === "all" ? null : branchFilter;
      if (selectedBranch) query = query.eq("branch_id", selectedBranch);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      const paymentIds = (data ?? []).map((row: any) => row.id);
      const productResult = paymentIds.length ? await supabase.from("user_packages").select("payment_id,package_name,price,total_count").in("payment_id", paymentIds) : { data: [], error: null };
      if (productResult.error) throw productResult.error;
      const productsByPayment = new Map<string, PaymentProduct[]>();
      (productResult.data ?? []).forEach((product: any) => productsByPayment.set(product.payment_id, [...(productsByPayment.get(product.payment_id) ?? []), product]));
      setPayments((data ?? []).map((row: any) => ({ ...row, users: firstJoined(row.users), products: productsByPayment.get(row.id) ?? [] })) as Payment[]);
    } catch (reason: any) { setError(reason?.message ?? "결제 내역을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [branchFilter, profile]);

  const loadAttendance = useCallback(async () => {
    if (!profile) return;
    setLoading(true); setError("");
    const period = rangeOf(month);
    try {
      let childrenQuery = supabase.from("children").select("id,child_name,parent_id,branch_id").order("child_name");
      let packagesQuery = supabase.from("user_packages").select("id,user_id,child_id,child_name,package_name,total_count,remaining_count,status,voucher_type,branch_id").or("voucher_type.is.null,voucher_type.neq.shuttle").order("created_at", { ascending: false });
      let logsQuery = supabase.from("attendance_logs").select("child_id,date,status,check_in").gte("date", period.from).lte("date", period.to).not("check_in", "is", null);
      const selectedBranch = profile.role === "coach" ? profile.branch_id : branchFilter === "all" ? null : branchFilter;
      if (selectedBranch) {
        childrenQuery = childrenQuery.eq("branch_id", selectedBranch);
        packagesQuery = packagesQuery.eq("branch_id", selectedBranch);
        logsQuery = logsQuery.eq("branch_id", selectedBranch);
      }
      const [childResult, packageResult, logResult] = await Promise.all([childrenQuery, packagesQuery, logsQuery]);
      if (childResult.error) throw childResult.error;
      if (packageResult.error) throw packageResult.error;
      if (logResult.error) throw logResult.error;
      const children = childResult.data ?? [];
      const packages = packageResult.data ?? [];
      const parentIds = [...new Set(children.map((child: any) => child.parent_id).filter(Boolean))];
      const packageIds = packages.map((item: any) => item.id);
      const [parentResult, usageResult] = await Promise.all([
        parentIds.length ? supabase.from("users").select("id,name").in("id", parentIds) : Promise.resolve({ data: [], error: null }),
        packageIds.length ? supabase.from("package_usage_logs").select("user_package_id,child_id,quantity,consumed_at,reservations(class_date,attendance_status)").in("user_package_id", packageIds).eq("status", "consumed") : Promise.resolve({ data: [], error: null }),
      ]);
      if (parentResult.error) throw parentResult.error;
      if (usageResult.error) throw usageResult.error;
      const parents = new Map((parentResult.data ?? []).map((item: any) => [item.id, item.name]));
      const packageMap = new Map<string, any[]>();
      packages.forEach((item: any) => item.child_id && packageMap.set(item.child_id, [...(packageMap.get(item.child_id) ?? []), item]));
      const legacy = new Map<string, string[]>();
      (logResult.data ?? []).forEach((log: any) => { if (!excluded(log.status)) legacy.set(log.child_id, [...(legacy.get(log.child_id) ?? []), log.date]); });
      const usage = new Map<string, string[]>();
      (usageResult.data ?? []).forEach((item: any) => {
        const reservation: any = firstJoined(item.reservations);
        if (excluded(reservation?.attendance_status ?? null)) return;
        const date = reservation?.class_date ?? item.consumed_at?.slice(0, 10);
        if (!date || date < period.from || date > period.to) return;
        const dates = usage.get(item.user_package_id) ?? [];
        for (let index = 0; index < Math.max(1, item.quantity ?? 1); index += 1) dates.push(date);
        usage.set(item.user_package_id, dates);
      });
      const rows: AttendanceRow[] = [];
      children.forEach((child: any) => {
        const items = packageMap.get(child.id) ?? [];
        if (!items.length) rows.push({ id: `child-${child.id}`, childId: child.id, childName: child.child_name ?? "이름 없음", parentName: parents.get(child.parent_id) ?? "-", packageName: "이용권 없음", weekly: null, total: 0, used: 0, remaining: 0, dates: [] });
        items.forEach((item: any) => {
          let dates = [...(usage.get(item.id) ?? [])].sort();
          if (!dates.length && items.length === 1) dates = [...(legacy.get(child.id) ?? [])].sort();
          const total = Math.min(MAX_SLOTS, item.total_count ?? 0);
          const used = Math.min(MAX_SLOTS, Math.max((item.total_count ?? 0) - (item.remaining_count ?? 0), dates.length));
          rows.push({ id: item.id, childId: child.id, childName: child.child_name ?? item.child_name ?? "이름 없음", parentName: parents.get(child.parent_id) ?? "-", packageName: item.package_name ?? "수업권", weekly: weeklyCount(item.package_name), total, used, remaining: Math.max(0, item.remaining_count ?? total - used), dates: dates.slice(0, MAX_SLOTS) });
        });
      });
      setAttendance(rows);
    } catch (reason: any) { setError(reason?.message ?? "출결표를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [branchFilter, month, profile]);

  const loadSchedules = useCallback(async () => {
    if (!profile) return;
    setLoading(true); setError("");
    try {
      let query = supabase.from("class_schedules").select("id,branch_id,target_class,day_of_week,start_time,end_time,max_people,branches(name)").eq("is_active", true).order("start_time");
      const selectedBranch = profile.role === "coach" ? profile.branch_id : branchFilter === "all" ? null : branchFilter;
      if (selectedBranch) query = query.eq("branch_id", selectedBranch);
      let reservationQuery = supabase.from("reservations").select("id,schedule_id,class_date,status,attendance_status,branch_id,child_id,user_id").gte("class_date", localDate(weekStart)).lte("class_date", localDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)));
      if (selectedBranch) reservationQuery = reservationQuery.eq("branch_id", selectedBranch);
      const [{ data, error: queryError }, { data: reservationData, error: reservationError }] = await Promise.all([query, reservationQuery]);
      if (queryError) throw queryError;
      if (reservationError) throw reservationError;
      setSchedules((data ?? []).map((item: any) => ({ ...item, branches: firstJoined(item.branches) })) as ClassSchedule[]);
      const activeReservations = (reservationData ?? []).filter((item: any) => !["cancelled", "canceled", "취소", "취소요청", "cancel_requested"].includes(item.status ?? ""));
      const childIds = [...new Set(activeReservations.map((item: any) => item.child_id).filter(Boolean))];
      const userIds = [...new Set(activeReservations.map((item: any) => item.user_id).filter(Boolean))];
      const [childrenResult, usersResult] = await Promise.all([
        childIds.length ? supabase.from("children").select("id,child_name").in("id", childIds) : Promise.resolve({ data: [], error: null }),
        userIds.length ? supabase.from("users").select("id,name,phone").in("id", userIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (childrenResult.error) throw childrenResult.error;
      if (usersResult.error) throw usersResult.error;
      const childNames = new Map((childrenResult.data ?? []).map((item: any) => [item.id, { child_name: item.child_name }]));
      const parentProfiles = new Map((usersResult.data ?? []).map((item: any) => [item.id, { name: item.name, phone: item.phone }]));
      setScheduleReservations(activeReservations.map((item: any) => ({ ...item, children: childNames.get(item.child_id) ?? null, users: parentProfiles.get(item.user_id) ?? null })) as ScheduleReservation[]);
    } catch (reason: any) { setError(reason?.message ?? "시간표를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [branchFilter, profile, weekStart]);

  useEffect(() => {
    if (!profile) return;
    // 인증 프로필과 선택 탭이 확정된 뒤 해당 원격 장부를 동기화합니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "payments") void loadPayments();
    else if (tab === "attendance") void loadAttendance();
    else void loadSchedules();
  }, [loadAttendance, loadPayments, loadSchedules, profile, tab]);

  const shownPayments = useMemo(() => payments.filter((item) => {
    const target = `${item.users?.name ?? ""} ${item.users?.email ?? ""} ${item.pg_tid ?? ""} ${item.id} ${item.products.map((product) => product.package_name).join(" ")}`.toLowerCase();
    return (statusFilter === "all" || item.status === statusFilter) && target.includes(search.trim().toLowerCase());
  }), [payments, search, statusFilter]);
  const shownAttendance = useMemo(() => attendance.filter((item) => `${item.childName} ${item.parentName} ${item.packageName}`.toLowerCase().includes(search.trim().toLowerCase())), [attendance, search]);
  const stats = useMemo(() => { const paid = payments.filter((item) => ["paid", "success"].includes(item.status ?? "")); return { revenue: paid.reduce((sum, item) => sum + (item.final_amount ?? item.total_amount ?? 0), 0), paid: paid.length, pending: payments.filter((item) => item.status === "pending_payment").length, failed: payments.filter((item) => ["failed", "cancelled", "canceled"].includes(item.status ?? "")).length }; }, [payments]);

  const downloadWorkbook = async (kind: Tab) => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ground Corporation";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(kind === "payments" ? "결제 내역" : `${month} 출결표`, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    if (kind === "payments") {
      sheet.columns = [
        { header: "결제일", key: "createdAt", width: 22 },
        { header: "회원", key: "name", width: 16 },
        { header: "이메일", key: "email", width: 30 },
        { header: "결제 상품", key: "products", width: 38 },
        { header: "결제 금액", key: "amount", width: 15 },
        { header: "결제 수단", key: "method", width: 24 },
        { header: "상태", key: "status", width: 14 },
        { header: "거래번호", key: "transaction", width: 34 },
      ];
      shownPayments.forEach((item) => sheet.addRow({
        createdAt: new Date(item.created_at),
        name: item.users?.name ?? "회원 정보 없음",
        email: item.users?.email ?? "",
        products: item.products.length ? item.products.map((product) => product.package_name ?? "상품명 없음").join(", ") : "연결 상품 없음",
        amount: item.final_amount ?? item.total_amount ?? 0,
        method: paymentDetail(item.payment_method, item.pg_tid),
        status: statusText(item.status),
        transaction: item.pg_tid ?? item.id,
      }));
      sheet.getColumn("createdAt").numFmt = "yyyy-mm-dd hh:mm";
      sheet.getColumn("amount").numFmt = "#,##0\"원\"";
    } else {
      sheet.columns = [
        { header: "자녀", key: "child", width: 14 },
        { header: "보호자", key: "parent", width: 14 },
        { header: "이용권", key: "package", width: 30 },
        { header: "주 횟수", key: "weekly", width: 11 },
        { header: "사용 가능", key: "total", width: 11 },
        { header: "사용", key: "used", width: 9 },
        { header: "잔여", key: "remaining", width: 9 },
        ...Array.from({ length: MAX_SLOTS }, (_, index) => ({ header: `${index + 1}회`, key: `slot${index + 1}`, width: 12 })),
        { header: "출석일", key: "dates", width: 42 },
      ];
      shownAttendance.forEach((item) => {
        const slots = Object.fromEntries(Array.from({ length: MAX_SLOTS }, (_, index) => [`slot${index + 1}`, item.dates[index] ?? ""]));
        sheet.addRow({ child: item.childName, parent: item.parentName, package: item.packageName, weekly: item.weekly ? `주 ${item.weekly}회` : "-", total: item.total, used: item.used, remaining: item.remaining, ...slots, dates: item.dates.join(", ") });
      });
    }

    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
    sheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: "middle", horizontal: rowNumber === 1 ? "center" : "left" };
      row.eachCell((cell) => { cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } }; });
    });
    if (kind === "attendance") {
      for (let column = 8; column < 8 + MAX_SLOTS; column += 1) sheet.getColumn(column).alignment = { horizontal: "center", vertical: "middle" };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = kind === "payments" ? `결제내역_${new Date().toISOString().slice(0, 10)}.xlsx` : `출결표_${month}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const logout = async () => { await supabase.auth.signOut(); router.replace("/auth/login"); };

  if (authLoading) return <Center><Loader2 className="animate-spin text-blue-600" size={36} /></Center>;
  if (forbidden) return <Center><ShieldAlert className="text-rose-500" size={44} /><h1 className="text-xl font-black">접근 권한이 없습니다</h1><p className="text-sm text-slate-500">결제 내역과 출결표는 코치와 관리자만 확인할 수 있습니다.</p></Center>;

  const activeBranchId = profile?.role === "coach" ? profile.branch_id : branchFilter === "all" ? null : branchFilter;
  const activeBranchName = activeBranchId ? branches.find((branch) => branch.id === activeBranchId)?.name ?? null : null;
  return <><BranchHeader branchId={activeBranchId} branchName={activeBranchName} onLogout={logout} /><main className="min-h-screen bg-slate-50 pt-[104px] text-slate-950"><div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
    <header className="mb-6 flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold tracking-[.18em] text-blue-300">STAFF MY PAGE</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">운영 내역 관리</h1><p className="mt-2 text-sm text-slate-300">{profile?.name ?? "담당자"}님 · {profile?.role === "admin" ? "관리자" : "코치"}</p></div><button onClick={logout} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/20"><LogOut size={17} /> 로그아웃</button></header>
    <div className="mb-5 grid grid-cols-3 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200 sm:w-[620px]"><TabButton active={tab === "payments"} onClick={() => { setTab("payments"); setSearch(""); }} icon={<CreditCard size={18} />} label="결제 내역" /><TabButton active={tab === "attendance"} onClick={() => { setTab("attendance"); setSearch(""); }} icon={<CalendarCheck size={18} />} label="출결표" /><TabButton active={tab === "schedule"} onClick={() => { setTab("schedule"); setSearch(""); }} icon={<Clock3 size={18} />} label="시간표" /></div>
    {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">{error}</div>}
    {tab === "payments" ? <>
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="결제 매출" value={`${won.format(stats.revenue)}원`} icon={<CreditCard />} color="blue" /><Stat label="결제 완료" value={`${stats.paid}건`} icon={<Check />} color="green" /><Stat label="입금 대기" value={`${stats.pending}건`} icon={<CreditCard />} color="amber" /><Stat label="실패·취소" value={`${stats.failed}건`} icon={<ShieldAlert />} color="rose" /></section>
      <Toolbar search={search} setSearch={setSearch} placeholder="회원명, 이메일, 거래번호 검색"><BranchFilter profile={profile} branches={branches} value={branchFilter} onChange={setBranchFilter} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"><option value="all">전체 상태</option><option value="paid">결제 완료</option><option value="pending_payment">입금 대기</option><option value="failed">결제 실패</option><option value="refunded">환불</option></select><button onClick={() => void downloadWorkbook("payments")} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><Download size={17} /> Excel</button></Toolbar>
      <TableShell empty={!loading && !shownPayments.length} emptyText="조건에 맞는 결제 내역이 없습니다."><table className="min-w-[1250px] text-left text-sm"><thead className="bg-slate-100 text-xs font-black text-slate-500"><tr><Th>결제일</Th><Th>회원</Th><Th>결제 상품</Th><Th>결제 금액</Th><Th>결제 수단</Th><Th>상태</Th><Th>거래번호</Th><Th>관리</Th></tr></thead><tbody className="divide-y divide-slate-100">{shownPayments.map((item) => {
        const { refunded, remaining } = getRefundInfo(item);
        const originalAmount = item.final_amount ?? item.total_amount ?? 0;
        const isRefundRow = originalAmount < 0 || (item.pg_tid && item.pg_tid.endsWith("_REFUND"));
        
        return <tr key={item.id} className="hover:bg-blue-50/40"><Td>{new Date(item.created_at).toLocaleString("ko-KR")}</Td><Td><b>{item.users?.name ?? "회원 정보 없음"}</b><p className="mt-1 text-xs text-slate-400">{item.users?.email ?? "-"}</p></Td><Td><div className="max-w-[300px] space-y-1">{item.products.length ? item.products.map((product, index) => <div key={`${product.package_name}-${index}`} className="rounded-lg bg-slate-100 px-2.5 py-1.5"><b className="block truncate">{product.package_name ?? "상품명 없음"}</b><span className="text-xs text-slate-500">{product.total_count ? `${product.total_count}회` : "횟수 미지정"}{product.price != null ? ` · ${won.format(product.price)}원` : ""}</span></div>) : <span className="text-slate-400">연결 상품 없음</span>}</div></Td><Td><b>{won.format(originalAmount)}원</b>{refunded > 0 && (<div className="mt-1 text-[11px] space-y-0.5"><p className="font-bold text-rose-600">환불 완료: {won.format(refunded)}원</p><p className="font-bold text-slate-500">남은 잔액: {won.format(remaining)}원</p></div>)}</Td><Td><b>{paymentDetail(item.payment_method, item.pg_tid)}</b>{item.payment_method === "CARD" && <p className="mt-1 text-xs text-amber-600">카드사 정보 미저장</p>}</Td><Td><Badge status={item.status} /></Td><Td><span title={item.pg_tid ?? item.id} className="block max-w-[220px] truncate font-mono text-xs text-slate-500">{item.pg_tid ?? item.id}</span></Td><Td>{["paid", "success"].includes(item.status ?? "") && item.payment_method === "CARD" && !isRefundRow ? (remaining > 0 ? (<button onClick={() => setCancelTarget(item)} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100">결제 취소</button>) : (<span className="text-xs font-bold text-slate-400">취소 완료</span>)) : ["cancelled", "canceled", "refunded"].includes(item.status ?? "") || isRefundRow ? (<span className="text-xs font-bold text-slate-400">취소 완료</span>) : ("-")}</Td></tr>;
      })}</tbody></table></TableShell>
    </> : tab === "attendance" ? <>
      <section className="mb-5 grid gap-3 sm:grid-cols-3"><Stat label="표시 자녀" value={`${new Set(shownAttendance.map((row) => row.childName)).size}명`} icon={<UsersRound />} color="blue" /><Stat label="이번 달 이용" value={`${shownAttendance.reduce((sum, row) => sum + row.dates.length, 0)}회`} icon={<CalendarCheck />} color="green" /><Stat label="남은 이용권" value={`${shownAttendance.reduce((sum, row) => sum + row.remaining, 0)}회`} icon={<TicketCheck />} color="amber" /></section>
      <Toolbar search={search} setSearch={setSearch} placeholder="자녀, 보호자, 이용권 검색"><BranchFilter profile={profile} branches={branches} value={branchFilter} onChange={setBranchFilter} /><div className="flex items-center rounded-xl border border-slate-200"><button aria-label="이전 달" onClick={() => setMonth(moveMonth(month, -1))} className="p-3"><ChevronLeft size={18} /></button><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-[132px] py-3 text-center text-sm font-black outline-none" /><button aria-label="다음 달" onClick={() => setMonth(moveMonth(month, 1))} className="p-3"><ChevronRight size={18} /></button></div><button onClick={() => void downloadWorkbook("attendance")} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><Download size={17} /> Excel</button></Toolbar>
      <div className="mb-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-100">등원 처리되어 이용권이 실제 차감된 날짜만 체크됩니다. 결석·보강은 포함하지 않으며 최대 20회까지 표시합니다.</div>
      <TableShell empty={!loading && !shownAttendance.length} emptyText="조건에 맞는 출결 정보가 없습니다."><table className="min-w-[1000px] w-full text-left text-xs sm:text-[13px]"><thead className="bg-slate-100 text-[11px] font-black text-slate-500"><tr><Th sticky>자녀 / 보호자</Th><Th>이용권</Th><Th>주 횟수</Th><Th>사용</Th>{Array.from({ length: MAX_SLOTS }, (_, i) => <Th key={i}>{i + 1}</Th>)}<Th>출석일</Th></tr></thead><tbody className="divide-y divide-slate-100">{shownAttendance.map((row) => <tr key={row.id} className="hover:bg-blue-50/30"><Td sticky><div className="flex items-center gap-2"><b className="text-sm">{row.childName}</b></div><p className="mt-1 text-[11px] text-slate-400">보호자 {row.parentName}</p></Td><Td><b className="text-[12px]">{row.packageName}</b><p className="mt-1 text-[11px] text-slate-400">{row.total}회권 · 잔여 {row.remaining}회</p></Td><Td>{row.weekly ? <b>주 {row.weekly}회</b> : "-"}</Td><Td><b className="text-blue-700">{row.used}</b> / {row.total}</Td>{Array.from({ length: MAX_SLOTS }, (_, i) => { const date = row.dates[i]; const isClickable = i < row.total; return <td key={i} className="px-0.5 py-2 text-center">{date ? (<button type="button" onClick={() => void handleCancelAttendance(row.childId, date)} className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-black hover:bg-rose-600 hover:scale-105 transition shadow-sm" title={`${date} 출석 취소 (클릭)`}>{date.slice(5).replace("-", ".")}</button>) : (<button type="button" onClick={() => { setAttendanceModal({ childId: row.childId, childName: row.childName }); setAttendanceDate(new Date().toISOString().slice(0, 10)); }} disabled={!isClickable} className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition hover:scale-105 ${isClickable ? "bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600" : "bg-slate-50 text-slate-200 cursor-not-allowed"}`} title={`${i + 1}회차 출석 등록 (클릭)`}>{i + 1}</button>)}</td>; })}<Td><div className="flex max-w-[180px] flex-wrap gap-1">{row.dates.length ? row.dates.map((date, i) => <button key={`${date}-${i}`} onClick={() => void handleCancelAttendance(row.childId, date)} className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition" title="출석 취소 (클릭)">{date.slice(5).replace("-", ".")}</button>) : <span className="text-slate-400">출석 없음</span>}</div></Td></tr>)}</tbody></table></TableShell>
    </> : <>
      <Toolbar search={search} setSearch={setSearch} placeholder="수업명 또는 지점 검색"><BranchFilter profile={profile} branches={branches} value={branchFilter} onChange={setBranchFilter} /><div className="flex items-center rounded-xl border border-slate-200"><button aria-label="이전 주" onClick={() => setWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7))} className="p-3"><ChevronLeft size={18} /></button><span className="min-w-[170px] px-2 text-center text-sm font-black">{localDate(weekStart).slice(5).replace("-", ".")} ~ {localDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)).slice(5).replace("-", ".")}</span><button aria-label="다음 주" onClick={() => setWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7))} className="p-3"><ChevronRight size={18} /></button></div></Toolbar>
      <WeeklySchedule schedules={schedules.filter((item) => `${item.target_class} ${item.branches?.name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))} reservations={scheduleReservations} weekStart={weekStart} showBranch={profile?.role === "admin" && branchFilter === "all"} />
    </>}
    {loading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/65 backdrop-blur-sm"><Loader2 className="animate-spin text-blue-600" size={38} /></div>}
    {cancelTarget && (
      <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setCancelTarget(null)}>
        <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-widest text-rose-600">결제 취소 / 환불</p>
              <h3 className="mt-1 text-xl font-black">{cancelTarget.users?.name ?? "회원"}님의 결제건</h3>
              <p className="mt-1 text-sm text-slate-500">거래번호: {cancelTarget.pg_tid ?? cancelTarget.id}</p>
            </div>
            <button onClick={() => setCancelTarget(null)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black">닫기</button>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">결제 상품</span><span className="font-bold truncate max-w-[200px]">{cancelTarget.products?.[0]?.package_name ?? "이용권"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">원 결제 금액</span><span className="font-bold text-slate-950">{won.format(cancelTarget.final_amount ?? cancelTarget.total_amount ?? 0)}원</span></div>
              {(() => {
                const { refunded, remaining } = getRefundInfo(cancelTarget);
                if (refunded > 0) {
                  return (
                    <>
                      <div className="flex justify-between text-rose-600"><span className="text-slate-500 font-medium">이미 환불된 금액</span><span className="font-bold">-{won.format(refunded)}원</span></div>
                      <div className="flex justify-between text-blue-600"><span className="text-slate-500 font-medium">남은 취소 가능 잔액</span><span className="font-bold">{won.format(remaining)}원</span></div>
                    </>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              {(() => {
                const { remaining } = getRefundInfo(cancelTarget);
                return (
                  <>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">취소 금액 (미입력 시 남은 잔액 전체 취소)</label>
                    <input
                      type="number"
                      placeholder={`최대 ${remaining.toLocaleString()}원`}
                      value={cancelAmountStr}
                      onChange={(e) => setCancelAmountStr(e.target.value)}
                      className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                );
              })()}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">취소 사유</label>
              <input
                type="text"
                placeholder="사유를 입력해 주세요 (예: 보호자 변심)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleCancelPayment}
              disabled={cancelLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 text-sm font-black text-white hover:bg-rose-700 disabled:bg-rose-300"
            >
              {cancelLoading ? "취소 요청 처리 중..." : "결제 취소 승인하기"}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* 🚀 수동 출석 등록 모달 렌더링 */}
    {attendanceModal && (
      <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setAttendanceModal(null)}>
        <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-widest text-blue-600">출결 수동 관리</p>
              <h3 className="mt-1 text-xl font-black">{attendanceModal.childName} 학생 출석 등록</h3>
              <p className="mt-1 text-xs text-slate-500">수강권 차감 및 학부모 알림 발송 없이 장부에만 기록합니다.</p>
            </div>
            <button onClick={() => setAttendanceModal(null)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black">닫기</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">출석 처리할 날짜 선택</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleManualAttendance}
              disabled={actionLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {actionLoading ? "출석 처리 중..." : "출석 완료 체크하기"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div></main></>;
}

function Center({ children }: { children: React.ReactNode }) { return <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">{children}</main>; }
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${active ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}>{icon}{label}</button>; }
function Toolbar({ search, setSearch, placeholder, children }: { search: string; setSearch: (value: string) => void; placeholder: string; children: React.ReactNode }) { return <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 lg:flex-row"><label className="relative min-w-0 flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></label>{children}</div>; }
function BranchFilter({ profile, branches, value, onChange }: { profile: Profile | null; branches: Branch[]; value: string; onChange: (value: string) => void }) { if (profile?.role !== "admin") return <div className="flex items-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500">본인 지점</div>; return <select aria-label="지점 선택" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"><option value="all">전체 지점</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>; }
function WeeklySchedule({ schedules, reservations, weekStart, showBranch }: { schedules: ClassSchedule[]; reservations: ScheduleReservation[]; weekStart: Date; showBranch: boolean }) {
  const [selected, setSelected] = useState<{ schedule: ClassSchedule; date: string; reservations: ScheduleReservation[] } | null>(null);
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const dayAliases: Record<string, string> = { 월요일: "월", 화요일: "화", 수요일: "수", 목요일: "목", 금요일: "금", 토요일: "토", 일요일: "일", Monday: "월", Tuesday: "화", Wednesday: "수", Thursday: "목", Friday: "금", Saturday: "토", Sunday: "일" };
  const normalizedDay = (day: string) => dayAliases[day] ?? day.slice(0, 1);
  const minuteOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const startHour = schedules.length ? Math.max(0, Math.floor(Math.min(...schedules.map((item) => minuteOf(item.start_time))) / 60)) : 6;
  const endHour = schedules.length ? Math.min(24, Math.ceil(Math.max(...schedules.map((item) => minuteOf(item.end_time))) / 60)) : 22;
  const hourHeight = 72;
  const calendarHeight = Math.max(8, endHour - startHour) * hourHeight;
  if (!schedules.length) return <div className="rounded-3xl bg-white p-16 text-center text-sm font-bold text-slate-400 shadow-sm ring-1 ring-slate-200">등록된 활성 시간표가 없습니다.</div>;
  return <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
    <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-black">주간 수업 시간표</h2><p className="mt-1 text-sm text-slate-500">DB에 등록된 활성 수업을 요일과 시간 순으로 표시합니다.</p></div>
    <div className="overflow-x-auto"><div className="min-w-[1050px]">
      <div className="grid grid-cols-[76px_repeat(7,minmax(130px,1fr))] border-b border-slate-200 bg-slate-50"><div className="p-4 text-center text-xs font-black text-slate-400">시간</div>{days.map((day) => <div key={day} className="border-l border-slate-200 p-4 text-center font-black">{day}요일</div>)}</div>
      <div className="grid grid-cols-[76px_repeat(7,minmax(130px,1fr))]">
        <div className="relative border-r border-slate-200" style={{ height: calendarHeight }}>{Array.from({ length: endHour - startHour + 1 }, (_, index) => <span key={index} className="absolute right-3 -translate-y-1/2 text-xs font-bold text-slate-400" style={{ top: index * hourHeight }}>{String(startHour + index).padStart(2, "0")}:00</span>)}</div>
        {days.map((day, dayIndex) => <div key={day} className="relative border-r border-slate-100 bg-[linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)]" style={{ height: calendarHeight, backgroundSize: `100% ${hourHeight}px` }}>
          {schedules.filter((item) => normalizedDay(item.day_of_week) === day).map((item, index) => {
            const top = ((minuteOf(item.start_time) - startHour * 60) / 60) * hourHeight;
            const height = Math.max(48, ((minuteOf(item.end_time) - minuteOf(item.start_time)) / 60) * hourHeight - 4);
            const date = localDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayIndex));
            const booked = reservations.filter((reservation) => reservation.schedule_id === item.id && reservation.class_date === date);
            return <button type="button" key={item.id} onClick={() => setSelected({ schedule: item, date, reservations: booked })} className="absolute left-1.5 right-1.5 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-left shadow-sm transition hover:border-blue-500 hover:bg-blue-100" style={{ top: top + 2, height, marginLeft: index % 2 ? 5 : 0 }} title="예약자 확인"><p className="truncate text-xs font-black text-blue-950">{item.target_class}</p><p className="mt-1 text-[11px] font-bold text-blue-700">{item.start_time.slice(0, 5)}~{item.end_time.slice(0, 5)}</p><p className="mt-1 text-[10px] font-black text-blue-600">예약 {booked.length}{item.max_people ? ` / ${item.max_people}` : ""}명</p>{showBranch && <p className="mt-1 truncate text-[10px] text-slate-500">{item.branches?.name ?? item.branch_id ?? "지점 미지정"}</p>}</button>;
          })}
        </div>)}
      </div>
    </div></div>
    {selected && <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setSelected(null)}><div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-widest text-blue-600">예약 명단</p><h3 className="mt-1 text-xl font-black">{selected.schedule.target_class}</h3><p className="mt-1 text-sm text-slate-500">{selected.date} · {selected.schedule.start_time.slice(0, 5)}~{selected.schedule.end_time.slice(0, 5)}</p></div><button onClick={() => setSelected(null)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black">닫기</button></div><div className="mb-4 flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-3"><span className="text-sm font-bold text-blue-900">예약 인원</span><b className="text-blue-700">{selected.reservations.length}{selected.schedule.max_people ? ` / ${selected.schedule.max_people}` : ""}명</b></div>{selected.reservations.length ? <div className="space-y-2">{selected.reservations.map((reservation, index) => <div key={reservation.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"><div className="min-w-0"><p className="font-black">{index + 1}. {reservation.children?.child_name ?? "자녀 정보 없음"}</p><p className="mt-1 truncate text-xs text-slate-500">보호자 {reservation.users?.name ?? "-"}{reservation.users?.phone ? ` · ${reservation.users.phone}` : ""}</p></div><div className="text-right"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{reservation.attendance_status ?? reservation.status ?? "예약"}</span></div></div>)}</div> : <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">이 수업에 예약된 자녀가 없습니다.</div>}</div></div>}
  </section>;
}
function Stat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: "blue" | "green" | "amber" | "rose" }) { const colors = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700" }; return <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div><div className={`rounded-2xl p-3 ${colors[color]}`}>{icon}</div></div>; }
function Badge({ status }: { status: string | null }) { const ok = ["paid", "success"].includes(status ?? ""); const pending = status === "pending_payment"; return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${ok ? "bg-emerald-50 text-emerald-700" : pending ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{statusText(status)}</span>; }
function TableShell({ children, empty, emptyText }: { children: React.ReactNode; empty: boolean; emptyText: string }) { return <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"><div className="overflow-x-auto">{children}</div>{empty && <div className="p-14 text-center text-sm font-bold text-slate-400">{emptyText}</div>}</div>; }
function Th({ children, sticky = false }: { children: React.ReactNode; sticky?: boolean }) { return <th className={`whitespace-nowrap px-4 py-4 ${sticky ? "sticky left-0 z-10 bg-slate-100" : ""}`}>{children}</th>; }
function Td({ children, sticky = false }: { children: React.ReactNode; sticky?: boolean }) { return <td className={`whitespace-nowrap px-4 py-4 align-middle ${sticky ? "sticky left-0 z-10 bg-white" : ""}`}>{children}</td>; }
