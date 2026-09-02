import { useEffect, useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { SkeletonList } from "../../components/ui/Skeleton";
import { getRoster, getExMembers, promoteMember, processMemberAction, deleteExMember } from "../../services/api/adminApi";
import { ApiError } from "../../services/api/client";
import { useToast } from "../../components/toast/ToastProvider";
import { useAuth } from "../../features/auth/context/AuthContext";
import { ROLE_LABEL } from "../../features/dashboard/data/playerTypes";
import { playerName } from "../../utils/playerName";

export default function MembersTab() {
  const toast = useToast();
  const { role } = useAuth();
  const [rows, setRows] = useState([]);
  const [exMembers, setExMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const canManage = role === "leader" || role === "acting_leader";
  const canPromoteOfficer = role === "leader" || role === "acting_leader";

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([getRoster(), getExMembers()])
      .then(([r, ex]) => {
        if (cancelled) return;
        setRows(r);
        setExMembers(ex);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Could not load roster."))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const askConfirm = ({ title, message, actionLabel, danger = false, fn, opts }) => {
    setConfirmAction({ title, message, actionLabel, danger, fn, opts });
  };

  const run = async (fn, opts) => {
    setBusyId(opts?.key ?? null);
    try {
      await toast.promise(fn, {
        loading: opts?.loading ?? "Working…",
        success: opts?.success ?? "Done",
        error: (err) => (err instanceof ApiError ? err.message : "Action failed."),
      });
      reload();
    } catch {
      // toast handled it
    } finally {
      setBusyId(null);
    }
  };

  const confirmAndRun = async () => {
    if (!confirmAction) return;
    const { fn, opts } = confirmAction;
    setConfirmAction(null);
    await run(fn, opts);
  };

  const active = rows.filter((r) => r.status === "active");
  const pending = rows.filter((r) => r.status === "pending_approval");

  return (
    <section className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-500/30 px-4 py-3 text-xs text-red-300">
          <FiAlertCircle /> {error}
        </div>
      )}

      {isLoading ? (
        <SkeletonList count={6} />
      ) : (
        <>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-guild-300 mb-3">
              Pending applications ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-xs text-guild-500">No pending applications.</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((m) => (
                  <li key={m._id} className="flex items-center justify-between gap-3 rounded-xl card-surface p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/10 text-sm font-bold text-gold-400 ring-1 ring-gold-500/30">
                        {playerName(m.userId, "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-cream truncate">{playerName(m.userId)}</p>
                        <p className="text-[11px] text-guild-500">Applied {new Date(m.createdAt ?? m.joinedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={busyId === m.userId?._id}
                        onClick={() =>
                          run(processMemberAction("approve", m.userId._id, rows), {
                            loading: "Approving…",
                            success: role === "officer" ? "Submitted to Officer vote" : "Member approved",
                          })
                        }
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === m.userId?._id}
                        onClick={() =>
                          run(processMemberAction("reject", m.userId._id, rows), {
                            loading: "Rejecting…",
                            success: role === "officer" ? "Submitted to Officer vote" : "Application rejected",
                          })
                        }
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-guild-300 mb-3">
              Active roster ({active.length})
            </h2>
            {active.length === 0 ? (
              <p className="text-xs text-guild-500">No active members yet.</p>
            ) : (
              <ul className="divide-y divide-guild-800 rounded-xl card-surface">
                {active.map((m) => (
                  <li key={m._id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/10 text-sm font-bold text-gold-400 ring-1 ring-gold-500/30">
                        {playerName(m.userId, "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-cream truncate">{playerName(m.userId)}</p>
                        <p className="text-[11px] text-guild-500">{ROLE_LABEL[m.role] ?? m.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {canPromoteOfficer && m.role === "member" && (
                        <button
                          disabled={busyId === m.userId?._id}
                          onClick={() =>
                            askConfirm({
                              title: "Promote to Officer?",
                              message: `${playerName(m.userId, "This player")} will become an Officer and get moderation powers.`,
                               actionLabel: "Promote",
                              fn: () => promoteMember(m.userId._id, "officer", rows),
                              opts: { loading: "Promoting…", success: "Promoted to Officer" },
                            })
                          }
                          className="rounded-lg gold-gradient-bg px-3 py-1.5 text-xs font-bold text-guild-950 hover:brightness-110 disabled:opacity-50"
                        >
                          Promote
                        </button>
                      )}
                      {canPromoteOfficer && m.role === "officer" && (
                        <button
                          disabled={busyId === m.userId?._id}
                          onClick={() =>
                            askConfirm({
                              title: "Demote to Member?",
                              message: `${playerName(m.userId, "This player")} will lose Officer moderation powers and become a regular Member.`,
                               actionLabel: "Demote",
                              fn: () => promoteMember(m.userId._id, "member", rows),
                              opts: { loading: "Demoting…", success: "Demoted to Member" },
                            })
                          }
                          className="rounded-lg border border-guild-600 px-3 py-1.5 text-xs font-bold text-guild-300 hover:bg-guild-800 disabled:opacity-50"
                        >
                          Demote
                        </button>
                      )}
                      {role === "leader" && m.role === "acting_leader" && (
                        <button
                          disabled={busyId === m.userId?._id}
                          onClick={() =>
                            askConfirm({
                              title: "Demote Acting Leader?",
                              message: `${playerName(m.userId, "This player")} will be demoted to Member and lose leadership powers.`,
                               actionLabel: "Demote",
                              danger: true,
                              fn: () => promoteMember(m.userId._id, "member", rows),
                              opts: { loading: "Demoting…", success: "Acting Leader demoted" },
                            })
                          }
                          className="rounded-lg border border-guild-600 px-3 py-1.5 text-xs font-bold text-guild-300 hover:bg-guild-800 disabled:opacity-50"
                        >
                          Demote
                        </button>
                      )}
                      {role === "leader" && m.role !== "leader" && m.role !== "acting_leader" && m.role !== "ex_member" && (
                        <button
                          disabled={busyId === m.userId?._id}
                          onClick={() =>
                            askConfirm({
                              title: "Make Acting Leader?",
                              message: `${playerName(m.userId, "This player")} will become Acting Leader with leadership powers (a previous Acting Leader, if any, will be demoted to Member).`,
                               actionLabel: "Make Acting Leader",
                              fn: () => promoteMember(m.userId._id, "acting_leader", rows),
                              opts: { loading: "Assigning…", success: "Acting Leader assigned" },
                            })
                          }
                          className="rounded-lg border border-gold-500/50 bg-guild-800 px-3 py-1.5 text-xs font-bold text-gold-300 hover:bg-guild-700 disabled:opacity-50"
                        >
                          Make Acting Leader
                        </button>
                      )}
                      {m.role !== "leader" && m.role !== "acting_leader" && (
                        <button
                          disabled={busyId === m.userId?._id}
                          onClick={() =>
                            askConfirm({
                              title: "Kick player?",
                              message: `${playerName(m.userId, "This player")} will be removed from the guild. They can re-apply later.`,
                               actionLabel: "Kick",
                              danger: true,
                              fn: () => processMemberAction("kick", m.userId._id, rows),
                              opts: {
                                loading: role === "officer" ? "Submitting to officer vote…" : "Removing…",
                                success: role === "officer" ? "Submitted to officer vote" : "Member removed",
                              },
                            })
                          }
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {exMembers.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-guild-300 mb-3">Ex-members ({exMembers.length})</h2>
              <ul className="divide-y divide-guild-800 rounded-xl card-surface">
                {exMembers.map((m) => (
                  <li key={m._id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-cream truncate">{playerName(m.userId)}</p>
                      <p className="text-[11px] text-guild-500">
                        Removed {m.removedAt ? new Date(m.removedAt).toLocaleDateString() : ""} — data retained
                      </p>
                    </div>
                    {canManage && (
                      <button
                        disabled={busyId === m.userId?._id}
                        onClick={() =>
                          run(deleteExMember(m.userId._id, exMembers), {
                            loading: "Deleting data…",
                            success: "Ex-member data permanently deleted",
                          })
                        }
                        className="rounded-lg bg-guild-800 px-3 py-1.5 text-xs font-bold text-guild-300 hover:bg-red-950/60 hover:text-red-300 disabled:opacity-50"
                      >
                        Permanently delete data
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfirmAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-guild-700 bg-guild-900 p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-display text-cream">{confirmAction.title}</h3>
            <p className="text-sm text-guild-400">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmAndRun}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold text-white hover:brightness-110 ${
                  confirmAction.danger ? "bg-red-600 hover:bg-red-700" : "gold-gradient-bg text-guild-950"
                }`}
              >
                {confirmAction.actionLabel}
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-lg bg-guild-700 py-2 text-sm font-semibold text-guild-100 hover:bg-guild-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}