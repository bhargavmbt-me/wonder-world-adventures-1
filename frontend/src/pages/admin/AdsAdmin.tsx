import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Plus, Search, Eye, Edit2, Copy, ToggleLeft, ToggleRight, Trash2,
  Monitor, Smartphone, Tablet, ChevronLeft, ChevronRight, Filter, BarChart3,
  Zap, Calendar, MousePointerClick, TrendingUp, LayoutGrid, RefreshCw,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLoadingState from "@/components/admin/AdminLoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import adsApi, { Ad, AdAnalytics } from "@/lib/ads/adsApi";
import { AD_FORMATS, AD_STATUS, DEVICE_TARGETS, SLOT_SPECS } from "@/lib/ads/adsConfig";
import AdsCreateModal from "@/pages/admin/AdsCreateModal";

// ── Status badge ─────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  ACTIVE: "#10b981", SCHEDULED: "#f59e0b", DRAFT: "#94a3b8",
  EXPIRED: "#ef4444", DISABLED: "#64748b",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
    borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: `${statusColor[status] || "#94a3b8"}18`,
    color: statusColor[status] || "#94a3b8", border: `1px solid ${statusColor[status] || "#94a3b8"}30`,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor[status] || "#94a3b8" }} />
    {status}
  </span>
);

// ── Device icon ───────────────────────────────────────────────────────────────
const DeviceIcon = ({ device }: { device: string }) => {
  if (device === "MOBILE") return <Smartphone size={13} />;
  if (device === "TABLET") return <Tablet size={13} />;
  if (device === "DESKTOP") return <Monitor size={13} />;
  return <LayoutGrid size={13} />;
};

