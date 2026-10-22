import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, Image, Video, Monitor, Tablet, Smartphone, Calendar,
  ExternalLink, Sparkles, AlertCircle, Check, Clock, Layers, Sliders, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import adsApi, { Ad } from "@/lib/ads/adsApi";
import {
  AD_FORMATS, AD_STATUS, DEVICE_TARGETS, SCREENS, POPUP_TRIGGERS,
  CTA_OPTIONS, SLOT_SPECS, getSlotsForScreen, SlotSpec,
} from "@/lib/ads/adsConfig";

interface AdsCreateModalProps {
  editAd?: Ad;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdsCreateModal({ editAd, onClose, onSuccess }: AdsCreateModalProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const tabletFileInputRef = useRef<HTMLInputElement>(null);
  const desktopFileInputRef = useRef<HTMLInputElement>(null);

  // Active step / tab in form
  const [activeTab, setActiveTab] = useState<"details" | "media" | "schedule" | "destination" | "preview">("details");

  // Device preview mode
  const [previewDevice, setPreviewDevice] = useState<"DESKTOP" | "TABLET" | "MOBILE">("DESKTOP");

  // Form State
  const [name, setName] = useState(editAd?.name || "");
  const [title, setTitle] = useState(editAd?.title || "");
  const [description, setDescription] = useState(editAd?.description || "");
  const [status, setStatus] = useState<string>(editAd?.status || "ACTIVE");
  const [isActive, setIsActive] = useState<boolean>(editAd ? editAd.isActive : true);
  const [priority, setPriority] = useState<number>(editAd?.priority ?? 5);

  // Targeting & Format
  const [screen, setScreen] = useState<string>(() => {
    if (editAd?.slot && SLOT_SPECS[editAd.slot]) {
      return SLOT_SPECS[editAd.slot].screen;
    }
    return "HOME";
  });
  const [slot, setSlot] = useState<string>(editAd?.slot || "HOME_TOP");
  const [format, setFormat] = useState<string>(editAd?.format || "BANNER");
  const [deviceTarget, setDeviceTarget] = useState<string>(editAd?.deviceTarget || "ALL");

  // Media
  const [mediaId, setMediaId] = useState<string | null>(editAd?.mediaId || null);
  const [mediaUrl, setMediaUrl] = useState<string>(editAd?.media?.url || "");
  const [mediaMime, setMediaMime] = useState<string>(editAd?.media?.mimeType || "");
  const [uploading, setUploading] = useState<boolean>(false);

  // Responsive media overrides
  const [showResponsiveMedia, setShowResponsiveMedia] = useState<boolean>(
    Boolean(editAd?.mobileMediaId || editAd?.tabletMediaId || editAd?.desktopMediaId)
  );
  const [mobileMediaId, setMobileMediaId] = useState<string | null>(editAd?.mobileMediaId || null);
  const [mobileMediaUrl, setMobileMediaUrl] = useState<string>(editAd?.mobileMedia?.url || "");
  const [tabletMediaId, setTabletMediaId] = useState<string | null>(editAd?.tabletMediaId || null);
  const [tabletMediaUrl, setTabletMediaUrl] = useState<string>(editAd?.tabletMedia?.url || "");
  const [desktopMediaId, setDesktopMediaId] = useState<string | null>(editAd?.desktopMediaId || null);
  const [desktopMediaUrl, setDesktopMediaUrl] = useState<string>(editAd?.desktopMedia?.url || "");

  // Schedule & Rules
  const [startAt, setStartAt] = useState<string>(
    editAd?.startAt ? new Date(editAd.startAt).toISOString().slice(0, 16) : ""
  );
  const [endAt, setEndAt] = useState<string>(
    editAd?.endAt ? new Date(editAd.endAt).toISOString().slice(0, 16) : ""
  );
  const [frequencyLimit, setFrequencyLimit] = useState<string>(
    editAd?.frequencyLimit ? String(editAd.frequencyLimit) : ""
  );
  const [maxDisplaysPerDay, setMaxDisplaysPerDay] = useState<string>(
    editAd?.maxDisplaysPerDay ? String(editAd.maxDisplaysPerDay) : ""
  );
  const [minTimeBetweenDisplays, setMinTimeBetweenDisplays] = useState<string>(
    editAd?.minTimeBetweenDisplays ? String(editAd.minTimeBetweenDisplays) : ""
  );

  // Popup specifics
  const [popupTrigger, setPopupTrigger] = useState<string>(editAd?.popupTrigger || "ON_PAGE_LOAD");
  const [popupDelay, setPopupDelay] = useState<string>(editAd?.popupDelay ? String(editAd.popupDelay) : "3");

  // Destination & CTA
  const [destinationType, setDestinationType] = useState<"internal" | "external">(
    editAd?.clickUrl ? "external" : "internal"
  );
  const [internalRoute, setInternalRoute] = useState<string>(editAd?.internalRoute || "/stories");
  const [clickUrl, setClickUrl] = useState<string>(editAd?.clickUrl || "");
  const [ctaText, setCtaText] = useState<string>(editAd?.ctaText || "Explore Now");

  const [saving, setSaving] = useState(false);

  // Current slot spec
  const currentSpec: SlotSpec | undefined = SLOT_SPECS[slot];

  // Screen slots
  const availableSlots = getSlotsForScreen(screen);

  const handleScreenChange = (newScreen: string) => {
    setScreen(newScreen);
    const slots = getSlotsForScreen(newScreen);
    if (slots.length > 0) {
      const nextSlot = slots[0].slot;
      setSlot(nextSlot);
      const sp = SLOT_SPECS[nextSlot];
      if (sp?.formats?.length) {
        setFormat(sp.formats[0]);
      }
    }
  };

  const handleSlotChange = (newSlot: string) => {
    setSlot(newSlot);
    const sp = SLOT_SPECS[newSlot];
    if (sp?.formats?.length && !sp.formats.includes(format as any)) {
      setFormat(sp.formats[0]);
    }
  };

  // Handle media file upload
  const handleUpload = async (
    file: File,
    target: "main" | "mobile" | "tablet" | "desktop"
  ) => {
    if (!token) return toast.error("Not authenticated");
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"];
    if (!allowed.includes(file.type)) {
      return toast.error("Invalid file type. Supported: PNG, JPG, WEBP, MP4, WEBM");
    }

    setUploading(true);
    try {
      const media = await adsApi.uploadAdMedia(file, token);
      if (target === "main") {
        setMediaId(media.id);
        setMediaUrl(media.url);
        setMediaMime(media.mimeType);
      } else if (target === "mobile") {
        setMobileMediaId(media.id);
        setMobileMediaUrl(media.url);
      } else if (target === "tablet") {
        setTabletMediaId(media.id);
        setTabletMediaUrl(media.url);
      } else if (target === "desktop") {
        setDesktopMediaId(media.id);
        setDesktopMediaUrl(media.url);
      }
      toast.success("Media uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Ad Name is required");
    if (!title.trim()) return toast.error("Ad Title is required");
    if (!slot) return toast.error("Placement Slot is required");
    if (!token) return toast.error("Not authenticated");

    setSaving(true);
    try {
      let safeStartAt: string | null = null;
      if (startAt && startAt.trim()) {
        const d = new Date(startAt);
        if (!isNaN(d.getTime())) safeStartAt = d.toISOString();
      }

      let safeEndAt: string | null = null;
      if (endAt && endAt.trim()) {
        const d = new Date(endAt);
        if (!isNaN(d.getTime())) safeEndAt = d.toISOString();
      }

      let cleanInternalRoute: string | null = null;
      let cleanClickUrl: string | null = null;

      if (destinationType === "internal") {
        if (internalRoute.trim()) {
          let val = internalRoute.trim();
          if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("//")) {
            try {
              const u = new URL(val.startsWith("//") ? `https:${val}` : val);
              val = (u.pathname || "/") + u.search + u.hash;
            } catch {}
          }
          val = val.replace(/^\/+/, "/");
          if (!val.startsWith("/")) val = `/${val}`;
          cleanInternalRoute = val;
        }
      } else {
        if (clickUrl.trim()) {
          const raw = clickUrl.trim();
          if (raw.startsWith("/") && !raw.startsWith("//")) {
            cleanInternalRoute = raw;
          } else {
            try {
              const parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
              const isSameOrigin = parsed.origin === window.location.origin;
              const isKnownSite =
                parsed.hostname === window.location.hostname ||
                parsed.hostname.includes("flucie.com") ||
                parsed.hostname.includes("storynest") ||
                parsed.hostname === "localhost" ||
                parsed.hostname === "127.0.0.1";
              if (isSameOrigin || isKnownSite) {
                const path = (parsed.pathname || "/") + parsed.search + parsed.hash;
                cleanInternalRoute = path.startsWith("/") ? path : `/${path}`;
              } else {
                cleanClickUrl = raw;
              }
            } catch {
              cleanClickUrl = raw;
            }
          }
        }
      }

      const payload: Partial<Ad> = {
        name: name.trim(),
        title: title.trim(),
        description: description.trim() || null,
        format,
        status,
        isActive,
        priority: Number(priority) || 5,
        slot,
        deviceTarget,
        mediaId: mediaId || null,
        mobileMediaId: showResponsiveMedia && mobileMediaId ? mobileMediaId : null,
        tabletMediaId: showResponsiveMedia && tabletMediaId ? tabletMediaId : null,
        desktopMediaId: showResponsiveMedia && desktopMediaId ? desktopMediaId : null,
        clickUrl: cleanClickUrl,
        internalRoute: cleanInternalRoute,
        ctaText: ctaText.trim() || null,
        startAt: safeStartAt,
        endAt: safeEndAt,
        frequencyLimit: frequencyLimit && !isNaN(Number(frequencyLimit)) ? parseInt(frequencyLimit, 10) : null,
        maxDisplaysPerDay: maxDisplaysPerDay && !isNaN(Number(maxDisplaysPerDay)) ? parseInt(maxDisplaysPerDay, 10) : null,
        minTimeBetweenDisplays: minTimeBetweenDisplays && !isNaN(Number(minTimeBetweenDisplays)) ? parseInt(minTimeBetweenDisplays, 10) : null,
        popupTrigger: format === "POPUP" ? popupTrigger : null,
        popupDelay: format === "POPUP" && popupDelay && !isNaN(Number(popupDelay)) ? parseInt(popupDelay, 10) : null,
      };

      if (editAd) {
        await adsApi.updateAd(editAd.id, payload, token);
        toast.success("Ad updated successfully");
      } else {
        await adsApi.createAd(payload, token);
        toast.success("Ad created successfully");
      }
      onSuccess();
    } catch (err: any) {
      const errorMsg = err.errors && Array.isArray(err.errors) && err.errors.length > 0
        ? err.errors.map((e: any) => `${e.field ? e.field + ": " : ""}${e.message}`).join(", ")
        : err.message || "Failed to save advertisement";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Get current active preview image based on device
  const getActivePreviewUrl = () => {
    if (previewDevice === "MOBILE" && mobileMediaUrl) return mobileMediaUrl;
    if (previewDevice === "TABLET" && tabletMediaUrl) return tabletMediaUrl;
    if (previewDevice === "DESKTOP" && desktopMediaUrl) return desktopMediaUrl;
    return mediaUrl;
  };

  const activeMediaUrl = getActivePreviewUrl();
  const isVideo = mediaMime.startsWith("video/") || activeMediaUrl?.endsWith(".mp4") || activeMediaUrl?.endsWith(".webm");

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        style={{
          background: "hsl(var(--card))",
          borderRadius: 24,
          border: "1px solid hsl(var(--border))",
          width: "100%",
          maxWidth: 1180,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid hsl(var(--border))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "hsl(var(--card))",
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 34, height: 34, borderRadius: 10,
                background: "linear-gradient(135deg, hsl(260,85%,60%), hsl(330,85%,65%))",
                display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white",
              }}>
                <Sparkles size={18} />
              </span>
              {editAd ? `Edit Advertisement: ${editAd.name}` : "Create New Advertisement"}
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
              Configure screen placement, device compatibility, responsive creative, and delivery rules.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none", background: "hsl(var(--muted))",
              borderRadius: "50%", width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "inherit",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: "flex", gap: 8, padding: "10px 24px",
          borderBottom: "1px solid hsl(var(--border))",
          background: "rgba(0,0,0,0.02)", overflowX: "auto",
        }}>
          {[
            { id: "details", label: "1. Basics & Placement", icon: Layers },
            { id: "media", label: "2. Media & Dimensions", icon: Image },
            { id: "schedule", label: "3. Schedule & Rules", icon: Calendar },
            { id: "destination", label: "4. CTA & Link", icon: ExternalLink },
            { id: "preview", label: "5. Live Preview", icon: Eye },
          ].map(tab => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 12,
                  fontSize: 13, fontWeight: 700, border: "none",
                  cursor: "pointer",
                  background: isCurrent ? "hsl(var(--primary))" : "transparent",
                  color: isCurrent ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body: Split view (Form on left / Preview on right) */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Form Scroll Area */}
          <div style={{ flex: 1, padding: 24, overflowY: "auto", maxHeight: "calc(92vh - 160px)" }}>
            <form onSubmit={handleSubmit}>
              {/* TAB 1: DETAILS & PLACEMENT */}
              {activeTab === "details" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Internal Ad Name <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Summer Reading Challenge 2026 Promo"
                        required
                      />
                      <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                        Visible only to admins in management tables.
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        style={{
                          width: "100%", height: 40, borderRadius: 10,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))", padding: "0 12px",
                          fontSize: 13, fontWeight: 600, color: "inherit",
                        }}
                      >
                        {Object.values(AD_STATUS).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                      Display Title <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <Input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. 🌟 Unlock 100+ Magic Stories Today!"
                      required
                    />
                    <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                      Public title rendered in the banner/card/popup.
                    </span>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                      Short Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g. Join Pippin the Fox on exciting space adventures. 50% off premium this week!"
                      rows={2}
                      style={{
                        width: "100%", borderRadius: 10,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))", padding: "10px 12px",
                        fontSize: 13, fontFamily: "inherit", color: "inherit", resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ height: 1, background: "hsl(var(--border))", margin: "4px 0" }} />

