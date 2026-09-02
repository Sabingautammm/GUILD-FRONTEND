import { FiTrendingUp, FiStar, FiHeart } from "react-icons/fi";

// Shared helper: pick the first defined value
export function firstDefined(...values) {
  return values.find((v) => v !== undefined && v !== null && v !== "");
}

// Shared helper: build a Free Fire asset URL from the public CDN.
export function ffAssetUrl(id, size = "300x300") {
  const s = String(id ?? "");
  return s ? `https://cdn.jsdelivr.net/gh/0xme/ff-resources@main/pngs/${size}/${s}.png` : "";
}

// Shared REGIONS list
export const REGIONS = [
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

// Shared step header component
export function StepHeader({ step, total, title, description }) {
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

// Shared error box component
export function ErrorBox({ message }) {
  if (!message) return null;
  return <p className="mt-2 text-xs text-red-400">{message}</p>;
}

// Shared Free Fire preview box
export function FfPreviewBox({ preview, fallback }) {
  if (!preview) return null;
  const bi = preview.profile?.basicinfo ?? preview.profile?.basicInfo ?? {};
  const rank = preview.rank ?? {};
  const nickname = firstDefined(rank.nickname, bi.nickname, fallback?.inGameName) ?? "—";
  const level = firstDefined(rank.level, bi.level, fallback?.basicInfo?.level) ?? "—";
  const region = firstDefined(rank.region, bi.region, fallback?.region) ?? "—";
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