"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  Info,
  Loader2,
  ChevronRight,
  X,
  Ticket,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// --- 인터페이스 정의 ---
interface Schedule {
  id: string;
  start_time: string;
  end_time: string;
  target_class: string;
  min_age: number;
  max_age: number;
  branch_id: string;
}
interface Child {
  id: string;
  child_name: string;
  child_birth: string;
  target_class?: string;
}
interface UserPackage {
  id: string;
  package_name: string;
  remaining_count: number;
}
interface ReservationInsert {
  branch_id: string;
  user_id: string;
  child_id: string;
  child_name: string;
  schedule_id: string;
  package_id: string;
  class_date: string;
  status: string;
  attendance_status: string;
}

export default function ReservationPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [cart, setCart] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [availablePackages, setAvailablePackages] = useState<UserPackage[]>([]);
  const [modalStep, setModalStep] = useState<"none" | "child" | "package">(
    "none",
  );

  useEffect(() => {
    AOS.init({ duration: 800 });
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [selectedDate]);

  const fetchInitialData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
      const { data: children } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", user.id);
      if (children && children.length > 0) {
        setAllChildren(children as Child[]);
        setSelectedChild(children[0] as Child);
      }
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    const dayName = format(new Date(selectedDate), "eeeeee", { locale: ko });
    const { data } = await supabase
      .from("class_schedules")
      .select("*")
      .eq("day_of_week", dayName)
      .eq("is_active", true)
      .order("start_time", { ascending: true });
    setSchedules((data as Schedule[]) || []);
    setLoading(false);
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate || birthDate.length < 4) return 0;
    const year = parseInt(birthDate.substring(0, 4));
    return new Date().getFullYear() - year + 1;
  };

  const handleSelectClass = (item: Schedule) => {
    const isSelected = cart.find((c) => c.id === item.id);
    if (isSelected) {
      setCart(cart.filter((c) => c.id !== item.id));
    } else {
      setCart([...cart, item]);
    }
  };

  const handleStartBooking = () => {
    if (allChildren.length > 1) setModalStep("child");
    else checkPackagesForChild(allChildren[0]);
  };

  const checkPackagesForChild = async (child: Child) => {
    setSelectedChild(child);
    const { data: pkgs } = await supabase
      .from("user_packages")
      .select("id, package_name, remaining_count")
      .eq("user_id", currentUser.id)
      .eq("status", "active")
      .gt("remaining_count", 0);
    if (!pkgs || pkgs.length === 0) {
      alert("사용 가능한 이용권이 없습니다.");
      setModalStep("none");
      return;
    }
    if (pkgs.length > 1) {
      setAvailablePackages(pkgs as UserPackage[]);
      setModalStep("package");
    } else {
      processFinalReservation(child, pkgs[0] as UserPackage);
    }
  };

  const processFinalReservation = async (child: Child, pkg: UserPackage) => {
    if (pkg.remaining_count < cart.length) {
      alert(`잔여 횟수가 부족합니다. (현재 ${pkg.remaining_count}회)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const reservationData: ReservationInsert[] = cart.map((item) => ({
        branch_id: item.branch_id || currentUser.branch_id,
        user_id: currentUser.id,
        child_id: child.id,
        child_name: child.child_name,
        schedule_id: item.id,
        package_id: pkg.id,
        class_date: selectedDate,
        status: "pending",
        attendance_status: "yet",
      }));

      // 🚀 (supabase as any)를 통해 never 형식 에러 완벽 해결
      const { error: insErr } = await (supabase as any)
        .from("reservations")
        .insert(reservationData);
      if (insErr) throw insErr;

      const { error: updErr } = await (supabase as any)
        .from("user_packages")
        .update({ remaining_count: pkg.remaining_count - cart.length })
        .eq("id", pkg.id);
      if (updErr) throw updErr;

      router.push("/branch/siheung/reservation/success");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "예약 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
      setModalStep("none");
    }
  };

  const targetAge = calculateAge(
    selectedChild?.child_birth || currentUser?.birth_date,
  );

  return (
    <div className="bg-[#f2efe9] text-[#1a3021] min-h-screen pt-32 pb-20 font-sans">
      <div className="max-w-6xl mx-auto px-[5%]">
        <div
          className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6"
          data-aos="fade-up"
        >
          <div>
            <span className="text-[#d35400] font-black tracking-widest text-xs uppercase italic mb-2 block">
              Class Booking
            </span>
            <h1 className="text-5xl font-black tracking-tighter">
              수업 예약하기
            </h1>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-black/5 shadow-sm">
                <User size={16} className="text-[#d35400]" />
                <span className="font-bold text-sm">
                  {selectedChild?.child_name || "본인"} ({targetAge}세)
                </span>
              </div>
            </div>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border-none rounded-2xl px-6 py-4 font-black text-[#1a3021] shadow-xl focus:ring-2 focus:ring-[#d35400] outline-none cursor-pointer"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-[#d35400]" size={40} />
              </div>
            ) : schedules.length === 0 ? (
              <div className="bg-white rounded-[40px] p-20 text-center border border-black/5">
                <p className="text-gray-400 font-black">
                  해당 날짜에 개설된 수업이 없습니다.
                </p>
              </div>
            ) : (
              schedules.map((item) => {
                const canReserve = selectedChild?.target_class
                  ? selectedChild.target_class === item.target_class
                  : targetAge >= item.min_age && targetAge <= item.max_age;
                const isSelected = cart.find((c) => c.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => canReserve && handleSelectClass(item)}
                    className={`group p-6 rounded-[30px] border-2 transition-all cursor-pointer flex items-center justify-between
                      ${isSelected ? "bg-[#1a3021] border-[#1a3021] text-white shadow-xl scale-[1.02]" : canReserve ? "bg-white border-transparent hover:border-[#d35400] shadow-sm" : "bg-gray-100/50 border-transparent opacity-40 grayscale cursor-not-allowed"}
                    `}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`p-4 rounded-2xl ${isSelected ? "bg-white/10" : "bg-[#f2efe9]"}`}
                      >
                        <Clock
                          size={24}
                          className={
                            isSelected ? "text-white" : "text-[#1a3021]"
                          }
                        />
                      </div>
                      <div>
                        <p className="text-lg font-black">
                          {item.start_time.slice(0, 5)} -{" "}
                          {item.end_time.slice(0, 5)}
                        </p>
                        <p className="text-sm font-bold opacity-60">
                          {item.target_class} ({item.min_age}~{item.max_age}세)
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={24} className="text-[#d35400]" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <aside className="sticky top-32 h-fit">
            <div className="bg-[#1a3021] rounded-[40px] p-8 text-white shadow-2xl">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2 italic">
                <CheckCircle2 className="text-[#d35400]" /> SELECTED
              </h3>
              <div className="space-y-4 mb-8">
                {cart.length === 0 ? (
                  <p className="text-white/30 text-center py-10">
                    수업을 선택해주세요.
                  </p>
                ) : (
                  cart.map((c) => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10"
                    >
                      <span className="font-black text-sm">
                        {c.start_time.slice(0, 5)} 수업
                      </span>
                      <X
                        size={16}
                        className="cursor-pointer text-white/20 hover:text-red-400"
                        onClick={() => handleSelectClass(c)}
                      />
                    </div>
                  ))
                )}
              </div>
              <button
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleStartBooking}
                className="w-full py-5 bg-[#d35400] text-white rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "예약 확정하기"
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* 모달: 자녀 선택 */}
      {modalStep === "child" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-8 tracking-tighter text-center">
              누구의 수업을 예약할까요?
            </h3>
            <div className="space-y-3">
              {allChildren.map((child) => (
                <button
                  key={child.id}
                  onClick={() => checkPackagesForChild(child)}
                  className="w-full p-6 bg-[#f8f6f2] rounded-2xl font-black text-lg hover:bg-[#1a3021] hover:text-white transition-all flex justify-between items-center group"
                >
                  {child.child_name}{" "}
                  <ChevronRight className="text-[#d35400] group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setModalStep("none")}
              className="w-full mt-6 text-gray-400 font-bold text-sm"
            >
              취소하기
            </button>
          </div>
        </div>
      )}

      {/* 모달: 이용권 선택 */}
      {modalStep === "package" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <Ticket className="text-[#d35400]" />
              <h3 className="text-2xl font-black tracking-tighter">
                이용권 선택
              </h3>
            </div>
            <div className="space-y-3">
              {availablePackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => processFinalReservation(selectedChild!, pkg)}
                  className="w-full p-6 border-2 border-gray-100 rounded-2xl text-left hover:border-[#1a3021] transition-all group"
                >
                  <p className="font-black text-lg group-hover:text-[#d35400] transition-colors">
                    {pkg.package_name}
                  </p>
                  <p className="text-sm font-bold text-gray-400 mt-1">
                    잔여 횟수: {pkg.remaining_count}회
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setModalStep("none")}
              className="w-full mt-8 text-gray-400 font-bold text-sm"
            >
              취소하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
