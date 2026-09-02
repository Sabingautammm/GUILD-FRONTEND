import { useState, useEffect } from "react";

import { FiLoader, FiHash, FiCheck, FiHeart, FiStar, FiTrendingUp, FiZap, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { submitUidRegion, completeOnboarding } from "../features/auth/services/authApi";
import { getPlayerProfile, getPlayerRank, getGuildInfo } from "../services/api/ffApi";
import { ApiError } from "../services/api/client";
import { useToast } from "../components/toast/ToastProvider";
import { useAuth } from "../features/auth/context/AuthContext";

function StepHeader({ step, total, title, description }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-400">
        Step {step} of {total}
      </p>
      <h2 className="mt-1 text-xl font-display text-cream">{title}</h2>
      {description && <p className="mt-1 text-sm text-guild-400">{description}</p>}
    </div>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return <p className="mt-2 text-xs text-red-400">{message}</p>;
}

// Pick the first defined value (merges /ff/player/rank + /ff/player/profile data).
function firstDefined(...values) {
  return values.find((v) => v !== undefined && v !== null && v !== "");
}

// Small live Free Fire preview shown after the onboarding fetch succeeds.
// Fed by getPlayerProfile + getPlayerRank; failures degrade to subtle text only.
function FfPreviewBox({ preview, fallback }) {
  const bi = preview.profile?.basicinfo ?? {};
  const rank = preview.rank ?? {};
  const nickname = firstDefined(rank.nickname, bi.nickname, fallback.inGameName) ?? "—";
  const level = firstDefined(rank.level, bi.level, fallback.basicInfo?.level) ?? "—";
  const region = firstDefined(rank.region, bi.region, fallback.region) ?? "—";
  const likes = firstDefined(rank.likes, bi.liked, bi.likes);
  const brTier = firstDefined(rank.br?.tier, bi.rank);
  const brSub = firstDefined(rank.br?.sub);
  const brPoints = firstDefined(rank.br?.points, bi.rankingpoints);
  const csTier = firstDefined(rank.cs?.tier, bi.csrank);
  const csStars = firstDefined(rank.cs?.stars, rank.cs?.marks, bi.csrankingpoints);

  return (
    <div className="rounded-lg border border-guild-700 bg-guild-900 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gold-400">Free Fire Preview</p>
      {preview.status === "loading" && <p className="text-xs text-guild-500">Loading live profile &amp; rank…</p>}
      {preview.status === "error" && <p className="text-xs text-guild-500">Couldn't load preview.</p>}
      {preview.status === "loaded" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-cream truncate">{nickname}</p>
            <p className="text-xs text-guild-400 shrink-0">
              {region} · Level <span className="font-semibold text-gold-300">{level}</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-guild-800/50 rounded-lg">
              <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-guild-400">
                <FiTrendingUp className="text-xs" /> BR Rank
              </p>
              <p className="text-sm font-bold text-cream truncate">
                {brTier != null ? [brTier, brSub].filter(Boolean).join(" ") : "—"}
              </p>
              <p className="text-[11px] text-gold-300">
                {brPoints != null ? `${Number(brPoints).toLocaleString()} pts` : ""}
              </p>
            </div>
            <div className="p-2 bg-guild-800/50 rounded-lg">
              <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-guild-400">
                <FiStar className="text-xs" /> CS Stars
              </p>
              <p className="text-sm font-bold text-cream truncate">{csTier != null ? csTier : "—"}</p>
              <p className="text-[11px] text-gold-300">{csStars != null ? `${csStars}★` : ""}</p>
            </div>
            <div className="p-2 bg-guild-800/50 rounded-lg">
              <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-guild-400">
                <FiHeart className="text-xs" /> Likes
              </p>
              <p className="text-sm font-bold text-cream truncate">
                {likes != null ? Number(likes).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const REGIONS = [
  { code: "IND", label: "India" },
  { code: "BR", label: "Brazil" },
  { code: "US", label: "United States" },
  { code: "SAC", label: "South America" },
  { code: "NA", label: "North America" },
  { code: "SG", label: "Singapore" },
  { code: "BD", label: "Bangladesh" },
  { code: "VN", label: "Vietnam" },
  { code: "TH", label: "Thailand" },
  { code: "ID", label: "Indonesia" },
  { code: "RU", label: "Russia" },
  { code: "TW", label: "Taiwan" },
  { code: "ME", label: "Middle East" },
  { code: "PK", label: "Pakistan" },
  { code: "CIS", label: "CIS" },
  { code: "EUROPE", label: "Europe" },
];

export default function OnboardingPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, membership, refresh } = useAuth();

  const [uid, setUid] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);
  // Fresh resolved photo URL (backend item catalog) -> retry rendering.
  useEffect(() => {
    setAvatarImgFailed(false);
  }, [fetchedData?.avatarUrl]);
  // Live FF preview: { status: "loading" | "loaded" | "error", profile, rank }
  const [ffPreview, setFfPreview] = useState(null);
  const [guildInfo, setGuildInfo] = useState(null); // { status: "loading" | "loaded" | "error", data }

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-guild-400">Please sign in first to continue onboarding.</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 rounded-lg gold-gradient-bg px-5 py-2 text-sm font-bold text-guild-950 hover:brightness-110"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (membership && membership.status !== "pending_approval") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-display text-cream">You're all set!</p>
        <p className="text-sm text-guild-400 mt-2">
          You're an active member of guild <span className="font-mono font-semibold text-gold-300">{membership.guildUid}</span>.
        </p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="mt-4 rounded-lg gold-gradient-bg px-5 py-2 text-sm font-bold text-guild-950 hover:brightness-110"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  const handleFetchProfile = async () => {
    if (!/^\d+$/.test(uid.trim())) {
      setError("UID must be numeric.");
      return;
    }
    if (!region) {
      setError("Please select a region.");
      return;
    }
    setError("");
    setIsBusy(true);
    setFetchedData(null);
    setFfPreview(null);

    try {
      // Use backend endpoint to fetch Free Fire data with correct UID + Region
      // This ensures the frontend sends the uid and server (region) to the backend
      const res = await toast.promise(submitUidRegion(uid.trim(), region), {
        loading: "Fetching Free Fire profile & stats…",
        success: "Profile fetched!",
        error: (e) => (e instanceof ApiError ? e.message : "Could not fetch profile."),
      });

      const bi = res.profile?.profileData?.basicInfo || res.profile?.basicInfo || {};
      const pi = res.profile?.profileInfo || res.profile?.profileData?.profileInfo || {};
      const clanBasicInfo = res.profile?.profileData?.clanBasicInfo || res.profile?.clanBasicInfo || {};
      const socialInfo = res.profile?.profileData?.socialInfo || res.profile?.socialInfo || {};
      const petInfo = res.profile?.profileData?.petInfo || res.profile?.petInfo || {};

      // Build combinedData from what submitUidRegion returned
      const stats = res.profile?.stats || {};
      const combinedData = {
        uid: res.user?.gameUid || uid.trim(),
        region: res.user?.region || region,
        game: res.user?.game || "Free Fire",
        inGameName: res.user?.inGameName || bi.nickname || bi.accountId,
        avatar: res.user?.avatar || (bi.avatarUrl || (bi.avatar ? String(bi.avatar) : bi.headpic ? String(bi.headpic) : "")),
        avatarUrl: bi.avatarUrl || "",
        bannerUrl: bi.bannerUrl || "",
        basicInfo: {
          accountId: bi.accountid,
          level: bi.level,
          exp: bi.exp,
          rank: bi.rank,
          csRank: bi.csrank,
          badgeId: bi.badgeid,
          bannerId: bi.bannerid,
          headPic: bi.headpic,
          title: bi.title,
          releaseVersion: bi.releaseversion,
          liked: bi.likes ?? bi.liked,
          primeLevel: bi.primeLevel ?? 0,
          primePoints: bi.primePoints ?? 0,
          lastLoginAt: bi.lastloginat,
          createAt: bi.createat,
        },
        profileInfo: {
          avatarId: pi.avatarid,
          clothes: pi.clothes,
          equipedSkills: pi.equipedskills,
          pvePrimaryWeapon: pi.pveprimaryweapon,
        },
        clanBasicInfo: clanBasicInfo ? {
          clanId: clanBasicInfo.clanid,
          clanName: clanBasicInfo.clanname,
          clanLevel: clanBasicInfo.clanlevel,
          memberNum: clanBasicInfo.membernum,
          captainId: clanBasicInfo.captainid,
        } : null,
        petInfo: petInfo ? {
          id: petInfo.id,
          level: petInfo.level,
          exp: petInfo.exp,
          isSelected: petInfo.isselected,
          skinId: petInfo.skinid,
          selectedSkillId: petInfo.selectedskillid,
        } : null,
        socialInfo: socialInfo ? {
          gender: socialInfo.gender,
          language: socialInfo.language,
          battleTag: socialInfo.battletag,
          socialTag: socialInfo.socialtag,
          modePrefer: socialInfo.modeprefer,
          signature: socialInfo.signature,
          rankShow: socialInfo.rankshow,
        } : null,
        stats: {
          brRanked: {
            matches: stats?.brRank?.matches ?? 0,
            kd: stats?.brRank?.kd ?? 0,
            headshotRate: stats?.brRank?.headshotRate ?? 0,
            winRate: stats?.brRank?.winRate ?? 0,
            rankPoints: stats?.brRank?.rankPoints ?? 0,
          },
          csRanked: {
            matches: stats?.csRank?.matches ?? 0,
            kd: stats?.csRank?.kd ?? 0,
            headshotRate: stats?.csRank?.headshotRate ?? 0,
            winRate: stats?.csRank?.winRate ?? 0,
            rankPoints: stats?.csRank?.rankPoints ?? 0,
          },
          csNormal: {
            matches: stats?.clashSquadCustom?.matches ?? 0,
            kd: stats?.clashSquadCustom?.kd ?? 0,
            headshotRate: stats?.clashSquadCustom?.headshotRate ?? 0,
            winRate: stats?.clashSquadCustom?.winRate ?? 0,
          },
        },
      };

      setFetchedData(combinedData);
      toast.success("Data fetched successfully! Click confirm to complete onboarding.");
      // Non-blocking live Free Fire preview — never blocks (or breaks) onboarding.
      loadFfPreview(uid.trim(), region);
      if (combinedData.clanBasicInfo?.clanId) {
        loadGuildPreview(combinedData.region, combinedData.clanBasicInfo.clanId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to fetch data. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  // Optional live preview via the real FF API. Failure only shows a subtle
  // "couldn't load preview" text — onboarding stays fully functional.
  const loadFfPreview = async (server, previewUid) => {
    setFfPreview({ status: "loading", profile: null, rank: null });
    try {
      const [profileResult, rankResult] = await Promise.allSettled([
        getPlayerProfile(server, previewUid),
        getPlayerRank(server, previewUid),
      ]);
      const profile = profileResult.status === "fulfilled" ? profileResult.value?.data ?? null : null;
      const rank = rankResult.status === "fulfilled" ? rankResult.value?.data ?? null : null;
      if (!profile && !rank) {
        setFfPreview({ status: "error", profile: null, rank: null });
        return;
      }
      setFfPreview({ status: "loaded", profile, rank });
    } catch {
      setFfPreview({ status: "error", profile: null, rank: null });
    }
  };

  const loadGuildPreview = async (region, clanId) => {
    setGuildInfo({ status: "loading" });
    try {
      const info = await getGuildInfo(region, clanId);
      setGuildInfo({ status: "loaded", data: info?.data ?? null });
    } catch {
      setGuildInfo({ status: "error" });
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!fetchedData) return;
    setIsBusy(true);
    setError("");
    try {
      const payload = { ...fetchedData };
      if (fetchedData.clanBasicInfo?.clanId) {
        payload.guildUid = fetchedData.clanBasicInfo.clanId;
      }
      await toast.promise(completeOnboarding(payload), {
        loading: "Completing onboarding…",
        success: "Onboarding complete! Redirecting…",
        error: (e) => (e instanceof ApiError ? e.message : "Could not complete onboarding."),
      });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete onboarding.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="card-surface p-6">
        {!fetchedData ? (
          <>
            <StepHeader step={1} total={2} title="Enter your UID and Region" description="We'll fetch your Free Fire profile and stats automatically." />
            <div className="space-y-3">
              <div className="relative">
                <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-guild-500 text-sm" />
                <input
                  inputMode="numeric"
                  value={uid}
                  onChange={(e) => setUid(e.target.value.replace(/\D/g, ""))}
                  placeholder="Free Fire UID (numeric)"
                  className="w-full input-dark rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-guild-300 mb-1 block">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full input-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Select Region</option>
                  {REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ErrorBox message={error} />
            <button
              onClick={handleFetchProfile}
              disabled={isBusy}
              className="mt-6 w-full rounded-lg gold-gradient-bg py-2.5 text-sm font-bold text-guild-950 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isBusy ? <FiLoader className="animate-spin" /> : "Fetch Profile & Stats"}
            </button>
          </>
        ) : (
          <>
            <StepHeader step={2} total={2} title="Confirm & Complete" description="Review your fetched data and complete onboarding." />
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-guild-800/50 rounded-lg">
                {fetchedData.avatar && !avatarImgFailed ? (
                  <img
                    src={fetchedData.avatarUrl || ffAssetUrl(fetchedData.avatar, "300x300")}
                    alt=""
                    onError={() => setAvatarImgFailed(true)}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-xl">
                    {fetchedData.inGameName?.[0] || "P"}
                  </div>
                )}
                <div>
                  <p className="font-display text-cream font-semibold">{fetchedData.inGameName}</p>
                  <p className="text-guild-400">UID: <span className="font-mono">{fetchedData.uid}</span></p>
                  <p className="text-guild-400">Region: <span className="font-mono">{fetchedData.region}</span></p>
                  <p className="text-guild-400">Level: <span className="font-semibold text-gold-300">{fetchedData.basicInfo?.level || "N/A"}</span></p>
                {fetchedData.basicInfo?.primeLevel > 0 && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded-full">
                    <FiZap className="w-3 h-3" /> Prime {fetchedData.basicInfo.primeLevel}
                  </span>
                )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-guild-800/50 rounded-lg">
                  <p className="text-xs text-guild-400">BR Ranked</p>
                  <p className="font-bold text-cream">{fetchedData.stats?.brRanked?.matches || 0}</p>
                </div>
                <div className="p-2 bg-guild-800/50 rounded-lg">
                  <p className="text-xs text-guild-400">CS Ranked</p>
                  <p className="font-bold text-cream">{fetchedData.stats?.csRanked?.matches || 0}</p>
                </div>
                <div className="p-2 bg-guild-800/50 rounded-lg">
                  <p className="text-xs text-guild-400">CS Normal</p>
                  <p className="font-bold text-cream">{fetchedData.stats?.csNormal?.matches || 0}</p>
                </div>
              </div>
              {fetchedData.clanBasicInfo && (
                <div className="rounded-lg border border-gold-500/40 bg-guild-900 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <FiUsers className="text-gold-400 text-xs" />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gold-400">Free Fire Guild</p>
                  </div>
                  {guildInfo?.status === "loading" && (
                    <p className="text-xs text-guild-400 flex items-center gap-1">
                      <FiLoader className="animate-spin" /> Fetching guild data…
                    </p>
                  )}
                  {guildInfo?.status === "error" && (
                    <p className="text-xs text-guild-500">
                      Could not load live guild data.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg gold-gradient-bg text-base font-bold text-guild-950">
                      {fetchedData.clanBasicInfo.clanName?.charAt(0).toUpperCase() || "G"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-display text-cream truncate">
                        {guildInfo?.data?.guildname || fetchedData.clanBasicInfo.clanName || "Free Fire Guild"}
                      </p>
                      <p className="text-[11px] font-mono text-guild-500">UID {fetchedData.clanBasicInfo.clanId}</p>
                    </div>
                    <span className="text-[11px] font-bold text-gold-300">
                      Lv {guildInfo?.data?.guildlevel ?? fetchedData.clanBasicInfo.clanLevel ?? "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-md bg-guild-800/50">
                      <p className="text-[9px] text-guild-400">Members</p>
                      <p className="text-xs font-bold text-cream">
                        {guildInfo?.data?.membernum ?? fetchedData.clanBasicInfo.memberNum ?? "—"}
                      </p>
                    </div>
                    <div className="p-1.5 rounded-md bg-guild-800/50">
                      <p className="text-[9px] text-guild-400">Capacity</p>
                      <p className="text-xs font-bold text-cream">{guildInfo?.data?.capacity ?? 55}</p>
                    </div>
                    <div className="p-1.5 rounded-md bg-guild-800/50">
                      <p className="text-[9px] text-guild-400">Role</p>
                      <p className="text-xs font-bold text-cream">
                        {String(fetchedData.clanBasicInfo.captainId) === String(fetchedData.uid) ? "Leader" : "Member"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {ffPreview && <FfPreviewBox preview={ffPreview} fallback={fetchedData} />}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setFetchedData(null)}
                  className="flex-1 rounded-lg bg-guild-700 py-2.5 text-sm font-bold text-guild-300 hover:bg-guild-600"
                >
                  Back
                </button>
                <button
                  onClick={handleCompleteOnboarding}
                  disabled={isBusy}
                  className="flex-1 rounded-lg gold-gradient-bg py-2.5 text-sm font-bold text-guild-950 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isBusy ? <FiLoader className="animate-spin" /> : <>Complete Onboarding <FiCheck className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}