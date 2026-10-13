/**
 * AdSlot — Public-facing in-app advertisement component.
 *
 * Usage:
 *   <AdSlot slot="HOME_TOP" />
 *   <AdSlot slot="STORIES_BETWEEN_CARDS" device="MOBILE" />
 *
 * Features:
 *   - Requests eligible ad from /api/ads/slot/:slot
 *   - Handles loading, no-ad, and error states gracefully
 *   - Uses IntersectionObserver for visibility-based impression tracking
 *   - Tracks clicks
 *   - Supports Banner, Card, Popup, Bottom Sheet, Fullscreen, Video, Inline
 *   - Frequency control via sessionStorage
 *   - Renders nothing if no ad or API error
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink } from "lucide-react";
import adsApi, { PublicAd } from "@/lib/ads/adsApi";
import { SLOT_SPECS } from "@/lib/ads/adsConfig";

interface AdSlotProps {
  slot: string;
  device?: "MOBILE" | "TABLET" | "DESKTOP" | "ALL";
  className?: string;
  style?: React.CSSProperties;
}

// ── Device detection ─────────────────────────────────────────────────────────
const detectDevice = (): "MOBILE" | "TABLET" | "DESKTOP" => {
  const w = window.innerWidth;
  if (w < 768) return "MOBILE";
  if (w < 1024) return "TABLET";
  return "DESKTOP";
};

// ── Frequency control ────────────────────────────────────────────────────────
const getDisplayCount = (adId: string): number => {
  try {
    const key = `ad_count_${adId}`;
    return parseInt(sessionStorage.getItem(key) || "0", 10);
  } catch { return 0; }
};

const incrementDisplayCount = (adId: string): void => {
  try {
    const key = `ad_count_${adId}`;
    const count = getDisplayCount(adId);
    sessionStorage.setItem(key, String(count + 1));
  } catch {}
};

const getLastDisplayTime = (adId: string): number => {
  try {
    const key = `ad_last_${adId}`;
    return parseInt(sessionStorage.getItem(key) || "0", 10);
  } catch { return 0; }
};

const setLastDisplayTime = (adId: string): void => {
  try {
    sessionStorage.setItem(`ad_last_${adId}`, String(Date.now()));
  } catch {}
};

// ── AdSlot component ─────────────────────────────────────────────────────────
export default function AdSlot({ slot, device, className, style }: AdSlotProps) {
  const detectedDevice = device || detectDevice();
  const spec = SLOT_SPECS[slot];
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: ad, isLoading, error } = useQuery<PublicAd | null>({
    queryKey: ["ad-slot", slot, detectedDevice],
    queryFn: () => adsApi.getSlotAd(slot, detectedDevice),
    staleTime: 2 * 60 * 1000, // 2 min — matches backend cache TTL
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Frequency and interval eligibility checker (evaluates past displays)
  const isAdEligible = useCallback((adData: PublicAd): boolean => {
    if (adData.frequencyLimit && adData.frequencyLimit > 0) {
      const count = getDisplayCount(adData.id);
      if (count >= adData.frequencyLimit) return false;
    }
    if (adData.minTimeBetweenDisplays && adData.minTimeBetweenDisplays > 0) {
      const lastTime = getLastDisplayTime(adData.id);
      const elapsed = (Date.now() - lastTime) / 1000;
      if (lastTime > 0 && elapsed < adData.minTimeBetweenDisplays) return false;
    }
    return true;
  }, []);

  // Compute eligibility once per ad id for the duration of this component mount
  const lastAdIdRef = useRef<string | null>(null);
  const eligibleRef = useRef<boolean>(true);

  if (ad && ad.id !== lastAdIdRef.current) {
    lastAdIdRef.current = ad.id;
    eligibleRef.current = isAdEligible(ad);
  }

  // Safe impression recorder (ensures count & timestamp updates don't cancel active display)
  const recordImpression = useCallback((adId: string) => {
    if (impressionTracked) return;
    setImpressionTracked(true);
    adsApi.trackImpression(adId);
    incrementDisplayCount(adId);
    setLastDisplayTime(adId);
  }, [impressionTracked]);

  // Intersection Observer for impression tracking (in-page formats)
  useEffect(() => {
    if (!ad || impressionTracked || dismissed || !eligibleRef.current) return;
    if (ad.format === "POPUP") return; // Handled separately by popup timer

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          recordImpression(ad.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (adRef.current) observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [ad, impressionTracked, dismissed, recordImpression]);

  // Popup trigger logic
  useEffect(() => {
    if (!ad || dismissed || ad.format !== "POPUP" || !eligibleRef.current) return;

    const trigger = ad.popupTrigger || "ON_PAGE_LOAD";
    const delay = (ad.popupDelay || 0) * 1000;

    if (trigger === "ON_PAGE_LOAD" || trigger === "AFTER_DELAY") {
      popupTimerRef.current = setTimeout(() => {
        setPopupVisible(true);
        recordImpression(ad.id);
      }, delay);
    }

    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, [ad, dismissed, recordImpression]);

  const handleClick = useCallback(() => {
    if (!ad) return;
    adsApi.trackClick(ad.id);
    const url = ad.clickUrl || (ad.internalRoute ? `/${ad.internalRoute}` : null);
    if (url) {
      if (ad.clickUrl) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = url;
      }
    }
  }, [ad]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setPopupVisible(false);
    if (ad) {
      setLastDisplayTime(ad.id);
    }
  }, [ad]);

  // ── Render nothing if no ad, error, dismissed, or ineligible ──────────────
  if (isLoading) return null; // Don't show loading placeholder for ads
  if (error || !ad || dismissed || !eligibleRef.current) return null;

  // ── Render based on format ────────────────────────────────────────────────
  const format = ad.format;
  const dims = spec?.dimensions?.[detectedDevice.toLowerCase() as "desktop" | "tablet" | "mobile"] || spec?.dimensions?.mobile;
  const objectFit = spec?.objectFit || "cover";

  // ── Helper: media element ─────────────────────────────────────────────────
  const MediaElement = ({ customStyle }: { customStyle?: React.CSSProperties } = {}) => {
    if (!ad.mediaUrl) return null;
    const isVideo = ad.mimeType?.startsWith("video/");
    const baseStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit,
      display: "block",
      ...customStyle,
    };
    if (isVideo) {
      return (
        <video
          src={ad.mediaUrl}
          autoPlay muted loop playsInline
          style={baseStyle}
        />
      );
    }
    return (
      <img
        src={ad.mediaUrl}
        alt={ad.title}
        style={baseStyle}
        loading="lazy"
      />
    );
  };

  // ── Helper: CTA button ────────────────────────────────────────────────────
  const CTAButton = ({ dark = false }: { dark?: boolean }) => {
    if (!ad.ctaText) return null;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        style={{
          padding: "10px 24px",
          borderRadius: 12,
          background: dark ? "white" : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--lavender, 260 70% 70%)))",
          color: dark ? "#1A1040" : "white",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "opacity 0.15s",
        }}
        onMouseOver={e => (e.currentTarget.style.opacity = "0.9")}
        onMouseOut={e => (e.currentTarget.style.opacity = "1")}
      >
        {ad.ctaText}
        <ExternalLink size={13} />
      </button>
    );
  };

  // ── Ad label (child-safe, clearly marks ads) ──────────────────────────────
  const AdLabel = () => (
    <span style={{
      position: "absolute", top: 8, left: 10, fontSize: 10, fontWeight: 700,
      color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.5)",
      padding: "2px 8px", borderRadius: 6, letterSpacing: 1, zIndex: 5,
      textTransform: "uppercase", backdropFilter: "blur(4px)",
    }}>
      Ad
    </span>
  );

  // ── Close button (for popup/fullscreen/bottom-sheet) ──────────────────────
  const CloseButton = ({ onClose }: { onClose: (e: React.MouseEvent) => void }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClose(e);
      }}
      aria-label="Close advertisement"
      style={{
        position: "absolute", top: 12, right: 12, width: 36, height: 36,
        borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "2px solid rgba(255,255,255,0.4)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", zIndex: 10, backdropFilter: "blur(4px)",
      }}
    >
      <X size={16} />
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // BANNER
  // ─────────────────────────────────────────────────────────────────────────
  if (format === "BANNER") {
    return (
      <div
        ref={adRef}
        className={className}
        onClick={handleClick}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: dims ? dims.width : "100%",
          height: dims ? dims.height : 200,
          borderRadius: 16,
          overflow: "hidden",
          cursor: ad.clickUrl || ad.internalRoute ? "pointer" : "default",
          margin: "12px auto",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          ...style,
        }}
      >
        <AdLabel />
        <MediaElement />
        {(ad.title || ad.ctaText) && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
            padding: "24px 16px 14px",
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          }}>
            <div>
              {ad.title && <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 4 }}>{ad.title}</div>}
              {ad.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{ad.description}</div>}
            </div>
            <CTAButton />
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CARD / INLINE_CONTENT
  // ─────────────────────────────────────────────────────────────────────────
  if (format === "CARD" || format === "INLINE_CONTENT") {
    return (
      <div
        ref={adRef}
        className={className}
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          margin: "12px auto",
          maxWidth: dims ? dims.width : 640,
          cursor: ad.clickUrl || ad.internalRoute ? "pointer" : "default",
          ...style,
        }}
        onClick={handleClick}
      >
        <AdLabel />
        <div style={{ width: "100%", aspectRatio: spec?.aspectRatio?.replace(":", "/") || "16/9", overflow: "hidden" }}>
          <MediaElement />
        </div>
        {(ad.title || ad.ctaText) && (
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              {ad.title && <div style={{ fontSize: 14, fontWeight: 700 }}>{ad.title}</div>}
              {ad.description && <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{ad.description}</div>}
            </div>
            {ad.ctaText && <CTAButton dark />}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POPUP
  // ─────────────────────────────────────────────────────────────────────────
  if (format === "POPUP") {
    if (!popupVisible) return <div ref={adRef} style={{ display: "none" }} />;
    return (
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={e => e.target === e.currentTarget && handleDismiss()}
      >
        <div style={{
          position: "relative",
          borderRadius: 24,
          overflow: "hidden",
          maxWidth: dims ? dims.width : 600,
          width: "100%",
          maxHeight: "90vh",
          background: "#1A103C",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 40px rgba(140,80,220,0.2)",
          cursor: ad.clickUrl || ad.internalRoute ? "pointer" : "default",
        }} onClick={handleClick}>
          <CloseButton onClose={handleDismiss} />
          <AdLabel />
          <MediaElement customStyle={{ height: "auto", maxHeight: "75vh", objectFit: "contain", background: "rgba(18, 12, 38, 0.95)" }} />
          {(ad.title || ad.ctaText) && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(15,8,30,0.92) 0%, rgba(15,8,30,0.7) 60%, transparent 100%)",
              padding: "36px 22px 22px",
              display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                {ad.title && <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 6 }}>{ad.title}</div>}
                {ad.description && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{ad.description}</div>}
              </div>
              <CTAButton />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOTTOM_SHEET
  // ─────────────────────────────────────────────────────────────────────────
  if (format === "BOTTOM_SHEET") {
    if (dismissed) return null;
    return (
      <div
        ref={adRef}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 500,
          background: "hsl(var(--card))",
          borderTop: "1px solid hsl(var(--border))",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
          overflow: "hidden",
          maxHeight: "40vh",
        }}
      >
        <CloseButton onClose={handleDismiss} />
        <AdLabel />
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 56px 16px 16px" }} onClick={handleClick}>
          {ad.mediaUrl && (
            <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
              <MediaElement />
            </div>
          )}
          <div style={{ flex: 1 }}>
            {ad.title && <div style={{ fontSize: 16, fontWeight: 700 }}>{ad.title}</div>}
            {ad.description && <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>{ad.description}</div>}
            {ad.ctaText && <div style={{ marginTop: 12 }}><CTAButton dark /></div>}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FULLSCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (format === "FULLSCREEN") {
    if (dismissed) return null;
    return (
      <div
        ref={adRef}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "#000",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <CloseButton onClose={handleDismiss} />
        <AdLabel />
        <div style={{ width: "100%", height: "100%", position: "relative" }} onClick={handleClick}>
          <MediaElement />
          {(ad.title || ad.ctaText) && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
              padding: "48px 24px 24px",
              display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            }}>
              <div>
                {ad.title && <div style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 8 }}>{ad.title}</div>}
                {ad.description && <div style={{ fontSize: 15, color: "rgba(255,255,255,0.85)" }}>{ad.description}</div>}
              </div>
              <CTAButton />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIDEO (inline)
  // ─────────────────────────────────────────────────────────────────────────
  if (format === "VIDEO") {
    return (
      <div
        ref={adRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: dims ? dims.width : "100%",
          borderRadius: 16,
          overflow: "hidden",
          margin: "12px auto",
          ...style,
        }}
      >
        <AdLabel />
        <video
          src={ad.mediaUrl || undefined}
          autoPlay muted loop playsInline
          style={{ width: "100%", display: "block" }}
        />
        {(ad.title || ad.ctaText) && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
            padding: "20px 16px 12px",
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          }}>
            {ad.title && <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{ad.title}</div>}
            <CTAButton />
          </div>
        )}
      </div>
    );
  }

  return null;
}
