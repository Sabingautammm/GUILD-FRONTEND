import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser, FiMail, FiShield, FiLogOut, FiPlusCircle, FiLoader, FiTrash2,
  FiUsers, FiArrowRight, FiCamera, FiHash, FiAward, FiLock, FiUploadCloud, FiXCircle, FiAlertCircle,
  FiWifi, FiWifiOff, FiCheck, FiSmartphone, FiMonitor,
} from "react-icons/fi";
import PasswordInput from "../features/auth/components/PasswordInput";
import { apiFetch, ApiError } from "../services/api/client";
import { uploadAvatarFile, removeAvatar as removeAvatarApi } from "../services/api/mediaApi";
import { useToast } from "../components/toast/ToastProvider";
import { useAuth } from "../features/auth/context/AuthContext";
import { ROLE_LABEL } from "../features/dashboard/data/playerTypes";
import { usePlayerProfile } from "../features/dashboard/hooks/usePlayerProfile";
import FFLiveData from "../features/dashboard/components/FFLiveData";
import { usePlayerStatsSocket } from "../hooks/usePlayerStatsSocket";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { SkeletonProfile } from "../components/ui/Skeleton";

const ACCEPT_AVATAR = "image/jpeg,image/png,image/webp";
const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

// Platform detection and download URLs
const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_DOWNLOAD_URL || "https://github.com/Sabingautammm/GUILD/releases/latest/download/app-release.apk";
const WINDOWS_DOWNLOAD_URL = import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || "https://github.com/Sabingautammm/GUILD/releases/latest/download/GUILD_1.0.0_x64-setup.exe";

function usePlatform() {
  const [platform, setPlatform] = useState("unknown");
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isWindows = /windows/.test(ua);
    const isMac = /macintosh|mac os x/.test(ua);
    const isLinux = /linux/.test(ua);
    
    if (isMobile) {
      if (isAndroid) setPlatform("android");
      else if (isIOS) setPlatform("ios");
      else setPlatform("mobile");
    } else if (isWindows) {
      setPlatform("windows");
    } else if (isMac) {
      setPlatform("mac");
    } else if (isLinux) {
      setPlatform("linux");
    } else {
      setPlatform("desktop");
    }
  }, []);
  return platform;
}

function DownloadAppButtons() {
  const platform = usePlatform();
  
  if (platform === "android") {
    return (
      <a
        href={APK_DOWNLOAD_URL}
        download="GUILD-app-release.apk"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg gold-gradient-bg px-5 py-2.5 text-sm font-bold text-guild-950 hover:brightness-110 transition-all shadow-[0_4px_14px_-4px_rgba(227,160,18,0.5)] animate-fade-up"
      >
        <FiSmartphone className="w-4 h-4" />
        Download APK
      </a>
    );
  }
  
  if (platform === "ios") {
    return (
      <div className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg border border-guild-600 px-5 py-2.5 text-sm font-semibold text-guild-300 animate-fade-up opacity-70">
        <FiSmartphone className="w-4 h-4" />
        <span>iOS: Open in Safari & tap Share → Add to Home Screen</span>
      </div>
    );
  }
  
  // Windows, Mac, Linux, desktop
  return (
    <a
      href={WINDOWS_DOWNLOAD_URL}
      download="GUILD_1.0.0_x64-setup.exe"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg gold-gradient-bg px-5 py-2.5 text-sm font-bold text-guild-950 hover:brightness-110 transition-all shadow-[0_4px_14px_-4px_rgba(227,160,18,0.5)] animate-fade-up"
    >
      <FiMonitor className="w-4 h-4" />
      Download for Windows
    </a>
  );
}

function validateAvatarFile(file) {
  if (!file) return { ok: false, message: "Please select an image." };
  const mime = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!AVATAR_MIMES.includes(mime) || !AVATAR_EXTENSIONS.includes(ext)) {
    return { ok: false, message: "Unsupported file type. Profile picture must be JPG, PNG or WEBP." };
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { ok: false, message: "Profile picture is too large. Maximum allowed is 2 MB." };
  }
  return { ok: true };
}

