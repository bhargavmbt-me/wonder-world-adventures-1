import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  BookOpen,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Globe,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldAlert,
  ArrowUpDown,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLoadingState from "@/components/admin/AdminLoadingState";
import { adminApi, StoryWeaverAdminStory, StoryWeaverAdminStats } from "@/lib/adminApi";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { StoryWeaverReader } from "@/components/story/StoryWeaverReader";

const LANGUAGES = [
  "All",
  "English",
  "Hindi",
  "Gujarati",
  "Marathi",
  "Urdu",
  "Kannada",
  "Bengali",
  "Malayalam",
  "Odia",
  "Sanskrit",
  "Assamese",
  "Punjabi",
  "Arabic",
  "Telugu",
  "Tamil",
];

const LEVELS = ["All", "1", "2", "3", "4"];

export default function StoryWeaverAdmin() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Filter & pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [audioStatus, setAudioStatus] = useState<"all" | "audio_only" | "no_audio">("all");
  const [visibility, setVisibility] = useState<"all" | "visible" | "hidden">("all");
  const [language, setLanguage] = useState("All");
  const [level, setLevel] = useState("All");
  const [sortBy, setSortBy] = useState<"reads" | "newest" | "title" | "audio">("reads");

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reader preview modal
  const [previewStory, setPreviewStory] = useState<any | null>(null);

  // Bulk action confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "hide_non_audio" | "unhide_non_audio" | "hide_all" | "unhide_all" | "hide_selected" | "unhide_selected";
    title: string;
    description: string;
    destructive?: boolean;
  }>({
    open: false,
    action: "hide_non_audio",
    title: "",
    description: "",
  });

  // Generating audio per-story state
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Fetch Stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery<{
    success: boolean;
    stats: StoryWeaverAdminStats;
  }>({
    queryKey: ["storyweaver-admin-stats"],
    queryFn: () => adminApi.getStoryWeaverStats(token),
    enabled: Boolean(token),
    staleTime: 30 * 1000,
  });

  const stats = statsData?.stats;

  // Fetch Stories
  const { data: storiesData, isLoading: storiesLoading, isFetching: storiesFetching, refetch: refetchStories } = useQuery({
    queryKey: [
      "storyweaver-admin-stories",
      page,
      limit,
      search,
      audioStatus,
      visibility,
      language,
      level,
      sortBy,
    ],
    queryFn: () =>
      adminApi.getStoryWeaverStories(
        {
          page,
          limit,
          query: search,
          audioStatus,
          visibility,
          language: language !== "All" ? language : undefined,
          level: level !== "All" ? level : undefined,
          sortBy,
        },
        token
      ),
    enabled: Boolean(token),
  });

  const stories = storiesData?.stories || [];
  const total = storiesData?.total || 0;
  const totalPages = storiesData?.totalPages || 1;

  // Toggle single story hide mutation
  const toggleHideMutation = useMutation({
    mutationFn: ({ id, isHidden }: { id: string; isHidden: boolean }) =>
      adminApi.toggleStoryWeaverHide(id, isHidden, token),
    onMutate: async ({ id, isHidden }) => {
      // Optimistic update
      queryClient.setQueryData(
        [
          "storyweaver-admin-stories",
          page,
          limit,
          search,
          audioStatus,
          visibility,
          language,
          level,
          sortBy,
        ],
        (old: any) => {
          if (!old?.stories) return old;
          return {
            ...old,
            stories: old.stories.map((s: StoryWeaverAdminStory) =>
              s.swId === id ? { ...s, isHidden } : s
            ),
          };
        }
      );
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.isHidden
          ? `Story hidden from public view`
          : `Story is now visible to users`
      );
      queryClient.invalidateQueries({ queryKey: ["storyweaver-admin-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update story visibility");
      refetchStories();
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: ({
      action,
      storyIds,
    }: {
      action: "hide_non_audio" | "unhide_non_audio" | "hide_all" | "unhide_all" | "hide_selected" | "unhide_selected";
      storyIds?: string[];
    }) => adminApi.bulkStoryWeaverHide(action, storyIds, token),
    onSuccess: (data) => {
      toast.success(data.message || "Bulk action completed successfully");
      setSelectedIds([]);
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      queryClient.invalidateQueries({ queryKey: ["storyweaver-admin-stories"] });
      queryClient.invalidateQueries({ queryKey: ["storyweaver-admin-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to perform bulk action");
    },
  });

  // Trigger audio generation
  const handleGenerateAudio = async (swId: string) => {
    setGeneratingId(swId);
    try {
      toast.info("Generating natural audio narration for story pages. Please wait...");
      const res = await adminApi.generateStoryWeaverAudio(swId, token);
      if (res.success) {
        toast.success("Audio narration generated and saved successfully!");
        queryClient.invalidateQueries({ queryKey: ["storyweaver-admin-stories"] });
        queryClient.invalidateQueries({ queryKey: ["storyweaver-admin-stats"] });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate audio");
    } finally {
      setGeneratingId(null);
    }
  };

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // Handle select all on page
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(stories.map((s) => s.swId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (swId: string) => {
    setSelectedIds((prev) =>
      prev.includes(swId) ? prev.filter((id) => id !== swId) : [...prev, swId]
    );
  };

  const isAllSelected = stories.length > 0 && stories.every((s) => selectedIds.includes(s.swId));

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-violet-600/10 text-violet-600 font-bold">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                StoryWeaver Stories CMS
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage StoryWeaver audio stories, visibility rules, and hide non-audio stories with one click.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStats();
                refetchStories();
              }}
              disabled={storiesFetching}
              className="gap-2 font-semibold border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className={`w-4 h-4 ${storiesFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Stats Summary Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Stories */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stored</span>
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <BookOpen className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{stats?.total ?? "..."}</div>
              <span className="text-[11px] text-slate-400 font-semibold">in PostgreSQL database</span>
            </div>
          </div>

          {/* Audio Stories */}
          <div
            onClick={() => {
              setAudioStatus("audio_only");
              setPage(1);
            }}
            className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">With Audio</span>
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Volume2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-700">{stats?.withAudio ?? "..."}</div>
              <span className="text-[11px] text-emerald-600 font-semibold">Ready for narration 🔊</span>
            </div>
          </div>

          {/* No Audio Stories */}
          <div
            onClick={() => {
              setAudioStatus("no_audio");
              setPage(1);
            }}
            className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-400 hover:bg-amber-50/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">No Audio</span>
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <VolumeX className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-700">{stats?.withoutAudio ?? "..."}</div>
              <span className="text-[11px] text-amber-600 font-semibold">Candidate to hide / generate</span>
            </div>
          </div>

          {/* Visible in App */}
          <div
            onClick={() => {
              setVisibility("visible");
              setPage(1);
            }}
            className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Visible to Kids</span>
              <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Eye className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-blue-700">{stats?.visible ?? "..."}</div>
              <span className="text-[11px] text-blue-600 font-semibold">Active in public app</span>
            </div>
          </div>

          {/* Hidden Stories */}
          <div
            onClick={() => {
              setVisibility("hidden");
              setPage(1);
            }}
            className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-400 hover:bg-rose-50/20 transition-all col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Hidden Stories</span>
              <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <EyeOff className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-700">{stats?.hidden ?? "..."}</div>
              <span className="text-[11px] text-rose-600 font-semibold">
                {stats?.hiddenWithoutAudio ?? 0} non-audio hidden
              </span>
            </div>
          </div>
        </div>

        {/* ── Prominent Banner: Hide All Non-Audio Stories ─────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl border border-indigo-700/30">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                Audience Experience Control
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white">
                Audio vs Non-Audio Story Visibility
              </h2>
              <p className="text-sm text-indigo-100/90 leading-relaxed">
                You have <strong className="text-amber-300 font-bold">{stats?.withoutAudio ?? 482} stories without audio narration</strong>.
                To ensure children have an engaging read-aloud experience, you can hide all non-audio stories so they only discover stories with audio narration.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    action: "hide_non_audio",
                    title: "Hide All Non-Audio Stories?",
                    description: `This will immediately hide all ${stats?.withoutAudio ?? 482} stories that do not have audio narration. Children and users in the app will only see stories with audio narration. You can unhide them at any time.`,
                    destructive: false,
                  })
                }
                disabled={bulkActionMutation.isPending || stats?.withoutAudio === stats?.hiddenWithoutAudio}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black shadow-lg shadow-orange-500/20 gap-2 border-0 px-5 py-2.5 h-auto rounded-xl transition-all"
              >
                <EyeOff className="w-4 h-4 text-slate-950" />
                Hide All Non-Audio Stories ({stats?.withoutAudio ?? 482})
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    action: "unhide_all",
                    title: "Unhide All Stories?",
                    description: "This will make ALL stories in the database visible to users, including stories without audio narration.",
                    destructive: false,
                  })
                }
                disabled={bulkActionMutation.isPending || (stats?.hidden ?? 0) === 0}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold px-4 py-2.5 h-auto rounded-xl backdrop-blur-sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                Unhide All Stories
              </Button>
            </div>
          </div>
        </div>

        {/* ── Filters & Controls Toolbar ──────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by title, author, or StoryWeaver ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 pr-9 bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Audio Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => {
                    setAudioStatus("all");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    audioStatus === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => {
                    setAudioStatus("audio_only");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    audioStatus === "audio_only" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Audio ({stats?.withAudio ?? 0})
                </button>
                <button
                  onClick={() => {
                    setAudioStatus("no_audio");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    audioStatus === "no_audio" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:text-amber-700"
                  }`}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  No Audio ({stats?.withoutAudio ?? 0})
                </button>
              </div>

              {/* Visibility Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => {
                    setVisibility("all");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    visibility === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => {
                    setVisibility("visible");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    visibility === "visible" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-blue-700"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visible
                </button>
                <button
                  onClick={() => {
                    setVisibility("hidden");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    visibility === "hidden" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:text-rose-700"
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Hidden ({stats?.hidden ?? 0})
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Filters row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">
                Refine by:
              </span>

              {/* Language Selector */}
              <Select
                value={language}
                onValueChange={(val) => {
                  setLanguage(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs font-bold bg-slate-50 border-slate-200 rounded-lg w-[140px]">
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang} className="text-xs font-semibold">
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Level Selector */}
              <Select
                value={level}
                onValueChange={(val) => {
                  setLevel(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs font-bold bg-slate-50 border-slate-200 rounded-lg w-[110px]">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl} className="text-xs font-semibold">
                      {lvl === "All" ? "All Levels" : `Level ${lvl}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select
                value={sortBy}
                onValueChange={(val: any) => {
                  setSortBy(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs font-bold bg-slate-50 border-slate-200 rounded-lg w-[130px]">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reads" className="text-xs font-semibold">Most Reads</SelectItem>
                  <SelectItem value="audio" className="text-xs font-semibold">Audio First</SelectItem>
                  <SelectItem value="title" className="text-xs font-semibold">Title (A-Z)</SelectItem>
                  <SelectItem value="newest" className="text-xs font-semibold">Newest Added</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-slate-500 font-bold text-xs">
              Showing <span className="text-slate-900 font-black">{total}</span> stories
            </div>
          </div>
        </div>

        {/* ── Bulk Selection Action Bar (appears when rows are checked) ── */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-indigo-950 text-white rounded-2xl px-5 py-3.5 shadow-xl flex items-center justify-between gap-4 border border-indigo-700/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 text-white font-black text-xs">
                  {selectedIds.length}
                </span>
                <span className="text-sm font-bold">stories selected</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      action: "hide_selected",
                      title: `Hide ${selectedIds.length} Selected Stories?`,
                      description: `These ${selectedIds.length} stories will be hidden from children and users in the app.`,
                    })
                  }
                  className="bg-rose-500/20 text-rose-200 hover:bg-rose-500 hover:text-white border-rose-500/40 font-bold text-xs h-8"
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                  Hide Selected
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      action: "unhide_selected",
                      title: `Unhide ${selectedIds.length} Selected Stories?`,
                      description: `These ${selectedIds.length} stories will be made visible to children and users in the app.`,
                    })
                  }
                  className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500 hover:text-white border-emerald-500/40 font-bold text-xs h-8"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Make Visible
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds([])}
                  className="text-slate-400 hover:text-white text-xs h-8"
                >
                  Clear Selection
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stories Table ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">Story</th>
                  <th className="py-3.5 px-3">Language & Level</th>
                  <th className="py-3.5 px-3 text-center">Audio Narration</th>
                  <th className="py-3.5 px-3 text-center">App Visibility</th>
                  <th className="py-3.5 px-3 text-center">Hide / Show</th>
                  <th className="py-3.5 pr-4 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {storiesLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="inline-flex items-center gap-3 text-slate-500 font-bold">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        Loading StoryWeaver stories from database...
                      </div>
                    </td>
                  </tr>
                ) : stories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                        <div className="text-base font-bold text-slate-700">No stories match your criteria</div>
                        <p className="text-xs text-slate-400">
                          Try adjusting your search query, language filter, or audio filters.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setSearchInput("");
                            setAudioStatus("all");
                            setVisibility("all");
                            setLanguage("All");
                            setLevel("All");
                          }}
                          className="mt-2 text-xs"
                        >
                          Reset All Filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  stories.map((story) => {
                    const isSelected = selectedIds.includes(story.swId);
                    return (
                      <tr
                        key={story.swId}
                        className={`transition-colors hover:bg-slate-50/70 ${
                          story.isHidden ? "bg-rose-50/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 pl-4 pr-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(story.swId)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Story Info */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              {story.coverImage ? (
                                <img
                                  src={story.coverImage}
                                  alt={story.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <BookOpen className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs sm:max-w-sm md:max-w-md">
                              <div className="font-bold text-slate-900 truncate text-sm">
                                {story.title}
                              </div>
                              <div className="text-xs text-slate-400 truncate mt-0.5">
                                {story.authors?.length > 0 ? `By ${story.authors.join(", ")}` : `ID: ${story.swId}`}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                                <span>{story.totalPages || (story.pages || []).length} pages</span>
                                <span>•</span>
                                <span>{story.readsCount.toLocaleString()} reads</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Language & Level */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {story.language || "English"}
                            </span>
                            {story.level && (
                              <div className="text-[11px] font-semibold text-slate-400">
                                Level {story.level}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Audio Status */}
                        <td className="py-3.5 px-3 text-center">
                          {story.hasAudio ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold gap-1 text-[11px] py-1">
                              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                              Audio Ready
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold gap-1 text-[11px] py-1">
                              <VolumeX className="w-3.5 h-3.5 text-amber-600" />
                              No Audio
                            </Badge>
                          )}
                        </td>

                        {/* App Visibility Badge */}
                        <td className="py-3.5 px-3 text-center">
                          {story.isHidden ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200">
                              <EyeOff className="w-3 h-3 text-rose-600" />
                              Hidden
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <Eye className="w-3 h-3 text-emerald-600" />
                              Visible
                            </span>
                          )}
                        </td>

                        {/* Toggle Switch */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={!story.isHidden}
                              onCheckedChange={(checked) =>
                                toggleHideMutation.mutate({
                                  id: story.swId,
                                  isHidden: !checked,
                                })
                              }
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-rose-500"
                            />
                            <span className="text-[10px] font-bold text-slate-400">
                              {!story.isHidden ? "Shown" : "Hidden"}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-4 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview Reader */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPreviewStory(story)}
                              className="h-8 px-2.5 text-xs font-bold gap-1 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600"
                              title="Preview story in reader"
                            >
                              <Play className="w-3 h-3 text-indigo-600" />
                              Preview
                            </Button>

                            {/* Generate Audio if missing */}
                            {!story.hasAudio && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateAudio(story.swId)}
                                disabled={generatingId === story.swId}
                                className="h-8 px-2.5 text-xs font-bold gap-1 border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100"
                                title="Generate natural TTS audio narration"
                              >
                                {generatingId === story.swId ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-amber-600" />
                                )}
                                Audio
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer & Pagination ─────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 gap-3">
            <div className="text-xs font-semibold text-slate-500">
              Showing <span className="text-slate-900 font-bold">{stories.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
              <span className="text-slate-900 font-bold">{Math.min(page * limit, total)}</span> of{" "}
              <span className="text-slate-900 font-bold">{total}</span> stories
            </div>

            <div className="flex items-center gap-3">
              {/* Rows Per Page */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || storiesLoading}
                  className="h-8 w-8 p-0 border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold text-slate-700 px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || storiesLoading}
                  className="h-8 w-8 p-0 border-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 pt-2 leading-relaxed">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
              disabled={bulkActionMutation.isPending}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                bulkActionMutation.mutate({
                  action: confirmDialog.action,
                  storyIds:
                    confirmDialog.action === "hide_selected" || confirmDialog.action === "unhide_selected"
                      ? selectedIds
                      : undefined,
                })
              }
              disabled={bulkActionMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black gap-2"
            >
              {bulkActionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Story Preview Modal ─────────────────────────────────────── */}
      {previewStory && (
        <StoryWeaverReader
          story={previewStory}
          onClose={() => setPreviewStory(null)}
        />
      )}
    </AdminLayout>
  );
}

