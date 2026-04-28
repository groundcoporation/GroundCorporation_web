"use client";

import React, { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  CheckCircle2,
  Bus,
  Zap,
  Clock,
  Star,
  ChevronDown,
  ShoppingCart,
  Trash2,
  CreditCard,
  X,
} from "lucide-react";

export default function SiheungShop() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  // 장바구니 담기
  const addToCart = (item: any) => {
    const uniqueId = Date.now();
    setCart([...cart, { ...item, id: uniqueId }]);
  };

  // 장바구니 삭제
  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // 총액 계산
  const totalPrice = cart.reduce((acc, curr) => {
    const priceNumber = parseInt(curr.price.replace(/[^0-9]/g, ""));
    return acc + priceNumber;
  }, 0);

  // 공통 카드 컴포넌트
  const PriceCard = ({
    id,
    title,
    sub,
    prices,
    icon: Icon,
    highlight = false,
  }: any) => {
    const isOpen = activeCategory === id;

    return (
      <div
        data-aos="fade-up"
        className={`relative p-8 rounded-[40px] border transition-all duration-500 ${
          highlight
            ? "bg-[#1a3021] text-white border-transparent shadow-2xl shadow-green-900/20"
            : "bg-white text-[#1a3021] border-black/5 shadow-xl shadow-black/5"
        }`}
      >
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${highlight ? "bg-[#d35400]" : "bg-[#f2efe9] text-[#d35400]"}`}
        >
          <Icon size={28} />
        </div>
        <h3 className="text-2xl font-black mb-2 tracking-tighter">{title}</h3>
        <p
          className={`text-sm font-bold mb-8 ${highlight ? "text-white/60" : "text-gray-400"}`}
        >
          {sub}
        </p>

        <button
          onClick={() => setActiveCategory(isOpen ? null : id)}
          className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
            highlight
              ? "bg-white text-[#1a3021] hover:bg-[#d35400] hover:text-white"
              : "bg-[#1a3021] text-white hover:bg-[#d35400]"
          }`}
        >
          {isOpen ? "닫기" : "구매하기"}
          <ChevronDown
            size={18}
            className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* --- 펼쳐지는 상세 옵션 리스트 --- */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-[500px] mt-6 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="space-y-2 border-t border-current/10 pt-4">
            {prices.map((p: any, i: number) => (
              <div
                key={i}
                onClick={() =>
                  addToCart({ title, option: p.label, price: p.price })
                }
                className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center group ${
                  highlight
                    ? "border-white/10 hover:bg-white/10"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className="text-[10px] opacity-50 font-black uppercase tracking-tighter">
                    {p.label}
                  </p>
                  <p className="font-black text-sm">{p.price}</p>
                </div>
                <ShoppingCart
                  size={16}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${highlight ? "text-white" : "text-[#d35400]"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#f2efe9] text-[#1a3021] font-sans min-h-screen">
      {/* --- 상단 헤더 --- */}
      <section className="pt-48 pb-12 px-[5%] text-center lg:text-left max-w-[1600px] mx-auto">
        <div data-aos="fade-down">
          <span className="text-[#d35400] font-black tracking-[0.4em] text-xs uppercase italic mb-4 block">
            Premium Membership
          </span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-4 text-[#1a3021]">
            JOIN THE <span className="text-[#d35400]">GROUND</span>
          </h1>
        </div>
      </section>

      {/* --- 메인 레이아웃 (상품 리스트 + 장바구니 사이드바) --- */}
      <div className="max-w-[1600px] mx-auto px-[5%] flex flex-col lg:flex-row gap-10 pb-40">
        {/* 왼쪽: 상품 리스트 영역 */}
        <div className="flex-1 space-y-16">
          {/* 유소년 섹션 */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[2px] w-12 bg-[#d35400]" />
              <h2 className="text-2xl font-black tracking-tighter italic">
                YOUTH PROGRAM
              </h2>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              <PriceCard
                id="hobby"
                title="취미반"
                sub="60분 기초 세션"
                icon={Star}
                prices={[
                  { label: "주 1회 (월 4회)", price: "120,000원" },
                  { label: "주 2회 (월 8회)", price: "220,000원" },
                  { label: "주 3회 (월 12회)", price: "300,000원" },
                  { label: "주 4회 (월 16회)", price: "380,000원" },
                ]}
              />
              <PriceCard
                id="care"
                title="취미 + 성장 케어"
                sub="60분 복합 프로그램"
                icon={Zap}
                highlight={true}
                prices={[
                  { label: "주 1회 (월 4회)", price: "150,000원" },
                  { label: "주 2회 (월 8회)", price: "280,000원" },
                  { label: "주 3회 (월 12회)", price: "390,000원" },
                  { label: "주 4회 (월 16회)", price: "480,000원" },
                ]}
              />
              <PriceCard
                id="jelly"
                title="성장 케어 + 젤리"
                sub="60분 올인원 패키지"
                icon={CheckCircle2}
                prices={[
                  { label: "주 1회 (월 4회)", price: "180,000원" },
                  { label: "주 2회 (월 8회)", price: "340,000원" },
                  { label: "주 3회 (월 12회)", price: "480,000원" },
                  { label: "주 4회 (월 16회)", price: "590,000원" },
                ]}
              />
            </div>
          </section>

          {/* 성인 & 레슨 섹션 */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[2px] w-12 bg-[#d35400]" />
              <h2 className="text-2xl font-black tracking-tighter italic">
                ADULT & LESSON
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <PriceCard
                id="ladies"
                title="성인 여성 취미반"
                sub="기본기 및 전술 훈련"
                icon={Star}
                prices={[
                  { label: "주 1회 (월 4회)", price: "130,000원" },
                  { label: "주 2회 (월 8회)", price: "240,000원" },
                  { label: "주 3회 (월 12회)", price: "330,000원" },
                ]}
              />
              <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 bg-[#f2efe9] rounded-2xl flex items-center justify-center text-[#d35400] mb-6">
                    <Clock size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">개인/그룹 레슨</h3>
                  <p className="text-sm font-bold text-gray-400 mb-6">
                    스킬 & 퍼포먼스 향상 (1회, 10회, 20회)
                  </p>
                </div>
                <button className="w-full py-4 bg-[#1a3021] text-white rounded-2xl font-black text-sm hover:bg-[#d35400] transition-all">
                  가격 유선 문의
                </button>
              </div>
            </div>
          </section>

          {/* 대관 & 셔틀 */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-xl flex justify-between items-center group">
              <div>
                <h4 className="text-xl font-black">풋살장 대관</h4>
                <p className="text-xs text-gray-400 font-bold">
                  평일/주말 1시간 기준
                </p>
                <p className="text-[#d35400] font-black mt-2 text-xl">
                  50,000원
                </p>
              </div>
              <button
                onClick={() =>
                  addToCart({
                    title: "풋살장 대관",
                    option: "1시간",
                    price: "50,000원",
                  })
                }
                className="w-12 h-12 bg-[#1a3021] text-white rounded-full flex items-center justify-center hover:bg-[#d35400] transition-colors"
              >
                <ShoppingCart size={20} />
              </button>
            </div>
            <div className="bg-[#d35400] p-8 rounded-[40px] shadow-xl flex justify-between items-center text-white">
              <div>
                <h4 className="text-xl font-black">유료 셔틀버스</h4>
                <p className="text-xs text-white/60 font-bold">
                  월 정기 이용권 (전 지역)
                </p>
                <p className="text-white font-black mt-2 text-xl">14,000원</p>
              </div>
              <button
                onClick={() =>
                  addToCart({
                    title: "셔틀버스",
                    option: "월 정기권",
                    price: "14,000원",
                  })
                }
                className="w-12 h-12 bg-white text-[#d35400] rounded-full flex items-center justify-center hover:bg-[#1a3021] hover:text-white transition-colors"
              >
                <ShoppingCart size={20} />
              </button>
            </div>
          </section>
        </div>

        {/* --- 오른쪽: 장바구니 사이드바 --- */}
        <aside className="w-full lg:w-[420px] sticky top-32 h-fit">
          <div className="bg-white rounded-[50px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">
            <div className="bg-[#1a3021] p-8 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShoppingCart size={24} className="text-[#d35400]" />
                <h2 className="text-xl font-black tracking-tighter uppercase">
                  My Cart
                </h2>
              </div>
              <span className="bg-[#d35400] px-3 py-1 rounded-full text-xs font-black">
                {cart.length}
              </span>
            </div>

            {/* 담긴 상품 리스트 */}
            <div className="p-8 space-y-6 max-h-[450px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-24 text-center space-y-4">
                  <div className="w-16 h-16 bg-[#f2efe9] rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <ShoppingCart size={30} />
                  </div>
                  <p className="text-gray-400 font-bold">
                    선택한 이용권이 없습니다.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center animate-in fade-in slide-in-from-right-5 duration-500"
                  >
                    <div>
                      <h4 className="font-black text-[#1a3021] text-[15px]">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-400 font-bold">
                        {item.option}
                      </p>
                      <p className="text-[#d35400] font-black mt-1">
                        {item.price}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 총액 및 결제 버튼 */}
            <div className="p-10 bg-[#f2efe9] border-t border-black/5">
              <div className="flex justify-between items-end mb-8">
                <span className="text-gray-500 font-black uppercase text-xs tracking-widest">
                  Total Payment
                </span>
                <span className="text-4xl font-black text-[#1a3021] tracking-tighter">
                  {totalPrice.toLocaleString()}원
                </span>
              </div>
              <button
                disabled={cart.length === 0}
                className="w-full py-6 bg-[#d35400] text-white rounded-[30px] font-black text-xl shadow-2xl shadow-orange-900/30 hover:scale-[1.02] active:scale-95 transition-all disabled:grayscale disabled:opacity-30 flex items-center justify-center gap-3"
              >
                <CreditCard size={24} />
                결제하기
              </button>
              <p className="text-center text-[10px] text-gray-400 font-bold mt-6 uppercase tracking-widest opacity-60">
                FOOTBALL GROUND SIHEUNG PREMIUM STORE
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