function AvatarUploadZone({
  avatarSrc,
  avatarFile,
  avatarPreview,
  isSavingAvatar,
  avatarError,
  onFileSelect,
  onSave,
  onRemove,
  onClear,
  inputRef,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const dropZoneRef = useRef(null);

  // Reset the broken-image flag whenever the source changes (new upload,
  // refreshed avatar URL, cleared selection).
  useEffect(() => {
    setImgFailed(false);
  }, [avatarSrc]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  useEffect(() => {
    const el = dropZoneRef.current;
    el?.addEventListener("dragenter", handleDrag);
    el?.addEventListener("dragover", handleDrag);
    el?.addEventListener("dragleave", handleDrag);
    el?.addEventListener("drop", handleDrop);
    return () => {
      el?.removeEventListener("dragenter", handleDrag);
      el?.removeEventListener("dragover", handleDrag);
      el?.removeEventListener("dragleave", handleDrag);
      el?.removeEventListener("drop", handleDrop);
    };
  }, [handleDrag, handleDrop]);

  const isUploading = avatarFile || isSavingAvatar;

  return (
    <div className="relative" ref={dropZoneRef}>
      {/* Main Avatar Display */}
      <button
        type="button"
        onClick={() => !isUploading && inputRef.current?.click()}
        disabled={isUploading}
        className="group relative shrink-0"
        aria-label="Change profile picture"
      >
        <span className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center overflow-hidden rounded-3xl bg-guild-800 ring-2 ring-gold-500/40 gold-glow transition-all duration-300 hover:ring-gold-500/80">
          {avatarSrc && !imgFailed ? (
            <img
              src={avatarSrc}
              alt="Profile"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <FiUser className="text-4xl sm:text-5xl text-gold-400/50" />
          )}
          
          {/* Upload Overlay */}
          <span className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <FiCamera className="text-2xl text-gold-300" />
              <span className="text-sm font-semibold text-gold-100">Change Photo</span>
              <span className="text-[10px] text-gold-300/70">Drag & drop or click to upload</span>
            </div>
          </span>
          
          {/* Drag Active State */}
          {dragActive && !isUploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-gold-500/30 ring-2 ring-gold-500 animate-pulse">
              <div className="flex flex-col items-center gap-2 text-gold-100">
                <FiUploadCloud className="text-2xl" />
                <span className="text-sm font-semibold">Drop to Upload</span>
              </div>
            </span>
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_AVATAR}
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        className="hidden"
      />

      {/* Upload Preview & Actions */}
      {isUploading && (
        <div className="mt-4 rounded-xl border border-gold-500/30 bg-guild-800/90 p-4 space-y-3 animate-fade-up">
          {avatarFile && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-guild-900/50 border border-guild-700">
              <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-guild-800">
                {avatarPreview && (
                  <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-cream truncate">{avatarFile.name}</p>
                <p className="text-[10px] text-guild-500">{(avatarFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={onClear}
                disabled={isSavingAvatar}
                className="shrink-0 rounded-full border border-guild-600 px-3 py-1.5 text-[11px] font-semibold text-guild-300 hover:bg-guild-700 disabled:opacity-50 transition-colors"
              >
                <FiXCircle className="w-3 h-3 mr-1" /> Change
              </button>
            </div>
          )}
          
          {avatarError && (
            <p className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/30 border border-red-500/20 px-3 py-2 rounded-lg">
              <FiAlertCircle className="w-4 h-4 shrink-0" />
              {avatarError}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={isSavingAvatar || !avatarFile}
              className="flex items-center justify-center gap-1.5 rounded-lg gold-gradient-bg px-5 py-2.5 text-sm font-bold text-guild-950 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_14px_-4px_rgba(227,160,18,0.5)]"
            >
              {isSavingAvatar ? (
                <>
                  <FiLoader className="animate-spin" />
                  Uploading&hellip;
                </>
              ) : (
                <>
                  <FiCheck className="w-4 h-4" />
                  Save Profile Picture
                </>
              )}
            </button>
            
            {avatarSrc && !avatarFile && (
              <button
                type="button"
                onClick={onRemove}
                disabled={isSavingAvatar}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-950/40 hover:border-red-500/50 disabled:opacity-50 transition-all"
              >
                <FiTrash2 className="w-4 h-4" />
                Remove Picture
              </button>
            )}
            
            {!avatarFile && (
              <button
                type="button"
                onClick={onClear}
                disabled={isSavingAvatar}
                className="flex items-center gap-1.5 rounded-lg border border-guild-600 px-5 py-2.5 text-sm font-semibold text-guild-300 hover:bg-guild-800 disabled:opacity-50 transition-colors"
              >
                <FiXCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Help Text */}
      {!isUploading && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3 mx-auto flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-xs font-bold text-gold-300 hover:bg-gold-500/20 hover:border-gold-500 transition-colors"
          >
            <FiCamera className="text-sm" />
            Change profile picture
          </button>
          <p className="mt-2 text-center text-[11px] text-guild-500">
            JPG, PNG or WEBP &middot; Max 2MB &middot; Square aspect ratio recommended
          </p>
        </>
      )}
    </div>
  );
}

const STAT_MODES = [
  { key: "brRank", title: "BR Rank Match", hasPoints: true, pointsLabel: "Points" },
  { key: "csRank", title: "CS Rank Match", hasPoints: true, pointsLabel: "Star" },
  { key: "clashSquadCustom", title: "Clash Squad (Custom) Match", hasPoints: false },
];

function SectionCard({ icon: Icon, title, action, children }) {
  return (
    <section className="card-surface p-6 space-y-4 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-guild-300">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400">
            <Icon className="text-sm" />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value, highlight = false }) {
  return (
    <div className="rounded-lg bg-guild-900 border border-guild-800 p-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-guild-500">{label}</p>
      <p className={`text-base font-bold ${highlight ? "gold-gradient-text" : "text-cream"}`}>{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, membership, role, isAdmin, logout, refresh } = useAuth();
  const { player, isLoading } = usePlayerProfile({ enabled: true });
  const { stats: socketStats, isConnected } = usePlayerStatsSocket(user?.id, true);

  // Merge REST API stats with WebSocket updates (WebSocket takes precedence)
  const mergedStats = player?.stats ? {
    ...player.stats,
    ...socketStats,
  } : socketStats;

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState("");

  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  const avatarSavingRef = useRef(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isFree = !membership;
  const isLeader = role === "leader";

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (password.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    // The backend requires the CURRENT password whenever the account has a
    // leader password hash (authController.changePassword) — without it the
    // request always fails with 400 "Current password is required."
    if (!current) {
      setPwError("Please enter your current password.");
      return;
    }
    setIsSavingPw(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "PUT",
        body: { currentPassword: current, newPassword: password },
      });
      toast.success("Password updated", "This session is now signed out. Please sign in again.");
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update password.");
    } finally {
      setIsSavingPw(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiFetch("/auth/account", { method: "DELETE" });
      toast.success("Account deleted", "Your account and related data were removed permanently.");
      setConfirmingDelete(false);
      await logout();
      navigate("/");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete account.");
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleAvatarSelect = useCallback((file) => {
    setAvatarError("");
    if (!file) return;

    const result = validateAvatarFile(file);
    if (!result.ok) {
      setAvatarFile(null);
      setAvatarPreview("");
      setAvatarError(result.message);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const clearAvatarSelection = useCallback(() => {
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview("");
    setAvatarError("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }, [avatarPreview]);

  const saveAvatar = useCallback(async () => {
    if (!avatarFile) {
      setAvatarError("Please choose an image from your device.");
      return;
    }
    if (avatarSavingRef.current) return;
    avatarSavingRef.current = true;
    setIsSavingAvatar(true);
    try {
      await toast.promise(uploadAvatarFile(avatarFile), {
        loading: "Uploading picture&hellip;",
        success: "Profile picture updated",
        error: (err) => (err instanceof ApiError ? err.message : "Could not upload profile picture."),
      });
      await refresh();
      clearAvatarSelection();
    } catch {
      // toast handled it
    } finally {
      avatarSavingRef.current = false;
      setIsSavingAvatar(false);
    }
  }, [avatarFile, toast, refresh, clearAvatarSelection]);

  const removeAvatar = useCallback(async () => {
    if (avatarSavingRef.current) return;
    avatarSavingRef.current = true;
    setIsSavingAvatar(true);
    try {
      await toast.promise(removeAvatarApi(), {
        loading: "Removing picture&hellip;",
        success: "Profile picture removed",
        error: (err) => (err instanceof ApiError ? err.message : "Could not remove profile picture."),
      });
      await refresh();
      clearAvatarSelection();
    } catch {
      // toast handled it
    } finally {
      avatarSavingRef.current = false;
      setIsSavingAvatar(false);
    }
  }, [toast, refresh, clearAvatarSelection]);

  // Clean up the object URL when the component unmounts or the preview changes.
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const avatarSrc = avatarPreview || (user?.avatar ? resolveMediaUrl(user.avatar) : "");

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <SkeletonProfile />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-guild-900 via-guild-850 to-guild-900 ring-1 ring-gold-500/25 p-6 sm:p-8 animate-fade-up">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-gold-600/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <AvatarUploadZone
            avatarSrc={avatarSrc}
            avatarFile={avatarFile}
            avatarPreview={avatarPreview}
            isSavingAvatar={isSavingAvatar}
            avatarError={avatarError}
            onFileSelect={handleAvatarSelect}
            onSave={saveAvatar}
            onRemove={removeAvatar}
            onClear={clearAvatarSelection}
            inputRef={avatarInputRef}
          />

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-display text-cream truncate">{user?.inGameName || user?.name || "Player"}</h1>
            <p className="mt-1 text-sm text-guild-400 flex items-center justify-center sm:justify-start gap-1.5">
              <FiMail className="text-xs shrink-0" /> {user?.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-[11px] font-bold text-gold-300 ring-1 ring-gold-500/30">
                <FiShield className="text-xs" /> {ROLE_LABEL[role] ?? role ?? "Free Player"}
              </span>
              {user?.game && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-guild-800 px-3 py-1 text-[11px] font-bold text-guild-200 ring-1 ring-guild-600">
                  <FiHash className="text-xs" /> {user.game}{user?.gameUid ? ` &middot; ${user.gameUid}` : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <DownloadAppButtons />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-guild-600 px-3 py-1.5 text-xs font-semibold text-guild-300 hover:bg-guild-800 hover:text-red-300 transition-colors"
            >
              <FiLogOut /> Sign out
            </button>
          </div>
        </div>
      </div>

      {/* GUILD */}
      <SectionCard icon={FiUsers} title="Guild">
        {membership ? (
          <div className="rounded-xl border border-gold-500/25 bg-guild-900 p-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-lg font-display text-cream">{player?.guildName || `Guild ${membership.guildUid}`}</p>
                <p className="text-[11px] font-mono text-guild-500 mt-0.5">Guild UID {membership.guildUid}</p>
              </div>
              <span className="rounded-full gold-gradient-bg px-3 py-1 text-[11px] font-bold text-guild-950">
                {ROLE_LABEL[membership.role] ?? membership.role}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => navigate(`/guild/${membership.guildUid}`)}
                className="flex items-center gap-1.5 rounded-lg gold-gradient-bg px-4 py-2 text-xs font-bold text-guild-950 hover:brightness-110"
              >
                <FiUsers className="text-xs" /> View guild
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin/members")}
                  className="flex items-center gap-1.5 rounded-lg border border-guild-600 px-4 py-2 text-xs font-bold text-guild-200 hover:bg-guild-800"
                >
                  <FiShield className="text-xs" /> Admin Dashboard
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gold-500/40 bg-guild-900 p-5 space-y-3">
            <p className="text-sm font-bold text-cream">Not in a Guild</p>
            <p className="text-xs text-guild-400">Join an existing guild or create your own to become its Leader.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate("/guild")}
                className="inline-flex items-center gap-1.5 rounded-lg gold-gradient-bg px-4 py-2 text-xs font-bold text-guild-950 hover:brightness-110"
              >
                <FiUsers className="text-xs" /> Join Guild
              </button>
              <button
                onClick={() => navigate("/onboarding")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-guild-600 px-4 py-2 text-xs font-bold text-guild-200 hover:bg-guild-800"
              >
                <FiPlusCircle className="text-xs" /> Create Guild
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* PERSONAL INFORMATION */}
      <SectionCard icon={FiUser} title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-guild-400">Game</label>
            <p className="mt-1 rounded-lg border border-guild-800 bg-guild-900 px-3 py-2 text-sm text-guild-200">
              {user?.game || "&mdash;"}
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-guild-400">Game UID (locked)</label>
            <p className="mt-1 rounded-lg border border-guild-800 bg-guild-900 px-3 py-2 text-sm font-mono text-gold-300">
              {user?.gameUid || "&mdash;"}
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-guild-400">In-Game Name</label>
            <p className="mt-1 rounded-lg border border-guild-800 bg-guild-900 px-3 py-2 text-sm text-guild-200">
              {user?.inGameName || user?.name || "&mdash;"}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* SEASON STATISTICS */}
      <SectionCard
        icon={FiAward}
        title="Season Statistics"
        action={
          <span className={`inline-flex items-center gap-1 text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? <FiWifi className="text-xs" /> : <FiWifiOff className="text-xs" />}
            {isConnected ? 'Live' : 'Offline'}
          </span>
        }
      >
        <div className="space-y-3">
          {STAT_MODES.map((mode) => {
            const m = mergedStats?.[mode.key] || {};
            return (
              <div key={mode.key} className="rounded-xl border border-guild-700 bg-guild-900 p-4">
                <p className="text-sm font-bold text-cream mb-2">{mode.title}</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  {mode.hasPoints && (
                    <StatTile label={mode.pointsLabel} value={(m.rankPoints ?? 0).toLocaleString()} highlight />
                  )}
                  <StatTile label="Matches" value={(m.matches ?? 0).toLocaleString()} />
                  <StatTile label="K/D" value={(m.kd ?? 0).toFixed(2)} />
                  <StatTile label="Headshot" value={`${(m.headshotRate ?? 0).toFixed(1)}%`} />
                  <StatTile label="Win Rate" value={`${(m.winRate ?? 0).toFixed(1)}%`} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* FREE FIRE LIVE DATA */}
      <FFLiveData region={user?.region} uid={user?.gameUid} />

      {isFree && (
        <button
          onClick={() => navigate("/onboarding")}
          className="flex items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed border-gold-500/40 bg-gold-500/5 p-5 text-sm font-bold text-gold-300 hover:bg-gold-500/10 transition-colors animate-fade-up"
        >
          <FiPlusCircle className="text-lg" /> You're a free player &mdash; Create Guild or Apply to join one
        </button>
      )}

      {/* ACCOUNT */}
      <SectionCard icon={FiLock} title="Account">
        {isAdmin && (
          <button
            onClick={() => navigate("/admin/members")}
            className="flex items-center justify-between w-full rounded-xl border border-gold-500/30 bg-gold-500/5 px-4 py-3 text-sm font-bold text-gold-300 hover:bg-gold-500/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FiShield className="text-xs" /> Admin Dashboard
            </span>
            <FiArrowRight className="text-xs" />
          </button>
        )}

        {isLeader && (
          <form onSubmit={savePassword} className="rounded-xl border border-guild-700 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FiShield className="text-gold-400" />
              <h3 className="text-sm font-bold text-cream">Leader password</h3>
            </div>
            <p className="text-xs text-guild-400">Your Leader login uses Guild UID + this password. Changing it signs you out everywhere (session version).</p>
            <div className="space-y-3">
              <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" />
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
              <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" />
            </div>
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            <button
              type="submit"
              disabled={isSavingPw}
              className="rounded-lg gold-gradient-bg px-5 py-2 text-sm font-bold text-guild-950 hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
            >
              {isSavingPw && <FiLoader className="animate-spin" />} Update password
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-guild-800 space-y-3">
          <button
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300"
          >
            <FiTrash2 /> Delete account
          </button>
          <p className="text-[11px] text-guild-500">
            Permanently removes your account and data. Leaders must transfer leadership before deleting.
          </p>
        </div>
      </SectionCard>

      {/* DELETE CONFIRMATION */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmingDelete(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-guild-700 bg-guild-900 p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-display text-cream">Delete your account?</h3>
            <p className="text-sm text-guild-400">
              This will permanently delete your account, memberships, notifications and profile data. This action
              cannot be undone. If you lead a guild, transfer leadership or disband it first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-lg bg-guild-700 py-2 text-sm font-semibold text-guild-100 hover:bg-guild-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <FiLoader className="animate-spin" />} Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}