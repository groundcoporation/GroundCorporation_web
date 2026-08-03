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
  Waves,
} from "lucide-react";

export default function YeongjongShop() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    // 영종도 지점 컨셉에 맞춘 애니메이션 초기화
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

  // 공통 카드 컴포넌트 (영종도 테마)
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
        className={`relative p-10 rounded-[50px] border transition-all duration-500 ${
          highlight
            ? "bg-[#1b4332] text-white border-transparent shadow-[0_30px_60px_rgba(27,67,50,0.2)]"
            : "bg-white text-[#1b4332] border-[#d8f3dc] shadow-xl shadow-emerald-900/5"
        }`}
      >
        <div
          className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-8 ${
            highlight
              ? "bg-[#52b788] text-[#1b4332]"
              : "bg-[#f0f7f4] text-[#52b788]"
          }`}
        >
          <Icon size={32} />
        </div>
        <h3 className="text-3xl font-[1000] mb-3 tracking-tighter italic uppercase">
          {title}
        </h3>
        <p
          className={`text-sm font-bold mb-10 ${
            highlight ? "text-[#52b788]" : "text-gray-400"
          }`}
        >
          {sub}
        </p>

        <button
          onClick={() => setActiveCategory(isOpen ? null : id)}
          className={`w-full py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
            highlight
              ? "bg-[#52b788] text-[#1b4332] hover:bg-white"
              : "bg-[#1b4332] text-white hover:bg-[#52b788]"
          }`}
        >
          {isOpen ? "CLOSE" : "SELECT OPTION"}
          <ChevronDown
            size={18}
            className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* 펼쳐지는 상세 옵션 */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isOpen ? "max-h-[500px] mt-8 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-3 border-t border-current/10 pt-6">
            {prices.map((p: any, i: number) => (
              <div
                key={i}
                onClick={() =>
                  addToCart({ title, option: p.label, price: p.price })
                }
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center group ${
                  highlight
                    ? "border-white/10 hover:bg-white/5"
                    : "border-[#f0f7f4] hover:bg-[#f0f7f4]"
                }`}
              >
                <div>
                  <p className="text-[10px] opacity-50 font-black uppercase tracking-widest mb-1">
                    {p.label}
                  </p>
                  <p className="font-black text-lg">{p.price}</p>
                </div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    highlight
                      ? "bg-white/10 group-hover:bg-[#52b788]"
                      : "bg-gray-50 group-hover:bg-[#1b4332]"
                  }`}
                >
                  <ShoppingCart
                    size={18}
                    className={`transition-colors ${
                      highlight
                        ? "text-white group-hover:text-[#1b4332]"
                        : "text-gray-300 group-hover:text-white"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#f0f7f4] text-[#1b4332] font-sans min-h-screen">
      {/* --- 상단 헤더 --- */}
      <section className="pt-48 pb-16 px-[5%] text-center lg:text-left max-w-[1600px] mx-auto relative">
        <Waves className="absolute right-0 top-20 text-[#52b788]/10 w-96 h-96 -z-0" />
        <div data-aos="fade-down" className="relative z-10">
          <span className="text-[#52b788] font-black tracking-[0.5em] text-xs uppercase italic mb-6 block">
            Elite Membership & Shop
          </span>
          <h1 className="text-6xl md:text-9xl font-[1000] tracking-tighter leading-[0.85] mb-6 text-[#1b4332] italic">
            SKY-HIGH <br />
            <span className="text-[#52b788]">RESERVATION</span>
          </h1>
          <p className="text-gray-400 font-bold text-lg max-w-xl leading-relaxed">
            영종도 지점만의 차별화된 엘리트 프로그램을 만나보세요. 모든 결제는
            안전한 암호화 시스템을 통해 처리됩니다.
          </p>
        </div>
      </section>

      {/* --- 메인 레이아웃 --- */}
      <div className="max-w-[1600px] mx-auto px-[5%] flex flex-col lg:flex-row gap-12 pb-40 relative z-10">
        {/* 왼쪽: 상품 리스트 */}
        <div className="flex-1 space-y-24">
          {/* 엘리트 유스 섹션 */}
          <section>
            <div className="flex items-center gap-5 mb-12">
              <div className="h-[3px] w-16 bg-[#52b788]" />
              <h2 className="text-3xl font-[1000] tracking-tighter italic uppercase">
                Elite Youth <span className="text-[#52b788]">Program</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
              <PriceCard
                id="hobby"
                title="베이직"
                sub="기초 스킬 트레이닝 (60m)"
                icon={Star}
                prices={[
                  { label: "주 1회 (월 4회)", price: "130,000원" },
                  { label: "주 2회 (월 8회)", price: "240,000원" },
                ]}
              />
              <PriceCard
                id="care"
                title="스카이 엘리트"
                sub="성장 피드백 + 훈련 (80m)"
                icon={Zap}
                highlight={true}
                prices={[
                  { label: "주 1회 (월 4회)", price: "160,000원" },
                  { label: "주 2회 (월 8회)", price: "300,000원" },
                  { label: "주 3회 (월 12회)", price: "420,000원" },
                ]}
              />
              <PriceCard
                id="allin"
                title="마스터 클래스"
                sub="1:1 관리형 풀패키지"
                icon={CheckCircle2}
                prices={[
                  { label: "주 2회 (월 8회)", price: "380,000원" },
                  { label: "주 3회 (월 12회)", price: "520,000원" },
                ]}
              />
            </div>
          </section>

          {/* 성인 & 대관 섹션 */}
          <section className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[50px] border border-[#d8f3dc] shadow-xl flex flex-col justify-between group">
              <div>
                <div className="w-16 h-16 bg-[#f0f7f4] rounded-3xl flex items-center justify-center text-[#52b788] mb-8">
                  <Clock size={32} />
                </div>
                <h3 className="text-3xl font-[1000] italic uppercase mb-4">
                  Adult Class
                </h3>
                <p className="text-gray-400 font-bold mb-8">
                  성인 여성/남성 야간 테크니컬 클래스
                </p>
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center py-4 border-b border-[#f0f7f4]">
                    <span className="font-bold text-sm">월 4회 정기권</span>
                    <span className="font-black text-xl">140,000원</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  addToCart({
                    title: "성인 정기 클래스",
                    option: "월 4회",
                    price: "140,000원",
                  })
                }
                className="w-full py-5 bg-[#1b4332] text-white rounded-2xl font-black hover:bg-[#52b788] transition-all flex items-center justify-center gap-3"
              >
                <ShoppingCart size={20} /> ADD TO CART
              </button>
            </div>

            <div className="space-y-8">
              <div className="bg-[#52b788] p-10 rounded-[50px] shadow-2xl flex justify-between items-center text-[#1b4332] group">
                <div>
                  <h4 className="text-2xl font-[1000] italic uppercase">
                    Pitch Rental
                  </h4>
                  <p className="text-sm font-bold opacity-70 mb-4">
                    메인 A구장 대관 (1시간)
                  </p>
                  <p className="font-[1000] text-3xl italic">60,000원</p>
                </div>
                <button
                  onClick={() =>
                    addToCart({
                      title: "구장 대관",
                      option: "1시간",
                      price: "60,000원",
                    })
                  }
                  className="w-16 h-16 bg-[#1b4332] text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <ShoppingCart size={24} />
                </button>
              </div>

              <div className="bg-[#1b4332] p-10 rounded-[50px] shadow-2xl flex justify-between items-center text-white group">
                <div>
                  <h4 className="text-2xl font-[1000] italic uppercase text-[#52b788]">
                    Shuttle Bus
                  </h4>
                  <p className="text-sm font-bold opacity-50 mb-4">
                    영종 전지역 순환 셔틀 (월)
                  </p>
                  <p className="font-[1000] text-3xl italic">20,000원</p>
                </div>
                <button
                  onClick={() =>
                    addToCart({
                      title: "셔틀버스",
                      option: "월 이용권",
                      price: "20,000원",
                    })
                  }
                  className="w-16 h-16 bg-[#52b788] text-[#1b4332] rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <ShoppingCart size={24} />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* --- 오른쪽: 장바구니 사이드바 --- */}
        <aside className="w-full lg:w-[450px] sticky top-32 h-fit">
          <div className="bg-white rounded-[60px] shadow-[0_50px_100px_rgba(27,67,50,0.1)] border border-[#d8f3dc] overflow-hidden flex flex-col">
            <div className="bg-[#1b4332] p-10 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#52b788] rounded-2xl flex items-center justify-center text-[#1b4332]">
                  <ShoppingCart size={24} />
                </div>
                <h2 className="text-2xl font-[1000] tracking-tighter uppercase italic">
                  Order <span className="text-[#52b788]">List</span>
                </h2>
              </div>
              <span className="bg-[#52b788] text-[#1b4332] w-8 h-8 flex items-center justify-center rounded-full text-sm font-black">
                {cart.length}
              </span>
            </div>

            {/* 장바구니 리스트 */}
            <div className="p-10 space-y-8 max-h-[400px] overflow-y-auto custom-scrollbar">
              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-5">
                  <div className="w-20 h-20 bg-[#f0f7f4] rounded-full flex items-center justify-center mx-auto text-[#d8f3dc]">
                    <ShoppingCart size={40} />
                  </div>
                  <p className="text-gray-300 font-bold italic uppercase tracking-widest">
                    Cart is Empty
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start animate-in fade-in slide-in-from-right-5 duration-500 group"
                  >
                    <div className="flex-1">
                      <h4 className="font-black text-[#1b4332] text-lg leading-none mb-2 italic uppercase">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#52b788] font-bold uppercase tracking-wider mb-2">
                        {item.option}
                      </p>
                      <p className="text-[#1b4332] font-[1000] text-xl">
                        {item.price}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-3 bg-[#f0f7f4] text-[#1b4332]/20 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 하단 결제 영역 */}
            <div className="p-12 bg-[#f0f7f4] border-t border-[#d8f3dc]">
              <div className="flex justify-between items-center mb-10">
                <span className="text-[#1b4332]/40 font-black uppercase text-xs tracking-[0.3em]">
                  Total amount
                </span>
                <span className="text-5xl font-[1000] text-[#1b4332] tracking-tighter italic">
                  {totalPrice.toLocaleString()}₩
                </span>
              </div>
              <button
                disabled={cart.length === 0}
                className="w-full py-7 bg-[#1b4332] text-white rounded-[32px] font-[1000] text-2xl shadow-2xl shadow-[#1b4332]/20 hover:bg-[#52b788] hover:text-[#1b4332] transition-all disabled:grayscale disabled:opacity-20 flex items-center justify-center gap-4 group"
              >
                <CreditCard size={28} className="group-hover:animate-bounce" />
                CHECKOUT
              </button>
              <div className="mt-8 flex justify-center gap-6 opacity-30">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
                  className="h-4"
                  alt="visa"
                />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                  className="h-6"
                  alt="master"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
