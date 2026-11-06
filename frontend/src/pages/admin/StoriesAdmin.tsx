import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit2, Trash2, Copy, Eye, Star, Crown,
  BookOpen, X, Download, Upload, Flame, Sparkles, CheckCircle2,
  Headphones, ChevronDown, Filter, RefreshCw, Zap, Heart,
  BookMarked, Languages, Clock, BarChart2, Ban,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLoadingState from "@/components/admin/AdminLoadingState";
import { adminApi, AdminStory } from "@/lib/adminApi";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ExcelImportStoriesDialog from "@/components/admin/stories/ExcelImportStoriesDialog";

// ── Constants ─────────────────────────────────────────────────────
const CATEGORIES = [
  "Animal", "Moral", "Adventure", "Fantasy", "Science",
  "Space", "Nature", "History", "Friendship", "Family",
  "Festival", "Bedtime", "Educational",
];
const AGE_GROUPS  = ["3-5", "6-8", "9-12"];

const CATEGORY_COLORS: Record<string, string> = {
  Animal: "#10b981", Moral: "#8b5cf6", Adventure: "#f59e0b",
  Fantasy: "#6366f1", Science: "#0ea5e9", Space: "#4f46e5",
  Nature: "#22c55e", History: "#f97316", Friendship: "#ec4899",
  Family: "#14b8a6", Festival: "#f43f5e", Bedtime: "#7c3aed",
  Educational: "#0284c7",
};

// ── Empty form factory ────────────────────────────────────────────
const emptyForm = (): Partial<AdminStory> => ({
  title: "", subtitle: "", description: "", content: "",
  author: "", slug: "",
  category: undefined, ageGroup: undefined,   // undefined so Select shows placeholder
  coverImage: "", tags: [], readingTime: undefined, listeningTime: undefined,
  isPremium: false, isPublished: false, isFeatured: false,
  isTrending: false, isRecommended: false, readAloudEnabled: false,
  narratorVoice: "", xpReward: 0, starsReward: 2, sortOrder: 0,
});

