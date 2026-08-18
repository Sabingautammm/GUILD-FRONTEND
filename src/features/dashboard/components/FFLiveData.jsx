import { useEffect, useState, useCallback } from "react";
import {
  FiAward, FiZap, FiHeart, FiCpu, FiGlobe, FiCalendar, FiClock, FiUsers,
  FiShield, FiStar, FiFlag, FiRefreshCw, FiAlertCircle,
} from "react-icons/fi";
import { getPlayerFull } from "../../../services/api/ffApi";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import Avatar from "../../../components/ui/Avatar";

const n = (v, fallback = null) => {
  const x = Number(v);
  return Number.isFinite(x) && x !== 0 ? x.toLocaleString() : fallback;
};

const fmtEpoch = (v) => {
  const s = Number(v);
  if (!Number.isFinite(s) || s <= 0) return null;
  const d = new Date(s * 1000);
  return isNaN(d) ? null : d.toLocaleDateString();
};

const fmtAge = (v) => {
  const s = Number(v);
  if (!Number.isFinite(s) || s <= 0) return null;
  const years = Math.floor((Date.now() - s * 1000) / (365.25 * 24 * 3600 * 1000));
  return years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "New";
};

const fmtDuration = (sec) => {
  const s = Number(sec);
  if (!Number.isFinite(s) || s <= 0) return null;
  const days = Math.floor(s / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

function Progress({ value, nextMin }) {
  if (!Number.isFinite(value) || !Number.isFinite(nextMin) || nextMin <= 0) return null;
  const pct = Math.min(100, Math.round((value / nextMin) * 100));
  return (
    <div className="mt-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-guild-800">
        <div className="h-full rounded-full gold-gradient-bg" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const tierDisplay = (tier, sub) => {
  if (!tier) return "Unranked";
  if (!sub) return tier;
  if (tier === "Grandmaster" && sub === "+") return `${tier} +`;
  return `${tier} ${sub}`;
};

function TierCard({ title, tier, sub, points, stars, marks, progress, seasonId, unit, badge }) {
  const tierColor =
    tier === "Grandmaster" ? "text-gold-300" : tier === "Master" ? "text-violet-300" : "text-guild-200";
  const value = points != null && Number.isFinite(Number(points)) ? Number(points) : marks;
  return (
    <div className="rounded-xl border border-guild-700 bg-guild-900 p-4 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-guild-500">{title}</p>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-3">
          {badge && badge.url ? (
            <img
              src={resolveMediaUrl(badge.url)}
              alt={badge.icon || tierDisplay(tier, sub)}
              className="h-10 w-10 rounded-md object-contain"
              onError={(e) => {
                if (badge.fallbackUrl) {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = resolveMediaUrl(badge.fallbackUrl);
                } else {
                  e.currentTarget.style.display = "none";
                }
              }}
            />
          ) : null}
          <p className={`text-lg font-display font-bold ${tierColor}`}>{tierDisplay(tier, sub)}</p>
        </div>
        {Number.isFinite(Number(value)) && (
          <p className="text-sm font-mono text-gold-400">{Number(value).toLocaleString()} {unit || (marks != null ? "marks" : "pts")}</p>
        )}
      </div>
      {stars != null && (
        <p className="text-xs font-bold text-gold-300">
          <FiStar className="inline -mt-0.5 mr-1" />
          {Number(stars).toLocaleString()} stars
        </p>
      )}
      <Progress value={value} nextMin={progress && progress.nextMin} />
      {progress && progress.toNext != null && (
        <p className="text-[11px] text-guild-400">
          {Number(progress.toNext).toLocaleString()} to {progress.nextTier || "next tier"}
        </p>
      )}
      {seasonId != null && <p className="text-[11px] text-guild-500">Season {seasonId}</p>}
    </div>
  );
}

function PassGrid({ kind, passes }) {
  const list = (passes || [])
    .slice()
    .sort((a, b) => Number(b.eventId) - Number(a.eventId))
    .slice(0, 60);
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((p) => {
        const lvl = Number(p.badges);
        const capped = p.maxLevel != null ? Math.min(lvl, Number(p.maxLevel)) : lvl;
        return (
          <div
            key={`${kind}-${p.eventId}`}
            className={`flex min-w-[3.4rem] flex-col items-center rounded-lg border px-2 py-1.5 ${
              p.owned
                ? "border-gold-500/40 bg-gold-500/10"
                : "border-guild-700 bg-guild-950"
            }`}
          >
            {p.url ? (
              <img
                src={resolveMediaUrl(p.url)}
                alt={p.icon || `Season ${p.eventId}`}
                className="mb-1 h-9 w-9 rounded-md object-contain"
                onError={(e) => {
                  if (p.fallbackUrl) {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = resolveMediaUrl(p.fallbackUrl);
                  } else {
                    e.currentTarget.style.display = "none";
                  }
                }}
              />
            ) : null}
            <span className={`text-xs font-display font-bold ${p.owned ? "text-gold-300" : "text-guild-300"}`}>
              {kind === "booyah" ? `Lv. ${capped.toLocaleString()}` : capped.toLocaleString()}
            </span>
            <span className="text-[9px] text-guild-500">S{p.eventId}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatRow({ icon: Icon, label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-guild-900 border border-guild-800 px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-guild-400">
        {Icon && <Icon className="text-gold-400/80 shrink-0" />}
        {label}
      </span>
      <span className="text-sm font-bold text-cream font-mono">{value}</span>
    </div>
  );
}

function CombatBlock({ title, data }) {
  if (!data) return null;
  const d = data.detailedstats || {};
  const rows = [
    { label: "Matches", value: n(data.gamesplayed) },
    { label: "Wins", value: n(data.wins) },
    { label: "Kills", value: n(data.kills) },
    { label: "K/D", value: data.kd != null ? Number(data.kd).toFixed(2) : null },
    { label: "Win Rate", value: data.winRate != null ? `${Number(data.winRate).toFixed(1)}%` : null },
    { label: "Headshot Rate", value: data.headshotRate != null ? `${Number(data.headshotRate).toFixed(1)}%` : null },
    { label: "Highest Kills (one game)", value: n(d.highestKills) },
    { label: "Total Damage", value: n(d.damage) },
    { label: "Survival Time", value: fmtDuration(d.survivalTime) },
    { label: "Revives", value: n(d.revives) },
    { label: "Knock Downs", value: n(d.knockDown) },
    { label: "Headshots", value: n(d.headshots || d.headshotCount) },
    { label: "MVP Count", value: n(d.mvpCount) },
    { label: "Gold Medals", value: n(d.goldMedalCnt) },
    { label: "Silver Medals", value: n(d.silverMedalCnt) },
    { label: "Assists", value: n(d.assists) },
    { label: "Most Damage (one game)", value: n(d.oneGameMostDamage) },
    { label: "Most Kills (one game)", value: n(d.oneGameMostKills) },
    { label: "Streak Wins", value: n(d.streakWins) },
  ].filter((r) => r.value != null);

  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-guild-500">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((r) => (
          <StatRow key={r.label} icon={null} label={r.label} value={r.value} />
        ))}
      </div>
    </div>
  );
}

export default function FFLiveData({ region, uid }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!region || !uid) {
      setError(null);
      setData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPlayerFull(region, uid);
      setData(res && res.data ? res.data : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Free Fire data.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [region, uid]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (!region || !uid) return null;

  const b = data?.basic || {};
  const rank = data?.rank || {};
  const pet = data?.pet || {};
  const social = data?.social || {};
  const brQuad = data?.stats?.br?.quadstats || null;
  const brSolo = data?.stats?.br?.solostats || null;
  const brDuo = data?.stats?.br?.duostats || null;
  const csStats = data?.stats?.cs?.csstats || null;
  const guild = data?.guild || {};
  const passes = rank.passes || null;
  const pi = data?.profileInfo || {};
  const skills = pi.equipedSkills || [];
  const clothes = pi.clothes || [];
  const weaponSkins = b.weaponSkins || [];
  const titleItem = b.titleItem;
  const frameItem = b.avatarFrameItem;

  const itemLabel = (icon) => {
    if (!icon) return null;
    return icon
      .replace(/^Icon_avatar_/, "")
      .replace(/^Icon_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const hasLoadout =
    (skills.length > 0 && skills.some((s) => s.icon)) ||
    (clothes.length > 0 && clothes.some((c) => c.icon)) ||
    weaponSkins.some((w) => w.icon) ||
    (titleItem && titleItem.icon) ||
    (frameItem && frameItem.icon);
// fgfgdfgfgd
  return (
    <section className="card-surface p-6 space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-guild-300">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400">
            <FiCpu className="text-sm" />
          </span>
          Free Fire Live Data
        </h2>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-full border border-guild-600 px-3 py-1 text-[11px] font-bold text-guild-300 hover:bg-guild-800 disabled:opacity-50 transition-colors"
        >
          <FiRefreshCw className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-guild-900 animate-pulse" />
          <div className="h-40 rounded-xl bg-guild-900 animate-pulse" />
        </div>
      )}

      {!isLoading && error && (
        <p className="flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-950/20 px-4 py-3 text-xs text-red-400">
          <FiAlertCircle className="shrink-0" /> {error}
        </p>
      )}

      {!isLoading && !error && !data && (
        <p className="text-sm text-guild-400">No Free Fire data available for this account yet.</p>
      )}

      {!isLoading && !error && data && (
        <>
          {/* BANNER + IDENTITY */}
          <div className="relative h-44 sm:h-56 w-full overflow-hidden rounded-2xl ring-1 ring-gold-500/25">
            {b.bannerUrl ? (
              <img
                src={resolveMediaUrl(b.bannerUrl)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-guild-900 via-guild-850 to-guild-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-guild-950/95 via-guild-950/40 to-guild-950/20" />
            <div className="relative z-10 flex h-full items-end gap-4 p-5">
              {b.avatarUrl ? (
                <Avatar
                  src={resolveMediaUrl(b.avatarUrl)}
                  name={b.nickname || "Player"}
                  className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-full ring-2 ring-gold-500/70 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.9)]"
                  fallbackClassName="gold-gradient-bg text-3xl text-guild-950 gold-glow"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-display text-cream">{b.nickname || "Unknown Player"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-guild-300">
                  <span className="flex items-center gap-1 font-mono text-gold-400">UID {b.uid}</span>
                  {b.region && <span className="flex items-center gap-1"><FiGlobe /> {b.region}</span>}
                  {b.level != null && (
                    <span className="flex items-center gap-1"><FiAward /> Lv. {Number(b.level).toLocaleString()}</span>
                  )}
                  {b.liked != null && (
                    <span className="flex items-center gap-1"><FiHeart className="text-red-400" /> {Number(b.liked).toLocaleString()}</span>
                  )}
                  {b.badgeCount != null && (
                    <span className="flex items-center gap-1"><FiFlag /> {Number(b.badgeCount).toLocaleString()} badges</span>
                  )}
                  {b.hasElitePass && (
                    <span className="rounded-full border border-gold-500/40 bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold text-gold-300">
                      ELITE PASS
                    </span>
                  )}
                </div>
              </div>
              {b.primeLevel > 0 && (
                <div className="hidden sm:flex flex-col items-end">
                  <span className="rounded-full gold-gradient-bg px-3 py-1 text-[11px] font-bold text-guild-950">
                    PRIME {b.primeLevel}
                  </span>
                  {b.primePoints != null && (
                    <span className="mt-1 text-[10px] text-gold-200/80">{Number(b.primePoints).toLocaleString()} pts</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ACCOUNT METRICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatRow icon={FiCalendar} label="Account age" value={fmtAge(b.createdAt)} />
            <StatRow icon={FiClock} label="Last login" value={fmtEpoch(b.lastLoginAt)} />
            <StatRow icon={FiZap} label="Experience" value={n(b.exp)} />
            <StatRow icon={FiShield} label="Elite Pass" value={b.hasElitePass ? "Active" : "None"} />
          </div>

          {/* PRIME */}
          {(b.primeLevel != null || b.primePoints != null) && (
            <div className="rounded-xl border border-gold-500/25 bg-gold-500/5 p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
              <span className="flex items-center gap-2 text-sm font-bold text-cream">
                <FiZap className="text-gold-400" /> Prime
              </span>
              <span className="text-xs text-guild-300">Level {b.primeLevel ?? "—"}</span>
              <span className="text-xs text-guild-300">{Number(b.primePoints).toLocaleString()} points</span>
            </div>
          )}

          {/* RANKS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TierCard
              title="Battle Royale Rank"
              tier={rank.br?.tier}
              sub={rank.br?.sub}
              points={rank.br?.points}
              progress={rank.br?.progress}
              seasonId={rank.br?.seasonId}
              unit="pts"
              badge={rank.br?.badge}
            />
            <TierCard
              title="Clash Squad Rank"
              tier={rank.cs?.tier}
              sub={rank.cs?.sub}
              points={rank.cs?.points}
              marks={rank.cs?.marks}
              stars={rank.cs?.stars}
              progress={rank.cs?.progress}
              seasonId={rank.cs?.seasonId}
              badge={rank.cs?.badge}
            />
          </div>

          {/* COMBAT DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CombatBlock title="BR · Quad Squad (Ranked)" data={brQuad} />
            <CombatBlock title="Clash Squad (Ranked)" data={csStats} />
            <CombatBlock title="BR · Duo (Ranked)" data={brDuo} />
            <CombatBlock title="BR · Solo (Ranked)" data={brSolo} />
          </div>

          {/* EQUIPPED / LOADOUT */}
          {hasLoadout && (
            <div className="rounded-xl border border-guild-700 bg-guild-900 p-4 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-guild-500">Equipped</p>

              {weaponSkins.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] text-guild-500">Weapon Skins</p>
                  <div className="flex flex-wrap gap-2">
                    {weaponSkins.map((w) => (
                      <div key={w.id} className="flex items-center gap-2 rounded-lg border border-guild-700 bg-guild-950 px-2 py-1.5">
                        {w.url ? (
                          <img src={resolveMediaUrl(w.url)} alt="" className="h-9 w-9 rounded-md object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                        ) : null}
                        <span className="text-xs font-semibold text-guild-200">{itemLabel(w.icon) || `Item #${w.id}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] text-guild-500">Equipped Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 rounded-lg border border-guild-700 bg-guild-950 px-2 py-1.5">
                        {s.url ? (
                          <img src={resolveMediaUrl(s.url)} alt="" className="h-9 w-9 rounded-md object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                        ) : null}
                        <span className="text-xs font-semibold text-guild-200">{itemLabel(s.icon) || `Skill #${s.id}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clothes.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] text-guild-500">Clothes</p>
                  <div className="flex flex-wrap gap-2">
                    {clothes.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-lg border border-guild-700 bg-guild-950 px-2 py-1.5">
                        {c.url ? (
                          <img src={resolveMediaUrl(c.url)} alt="" className="h-9 w-9 rounded-md object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                        ) : null}
                        <span className="text-xs font-semibold text-guild-200">{itemLabel(c.icon) || `Item #${c.id}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(titleItem?.icon || frameItem?.icon) && (
                <div className="flex flex-wrap gap-4">
                  {titleItem?.icon && (
                    <div className="flex items-center gap-2 rounded-lg border border-gold-500/30 bg-gold-500/5 px-2 py-1.5">
                      <span className="text-[10px] text-guild-500">Title</span>
                      <span className="text-xs font-semibold text-gold-200">{itemLabel(titleItem.icon)}</span>
                    </div>
                  )}
                  {frameItem?.icon && (
                    <div className="flex items-center gap-2 rounded-lg border border-gold-500/30 bg-gold-500/5 px-2 py-1.5">
                      <span className="text-[10px] text-guild-500">Avatar Frame</span>
                      <span className="text-xs font-semibold text-gold-200">{itemLabel(frameItem.icon)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PET + SOCIAL */}
          {(pet.id != null || social.signature) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pet.id != null && (
                <div className="rounded-xl border border-guild-700 bg-guild-900 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-guild-500">Pet</p>
                  <p className="text-sm font-display font-bold text-cream">
                    {pet.name || `Pet #${pet.id}`}
                    {pet.isSelected ? <span className="ml-2 rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold text-gold-300 ring-1 ring-gold-500/30">Selected</span> : null}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <StatRow icon={FiAward} label="Level" value={pet.level} />
                    <StatRow icon={FiZap} label="EXP" value={n(pet.exp)} />
                  </div>
                </div>
              )}
              {social.signature && (
                <div className="rounded-xl border border-guild-700 bg-guild-900 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-guild-500">Signature</p>
                  <p className="text-sm italic text-guild-200">"{social.signature}"</p>
                  <p className="text-[11px] text-guild-500">
                    {social.gender ? `${social.gender} · ` : ""}
                    {social.language ? `${social.language} · ` : ""}
                    {social.modePrefer || ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* GUILD */}
          {guild.clanName && (
            <div className="rounded-xl border border-gold-500/25 bg-guild-900 p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="flex items-center gap-2 text-sm font-bold text-cream">
                <FiUsers className="text-gold-400" /> {guild.clanName}
              </span>
              {guild.clanLevel != null && <span className="text-xs text-guild-300">Level {guild.clanLevel}</span>}
              {guild.memberNum != null && (
                <span className="text-xs text-guild-300">{guild.memberNum} / {guild.capacity ?? "?"} members</span>
              )}
              {guild.captainId != null && <span className="text-xs font-mono text-guild-500">Captain {guild.captainId}</span>}
              {guild.points != null && (
                <span className="text-xs text-guild-300">{Number(guild.points).toLocaleString()} points</span>
              )}
              {guild.contribution != null && (
                <span className="text-xs text-guild-300">{Number(guild.contribution).toLocaleString()} contribution</span>
              )}
              {guild.createdTime && <span className="text-xs text-guild-500">Founded {fmtEpoch(guild.createdTime)}</span>}
              {guild.slogan && <span className="w-full text-xs italic text-guild-400">"{guild.slogan}"</span>}
            </div>
          )}

          {/* PASSES */}
          {(passes?.booyah?.length > 0 || passes?.fire?.length > 0) && (
            <div className="rounded-xl border border-guild-700 bg-guild-900 p-4 space-y-5">
              {passes?.booyah?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">Booyah Pass</p>
                  <PassGrid kind="booyah" passes={passes.booyah} />
                </div>
              )}
              {passes?.fire?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">Elite Pass</p>
                  <PassGrid kind="fire" passes={passes.fire} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}