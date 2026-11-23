"use client";

import React, { useState } from "react";
import { UserAccount } from "@/types/store";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email dan password wajib diisi.");
      return;
    }
    if (
      tab === "register" &&
      (!name.trim() || !phone.trim() || !address.trim())
    ) {
      setErrorMsg("Nama lengkap, nomor WhatsApp, dan alamat wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const payload =
        tab === "login"
          ? { action: "login", email: email.trim(), password }
          : {
              action: "register",
              email: email.trim(),
              password,
              name: name.trim(),
              phone: phone.trim(),
              address: address.trim(),
            };

      const res = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.status === "error") {
        setErrorMsg(data.message || "Autentikasi gagal.");
        setLoading(false);
        return;
      }

      const activeUser: UserAccount = data.user || {
        email: email.trim(),
        password,
        name: name.trim() || email.trim().split("@")[0],
        phone: phone.trim() || "",
        address: address.trim() || "",
      };

      onSuccess({ ...activeUser, password });
      onClose();
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat memproses akun.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#FAF6F0] p-6 text-[#3A2618] shadow-xl border border-[#E5D9C9]">
        <div className="flex items-center justify-between border-b border-[#E5D9C9] pb-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8C6D53]">
              REKAN LABEL
            </p>
            <h2 className="font-serif text-xl font-semibold">
              {tab === "login" ? "Masuk ke Akun Anda" : "Daftar Akun Baru"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-sm text-[#6E523D] hover:bg-[#EFE5D8]"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs text-[#6E523D] bg-[#F3EAE0] p-3 rounded-lg">
          Gunakan <strong>Email</strong> Anda sebagai ID akun agar keranjang
          belanja dan riwayat pesanan tidak tertukar dengan akun lain.
        </p>

        <div className="mt-4 grid grid-cols-2 rounded-xl bg-[#EFE5D8] p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMsg("");
            }}
            className={`rounded-lg py-2 transition ${
              tab === "login" ? "bg-[#4A2E1B] text-white" : "text-[#4A2E1B]"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setErrorMsg("");
            }}
            className={`rounded-lg py-2 transition ${
              tab === "register" ? "bg-[#4A2E1B] text-white" : "text-[#4A2E1B]"
            }`}
          >
            Buat Akun
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {tab === "register" && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Resa Putri"
                  className="w-full rounded-lg border border-[#D8C7B2] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full rounded-lg border border-[#D8C7B2] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
                  className="w-full rounded-lg border border-[#D8C7B2] bg-white px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">
              Email (Username ID)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full rounded-lg border border-[#D8C7B2] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#D8C7B2] bg-white px-3 py-2 text-sm"
            />
          </div>

          {errorMsg && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#4A2E1B] py-2.5 text-sm font-medium text-white hover:bg-[#362011] disabled:opacity-60"
          >
            {loading
              ? "Memproses..."
              : tab === "login"
                ? "Masuk Sekarang"
                : "Daftar & Aktifkan Akun"}
          </button>
        </form>
      </div>
    </div>
  );
}
