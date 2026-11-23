"use client";

import React, { useEffect, useState } from "react";
import {
  CartItem,
  InvoiceData,
  ShippingOption,
  UserAccount,
} from "@/types/store";
import { formatRupiah } from "@/lib/config";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  cart: CartItem[];
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onRequireLogin: () => void;
  onCheckoutSuccess: (invoice: InvoiceData) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  user,
  cart,
  onUpdateQty,
  onRemoveItem,
  onRequireLogin,
  onCheckoutSuccess,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [rates, setRates] = useState<ShippingOption[]>([]);
  const [selectedRateIndex, setSelectedRateIndex] = useState<number>(0);
  const [loadingRates, setLoadingRates] = useState(false);
  const [proofBase64, setProofBase64] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalWeightGram = cart.reduce(
    (acc, item) => acc + (item.weightGram || 250) * item.qty,
    0,
  );
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const selectedRate = rates[selectedRateIndex] || null;
  const shippingCost = selectedRate ? selectedRate.cost : 0;
  const grandTotal = subtotal + shippingCost;

  useEffect(() => {
    if (user) {
      setCustomerName(user.name || "");
      setPhone(user.phone || "");
      setAddress(user.address || "");
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/shipping?mode=provinces")
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setProvinces(d.provinces || []);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrict("");
      setRates([]);
      return;
    }
    fetch(
      `/api/shipping?mode=districts&province=${encodeURIComponent(selectedProvince)}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          setDistricts(d.districts || []);
          setSelectedDistrict(d.districts?.[0] || "");
        }
      });
  }, [selectedProvince]);

  useEffect(() => {
    if (!selectedProvince || cart.length === 0) {
      setRates([]);
      return;
    }
    setLoadingRates(true);
    fetch(
      `/api/shipping?mode=rates&province=${encodeURIComponent(
        selectedProvince,
      )}&district=${encodeURIComponent(selectedDistrict)}&weightGram=${totalWeightGram}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          setRates(d.rates || []);
          setSelectedRateIndex(0);
        }
      })
      .finally(() => setLoadingRates(false));
  }, [selectedProvince, selectedDistrict, totalWeightGram, cart.length]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProofBase64(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!user) {
      onRequireLogin();
      return;
    }
    if (cart.length === 0) {
      setErrorMsg("Keranjang belanja masih kosong.");
      return;
    }
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg("Lengkapi nama pemesan, nomor HP, dan alamat pengiriman.");
      return;
    }
    if (!selectedProvince || !selectedRate) {
      setErrorMsg(
        "Pilih Provinsi, Kecamatan, dan layanan kurir terlebih dahulu.",
      );
      return;
    }

    setSubmitting(true);
    const orderId = `RL-${Date.now().toString().slice(-6)}`;
    const createdAt = new Date().toLocaleString("id-ID");

    try {
      const res = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout",
          orderId,
          createdAt,
          email: user.email,
          password: user.password || "",
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: `${address.trim()}, ${selectedDistrict}, ${selectedProvince}`,
          province: selectedProvince,
          district: selectedDistrict,
          totalWeightGram,
          shippingCourier: `${selectedRate.courier} ${selectedRate.service}`,
          shippingCost,
          subtotal,
          grandTotal,
          proofBase64,
          items: cart,
        }),
      });
      const data = await res.json();

      if (data.status === "error") {
        setErrorMsg(data.message || "Gagal memproses pesanan.");
        setSubmitting(false);
        return;
      }

      const invoice: InvoiceData = {
        orderId,
        createdAt,
        email: user.email,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        province: selectedProvince,
        district: selectedDistrict,
        totalWeightGram,
        shippingCourier: `${selectedRate.courier} ${selectedRate.service}`,
        shippingCost,
        subtotal,
        grandTotal,
        proofUrl: data.proofUrl,
        items: cart,
      };

      onCheckoutSuccess(invoice);
      onClose();
    } catch {
      setErrorMsg("Terjadi kesalahan saat menyimpan pesanan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-[#FAF6F0] p-6 text-[#3A2618] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5D9C9] pb-4">
          <div>
            <h2 className="font-serif text-xl font-semibold">
              Keranjang & Checkout
            </h2>
            <p className="text-xs text-[#6E523D]">
              {user
                ? `Akun aktif: ${user.email}`
                : "Silakan login untuk mengakses keranjang"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm hover:bg-[#EFE5D8]"
          >
            Tutup ✕
          </button>
        </div>

        {!user ? (
          <div className="mt-8 rounded-2xl border border-[#E5D9C9] bg-white p-6 text-center">
            <p className="text-sm text-[#5A4231] mb-4">
              Anda perlu masuk dengan <strong>Email & Password</strong> agar
              produk dan pesanan tersimpan khusus untuk akun Anda.
            </p>
            <button
              type="button"
              onClick={onRequireLogin}
              className="rounded-xl bg-[#4A2E1B] px-5 py-2.5 text-sm font-medium text-white"
            >
              Login / Buat Akun
            </button>
          </div>
        ) : cart.length === 0 ? (
          <p className="mt-8 text-center text-sm text-[#6E523D]">
            Keranjang belanja untuk <strong>{user.email}</strong> masih kosong.
          </p>
        ) : (
          <form onSubmit={handleCheckout} className="mt-4 space-y-5">
            {/* Daftar Item */}
            <div className="space-y-3">
              {cart.map((item, idx) => (
                <div
                  key={`${item.id}-${item.size}-${item.color}-${idx}`}
                  className="flex gap-3 rounded-xl border border-[#E5D9C9] bg-white p-3"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 rounded-lg object-cover bg-[#F3EAE0]"
                  />
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-[#6E523D]">
                      Size: {item.size} • Warna: {item.color} •{" "}
                      {(item.weightGram || 250) * item.qty}g
                    </p>
                    <p className="mt-1 font-medium">
                      {formatRupiah(item.price * item.qty)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(idx, -1)}
                        className="rounded border px-2 py-0.5"
                      >
                        -
                      </button>
                      <span>{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(idx, 1)}
                        className="rounded border px-2 py-0.5"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        className="ml-auto text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Data Penerima & Ongkir Dinamis */}
            <div className="space-y-3 rounded-xl border border-[#E5D9C9] bg-white p-4 text-xs">
              <h3 className="font-semibold text-sm">
                Alamat & Cek Ongkir Otomatis
              </h3>
              <p className="text-[#6E523D]">
                Total Berat Paket: <strong>{totalWeightGram} gram</strong> (
                {Math.ceil(totalWeightGram / 1000)} kg)
              </p>

              <input
                type="text"
                placeholder="Nama Pemesan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-[#D8C7B2] px-3 py-2"
              />
              <input
                type="text"
                placeholder="No. WhatsApp Aktif"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[#D8C7B2] px-3 py-2"
              />
              <textarea
                rows={2}
                placeholder="Alamat detail (Jalan, No. Rumah, RT/RW)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-[#D8C7B2] px-3 py-2"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="rounded-lg border border-[#D8C7B2] bg-white px-2.5 py-2"
                >
                  <option value="">Pilih Provinsi</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!districts.length}
                  className="rounded-lg border border-[#D8C7B2] bg-white px-2.5 py-2 disabled:bg-gray-100"
                >
                  <option value="">Pilih Kota/Kecamatan</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {loadingRates && (
                <p className="text-[#8C6D53]">Menghitung tarif kurir...</p>
              )}

              {rates.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="font-medium">
                    Pilih Layanan Kurir (JNE / J&T / SiCepat):
                  </p>
                  {rates.map((r, i) => (
                    <label
                      key={`${r.courier}-${r.service}`}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 ${
                        selectedRateIndex === i
                          ? "border-[#4A2E1B] bg-[#FAF3EA]"
                          : "border-[#E5D9C9]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="courierRate"
                          checked={selectedRateIndex === i}
                          onChange={() => setSelectedRateIndex(i)}
                        />
                        <div>
                          <p className="font-semibold">
                            {r.courier} — {r.service}
                          </p>
                          <p className="text-[11px] text-[#6E523D]">
                            Est. {r.etd}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold">
                        {formatRupiah(r.cost)}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div>
                <label className="block font-medium mb-1">
                  Upload Bukti Transfer (Tersimpan ke Google Drive)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-[11px]"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                {errorMsg}
              </p>
            )}

            {/* Ringkasan Total */}
            <div className="rounded-xl bg-white border border-[#E5D9C9] p-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>Subtotal Produk</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ongkos Kirim</span>
                <span>{formatRupiah(shippingCost)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm font-bold text-[#3A2618]">
                <span>Total Pembayaran</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#4A2E1B] py-3 text-sm font-semibold text-white hover:bg-[#362011] disabled:opacity-60"
            >
              {submitting
                ? "Membuat Invoice..."
                : "Buat Pesanan & Invoice Otomatis"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
