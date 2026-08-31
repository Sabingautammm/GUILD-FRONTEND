import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLoader, FiHash, FiCheck, FiUser, FiAward, FiStar, FiHeart, FiTrendingUp, FiZap, FiUsers } from "react-icons/fi";
import { submitUidRegion, completeOnboarding } from "../features/auth/services/authApi";
import { getPlayerProfile, getPlayerRank, getGuildInfo } from "../services/api/ffApi";
import { ApiError } from "../services/api/client";
import { useToast } from "../components/toast/ToastProvider";
import { useAuth } from "../features/auth/context/AuthContext";

// Best-effort asset URL from the public ff-resources CDN. Numeric FF ids are
// NOT hosted there (verified) — the <img> onError hook falls back to initials.
function ffAssetUrl(id, size = "300x300") {
  const s = String(id ?? "");
  return s ? `https://cdn.jsdelivr.net/gh/0xme/ff-resources@main/pngs/${size}/${s}.png` : "";
}

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

function StatCard({ icon, label, value, color = "text-gold-300" }) {
  return (
    <div className="flex flex-col items-center p-4 bg-guild-800/50 rounded-xl border border-guild-700/50">
      <div className={`text-2xl mb-2 ${color}`}>{icon}</div>
      <p className="font-bold text-cream text-lg">{value}</p>
      <p className="text-xs text-guild-400 text-center mt-1">{label}</p>
    </div>
  );
}

