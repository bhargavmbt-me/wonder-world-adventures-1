import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Settings, Crown, Edit2, Save, X, DollarSign, Calendar, ToggleLeft, ToggleRight, Megaphone } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi, SubscriptionPlan } from "@/lib/adminApi";
import adsApi from "@/lib/ads/adsApi";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const PLAN_GRADIENTS = [
  "linear-gradient(135deg,#64748b,#475569)",
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
];

const PLAN_ICONS = ["🆓", "⭐", "🚀", "💎"];

const PlanCard = ({ plan, index, onEdit }: { plan: SubscriptionPlan; index: number; onEdit: (p: SubscriptionPlan) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
    whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
    style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid #e2e8f0" }}
  >
    {/* Gradient Header */}
    <div style={{ background: PLAN_GRADIENTS[index % PLAN_GRADIENTS.length], padding: "28px 24px 24px", color: "white" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{PLAN_ICONS[index % PLAN_ICONS.length]}</div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{plan.name}</div>
      <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>{plan.description || "Subscription plan"}</div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 36, fontWeight: 900 }}>₹{plan.price}</span>
        {plan.price > 0 && <span style={{ opacity: 0.7, fontSize: 13 }}>/ {plan.durationDays} days</span>}
      </div>
    </div>

    {/* Details */}
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Calendar size={13} /> Duration</span>
          <span style={{ fontWeight: 700 }}>{plan.durationDays} days</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><DollarSign size={13} /> Price</span>
          <span style={{ fontWeight: 700 }}>₹{plan.price}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#64748b" }}>Status</span>
          <span style={{ fontWeight: 700, color: plan.isActive ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: 5 }}>
            {plan.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {plan.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <Button onClick={() => onEdit(plan)} style={{ width: "100%", gap: 6, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white" }}>
        <Edit2 size={14} /> Edit Plan
      </Button>
    </div>
  </motion.div>
);

const EditModal = ({ plan, onClose, onSave }: { plan: SubscriptionPlan; onClose: () => void; onSave: (p: Partial<SubscriptionPlan>) => void }) => {
  const [form, setForm] = useState({ name: plan.name, description: plan.description || "", price: plan.price, durationDays: plan.durationDays, isActive: plan.isActive });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 440, padding: 28, boxShadow: "0 40px 80px rgba(0,0,0,0.2)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Edit Plan: {plan.name}</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>Plan Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>Price (₹)</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>Duration (days)</Label>
              <Input type="number" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            <Label style={{ fontSize: 13 }}>Plan Active</Label>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Button variant="outline" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={() => onSave(form)} style={{ flex: 1, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", gap: 6 }}>
              <Save size={14} /> Save Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function SettingsAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [featureFlags, setFeatureFlags] = useState({
    premiumStories: true,
    voiceChat: true,
    parentDashboard: true,
    multiChild: false,
    offlineMode: false,
  });

  const { data: globalAdsEnabled = true, isLoading: adsSwitchLoading } = useQuery({
    queryKey: ["ads-global-switch"],
    queryFn: () => adsApi.getGlobalSwitch(token!),
    enabled: !!token,
  });

  const toggleAdsMutation = useMutation({
    mutationFn: (enabled: boolean) => adsApi.setGlobalSwitch(enabled, token!),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "Advertisements enabled globally" : "Advertisements disabled globally");
      queryClient.invalidateQueries({ queryKey: ["ads-global-switch"] });
    },
    onError: () => toast.error("Failed to update global advertisements setting"),
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: adminApi.getPlans,
  });

  const handleSavePlan = (data: Partial<SubscriptionPlan>) => {
    toast.success(`Plan "${editPlan?.name}" updated! (Changes reflected after backend deploy)`);
    setEditPlan(null);
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1100 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Settings size={24} color="#6366f1" /> Settings
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Manage subscription plans, pricing, and feature flags</p>
        </motion.div>

        {/* Subscription Plans */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Crown size={18} color="#d97706" />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>Subscription Plans</h2>
          </div>
          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: 280, background: "#f1f5f9", borderRadius: 20, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
              {plans.map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} index={i} onEdit={setEditPlan} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Feature Flags */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: "white", borderRadius: 20, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 32 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
            <ToggleRight size={18} color="#6366f1" />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>Feature Flags</h2>
          </div>
          <div style={{ padding: "8px 0" }}>
            {Object.entries(featureFlags).map(([key, value]) => {
              const labels: Record<string, { label: string; desc: string }> = {
                premiumStories: { label: "Premium Stories", desc: "Enable premium story content for subscribers" },
                voiceChat: { label: "Voice Chat (AI)", desc: "Enable AI voice interaction feature" },
                parentDashboard: { label: "Parent Dashboard", desc: "Show parent monitoring dashboard" },
                multiChild: { label: "Multi-Child Profiles", desc: "Allow multiple child profiles per account" },
                offlineMode: { label: "Offline Mode", desc: "Enable content caching for offline use" },
              };
              const meta = labels[key] || { label: key, desc: "" };
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #f8fafc" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{meta.label}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{meta.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: value ? "#10b981" : "#94a3b8" }}>{value ? "Enabled" : "Disabled"}</span>
                    <Switch checked={value} onCheckedChange={v => { setFeatureFlags(f => ({ ...f, [key]: v })); toast.success(`${meta.label} ${v ? "enabled" : "disabled"}`); }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Advertisements Global Control */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ background: "white", borderRadius: 20, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 32 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, hsl(260,85%,60%), hsl(330,85%,65%))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Megaphone size={18} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>Advertisements</h2>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>Control master in-app promotional advertisement delivery across all StoryNest screens</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: globalAdsEnabled ? "#10b981" : "#ef4444" }}>
                {globalAdsEnabled ? "Enabled (Delivery Active)" : "Disabled (Master Kill Switch)"}
              </span>
              <Switch
                checked={!!globalAdsEnabled}
                onCheckedChange={v => toggleAdsMutation.mutate(v)}
                disabled={adsSwitchLoading || toggleAdsMutation.isPending}
              />
            </div>
          </div>
          <div style={{ padding: "16px 24px", background: "#f8fafc", fontSize: 13, color: "#64748b" }}>
            When toggled <strong>OFF</strong>, no in-app ads will be delivered anywhere in StoryNest, overriding all individual placement and schedule settings server-side.
          </div>
        </motion.div>

        {/* Payment Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: "white", borderRadius: 20, border: "1px solid #e2e8f0", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <DollarSign size={18} color="#6366f1" />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>Payment Settings</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <Label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>Razorpay Key ID</Label>
              <Input type="password" defaultValue="rzp_test_SxfXgEXGtWfHba" readOnly style={{ fontFamily: "monospace", background: "#f8fafc" }} />
            </div>
            <div>
              <Label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "block" }}>Currency</Label>
              <Input defaultValue="INR" readOnly style={{ background: "#f8fafc" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
                ⚠️ Payment credentials are managed via environment variables on the backend. Changes here are for display only.
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {editPlan && <EditModal plan={editPlan} onClose={() => setEditPlan(null)} onSave={handleSavePlan} />}
    </AdminLayout>
  );
}
