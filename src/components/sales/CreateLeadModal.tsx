import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Portal from "@/components/Portal";

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    phone_number: "",
    area: "",
    state_and_ut: "",
    country: "India",
    enquiry_for: "",
    enquiry_products: "",
    sources_of_customer: "",
    sales_person_assigned: "",
    investment_amount: "",
    current_monthly_turnover: "",
    existing_products: "",
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to create lead");
      }
    } catch (error) {
      console.error(error);
      alert("Error submitting form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[#FFFBF0] dark:bg-navy-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-orange-100/50 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
          
          <div className="p-4 border-b border-orange-100/50 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Create New Lead</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-400 dark:text-slate-400 font-bold text-[8px] uppercase tracking-widest">Stage 1: Lead Details</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors">
              <XMarkIcon className="w-8 h-8" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-6 max-h-[80vh] overflow-y-auto bg-white dark:bg-navy-800/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Contact Name" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Company Name</label>
                <input name="company_name" value={formData.company_name} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Business Name" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Phone Number</label>
                <input required name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="10-digit number" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Area / City</label>
                <input name="area" value={formData.area} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Locality" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">State and UT</label>
                <input name="state_and_ut" value={formData.state_and_ut} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="State" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Country</label>
                <input name="country" value={formData.country} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Country" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Enquiry For</label>
                <input name="enquiry_for" value={formData.enquiry_for} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="e.g. Dealership" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Enquiry Products</label>
                <input name="enquiry_products" value={formData.enquiry_products} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Products interested in" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Lead Source</label>
                <input name="sources_of_customer" value={formData.sources_of_customer} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="e.g. Website, JustDial" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Sales Person Assigned</label>
                <input name="sales_person_assigned" value={formData.sales_person_assigned} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Sales Executive Name" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Investment Amount</label>
                <input name="investment_amount" value={formData.investment_amount} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Investment Budget" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Current Monthly Turnover</label>
                <input name="current_monthly_turnover" value={formData.current_monthly_turnover} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Current Turnover" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Existing Products / Brands Selling</label>
                <input name="existing_products" value={formData.existing_products} onChange={handleChange} className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm" placeholder="Brands" />
              </div>
            </div>
            
            <button type="submit" disabled={isSubmitting} className="w-full px-4 py-3 bg-[#003875] hover:bg-[#002855] text-white rounded-xl text-[12px] font-black uppercase tracking-widest transition-all shadow-md mt-6 disabled:opacity-50">
              {isSubmitting ? "Creating..." : "Create Lead"}
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}
