import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiShield, FiUsers, FiAlertCircle, FiArrowRight, FiEdit3, FiCheck, FiX, FiImage, FiFilm } from "react-icons/fi";
import { getGuildProfile, getPrivateGuildView, updateGuild, applyToGuild, leaveGuild, disbandGuild } from "../services/api/guildApi";
import { getGallery } from "../services/api/mediaApi";
import { ApiError } from "../services/api/client";
import { useToast } from "../components/toast/ToastProvider";
import { useAuth } from "../features/auth/context/AuthContext";
import { ROLE_LABEL } from "../features/dashboard/data/playerTypes";
import { playerName } from "../utils/playerName";
import { SkeletonProfile, SkeletonGuild, SkeletonMediaGrid } from "../components/ui/Skeleton";
import MediaCard from "../components/ui/MediaCard";

export default function GuildPage() {
  const { guildUid } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, membership, role, refresh } = useAuth();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingDisband, setConfirmingDisband] = useState(false);
  const [activeTab, setActiveTab] = useState("players");
  const [editingIntro, setEditingIntro] = useState(false);
  const [editingHistory, setEditingHistory] = useState(false);
  const [introDraft, setIntroDraft] = useState("");
  const [historyDraft, setHistoryDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const [guildMedia, setGuildMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const amMember = membership && membership.guildUid === guildUid;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const load = amMember ? getPrivateGuildView(guildUid) : getGuildProfile(guildUid);
    load
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Could not load guild."))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [guildUid, amMember]);

  // Load guild media when gallery tab is active
  useEffect(() => {
    if (activeTab !== "gallery") return;
    
    let cancelled = false;
    setMediaLoading(true);
    setMediaError(null);
    
    getGallery({ guildUid })
      .then((media) => !cancelled && setGuildMedia(Array.isArray(media) ? media : []))
      .catch((err) => !cancelled && setMediaError(err instanceof ApiError ? err.message : "Could not load guild media."))
      .finally(() => !cancelled && setMediaLoading(false));
    
    return () => {
      cancelled = true;
    };
  }, [guildUid, activeTab]);

  const handleApply = async () => {
    if (!isAuthenticated) return navigate("/login");
    try {
      await toast.promise(applyToGuild(guildUid), {
        loading: "Applying…",
        success: "Application sent",
        successDescription: "An admin will review your request.",
        error: (err) => (err instanceof ApiError ? err.message : "Could not apply."),
      });
      await refresh();
    } catch {
      // toast handles it
    }
  };

  const handleLeave = async () => {
    try {
      await toast.promise(leaveGuild(guildUid), {
        loading: "Leaving guild…",
        success: "You left the guild",
        successDescription: "You are now a free player.",
        error: (err) => (err instanceof ApiError ? err.message : "Could not leave guild."),
      });
      await refresh();
    } catch {
      // toast handles it
    }
  };

  const handleDisband = async () => {
    try {
      await toast.promise(disbandGuild(guildUid), {
        loading: "Disbanding…",
        success: "Guild disbanded",
        successDescription: "Everyone is now a free player.",
        error: (err) => (err instanceof ApiError ? err.message : "Could not disband."),
      });
      await refresh();
      navigate("/");
    } catch {
      // toast handles it
    }
  };

  const canEditGuild = role === "leader" || role === "acting_leader";

  const saveIntro = async () => {
    setSaving(true);
    try {
      await toast.promise(updateGuild(guildUid, { introduction: introDraft.trim() }), {
        loading: "Saving introduction…",
        success: "Guild introduction updated",
        error: (err) => (err instanceof ApiError ? err.message : "Could not save introduction."),
      });
      setEditingIntro(false);
      setData((d) => (d ? { ...d, guild: { ...d.guild, introduction: introDraft.trim() } } : d));
    } catch {
      // toast handled it
    } finally {
      setSaving(false);
    }
  };

  const saveHistory = async () => {
    setSaving(true);
    try {
      await toast.promise(updateGuild(guildUid, { history: historyDraft.trim() }), {
        loading: "Saving history…",
        success: "Guild history updated",
        error: (err) => (err instanceof ApiError ? err.message : "Could not save history."),
      });
      setEditingHistory(false);
      setData((d) => (d ? { ...d, guild: { ...d.guild, history: historyDraft.trim() } } : d));
    } catch {
      // toast handled it
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <SkeletonGuild />
        <SkeletonProfile />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <FiAlertCircle className="mx-auto text-3xl text-gold-400" />
        <p className="mt-3 text-sm font-semibold text-cream">{error ?? "Guild not found."}</p>
        <button onClick={() => navigate("/")} className="mt-4 rounded-full gold-gradient-bg px-4 py-2 text-xs font-bold text-guild-950 hover:brightness-110">
          Back home
        </button>
      </div>
    );
  }

  const g = data.guild;
  const roster = data.roster ?? [];
  const leader = roster.find((m) => m.role === "leader");
  const officers = roster.filter((m) => ["officer", "acting_leader"].includes(m.role));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-guild-900 via-guild-850 to-guild-900 ring-1 ring-gold-500/30 p-6 sm:p-8 text-cream">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold-500/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-gold-600/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl gold-gradient-bg text-2xl font-bold text-guild-950 gold-glow">
                {g.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <h1 className="text-2xl font-display">{g.name}</h1>
                <p className="text-sm text-gold-300/90">{g.slogan}</p>
                <p className="text-xs font-mono text-guild-500 mt-1">Guild UID {g.guildUid}</p>
              </div>
            </div>
            <span className="rounded-full bg-gold-500/10 px-3 py-1 text-[11px] font-bold text-gold-300 ring-1 ring-gold-500/30">
              {g.visibility === "private" ? "Private" : "Public"} guild
            </span>
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm text-guild-300">
            <FiUsers className="text-gold-400" />
            <span>
              {roster.length} / {g.memberCap} members
            </span>
            {amMember && (
              <span className="ml-2 rounded-full gold-gradient-bg px-3 py-1 text-[11px] font-bold text-guild-950">
                {ROLE_LABEL[membership.role]}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!amMember && isAuthenticated && !membership && (
              <button onClick={handleApply} className="rounded-full gold-gradient-bg px-5 py-2 text-sm font-bold text-guild-950 gold-glow hover:brightness-110">
                Apply to join
              </button>
            )}
            {!amMember && !isAuthenticated && (
              <button onClick={() => navigate("/login")} className="rounded-full border border-gold-500/50 px-5 py-2 text-sm font-semibold text-gold-300 hover:bg-gold-500/10">
                Sign in to apply
              </button>
            )}
            {amMember && (role === "leader" || role === "acting_leader" || role === "officer") && (
              <button onClick={() => navigate("/admin/members")} className="rounded-full gold-gradient-bg px-5 py-2 text-sm font-bold text-guild-950 hover:brightness-110 flex items-center gap-2">
                <FiShield className="text-xs" /> Admin dashboard
              </button>
            )}
            {amMember && membership.role !== "leader" && (
              <button onClick={handleLeave} className="rounded-full border border-guild-600 px-5 py-2 text-sm font-semibold text-guild-300 hover:bg-guild-800 hover:border-red-500/40 hover:text-red-300">
                Leave guild
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full bg-guild-900 p-1.5 ring-1 ring-guild-700">
        {[
          { key: "players", label: "Guild Players" },
          { key: "introduction", label: "Introduction" },
          { key: "history", label: "History" },
          { key: "gallery", label: "Gallery" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === t.key
                ? "gold-gradient-bg text-guild-950"
                : "text-guild-400 hover:text-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "players" && (
        <>
          <section className="card-surface p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-guild-300 mb-4">Leadership</h2>
            <div className="flex flex-wrap gap-3">
              {leader && <RoleChip member={leader} label="Leader" />}
              {officers.length > 0 && officers.map((m) => <RoleChip key={m._id} member={m} label={ROLE_LABEL[m.role]} />)}
              {!leader && <p className="text-xs text-guild-500">No leader assigned.</p>}
            </div>
          </section>

          <section className="card-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-guild-300">Roster</h2>
              <span className="text-xs text-guild-500">{roster.length} shown</span>
            </div>
            {roster.length === 0 ? (
              <p className="text-xs text-guild-500">No members yet.{amMember && " Invite friends to apply!"}</p>
            ) : (
              <ul className="divide-y divide-guild-800">
                {roster.map((m) => (
                  <li key={m._id} className="flex items-center justify-between py-3">
                    <button
                      onClick={() => m.userId?._id && navigate(`/members/${m.userId._id}`)}
                      className="flex items-center gap-3 min-w-0 text-left flex-1"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-sm font-bold text-gold-400 ring-1 ring-gold-500/30">
                        {playerName(m.userId, "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-cream truncate">{playerName(m.userId)}</p>
                        <p className="text-[11px] text-guild-500">{ROLE_LABEL[m.role] ?? m.role}</p>
                      </div>
                      <FiArrowRight className="ml-auto text-xs text-guild-600" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === "gallery" && (
        <section className="card-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-guild-300">Guild Media</h2>
            <span className="text-xs text-guild-500">
              {mediaLoading ? "Loading..." : `${guildMedia.length} items`}
            </span>
          </div>

          {mediaError ? (
            <div className="py-8 text-center">
              <FiAlertCircle className="mx-auto text-2xl text-gold-400" />
              <p className="mt-2 text-xs text-cream">{mediaError}</p>
            </div>
          ) : mediaLoading ? (
            <SkeletonMediaGrid count={6} />
          ) : guildMedia.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-guild-500">
                {amMember ? "This guild hasn't uploaded any media yet." : "This guild's media is private."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guildMedia.map((media) => (
                <MediaCard key={media._id} media={media} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "introduction" && (
        <section className="card-surface p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-guild-300">Guild Introduction</h2>
            {canEditGuild && !editingIntro && (
              <button
                onClick={() => {
                  setIntroDraft(g.introduction || "");
                  setEditingIntro(true);
                }}
                className="flex items-center gap-1.5 rounded-full border border-guild-600 px-3 py-1.5 text-xs font-bold text-guild-300 hover:bg-guild-800 hover:border-gold-500/40 transition-colors"
              >
                <FiEdit3 /> Edit
              </button>
            )}
          </div>
          <p className="text-xs text-guild-500 mb-3">Slogan: {g.slogan}</p>
          {editingIntro ? (
            <div className="space-y-3">
              <textarea
                value={introDraft}
                onChange={(e) => setIntroDraft(e.target.value)}
                rows={5}
                placeholder="Describe your guild — goals, community, activity…"
                className="w-full input-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveIntro}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg gold-gradient-bg px-4 py-2 text-xs font-bold text-guild-950 hover:brightness-110 disabled:opacity-50"
                >
                  <FiCheck /> {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingIntro(false)}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-guild-600 px-4 py-2 text-xs font-bold text-guild-300 hover:bg-guild-800 disabled:opacity-50"
                >
                  <FiX /> Cancel
                </button>
              </div>
            </div>
          ) : g.introduction ? (
            <p className="text-sm whitespace-pre-wrap text-cream">{g.introduction}</p>
          ) : (
            <p className="text-xs text-guild-500">No introduction yet.</p>
          )}
        </section>
      )}

      {activeTab === "history" && (
        <section className="card-surface p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-guild-300">Guild History</h2>
            {canEditGuild && !editingHistory && (
              <button
                onClick={() => {
                  setHistoryDraft(g.history || "");
                  setEditingHistory(true);
                }}
                className="flex items-center gap-1.5 rounded-full border border-guild-600 px-3 py-1.5 text-xs font-bold text-guild-300 hover:bg-guild-800 hover:border-gold-500/40 transition-colors"
              >
                <FiEdit3 /> Edit
              </button>
            )}
          </div>
          {editingHistory ? (
            <div className="space-y-3">
              <textarea
                value={historyDraft}
                onChange={(e) => setHistoryDraft(e.target.value)}
                rows={6}
                placeholder="The story of your guild…"
                className="w-full input-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveHistory}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg gold-gradient-bg px-4 py-2 text-xs font-bold text-guild-950 hover:brightness-110 disabled:opacity-50"
                >
                  <FiCheck /> {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingHistory(false)}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-guild-600 px-4 py-2 text-xs font-bold text-guild-300 hover:bg-guild-800 disabled:opacity-50"
                >
                  <FiX /> Cancel
                </button>
              </div>
            </div>
          ) : g.history ? (
            <p className="text-sm whitespace-pre-wrap text-cream">{g.history}</p>
          ) : (
            <p className="text-xs text-guild-500">No history recorded yet.</p>
          )}
        </section>
      )}

      {membership?.role === "leader" && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-5">
          <p className="text-sm font-bold text-red-300">Leader controls</p>
          <p className="text-xs text-red-400/80 mt-1">
            Disbanding is irreversible — every member (including you) becomes a free player and the guild is archived.
          </p>
          {!confirmingDisband ? (
            <button onClick={() => setConfirmingDisband(true)} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">
              Disband guild
            </button>
          ) : (
            <div className="mt-3 flex gap-3">
              <button onClick={handleDisband} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">
                Yes, disband permanently
              </button>
              <button onClick={() => setConfirmingDisband(false)} className="rounded-lg border border-red-500/40 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-950/60">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {(role === "leader" || role === "acting_leader" || role === "officer") && (
        <button onClick={() => navigate("/admin/members")} className="flex items-center gap-2 text-sm font-bold text-gold-400 hover:text-gold-300 hover:underline">
          Admin dashboard <FiArrowRight className="text-xs" />
        </button>
      )}
    </div>
  );
}

function RoleChip({ member, label }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-guild-600 bg-guild-900 px-3 py-1.5">
      <FiShield className="text-xs text-gold-400" />
      <span className="text-xs font-bold text-cream">{playerName(member.userId)}</span>
      <span className="text-[10px] uppercase tracking-wide text-guild-400">{label}</span>
    </div>
  );
}