export default function EnterUidRegionPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, membership, refresh } = useAuth();

  const [uid, setUid] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  // Numeric headpic/banner ids from the FF API cannot be resolved to photos by
  // any public CDN today (verified 404 across repositories) — render the
  // initials fallback when the image attempt fails.
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);
  // A fresh resolved photo URL (from the backend item catalog) means the
  // previous failure state is stale — retry rendering it.
  useEffect(() => {
    setAvatarImgFailed(false);
  }, [fetchedData?.avatarUrl]);
  // Optional live Free Fire cross-check for the preview step. Never blocks
  // completion; only surfaces a warning when submitUidRegion returned the
  // backend's mock fallback (name "Player<uid>", "head_001" avatar) — so that
  // a real profile is never accidentally persisted into the dashboard.
  const [liveCheck, setLiveCheck] = useState(null); // { status, rank, profile }
  const [guildInfo, setGuildInfo] = useState(null); // { status: "loading"|"loaded"|"error", data }

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-guild-400">Please sign in first to continue.</p>
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
    setShowDetails(false);

    try {
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
      const stats = res.profile?.stats || {};

      const combinedData = {
        uid: res.user?.gameUid || uid.trim(),
        region: res.user?.region || region,
        game: res.user?.game || "Free Fire",
        inGameName: res.user?.inGameName || bi.nickname || bi.accountId,
        // avatar = numeric headpic id from the backend basicInfo (902000306…);
        // ffAssetUrl() attempts the public CDN — onError falls back to initials.
        avatar: res.user?.avatar || (bi.avatarUrl || (bi.avatar ? String(bi.avatar) : bi.headpic ? String(bi.headpic) : "")),
        avatarUrl: bi.avatarUrl || "",
        banner: bi.bannerUrl || String(bi.bannerid || bi.bannerId || ""),
        bannerUrl: bi.bannerUrl || "",
        basicInfo: {
          accountId: bi.accountid,
          level: bi.level,
          exp: bi.exp,
          rank: bi.rank,
          csRank: bi.csrank,
          badgeId: bi.badgeid,
          bannerId: bi.bannerid,
          headPic: bi.avatar ?? bi.headpic,
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
      setAvatarImgFailed(false);
      setShowDetails(true);
      toast.success("Profile fetched successfully!");
      // Non-blocking live cross-check against /ff/player/rank + /ff/player/profile.
      // If submitUidRegion fell back to the backend's mock, we reconcile
      // fetchedData with the authoritative live nickname/avatar/level before
      // the user can click "Continue". The toast UI never blocks on this.
      crossCheckLive(combinedData);
      
      if (combinedData.clanBasicInfo?.clanId) {
        loadGuildPreview(combinedData.region, combinedData.clanBasicInfo.clanId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to fetch data. Please try again.");
    } finally {
      setIsBusy(false);
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

  const crossCheckLive = async (base) => {
    setLiveCheck({ status: "loading" });
    try {
      const [rankR, profileR] = await Promise.allSettled([
        getPlayerRank(base.region, base.uid),
        getPlayerProfile(base.region, base.uid),
      ]);
      const rank = rankR.status === "fulfilled" ? rankR.value?.data ?? null : null;
      const profile = profileR.status === "fulfilled" ? profileR.value?.data ?? null : null;
      setLiveCheck({ status: "loaded", rank, profile });

      if (!rank && !profile) return;
      // Reconcile only the fields the live endpoints are authoritative for.
      const realNickname =
        rank?.nickname || profile?.basicinfo?.nickname || profile?.basicInfo?.nickname;
      const realHeadpic =
        profile?.basicinfo?.headpic || profile?.basicInfo?.headpic;
      const realLevel =
        rank?.level || profile?.basicinfo?.level || profile?.basicInfo?.level;
      setFetchedData((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (realNickname && realNickname !== prev.inGameName) next.inGameName = realNickname;
        // The live profile carries the numeric headpic id — the real photo URL
        // was already resolved by the backend item catalog (avatarUrl). Never
        // overwrite it with a numeric-id CDN URL (404s); keep the numeric id
        // only as the asset fallback key.
        if (realHeadpic && !next.avatarUrl) {
          next.avatar = String(realHeadpic);
        }
        // The /ff proxy now injects the resolved photo URLs — trust them over
        // the numeric ids whenever the backend provided them.
        if (profile?.basicinfo?.avatarUrl) {
          next.avatarUrl = profile.basicinfo.avatarUrl;
        }
        if (profile?.basicinfo?.bannerUrl) {
          next.bannerUrl = profile.basicinfo.bannerUrl;
        }
        if (profile?.basicinfo?.bannerUrl) {
          next.banner = profile.basicinfo.bannerUrl;
        }
        if (realLevel != null) {
          next.basicInfo = { ...(next.basicInfo || {}), level: Number(realLevel) || 0 };
        }
        // submitUidRegion never returns basicinfo (PlayerProfile has no such
        // fields), so the live rank payload is the only source for likes.
        if (rank?.likes != null) {
          next.basicInfo = { ...(next.basicInfo || {}), liked: Number(rank.likes) || 0 };
        }
        return next;
      });
    } catch {
      setLiveCheck({ status: "error" });
    }
  };

  const handleCompleteAndRedirect = async () => {
    if (!fetchedData) return;
    setIsBusy(true);
    setError("");
    try {
      const payload = { ...fetchedData };
      if (fetchedData.clanBasicInfo?.clanId) {
        payload.guildUid = fetchedData.clanBasicInfo.clanId;
      }
      await toast.promise(completeOnboarding(payload), {
        loading: "Completing setup…",
        success: "Setup complete! Redirecting to dashboard…",
        error: (e) => (e instanceof ApiError ? e.message : "Could not complete setup."),
      });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete setup.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="card-surface p-6 sm:p-8">
        {!showDetails ? (
          <>
            <StepHeader step={1} total={2} title="Enter your Free Fire UID & Region" description="We'll fetch your profile, avatar, banner, and stats automatically." />
            <div className="space-y-4">
              <div className="relative">
                <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-guild-500 text-sm" />
                <input
                  inputMode="numeric"
                  value={uid}
                  onChange={(e) => setUid(e.target.value.replace(/\D/g, ""))}
                  placeholder="Free Fire UID (numeric)"
                  className="w-full input-dark rounded-lg pl-9 pr-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gold-500"
                  maxLength={12}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-guild-300 mb-1 block">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full input-dark rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gold-500"
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
              className="mt-6 w-full rounded-lg gold-gradient-bg py-3 text-base font-bold text-guild-950 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isBusy ? <FiLoader className="animate-spin" /> : "Fetch Profile & Stats"}
            </button>
          </>
        ) : (
          <>
            <StepHeader step={2} total={2} title="Your Profile Preview" description="Review your Free Fire profile details below, then continue to the dashboard." />
            <div className="space-y-6">
              {liveCheck?.status === "loading" && (
                <p className="text-[11px] text-guild-400">Verifying with live Free Fire data…</p>
              )}
              {liveCheck?.status === "loaded" && (
                <p className="text-[11px] text-emerald-400">Live Free Fire data verified.</p>
              )}
              {liveCheck?.status === "error" && (
                <p className="text-[11px] text-guild-500">
                  Live verification skipped — could not reach Free Fire. Proceed only if the data below matches your in-game profile.
                </p>
              )}
              {/* Profile Header — banner as full background, avatar left (FF style) */}
              <div className="relative h-36 w-full overflow-hidden rounded-xl border border-guild-700/50">
                {fetchedData.banner && (
                  <img
                    src={fetchedData.bannerUrl || ffAssetUrl(fetchedData.banner, "300x300")}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-guild-950/95 via-guild-950/50 to-guild-950/20" />
                <div className="relative z-10 flex h-full items-center gap-4 p-4">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                    {fetchedData.avatar && !avatarImgFailed ? (
                      <img
                        src={fetchedData.avatarUrl || ffAssetUrl(fetchedData.avatar, "300x300")}
                        alt={fetchedData.inGameName}
                        onError={() => setAvatarImgFailed(true)}
                        className="w-full h-full rounded-full object-cover border-[3px] border-gold-500/70 shadow-lg shadow-black/40"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-2xl border-[3px] border-gold-500/70">
                        {fetchedData.inGameName?.[0] || "P"}
                      </div>
                    )}
                    {/* Level Badge */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-guild-950 font-bold text-sm border-2 border-guild-900 shadow-md">
                      {fetchedData.basicInfo?.level || 1}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-cream text-xl sm:text-2xl truncate drop-shadow">{fetchedData.inGameName}</h3>
                    {fetchedData.clanBasicInfo?.clanName && (
                      <p className="text-gold-300 text-sm font-semibold mt-0.5 truncate">
                        {fetchedData.clanBasicInfo.clanName}
                      </p>
                    )}
                    <p className="text-guild-300 text-xs mt-1 truncate">
                      UID <span className="font-mono text-cream">{fetchedData.uid}</span> · {fetchedData.region}
                    </p>
<div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-xs bg-gold-500/10 text-gold-300 px-2 py-1 rounded-full">
                        <FiHeart className="w-3 h-3" /> {fetchedData.basicInfo?.liked || 0} Likes
                      </span>
                      <span className="flex items-center gap-1 text-xs bg-guild-700 text-guild-300 px-2 py-1 rounded-full">
                        <FiAward className="w-3 h-3" /> Level {fetchedData.basicInfo?.level || 1}
                      </span>
                      {fetchedData.basicInfo?.primeLevel > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded-full">
                          <FiZap className="w-3 h-3" /> Prime {fetchedData.basicInfo?.primeLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Guild Preview — from in-game clan if user is in a Free Fire guild */}
              {fetchedData.clanBasicInfo && (
                <div className="rounded-xl border border-gold-500/40 bg-guild-900 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">Free Fire Guild</p>
                  {guildInfo?.status === "loading" && (
                    <p className="mt-2 text-xs text-guild-400 flex items-center gap-1">
                      <FiLoader className="animate-spin" /> Fetching guild data…
                    </p>
                  )}
                  {guildInfo?.status === "error" && (
                    <p className="mt-2 text-xs text-guild-500">
                      Could not load live guild data. Guild will be linked with basic info only.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl gold-gradient-bg text-xl font-bold text-guild-950 gold-glow">
                      {fetchedData.clanBasicInfo.clanName?.charAt(0).toUpperCase() || "G"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-display text-cream truncate">
                        {guildInfo?.data?.guildname || fetchedData.clanBasicInfo.clanName || "Free Fire Guild"}
                      </p>
                      <p className="text-[11px] font-mono text-guild-500">Guild UID {fetchedData.clanBasicInfo.clanId}</p>
                    </div>
                    <span className="rounded-full bg-gold-500/10 px-3 py-1 text-[10px] font-bold text-gold-300 ring-1 ring-gold-500/30">
                      Lv {guildInfo?.data?.guildlevel ?? fetchedData.clanBasicInfo.clanLevel ?? "—"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-guild-800/50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-wide text-guild-400">Members</p>
                      <p className="text-sm font-bold text-cream">
                        {guildInfo?.data?.membernum ?? fetchedData.clanBasicInfo.memberNum ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-guild-800/50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-wide text-guild-400">Capacity</p>
                      <p className="text-sm font-bold text-cream">
                        {guildInfo?.data?.capacity ?? 55}
                      </p>
                    </div>
                    <div className="rounded-lg bg-guild-800/50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-wide text-guild-400">Your Role</p>
                      <p className="text-sm font-bold text-cream">
                        {String(fetchedData.clanBasicInfo.captainId) === String(fetchedData.uid) ? "Leader" : "Member"}
                      </p>
                    </div>
                  </div>
                  {guildInfo?.data?.slogan && (
                    <p className="mt-2 text-[11px] text-guild-400 italic">"{guildInfo.data.slogan}"</p>
                  )}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard 
                  icon={<FiTrendingUp className="w-6 h-6" />} 
                  label="BR Rank Points" 
                  value={fetchedData.stats?.brRanked?.rankPoints?.toLocaleString() || 0}
                  color="text-orange-400"
                />
                <StatCard 
                  icon={<FiStar className="w-6 h-6" />} 
                  label="CS Rank Stars" 
                  value={fetchedData.stats?.csRanked?.rankPoints || 0}
                  color="text-purple-400"
                />
                <StatCard 
                  icon={<FiUser className="w-6 h-6" />} 
                  label="BR Matches" 
                  value={fetchedData.stats?.brRanked?.matches || 0}
                  color="text-blue-400"
                />
                <StatCard 
                  icon={<FiAward className="w-6 h-6" />} 
                  label="CS Matches" 
                  value={fetchedData.stats?.csRanked?.matches || 0}
                  color="text-green-400"
                />
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <StatCard 
                  icon={<FiTrendingUp className="w-6 h-6" />} 
                  label="BR K/D" 
                  value={fetchedData.stats?.brRanked?.kd || 0}
                  color="text-orange-400"
                />
                <StatCard 
                  icon={<FiStar className="w-6 h-6" />} 
                  label="CS K/D" 
                  value={fetchedData.stats?.csRanked?.kd || 0}
                  color="text-purple-400"
                />
                <StatCard 
                  icon={<FiTrendingUp className="w-6 h-6" />} 
                  label="BR Win Rate" 
                  value={`${fetchedData.stats?.brRanked?.winRate || 0}%`}
                  color="text-blue-400"
                />
                <StatCard 
                  icon={<FiStar className="w-6 h-6" />} 
                  label="CS Win Rate" 
                  value={`${fetchedData.stats?.csRanked?.winRate || 0}%`}
                  color="text-green-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-guild-700/50">
                <button
                  onClick={() => { setShowDetails(false); setFetchedData(null); setLiveCheck(null); }}
                  className="flex-1 rounded-lg bg-guild-700 py-3 text-base font-bold text-guild-300 hover:bg-guild-600 transition-colors"
                >
                  <FiLoader className="w-4 h-4 mr-2 inline" /> Change UID
                </button>
                <button
                  onClick={handleCompleteAndRedirect}
                  disabled={isBusy}
                  className="flex-1 rounded-lg gold-gradient-bg py-3 text-base font-bold text-guild-950 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                >
                  {isBusy ? (
                    <>
                      <FiLoader className="animate-spin w-4 h-4" />
                      Continuing...
                    </>
                  ) : (
                    <>
                      Continue to Dashboard
                      <FiCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}