// ── Analytics stat card ───────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, boxShadow: "0 12px 30px rgba(0,0,0,0.07)" }}
    style={{ background: "hsl(var(--card))", borderRadius: 18, padding: "18px 22px", border: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: 14 }}
  >
    <div style={{ width: 42, height: 42, borderRadius: 12, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={18} color="white" />
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Baloo 2', cursive" }}>{value}</div>
      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{label}</div>
    </div>
  </motion.div>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function AdsAdmin() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterDevice, setFilterDevice] = useState("");
  const [filterSlot, setFilterSlot] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ad | null>(null);
  const searchTimerRef = { current: null as ReturnType<typeof setTimeout> | null };

  // Debounce search
  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 300);
  };

  const { data: listData, isLoading } = useQuery({
    queryKey: ["admin-ads", page, debouncedSearch, filterStatus, filterFormat, filterDevice, filterSlot],
    queryFn: () => adsApi.listAds({
      page, limit: 20, search: debouncedSearch || undefined,
      status: filterStatus || undefined, format: filterFormat || undefined,
      deviceTarget: filterDevice || undefined, slot: filterSlot || undefined,
    }, token!),
    enabled: !!token,
  });

  const { data: analytics } = useQuery<AdAnalytics>({
    queryKey: ["admin-ads-analytics"],
    queryFn: () => adsApi.getAnalytics(token!),
    enabled: !!token,
    staleTime: 30000,
  });

  const { data: globalEnabled, isLoading: globalLoading } = useQuery({
    queryKey: ["ads-global-switch"],
    queryFn: () => adsApi.getGlobalSwitch(token!),
    enabled: !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adsApi.deleteAd(id, token!),
    onSuccess: () => {
      toast.success("Ad deleted");
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      qc.invalidateQueries({ queryKey: ["admin-ads-analytics"] });
      setConfirmDelete(null);
    },
    onError: () => toast.error("Failed to delete ad"),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => adsApi.duplicateAd(id, token!),
    onSuccess: () => {
      toast.success("Ad duplicated");
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
    },
    onError: () => toast.error("Failed to duplicate ad"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      enable ? adsApi.enableAd(id, token!) : adsApi.disableAd(id, token!),
    onSuccess: (_, vars) => {
      toast.success(vars.enable ? "Ad enabled" : "Ad disabled");
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
    },
    onError: () => toast.error("Failed to update ad"),
  });

  const globalToggleMutation = useMutation({
    mutationFn: (enabled: boolean) => adsApi.setGlobalSwitch(enabled, token!),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "Advertisements enabled globally" : "Advertisements disabled globally");
      qc.invalidateQueries({ queryKey: ["ads-global-switch"] });
    },
    onError: () => toast.error("Failed to update global ads setting"),
  });

  const ads = listData?.ads || [];
  const totalPages = listData?.pages || 1;
  const total = listData?.total || 0;

  const formatLabel = (format: string) =>
    format.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1400 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, hsl(260,85%,60%), hsl(330,85%,65%))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Megaphone size={22} color="white" />
                </div>
                Advertisement Management
              </h1>
              <p style={{ color: "hsl(var(--muted-foreground))", marginTop: 6, fontSize: 14 }}>
                Create and manage in-app promotional ads across StoryNest screens.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Global ads toggle */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                borderRadius: 14, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: globalEnabled ? "#10b981" : "#ef4444" }}>
                  Ads {globalEnabled ? "ON" : "OFF"}
                </span>
                <Switch
                  checked={!!globalEnabled}
                  onCheckedChange={(v) => globalToggleMutation.mutate(v)}
                  disabled={globalLoading || globalToggleMutation.isPending}
                />
              </div>
              <Button
                onClick={() => setShowCreate(true)}
                style={{ background: "linear-gradient(135deg, hsl(260,85%,60%), hsl(330,85%,65%))", color: "white", gap: 8, height: 44, borderRadius: 12, fontWeight: 700 }}
              >
                <Plus size={16} />
                Create Ad
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Analytics Row */}
        {analytics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
            <StatCard icon={Megaphone} label="Total Ads" value={analytics.total} color="linear-gradient(135deg,hsl(260,85%,60%),hsl(270,80%,70%))" />
            <StatCard icon={Zap} label="Active" value={analytics.active} color="linear-gradient(135deg,#10b981,#059669)" />
            <StatCard icon={Calendar} label="Scheduled" value={analytics.scheduled} color="linear-gradient(135deg,#f59e0b,#d97706)" />
            <StatCard icon={TrendingUp} label="Impressions" value={analytics.totalImpressions.toLocaleString()} color="linear-gradient(135deg,hsl(200,90%,55%),hsl(200,90%,70%))" />
            <StatCard icon={MousePointerClick} label="Clicks" value={analytics.totalClicks.toLocaleString()} color="linear-gradient(135deg,hsl(330,85%,60%),hsl(330,85%,75%))" />
            <StatCard icon={BarChart3} label="CTR" value={`${analytics.ctr}%`} color="linear-gradient(135deg,hsl(45,100%,50%),hsl(15,90%,60%))" />
          </div>
        )}

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: "hsl(var(--card))", borderRadius: 20, padding: "16px 20px",
            border: "1px solid hsl(var(--border))", marginBottom: 20,
            display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "8px 14px" }}>
            <Search size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search ads by name or title..."
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, flex: 1, color: "inherit" }}
            />
          </div>

          {[
            { label: "Status", value: filterStatus, onChange: setFilterStatus, options: Object.values(AD_STATUS) },
            { label: "Format", value: filterFormat, onChange: setFilterFormat, options: Object.values(AD_FORMATS) },
            { label: "Device", value: filterDevice, onChange: setFilterDevice, options: Object.values(DEVICE_TARGETS) },
          ].map(({ label, value, onChange, options }) => (
            <select
              key={label}
              value={value}
              onChange={e => { onChange(e.target.value); setPage(1); }}
              style={{
                padding: "8px 14px", borderRadius: 12, border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))", fontSize: 13, cursor: "pointer", color: "inherit",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              <option value="">All {label}s</option>
              {options.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
            </select>
          ))}

          <select
            value={filterSlot}
            onChange={e => { setFilterSlot(e.target.value); setPage(1); }}
            style={{ padding: "8px 14px", borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13, cursor: "pointer", color: "inherit", fontFamily: "'Nunito', sans-serif" }}
          >
            <option value="">All Slots</option>
            {Object.values(SLOT_SPECS).map(s => <option key={s.slot} value={s.slot}>{s.label}</option>)}
          </select>

          {(filterStatus || filterFormat || filterDevice || filterSlot || debouncedSearch) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(""); setFilterFormat(""); setFilterDevice(""); setFilterSlot(""); setSearch(""); setDebouncedSearch(""); setPage(1); }}>
              <RefreshCw size={13} style={{ marginRight: 5 }} /> Clear
            </Button>
          )}

          <div style={{ marginLeft: "auto", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
            {total} ad{total !== 1 ? "s" : ""}
          </div>
        </motion.div>

        {/* Ads Table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "hsl(var(--card))", borderRadius: 20, border: "1px solid hsl(var(--border))", overflow: "hidden" }}
        >
          {isLoading ? (
            <AdminLoadingState message="Loading ads..." minHeight="300px" />
          ) : ads.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <Megaphone size={48} style={{ opacity: 0.2, margin: "0 auto 16px" }} />
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No ads found</p>
              <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>
                {debouncedSearch || filterStatus || filterFormat ? "Try adjusting your filters." : "Create your first ad to get started."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    {["Preview", "Name / Title", "Format", "Slot", "Device", "Status", "Priority", "Schedule", "Impressions", "Clicks", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad, i) => (
                    <motion.tr
                      key={ad.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      style={{ borderBottom: "1px solid hsl(var(--border))" }}
                    >
                      {/* Preview */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ width: 72, height: 44, borderRadius: 8, overflow: "hidden", background: "hsl(var(--muted))", flexShrink: 0 }}>
                          {ad.media?.url ? (
                            <img src={ad.media.url} alt={ad.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,hsl(260,85%,60%),hsl(330,85%,65%))" }}>
                              <Megaphone size={16} color="white" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Name / Title */}
                      <td style={{ padding: "10px 16px", maxWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ad.name}</div>
                        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ad.title}</div>
                      </td>

                      {/* Format */}
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "hsl(var(--muted))" }}>
                          {formatLabel(ad.format)}
                        </span>
                      </td>

                      {/* Slot */}
                      <td style={{ padding: "10px 16px", maxWidth: 160 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {SLOT_SPECS[ad.slot]?.label || ad.slot}
                        </div>
                      </td>

                      {/* Device */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600 }}>
                          <DeviceIcon device={ad.deviceTarget} />
                          {ad.deviceTarget}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "10px 16px" }}>
                        <StatusBadge status={ad.status} />
                      </td>

                      {/* Priority */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,hsl(260,85%,60%),hsl(330,85%,65%))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white" }}>
                          {ad.priority}
                        </div>
                      </td>

                      {/* Schedule */}
                      <td style={{ padding: "10px 16px", minWidth: 120 }}>
                        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                          {ad.startAt ? new Date(ad.startAt).toLocaleDateString() : "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                          {ad.endAt ? `→ ${new Date(ad.endAt).toLocaleDateString()}` : "No end"}
                        </div>
                      </td>

                      {/* Impressions */}
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{ad.impressionCount.toLocaleString()}</div>
                      </td>

                      {/* Clicks */}
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{ad.clickCount.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>
                          {ad.impressionCount > 0 ? `${((ad.clickCount / ad.impressionCount) * 100).toFixed(1)}% CTR` : "—"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button title="Edit" onClick={() => setEditingAd(ad)} style={{ padding: "6px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer", color: "inherit", display: "flex" }}>
                            <Edit2 size={13} />
                          </button>
                          <button title="Duplicate" onClick={() => duplicateMutation.mutate(ad.id)} style={{ padding: "6px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer", color: "inherit", display: "flex" }}>
                            <Copy size={13} />
                          </button>
                          <button
                            title={ad.isActive ? "Disable" : "Enable"}
                            onClick={() => toggleMutation.mutate({ id: ad.id, enable: !ad.isActive })}
                            style={{ padding: "6px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", cursor: "pointer", color: ad.isActive ? "#10b981" : "#94a3b8", display: "flex" }}
                          >
                            {ad.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                          </button>
                          <button
                            title="Delete"
                            onClick={() => setConfirmDelete(ad)}
                            style={{ padding: "6px", borderRadius: 8, border: "1px solid #fee2e2", background: "transparent", cursor: "pointer", color: "#ef4444", display: "flex" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                Page {page} of {totalPages}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Delete confirm modal */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                style={{ background: "hsl(var(--card))", borderRadius: 20, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,0.2)" }}
              >
                <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>🗑️</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Delete Ad?</h3>
                <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", textAlign: "center", marginBottom: 24 }}>
                  This will permanently delete <strong>{confirmDelete.name}</strong> and all its analytics data.
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</Button>
                  <Button
                    style={{ flex: 1, background: "#ef4444", color: "white" }}
                    onClick={() => deleteMutation.mutate(confirmDelete.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {(showCreate || editingAd) && (
            <AdsCreateModal
              editAd={editingAd || undefined}
              onClose={() => { setShowCreate(false); setEditingAd(null); }}
              onSuccess={() => {
                setShowCreate(false);
                setEditingAd(null);
                qc.invalidateQueries({ queryKey: ["admin-ads"] });
                qc.invalidateQueries({ queryKey: ["admin-ads-analytics"] });
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
