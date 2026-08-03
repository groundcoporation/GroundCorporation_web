"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  CheckCircle2,
  Zap,
  Star,
  ShoppingCart,
  Trash2,
  CreditCard,
  PhoneCall,
  MessageCircle,
  Info,
  Loader2,
} from "lucide-react";

// [SECTION] 1. Interface Definitions (데이터 구조 정의)
interface CategoryData {
  id: string;
  name: string;
}

interface PackageOption {
  id: string;
  label: string;
  price: number;
  total_count?: number;
}

interface Package {
  id: string;
  name: string;
  description: string;
  category_id: string;
  is_consult: boolean; // 상담 전용 여부 (true일 경우 바로 결제 불가)
  package_options: PackageOption[];
}

export default function PurchasePage() {
  // [SECTION] 2. Configuration & State (설정 및 상태 관리)
  const branchId = "branch_1"; // 지점 고정 (시흥본점)

  const [categories, setCategories] = useState<CategoryData[]>([]); // 카테고리 목록
  const [activeCategory, setActiveCategory] = useState<string>(""); // 선택된 카테고리 ID
  const [packages, setPackages] = useState<Package[]>([]); // 표시될 패키지 목록
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [cart, setCart] = useState<any[]>([]); // 장바구니 상태
  const [showConsultModal, setShowConsultModal] = useState(false); // 상담 안내 모달 토글

  // [SECTION] 3. Initial Load (초기화)
  useEffect(() => {
    AOS.init({ duration: 1000, once: true }); // 애니메이션 라이브러리 초기화
    fetchCategories();
  }, []);

  // [SECTION] 4. Data Fetching (데이터 로드 로직)
  /**
   * 카테고리 목록 조회: branch_id에 해당하는 카테고리를 가져와 첫 번째 항목을 기본값으로 설정
   */
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("package_categories")
      .select("id, name")
      .eq("branch_id", branchId)
      .order("display_order", { ascending: true })
      .returns<CategoryData[]>();

    if (error) {
      console.error("카테고리 로드 실패:", error);
      return;
    }

    if (data && data.length > 0) {
      setCategories(data);
      setActiveCategory(data[0].id); // 첫 번째 카테고리 자동 활성화
    }
  };

  /**
   * 패키지 목록 조회: 현재 선택된 카테고리에 속한 패키지 및 세부 옵션들을 로드
   */
  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("packages")
      .select(`*, package_options (*)`) // 패키지와 옵션 정보를 조인해서 가져옴
      .eq("branch_id", branchId)
      .eq("category_id", activeCategory)
      .order("display_order", { ascending: true });

    setPackages(data || []);
    setLoading(false);
  };

  // 카테고리 탭 변경 시마다 패키지 새로고침
  useEffect(() => {
    if (activeCategory) fetchPackages();
  }, [activeCategory]);

  // [SECTION] 5. Cart Logic (장바구니 관련 함수)
  /**
   * 장바구니 추가: 상담 전용 상품일 경우 모달을 띄우고, 아닐 경우 고유 ID와 함께 장바구니 추가
   */
  const addToCart = (pkg: Package, option: PackageOption) => {
    if (pkg.is_consult) {
      setShowConsultModal(true);
      return;
    }
    const uniqueId = Date.now(); // 중복 방지용 타임스탬프 ID
    setCart([
      ...cart,
      {
        id: uniqueId,
        name: pkg.name,
        option: option.label,
        price: option.price,
      },
    ]);
  };

  /**
   * 장바구니 삭제: 선택한 항목의 고유 ID를 필터링하여 제외
   */
  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // 장바구니 합계 금액 계산
  const totalPrice = cart.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className="bg-[#f2efe9] text-[#1a3021] min-h-screen pb-20">
      {/* [UI] 1. Hero Section: 타이틀 및 지점 정보 */}
      <section className="pt-32 pb-12 px-[5%] max-w-[1600px] mx-auto">
        <div data-aos="fade-right">
          <span className="text-[#d35400] font-black tracking-[0.4em] text-xs uppercase italic mb-2 block">
            Premium Membership
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-[#1a3021]">
            SIHEUNG <span className="text-[#d35400]">SHOP</span>
          </h1>
          <p className="text-gray-400 font-bold mt-4">
            시흥본점의 프리미엄 이용권을 만나보세요.
          </p>
        </div>
      </section>

      {/* [UI] 2. Category Tabs: 카테고리 필터링 탭 */}
      <div className="max-w-[1600px] mx-auto px-[5%] mb-12">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-8 py-4 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-[#d35400] text-white shadow-lg"
                  : "bg-white text-gray-400 hover:bg-gray-100 shadow-sm"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-[5%] flex flex-col lg:flex-row gap-10">
        {/* [UI] 3. Product List: 상품 카드 그리드 영역 */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-[#d35400]" size={40} />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  data-aos="fade-up"
                  className="bg-white p-8 rounded-[40px] shadow-xl border border-black/5 flex flex-col hover:border-[#d35400]/20 transition-all group"
                >
                  <div className="mb-6">
                    <div className="w-12 h-12 bg-[#f2efe9] rounded-xl flex items-center justify-center text-[#d35400] mb-4 group-hover:scale-110 transition-transform">
                      {pkg.name.includes("취미") ? (
                        <Star size={24} />
                      ) : (
                        <Zap size={24} />
                      )}
                    </div>
                    <h3 className="text-2xl font-black tracking-tighter">
                      {pkg.name}
                    </h3>
                    <p className="text-gray-400 text-sm font-bold mt-1 line-clamp-2">
                      {pkg.description}
                    </p>
                  </div>

                  {/* 상담 상품 vs 일반 상품 분기 처리 */}
                  {pkg.is_consult ? (
                    <button
                      onClick={() => setShowConsultModal(true)}
                      className="mt-auto w-full py-4 bg-[#1a3021] text-white rounded-2xl font-black hover:bg-[#d35400] transition-all flex items-center justify-center gap-2"
                    >
                      <PhoneCall size={18} /> 상담 예약하기
                    </button>
                  ) : (
                    <div className="space-y-2 mt-auto">
                      {pkg.package_options.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => addToCart(pkg, opt)}
                          className="flex justify-between items-center p-4 bg-[#f8f6f2] rounded-xl hover:bg-[#1a3021] hover:text-white transition-all cursor-pointer group/item"
                        >
                          <span className="font-bold text-sm">{opt.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#d35400] group-hover/item:text-white">
                              {opt.price.toLocaleString()}원
                            </span>
                            <ShoppingCart
                              size={16}
                              className="opacity-0 group-hover/item:opacity-100 transition-opacity"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 유의사항 섹션 */}
          <div className="mt-12 p-8 bg-white/50 rounded-[30px] border border-dashed border-black/10">
            <h4 className="font-black text-sm mb-4 flex items-center gap-2 text-[#1a3021]">
              <Info size={18} /> 가입 전 유의사항
            </h4>
            <ul className="text-xs font-bold text-gray-500 space-y-2">
              <li>• 모든 수업료는 부가세(VAT) 별도 금액입니다.</li>
              <li>
                • 가입비 10만원은 별도이며, 가입 시 유니폼 세트가 지급됩니다.
              </li>
              <li>
                • 결제 후 영업일 기준 1~2일 내로 담당자가 연락을 드립니다.
              </li>
            </ul>
          </div>
        </div>

        {/* [UI] 4. Sticky Cart: 우측 사이드바 장바구니 */}
        <aside className="w-full lg:w-[420px] sticky top-32 h-fit">
          <div className="bg-white rounded-[50px] shadow-2xl overflow-hidden border border-black/5">
            <div className="bg-[#1a3021] p-8 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShoppingCart className="text-[#d35400]" />
                <h2 className="text-xl font-black uppercase tracking-tighter">
                  My Cart
                </h2>
              </div>
              <span className="bg-[#d35400] px-3 py-1 rounded-full text-xs font-black">
                {cart.length}
              </span>
            </div>

            {/* 장바구니 리스트 영역 */}
            <div className="p-8 space-y-6 max-h-[400px] overflow-y-auto scrollbar-hide">
              {cart.length === 0 ? (
                <div className="py-20 text-center opacity-30 font-bold text-sm">
                  상품을 선택해 주세요.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center animate-in fade-in slide-in-from-right-2"
                  >
                    <div>
                      <h4 className="font-black text-sm text-[#1a3021]">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-bold">
                        {item.option}
                      </p>
                      <p className="text-[#d35400] font-black text-sm mt-1">
                        {item.price.toLocaleString()}원
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 결제 합계 및 버튼 영역 */}
            <div className="p-10 bg-[#f8f6f2] border-t border-black/5">
              <div className="flex justify-between items-end mb-8">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Total Amount
                </span>
                <span className="text-4xl font-black tracking-tighter text-[#1a3021]">
                  {totalPrice.toLocaleString()}원
                </span>
              </div>
              <button
                disabled={cart.length === 0}
                className="w-full py-6 bg-[#d35400] text-white rounded-[30px] font-black text-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-3"
              >
                <CreditCard size={24} /> 결제 진행하기
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* [UI] 5. Consult Modal: 신규 수강생 상담 안내 팝업 */}
      {showConsultModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-[#f2efe9] rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle size={40} className="text-[#d35400]" />
            </div>
            <h3 className="text-2xl font-black mb-4 tracking-tighter">
              반 배정 상담 안내
            </h3>
            <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8">
              신규 수강생은 원활한 수업 적응을 위해 <br /> 전화 상담 후 결제가
              가능합니다.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button className="py-4 bg-[#FEE500] text-[#1a3021] rounded-2xl font-black text-sm">
                카카오톡
              </button>
              <button className="py-4 bg-[#1a3021] text-white rounded-2xl font-black text-sm">
                전화상담
              </button>
            </div>
            <button
              onClick={() => setShowConsultModal(false)}
              className="mt-6 text-gray-400 font-bold text-xs underline"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
