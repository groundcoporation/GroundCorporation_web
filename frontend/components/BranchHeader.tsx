"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, Menu, User, X } from "lucide-react";

type BranchHeaderProps = {
  branchId?: string | null;
  branchName?: string | null;
  onLogout: () => void | Promise<void>;
};

function branchSlug(branchId?: string | null, branchName?: string | null) {
  const source = `${branchId ?? ""} ${branchName ?? ""}`.toLowerCase();
  if (source.includes("branch_2") || source.includes("영종") || source.includes("yeongjong")) return "yeongjong";
  return "siheung";
}

export default function BranchHeader({ branchId, branchName, onLogout }: BranchHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const slug = branchSlug(branchId, branchName);
  const base = `/branch/${slug}`;
  const accent = slug === "yeongjong" ? "text-emerald-700 hover:text-emerald-500" : "text-orange-700 hover:text-orange-500";
  const menus = [
    { title: "소개", items: [{ name: "지점 소개", href: `${base}/intro/branch` }, { name: "코치 소개", href: `${base}/intro/coaches` }] },
    { title: "시간표", items: [{ name: "전체 시간표", href: `${base}/schedule` }] },
  ];

  return <>
    <header className="fixed top-0 z-[2000] flex h-[80px] w-full items-center justify-between border-b border-slate-200 bg-white/95 px-[5%] shadow-sm backdrop-blur-md">
      <Link href={`${base}/main`} className="flex items-center gap-3">
        <Image src="/resource/image/logo.png" alt="Ground Corporation" width={180} height={44} priority className="h-10 w-auto md:h-11" />
        <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 sm:block">{branchName ?? (branchId ? "지점" : "전체 지점 관리")}</span>
      </Link>
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center lg:flex">
        <ul className="flex gap-10">{menus.map((menu) => <li key={menu.title} className="group relative py-7"><button className={`flex items-center gap-1 text-sm font-black transition ${accent}`}>{menu.title}<ChevronDown size={14} className="transition group-hover:rotate-180" /></button><ul className="invisible absolute left-1/2 top-[75px] w-[170px] -translate-x-1/2 rounded-2xl border border-slate-100 bg-white py-3 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">{menu.items.map((item) => <li key={item.href}><Link href={item.href} className="block px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-950">{item.name}</Link></li>)}</ul></li>)}</ul>
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/mypage" className="hidden items-center gap-2 rounded-full border-2 border-slate-900 px-4 py-2 text-xs font-black text-slate-900 transition hover:bg-slate-900 hover:text-white sm:flex"><User size={15} />MY PAGE</Link>
        <button onClick={() => void onLogout()} aria-label="로그아웃" title="로그아웃" className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><LogOut size={20} /></button>
        <button onClick={() => setMobileOpen(true)} aria-label="메뉴 열기" className="rounded-full p-2 text-slate-700 lg:hidden"><Menu size={23} /></button>
      </div>
    </header>
    {mobileOpen && <div className="fixed inset-0 z-[2500] bg-slate-950/45" onClick={() => setMobileOpen(false)}><aside className="ml-auto h-full w-[82%] max-w-sm overflow-y-auto bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex items-center justify-between"><b className="text-lg">{branchName ?? "지점 메뉴"}</b><button onClick={() => setMobileOpen(false)} aria-label="메뉴 닫기" className="rounded-full bg-slate-100 p-2"><X size={21} /></button></div><Link href={`${base}/main`} onClick={() => setMobileOpen(false)} className="mb-6 block rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">지점 홈</Link><nav className="space-y-7">{menus.map((menu) => <div key={menu.title}><p className="mb-3 text-xs font-black tracking-widest text-slate-400">{menu.title}</p><div className="space-y-1">{menu.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-3 font-bold text-slate-700 hover:bg-slate-100">{item.name}</Link>)}</div></div>)}</nav></aside></div>}
  </>;
}