// ── Status badge helper ───────────────────────────────────────────
function StatusBadge({ label, active, color }: { label: string; active: boolean; color: string }) {
  if (!active) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════
// Story Form Dialog
// ══════════════════════════════════════════════════════════════════
function StoryFormDialog({
  story, languages, onClose, onSave, isSaving,
}: {
  story: Partial<AdminStory>;
  languages: Array<{ id: string; code: string; name: string }>;
  onClose: () => void;
  onSave: (data: Partial<AdminStory>) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<Partial<AdminStory>>({ ...emptyForm(), ...story });
  const [tagsInput, setTagsInput] = useState((story.tags ?? []).join(", "));
  const [activeSection, setActiveSection] = useState(0);

  const set = (key: keyof AdminStory, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({ ...form, tags });
  };

  const sections = [
    "Basic Info", "Story Details", "Media",
    "Read Aloud", "Rewards", "Status & Flags",
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 flex flex-col gap-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800">
            {(story as AdminStory).storyId ? "Edit Story" : "Create New Story"}
          </DialogTitle>
          {/* Section tabs */}
          <div className="flex gap-1 mt-3 flex-wrap">
            {sections.map((s, i) => (
              <button
                key={s}
                onClick={() => setActiveSection(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === i
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">

          {/* ── Section 1: Basic Info ─────────────────────────── */}
          {activeSection === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Title <span className="text-rose-500">*</span></Label>
                  <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Story title" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subtitle</Label>
                  <Input value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="Optional subtitle" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Author</Label>
                  <Input value={form.author ?? ""} onChange={(e) => set("author", e.target.value)} placeholder="Author name" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Slug</Label>
                  <Input value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated-from-title" className="font-mono text-xs" />
                  <p className="text-[11px] text-slate-400 mt-1">Leave blank to auto-generate from title.</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Short Description</Label>
                  <Textarea
                    value={form.description ?? ""}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Brief description shown on story cards..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Full Story Content <span className="text-rose-500">*</span></Label>
                  <Textarea
                    value={form.content ?? ""}
                    onChange={(e) => set("content", e.target.value)}
                    placeholder="Write the full story here..."
                    rows={10}
                    className="text-sm resize-none font-normal leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Section 2: Story Details ──────────────────────── */}
          {activeSection === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Category</Label>
                  <Select
                    value={form.category || "none"}
                    onValueChange={(v) => set("category", v === "none" ? null : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-slate-400 italic">None (No Category)</SelectItem>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Age Group</Label>
                  <Select
                    value={form.ageGroup || "none"}
                    onValueChange={(v) => set("ageGroup", v === "none" ? null : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select age group" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-slate-400 italic">None (No Age Group)</SelectItem>
                      {AGE_GROUPS.map((a) => <SelectItem key={a} value={a}>{a} years</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Language</Label>
                  <Select
                    value={form.language?.id ?? form.languageId ?? undefined}
                    onValueChange={(v) => set("languageId", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reading Time (min)</Label>
                  <Input
                    type="number" min={0}
                    value={form.readingTime ?? ""}
                    onChange={(e) => set("readingTime", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Listening Time (min)</Label>
                  <Input
                    type="number" min={0}
                    value={form.listeningTime ?? ""}
                    onChange={(e) => set("listeningTime", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 7"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Tags</Label>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="adventure, animals, forest (comma-separated)"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Separate tags with commas.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Section 3: Media ──────────────────────────────── */}
          {activeSection === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4">Story Images</h4>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Thumbnail Image URL</Label>
                    <Input
                      value={form.thumbnailUrl ?? ""}
                      onChange={(e) => set("thumbnailUrl", e.target.value)}
                      placeholder="https://example.com/thumbnail.jpg"
                      className="font-mono text-xs"
                    />
                  </div>
                  {form.thumbnailUrl && (
                    <div className="mt-2">
                      <Label className="text-xs font-semibold text-slate-600 mb-2 block">Thumbnail Preview</Label>
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img
                          src={form.thumbnailUrl}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect fill='%23f1f5f9' width='128' height='128'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2394a3b8' font-size='10'%3EImage not found%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Background Image URL</Label>
                    <Input
                      value={form.backgroundUrl ?? ""}
                      onChange={(e) => set("backgroundUrl", e.target.value)}
                      placeholder="https://example.com/background.jpg"
                      className="font-mono text-xs"
                    />
                  </div>
                  {form.backgroundUrl && (
                    <div className="mt-2">
                      <Label className="text-xs font-semibold text-slate-600 mb-2 block">Background Preview</Label>
                      <div className="relative w-full max-w-md h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img
                          src={form.backgroundUrl}
                          alt="Background preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23f1f5f9' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2394a3b8' font-size='14'%3EImage not found%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Legacy Cover Image URL</Label>
                <Input
                  value={form.coverImage ?? ""}
                  onChange={(e) => set("coverImage", e.target.value)}
                  placeholder="https://example.com/story-cover.jpg"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">Paste a direct image URL. Image upload will be supported later.</p>
                {form.coverImage && (
                  <div className="mt-4">
                    <Label className="text-xs font-semibold text-slate-600 mb-2 block">Preview</Label>
                    <div className="relative w-full max-w-xs rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <img
                        src={form.coverImage}
                        alt="Cover preview"
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23f1f5f9' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2394a3b8' font-size='14'%3EImage not found%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      {form.title && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                          <p className="text-white font-bold text-sm leading-tight">{form.title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Section 4: Read Aloud ─────────────────────────── */}
          {activeSection === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Enable Read Aloud</p>
                  <p className="text-xs text-slate-500 mt-0.5">Shows an audio playback button on the story page</p>
                </div>
                <Switch
                  checked={form.readAloudEnabled ?? false}
                  onCheckedChange={(v) => set("readAloudEnabled", v)}
                />
              </div>
              {form.readAloudEnabled && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Narrator Voice</Label>
                  <Input
                    value={form.narratorVoice ?? ""}
                    onChange={(e) => set("narratorVoice", e.target.value)}
                    placeholder="e.g. Luna, Arjun, Default Female"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Section 5: Rewards ────────────────────────────── */}
          {activeSection === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> XP Reward
                  </Label>
                  <Input
                    type="number" min={0}
                    value={form.xpReward ?? 0}
                    onChange={(e) => set("xpReward", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-yellow-500" /> Star Reward
                  </Label>
                  <Input
                    type="number" min={0}
                    value={form.starsReward ?? 0}
                    onChange={(e) => set("starsReward", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">
                Children earn these rewards when they complete the story.
              </div>
            </div>
          )}

          {/* ── Section 6: Status & Flags ─────────────────────── */}
          {activeSection === 5 && (
            <div className="space-y-3">
              {([
                { key: "isPublished",    label: "Published",  desc: "Visible to users on the platform",     icon: CheckCircle2, color: "text-emerald-600" },
                { key: "isPremium",      label: "Premium",    desc: "Requires a subscription to access",    icon: Crown,        color: "text-amber-500"  },
                { key: "isFeatured",     label: "Featured",   desc: "Shown in the Featured Stories section",icon: Sparkles,     color: "text-indigo-500" },
                { key: "isTrending",     label: "Trending",   desc: "Shown in the Trending section",        icon: Flame,        color: "text-rose-500"   },
                { key: "isRecommended",  label: "Recommended",desc: "Shown in Recommended for You",         icon: BookMarked,   color: "text-teal-500"   },
              ] as const).map(({ key, label, desc, icon: Icon, color }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={(form as any)[key] ?? false}
                    onCheckedChange={(v) => set(key as keyof AdminStory, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between">
          <div className="flex gap-2">
            {activeSection > 0 && (
              <Button variant="outline" size="sm" onClick={() => setActiveSection((s) => s - 1)} className="rounded-xl">
                ← Back
              </Button>
            )}
            {activeSection < sections.length - 1 && (
              <Button size="sm" onClick={() => setActiveSection((s) => s + 1)} className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white">
                Next →
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              className="text-white rounded-xl shadow-sm shadow-indigo-200 font-semibold"
            >
              {isSaving ? <><RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Saving…</> : ((story as AdminStory).storyId ? "Update Story" : "Create Story")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════
// Story Preview Dialog
// ══════════════════════════════════════════════════════════════════
function StoryPreviewDialog({ story, onClose }: { story: AdminStory; onClose: () => void }) {
  const catColor = CATEGORY_COLORS[story.category ?? ""] ?? "#6366f1";
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden rounded-2xl">
        {/* Cover */}
        <div className="relative h-56 shrink-0 overflow-hidden">
          {story.coverImage ? (
            <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl" style={{ background: story.coverGradient ?? `linear-gradient(135deg, ${catColor}33, ${catColor}88)` }}>
              {story.coverEmoji ?? "📖"}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-12">
            <p className="text-white font-bold text-lg leading-tight">{story.title}</p>
            {story.subtitle && <p className="text-white/70 text-xs mt-0.5">{story.subtitle}</p>}
            {story.author && <p className="text-white/60 text-xs mt-1">by {story.author}</p>}
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta row */}
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-slate-100 shrink-0">
          {story.isPremium && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
              <Crown className="w-3 h-3" /> Premium
            </span>
          )}
          {story.category && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: `${catColor}18`, color: catColor }}>
              {story.category}
            </span>
          )}
          {story.ageGroup && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
              {story.ageGroup} yrs
            </span>
          )}

          {story.readingTime && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
              <Clock className="w-3 h-3" /> {story.readingTime} min
            </span>
          )}
          {story.readAloudEnabled && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600">
              <Headphones className="w-3 h-3" /> Read Aloud
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {story.description && (
            <p className="text-slate-600 text-sm leading-relaxed italic border-l-2 border-indigo-200 pl-3">{story.description}</p>
          )}
          {story.content && (
            <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-serif">
              {story.content.length > 800 ? story.content.slice(0, 800) + "…" : story.content}
            </div>
          )}

          {/* Rewards */}
          {(story.xpReward > 0 || story.starsReward > 0) && (
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              {story.xpReward > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                  <Zap className="w-4 h-4 text-amber-500" /> {story.xpReward} XP
                </div>
              )}
              {story.starsReward > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-yellow-700 font-semibold">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {story.starsReward} Stars
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">Admin Preview Mode</p>
          <Button size="sm" onClick={onClose} variant="outline" className="rounded-xl text-xs">
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main StoriesAdmin Page
// ══════════════════════════════════════════════════════════════════
export default function StoriesAdmin() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("all");
  const [ageFilter,   setAgeFilter]   = useState("all");
  const [premFilter,  setPremFilter]  = useState("all");
  const [pubFilter,   setPubFilter]   = useState("all");
  const [featFilter,  setFeatFilter]  = useState(false);
  const [trendFilter, setTrendFilter] = useState(false);

  // ── Dialog state ─────────────────────────────────────────────
  const [editStory,    setEditStory]    = useState<Partial<AdminStory> | null>(null);
  const [previewStory, setPreviewStory] = useState<AdminStory | null>(null);
  const [showImport,   setShowImport]   = useState(false);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);

  // ── Data fetching ────────────────────────────────────────────
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["admin-stories"],
    queryFn: () => adminApi.getStories({ limit: 100 }),
  });

  const { data: languages = [] } = useQuery({
    queryKey: ["admin-languages"],
    queryFn: adminApi.getLanguages,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: Partial<AdminStory>) => {
      const existing = editStory as AdminStory;
      return existing?.storyId
        ? adminApi.updateStory(existing.storyId, data, token)
        : adminApi.createStory(data, token);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success(
        (editStory as AdminStory)?.storyId ? "Story updated!" : "Story created!"
      );
      setEditStory(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteStory(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("Story deleted");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => adminApi.duplicateStory(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("Story duplicated as draft!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, key, value }: { id: string; key: string; value: boolean }) =>
      adminApi.updateStory(id, { [key]: value } as Partial<AdminStory>, token),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
      if (vars.key === "isPublished") {
        toast.success(vars.value ? "Story activated & published" : "Story terminated (unpublished)");
      } else {
        toast.success("Story updated");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Client-side filtering ─────────────────────────────────────
  const filtered = useMemo(() => {
    return stories.filter((s) => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !(s.author ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter  !== "all" && s.category  !== catFilter)  return false;
      if (premFilter === "premium" && !s.isPremium)  return false;
      if (premFilter === "free"    && s.isPremium)   return false;
      if (pubFilter  === "published" && !s.isPublished) return false;
      if (pubFilter  === "draft"     && s.isPublished)  return false;
      if (featFilter  && !s.isFeatured)  return false;
      if (trendFilter && !s.isTrending) return false;
      return true;
    });
  }, [stories, search, catFilter, ageFilter, premFilter, pubFilter, featFilter, trendFilter]);

  const activeFiltersCount = [
    catFilter !== "all", ageFilter !== "all",
    premFilter !== "all", pubFilter !== "all", featFilter, trendFilter,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCatFilter("all"); setAgeFilter("all");
    setPremFilter("all"); setPubFilter("all"); setFeatFilter(false); setTrendFilter(false);
  };

  // ── Summary stats ─────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      stories.length,
    published:  stories.filter((s) => s.isPublished).length,
    terminated: stories.filter((s) => !s.isPublished).length,
    premium:    stories.filter((s) => s.isPremium).length,
    featured:   stories.filter((s) => s.isFeatured).length,
  }), [stories]);

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1400 }}>

        {/* ── Page Header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              Stories Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {stats.total} total · <span className="text-emerald-600 font-semibold">{stats.published} active</span> · <span className="text-rose-500 font-semibold">{stats.terminated} terminated</span> · {stats.premium} premium
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/admin/storyweaver">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-violet-600" /> StoryWeaver Stories
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 gap-1.5 text-slate-600"
              onClick={() => window.open(adminApi.exportStoriesExcelUrl(token), "_blank")}
            >
              <Download className="w-4 h-4" /> Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5"
              onClick={() => setShowImport(true)}
            >
              <Upload className="w-4 h-4" /> Import Excel
            </Button>
            <Button
              size="sm"
              onClick={() => setEditStory(emptyForm())}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              className="text-white rounded-xl shadow-sm shadow-indigo-200 gap-1.5 font-semibold"
            >
              <Plus className="w-4 h-4" /> Add Story
            </Button>
          </div>
        </motion.div>

        {/* ── Filter Bar ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm"
        >
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or author…"
                className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category */}
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-40 rounded-xl bg-slate-50 border-slate-200 text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Age Group */}
            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger className="w-36 rounded-xl bg-slate-50 border-slate-200 text-sm">
                <SelectValue placeholder="Age Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                {AGE_GROUPS.map((a) => <SelectItem key={a} value={a}>{a} yrs</SelectItem>)}
              </SelectContent>
            </Select>



            {/* Premium */}
            <Select value={premFilter} onValueChange={setPremFilter}>
              <SelectTrigger className="w-36 rounded-xl bg-slate-50 border-slate-200 text-sm">
                <SelectValue placeholder="Premium" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Access</SelectItem>
                <SelectItem value="premium">Premium Only</SelectItem>
                <SelectItem value="free">Free Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Published / Status */}
            <Select value={pubFilter} onValueChange={setPubFilter}>
              <SelectTrigger className="w-44 rounded-xl bg-slate-50 border-slate-200 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">🟢 Active Only</SelectItem>
                <SelectItem value="draft">🔴 Terminated / Draft</SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle badges */}
            <button
              onClick={() => setFeatFilter((f) => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${featFilter ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Featured
            </button>
            <button
              onClick={() => setTrendFilter((f) => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${trendFilter ? "bg-rose-600 text-white border-rose-600" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
            >
              <Flame className="w-3.5 h-3.5" /> Trending
            </button>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-all"
              >
                <X className="w-3.5 h-3.5" /> Clear ({activeFiltersCount})
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Stories Table ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Cover", "Title & Author", "Category", "Language", "Status", "Time", "Flags", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4">
                      <AdminLoadingState
                        message="Fetching stories from database..."
                        subMessage="Loading story titles, authors, categories, and cover images."
                        minHeight="220px"
                      />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">
                      <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      {search || activeFiltersCount > 0 ? "No stories match your filters." : "No stories yet. Click Add Story to create one."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((story, i) => {
                    const catColor = CATEGORY_COLORS[story.category ?? ""] ?? "#6366f1";
                    return (
                      <motion.tr
                        key={story.storyId || story.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Cover */}
                        <td className="px-4 py-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-slate-100">
                            {story.coverImage ? (
                              <img src={story.coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl"
                                style={{ background: `linear-gradient(135deg,${catColor}33,${catColor}66)` }}>
                                {story.coverEmoji ?? "📚"}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Title & Author */}
                        <td className="px-4 py-3 min-w-[180px]">
                          <p className="font-semibold text-sm text-slate-900 leading-tight line-clamp-1">{story.title}</p>
                          {story.subtitle && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{story.subtitle}</p>}
                          {story.author && <p className="text-xs text-slate-400 mt-0.5">by {story.author}</p>}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          {story.category && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: `${catColor}18`, color: catColor }}>
                              {story.category}
                            </span>
                          )}
                        </td>

                        {/* Language */}
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono uppercase">
                          {story.language?.code ?? story.languageId ? (story.language?.code ?? "—") : "—"}
                        </td>

                        {/* Status Column */}
                        <td className="px-4 py-3">
                          {story.isPublished ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              Terminated
                            </span>
                          )}
                        </td>



                        {/* Time */}
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {story.readingTime && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <BookOpen className="w-3 h-3" /> {story.readingTime}m
                              </div>
                            )}
                            {story.listeningTime && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Headphones className="w-3 h-3" /> {story.listeningTime}m
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Flags — quick toggles */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1 flex-wrap">
                              {/* Published */}
                              <button
                                title={story.isPublished ? "Unpublish" : "Publish"}
                                onClick={() => toggleMutation.mutate({ id: story.storyId ?? story.id, key: "isPublished", value: !story.isPublished })}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all hover:opacity-80 ${story.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                              >
                                {story.isPublished ? "Published" : "Draft"}
                              </button>
                              {/* Premium */}
                              <button
                                title={story.isPremium ? "Make Free" : "Make Premium"}
                                onClick={() => toggleMutation.mutate({ id: story.storyId ?? story.id, key: "isPremium", value: !story.isPremium })}
                                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all hover:opacity-80 ${story.isPremium ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}
                              >
                                <Crown className="w-2.5 h-2.5" /> {story.isPremium ? "Premium" : "Free"}
                              </button>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {/* Featured */}
                              <button
                                title="Toggle Featured"
                                onClick={() => toggleMutation.mutate({ id: story.storyId ?? story.id, key: "isFeatured", value: !story.isFeatured })}
                                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all hover:opacity-80 ${story.isFeatured ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}
                              >
                                <Sparkles className="w-2.5 h-2.5" /> Featured
                              </button>
                              {/* Trending */}
                              <button
                                title="Toggle Trending"
                                onClick={() => toggleMutation.mutate({ id: story.storyId ?? story.id, key: "isTrending", value: !story.isTrending })}
                                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all hover:opacity-80 ${story.isTrending ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-400"}`}
                              >
                                <Flame className="w-2.5 h-2.5" /> Trending
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Terminate / Reactivate Action */}
                            <button
                              title={story.isPublished ? "Terminate Story (Hide from platform)" : "Reactivate Story (Publish)"}
                              onClick={() => toggleMutation.mutate({ id: story.storyId ?? story.id, key: "isPublished", value: !story.isPublished })}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                story.isPublished
                                  ? "hover:bg-rose-100 text-rose-600 hover:text-rose-700"
                                  : "hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 bg-slate-100"
                              }`}
                            >
                              {story.isPublished ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              title="Edit"
                              onClick={() => setEditStory({ ...story, storyId: story.storyId ?? story.id } as AdminStory)}
                              className="w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Preview"
                              onClick={() => setPreviewStory(story)}
                              className="w-8 h-8 rounded-lg hover:bg-sky-50 flex items-center justify-center text-slate-500 hover:text-sky-600 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Duplicate"
                              onClick={() => duplicateMutation.mutate(story.storyId ?? story.id)}
                              className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-slate-500 hover:text-emerald-600 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Delete permanently"
                              onClick={() => setDeleteId(story.storyId ?? story.id)}
                              className="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: row count */}
          {!isLoading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
              Showing {filtered.length} of {stories.length} stories
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Create / Edit Form ───────────────────────────────────── */}
      {editStory !== null && (
        <StoryFormDialog
          story={editStory}
          languages={languages}
          onClose={() => setEditStory(null)}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isPending}
        />
      )}

      {/* ── Preview Dialog ───────────────────────────────────────── */}
      {previewStory && (
        <StoryPreviewDialog
          story={previewStory}
          onClose={() => setPreviewStory(null)}
        />
      )}

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Delete Story?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mt-1">
            This action is permanent and cannot be undone. The story and its embeddings will be removed.
          </p>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting…" : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Excel Import Dialog ──────────────────────────────────── */}
      <ExcelImportStoriesDialog open={showImport} onOpenChange={setShowImport} />
    </AdminLayout>
  );
}