                  {/* Placement Target */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Target Screen / Page <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={screen}
                        onChange={e => handleScreenChange(e.target.value)}
                        style={{
                          width: "100%", height: 40, borderRadius: 10,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))", padding: "0 12px",
                          fontSize: 13, fontWeight: 600, color: "inherit",
                        }}
                      >
                        {Object.values(SCREENS).map(sc => (
                          <option key={sc} value={sc}>{sc.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Placement Slot <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={slot}
                        onChange={e => handleSlotChange(e.target.value)}
                        style={{
                          width: "100%", height: 40, borderRadius: 10,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))", padding: "0 12px",
                          fontSize: 13, fontWeight: 600, color: "inherit",
                        }}
                      >
                        {availableSlots.map(s => (
                          <option key={s.slot} value={s.slot}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Ad Format
                      </label>
                      <select
                        value={format}
                        onChange={e => setFormat(e.target.value)}
                        style={{
                          width: "100%", height: 40, borderRadius: 10,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))", padding: "0 12px",
                          fontSize: 13, fontWeight: 600, color: "inherit",
                        }}
                      >
                        {(currentSpec?.formats || Object.values(AD_FORMATS)).map(f => (
                          <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Device Compatibility
                      </label>
                      <select
                        value={deviceTarget}
                        onChange={e => setDeviceTarget(e.target.value)}
                        style={{
                          width: "100%", height: 40, borderRadius: 10,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))", padding: "0 12px",
                          fontSize: 13, fontWeight: 600, color: "inherit",
                        }}
                      >
                        {Object.values(DEVICE_TARGETS).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Priority (1-10)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={priority}
                        onChange={e => setPriority(parseInt(e.target.value, 10) || 5)}
                      />
                    </div>
                  </div>

                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 12, background: "rgba(0,0,0,0.03)",
                    border: "1px solid hsl(var(--border))",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Enable Ad Immediately</div>
                      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                        Disabled ads are never delivered by the public AdSlot API.
                      </div>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </motion.div>
              )}

              {/* TAB 2: MEDIA & DIMENSIONS */}
              {activeTab === "media" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Slot Spec Box */}
                  {currentSpec && (
                    <div style={{
                      padding: 16, borderRadius: 14, background: "hsl(var(--accent) / 0.15)",
                      border: "1px solid hsl(var(--accent) / 0.3)", display: "flex", flexDirection: "column", gap: 8,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, color: "hsl(var(--primary))" }}>
                        <Sliders size={16} /> Placement Specification: {currentSpec.label}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 12 }}>
                        <div style={{ padding: 8, borderRadius: 8, background: "hsl(var(--card))" }}>
                          <strong>💻 Desktop:</strong> {currentSpec.dimensions.desktop.width} × {currentSpec.dimensions.desktop.height} px
                          <div style={{ color: "hsl(var(--muted-foreground))" }}>Max {currentSpec.maxSizeKB.desktop} KB</div>
                        </div>
                        <div style={{ padding: 8, borderRadius: 8, background: "hsl(var(--card))" }}>
                          <strong>📱 Tablet:</strong> {currentSpec.dimensions.tablet.width} × {currentSpec.dimensions.tablet.height} px
                          <div style={{ color: "hsl(var(--muted-foreground))" }}>Max {currentSpec.maxSizeKB.tablet} KB</div>
                        </div>
                        <div style={{ padding: 8, borderRadius: 8, background: "hsl(var(--card))" }}>
                          <strong>📱 Mobile:</strong> {currentSpec.dimensions.mobile.width} × {currentSpec.dimensions.mobile.height} px
                          <div style={{ color: "hsl(var(--muted-foreground))" }}>Max {currentSpec.maxSizeKB.mobile} KB</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                        Aspect Ratio: <strong>{currentSpec.aspectRatio}</strong> • Fit: <strong>{currentSpec.objectFit}</strong>
                      </div>
                    </div>
                  )}

                  {/* Primary Media Upload */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                      Primary Creative Media (Image or Video)
                    </label>
                    <div style={{
                      border: "2px dashed hsl(var(--border))",
                      borderRadius: 16, padding: 24, textAlign: "center",
                      background: "hsl(var(--card))", cursor: "pointer",
                    }} onClick={() => fileInputRef.current?.click()}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file, "main");
                        }}
                      />
                      <Upload size={32} style={{ margin: "0 auto 10px", color: "hsl(var(--muted-foreground))" }} />
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {uploading ? "Uploading to Media Library..." : "Click to select or upload media file"}
                      </div>
                      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
                        PNG, JPG, WEBP (Recommended) or MP4, WEBM
                      </div>
                    </div>

                    {/* Or URL input */}
                    <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                      <Input
                        value={mediaUrl}
                        onChange={e => setMediaUrl(e.target.value)}
                        placeholder="Or enter direct media URL (https://...)"
                        style={{ fontSize: 12 }}
                      />
                      {mediaUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { setMediaUrl(""); setMediaId(null); }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Responsive Media Toggle */}
                  <div style={{
                    marginTop: 10, padding: 14, borderRadius: 14,
                    border: "1px solid hsl(var(--border))", background: "rgba(0,0,0,0.02)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Device-Specific Media Overrides (Optional)</div>
                        <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                          Upload distinct creatives tailored for Mobile, Tablet, and Desktop resolutions.
                        </div>
                      </div>
                      <Switch checked={showResponsiveMedia} onCheckedChange={setShowResponsiveMedia} />
                    </div>

                    {showResponsiveMedia && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
                        {/* Mobile Override */}
                        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                            <Smartphone size={14} /> Mobile:
                          </span>
                          <Input
                            value={mobileMediaUrl}
                            onChange={e => setMobileMediaUrl(e.target.value)}
                            placeholder="Mobile creative URL..."
                            style={{ fontSize: 12 }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => mobileFileInputRef.current?.click()}
                          >
                            Upload
                          </Button>
                          <input
                            type="file"
                            ref={mobileFileInputRef}
                            style={{ display: "none" }}
                            accept="image/*,video/*"
                            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "mobile")}
                          />
                        </div>

                        {/* Tablet Override */}
                        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                            <Tablet size={14} /> Tablet:
                          </span>
                          <Input
                            value={tabletMediaUrl}
                            onChange={e => setTabletMediaUrl(e.target.value)}
                            placeholder="Tablet creative URL..."
                            style={{ fontSize: 12 }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => tabletFileInputRef.current?.click()}
                          >
                            Upload
                          </Button>
                          <input
                            type="file"
                            ref={tabletFileInputRef}
                            style={{ display: "none" }}
                            accept="image/*,video/*"
                            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "tablet")}
                          />
                        </div>

                        {/* Desktop Override */}
                        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                            <Monitor size={14} /> Desktop:
                          </span>
                          <Input
                            value={desktopMediaUrl}
                            onChange={e => setDesktopMediaUrl(e.target.value)}
                            placeholder="Desktop creative URL..."
                            style={{ fontSize: 12 }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => desktopFileInputRef.current?.click()}
                          >
                            Upload
                          </Button>
                          <input
                            type="file"
                            ref={desktopFileInputRef}
                            style={{ display: "none" }}
                            accept="image/*,video/*"
                            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "desktop")}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: SCHEDULE & RULES */}
              {activeTab === "schedule" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Start Date & Time (UTC)
                      </label>
                      <Input
                        type="datetime-local"
                        value={startAt}
                        onChange={e => setStartAt(e.target.value)}
                      />
                      <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                        Leave blank to start immediately.
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        End Date & Time (UTC)
                      </label>
                      <Input
                        type="datetime-local"
                        value={endAt}
                        onChange={e => setEndAt(e.target.value)}
                      />
                      <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                        Leave blank for indefinite duration.
                      </span>
                    </div>
                  </div>

                  <div style={{ height: 1, background: "hsl(var(--border))", margin: "4px 0" }} />

                  {/* Frequency control */}
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Frequency & Delivery Caps</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Max Displays / Session
                      </label>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        value={frequencyLimit}
                        onChange={e => setFrequencyLimit(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Max Displays / Day
                      </label>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        value={maxDisplaysPerDay}
                        onChange={e => setMaxDisplaysPerDay(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Min Gap (Seconds)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 60"
                        value={minTimeBetweenDisplays}
                        onChange={e => setMinTimeBetweenDisplays(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Popup specifics */}
                  {format === "POPUP" && (
                    <div style={{
                      padding: 16, borderRadius: 14, background: "rgba(0,0,0,0.03)",
                      border: "1px solid hsl(var(--border))", marginTop: 6,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                        Popup Trigger Settings
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                            Trigger Event
                          </label>
                          <select
                            value={popupTrigger}
                            onChange={e => setPopupTrigger(e.target.value)}
                            style={{
                              width: "100%", height: 38, borderRadius: 8,
                              border: "1px solid hsl(var(--border))",
                              background: "hsl(var(--card))", padding: "0 10px",
                              fontSize: 13, color: "inherit",
                            }}
                          >
                            {Object.values(POPUP_TRIGGERS).map(tr => (
                              <option key={tr} value={tr}>{tr.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                            Delay Before Show (sec)
                          </label>
                          <Input
                            type="number"
                            value={popupDelay}
                            onChange={e => setPopupDelay(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4: CTA & DESTINATION */}
              {activeTab === "destination" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                      Call to Action (CTA) Button Text
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {CTA_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setCtaText(opt)}
                          style={{
                            padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            border: `1px solid ${ctaText === opt ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                            background: ctaText === opt ? "hsl(var(--primary) / 0.1)" : "hsl(var(--card))",
                            color: ctaText === opt ? "hsl(var(--primary))" : "inherit",
                            cursor: "pointer",
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={ctaText}
                      onChange={e => setCtaText(e.target.value)}
                      placeholder="e.g. Read Now, Subscribe, Start Lesson..."
                    />
                  </div>

                  <div style={{ height: 1, background: "hsl(var(--border))", margin: "4px 0" }} />

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
                      Click Destination Type
                    </label>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="destinationType"
                          checked={destinationType === "internal"}
                          onChange={() => setDestinationType("internal")}
                        />
                        Internal App Screen
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="destinationType"
                          checked={destinationType === "external"}
                          onChange={() => setDestinationType("external")}
                        />
                        External Safe URL
                      </label>
                    </div>

                    {destinationType === "internal" ? (
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                          Internal Route
                        </label>
                        <Input
                          value={internalRoute}
                          onChange={e => setInternalRoute(e.target.value)}
                          placeholder="e.g. /chat, /stories, /learn, or site URL like https://www.flucie.com/chat"
                        />
                        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4, display: "block" }}>
                          Smoothly redirects inside StoryNest without a page reload. Full website links are automatically converted.
                        </span>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {["/chat", "/stories", "/learn", "/games", "/life-skills", "/dictionary", "/parents", "/subscription"].map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setInternalRoute(r)}
                              style={{
                                fontSize: 11, padding: "3px 8px", borderRadius: 6,
                                border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))",
                                cursor: "pointer", color: "inherit",
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                          External Target URL (HTTPS)
                        </label>
                        <Input
                          type="url"
                          value={clickUrl}
                          onChange={e => setClickUrl(e.target.value)}
                          placeholder="https://example.com/promo"
                        />
                        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                          Validated server-side to prevent open redirects. Opens in a new tab.
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 5: PREVIEW */}
              {activeTab === "preview" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginBottom: 12 }}>
                    Review how your creative looks across responsive StoryNest viewports below.
                  </div>
                </motion.div>
              )}
            </form>
          </div>

          {/* Right Preview Pane (Always Visible & Interactive) */}
          <div style={{
            width: 440,
            background: "hsl(var(--muted) / 0.4)",
            borderLeft: "1px solid hsl(var(--border))",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Viewport switch header */}
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "hsl(var(--card))",
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Live Mockup
              </span>
              <div style={{ display: "flex", gap: 4, background: "hsl(var(--muted))", borderRadius: 8, padding: 3 }}>
                {[
                  { id: "DESKTOP", icon: Monitor },
                  { id: "TABLET", icon: Tablet },
                  { id: "MOBILE", icon: Smartphone },
                ].map(dev => {
                  const Icon = dev.icon;
                  return (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => setPreviewDevice(dev.id as any)}
                      style={{
                        border: "none",
                        background: previewDevice === dev.id ? "hsl(var(--card))" : "transparent",
                        padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                        display: "flex", alignItems: "center",
                        color: previewDevice === dev.id ? "hsl(var(--primary))" : "inherit",
                        boxShadow: previewDevice === dev.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                      title={`${dev.id} Preview`}
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated StoryNest Screen */}
            <div style={{
              flex: 1, padding: 18, overflowY: "auto",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: previewDevice === "MOBILE" ? 300 : previewDevice === "TABLET" ? 360 : 400,
                transition: "all 0.25s ease",
                borderRadius: 18,
                background: "hsl(var(--card))",
                boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                border: "1px solid hsl(var(--border))",
                overflow: "hidden",
              }}>
                {/* Simulated App Header */}
                <div style={{
                  padding: "8px 14px", background: "linear-gradient(90deg, #2E2270, #1A1040)",
                  color: "white", fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>🦊</span> StoryNest World
                  </div>
                  <span style={{ fontSize: 9, opacity: 0.7, textTransform: "uppercase" }}>
                    {screen} Screen
                  </span>
                </div>

                {/* Simulated Content Area with Ad Component */}
                <div style={{ padding: 12, background: "hsl(var(--background))" }}>
                  <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginBottom: 6, fontWeight: 600 }}>
                    Slot: {slot} ({format})
                  </div>

                  {/* Render Mockup by Format */}
                  <div style={{
                    borderRadius: 14, overflow: "hidden",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    position: "relative",
                  }}>
                    {/* Media Display */}
                    <div style={{
                      width: "100%",
                      height: format === "POPUP" ? 180 : format === "BANNER" ? 110 : 150,
                      background: "linear-gradient(135deg, hsl(260,85%,60%), hsl(330,85%,65%))",
                      position: "relative",
                      overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {activeMediaUrl ? (
                        isVideo ? (
                          <video
                            src={activeMediaUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: currentSpec?.objectFit || "cover" }}
                          />
                        ) : (
                          <img
                            src={activeMediaUrl}
                            alt={title || "Ad"}
                            style={{ width: "100%", height: "100%", objectFit: currentSpec?.objectFit || "cover" }}
                          />
                        )
                      ) : (
                        <div style={{ textAlign: "center", color: "white", padding: 12 }}>
                          <Image size={28} style={{ margin: "0 auto 6px", opacity: 0.8 }} />
                          <div style={{ fontSize: 11, fontWeight: 700 }}>Upload Media for Live Preview</div>
                          <div style={{ fontSize: 9, opacity: 0.8 }}>Recommended {currentSpec?.aspectRatio || "16:9"}</div>
                        </div>
                      )}

                      {/* Sponsored / Ad Badge */}
                      <span style={{
                        position: "absolute", top: 8, left: 8,
                        background: "rgba(0,0,0,0.6)", color: "white",
                        fontSize: 9, fontWeight: 700, padding: "2px 6px",
                        borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.5,
                      }}>
                        Promoted
                      </span>

                      {/* Close button simulation for popup / fullscreen */}
                      {(format === "POPUP" || format === "FULLSCREEN" || format === "BOTTOM_SHEET") && (
                        <div style={{
                          position: "absolute", top: 8, right: 8,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "rgba(0,0,0,0.5)", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10,
                        }}>
                          ✕
                        </div>
                      )}
                    </div>

                    {/* Content Details */}
                    <div style={{ padding: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "hsl(var(--foreground))" }}>
                        {title || "Your Engaging Promotional Headline"}
                      </div>
                      {description && (
                        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4, lineHeight: 1.3 }}>
                          {description}
                        </div>
                      )}
                      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          size="sm"
                          style={{
                            height: 30, fontSize: 11, fontWeight: 700, borderRadius: 8,
                            background: "linear-gradient(135deg, hsl(260,85%,60%), hsl(330,85%,65%))",
                            color: "white", border: "none",
                          }}
                        >
                          {ctaText || "Explore"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Footnote */}
                  <div style={{
                    marginTop: 8, fontSize: 9, textAlign: "center",
                    color: "hsl(var(--muted-foreground))",
                  }}>
                    🛡️ StoryNest Safe Ads: Preview impressions are not tracked.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid hsl(var(--border))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "hsl(var(--card))",
        }}>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
            Slot: <strong>{slot}</strong> • Status: <strong>{status}</strong>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{
                background: "linear-gradient(135deg, hsl(260,85%,60%), hsl(330,85%,65%))",
                color: "white", fontWeight: 700, minWidth: 120,
              }}
            >
              {saving ? "Saving..." : editAd ? "Save Changes" : "Create & Publish"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
