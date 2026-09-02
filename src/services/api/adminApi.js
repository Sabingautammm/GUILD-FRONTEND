import { apiFetch } from "./client";

// Lookup membership ID within the current guild by userId.
// Uses the local roster/ex-member data the caller should already have fetched.
export function resolveMembershipId(members, targetUserId) {
  if (!members || !Array.isArray(members)) return null;
  const found = members.find((m) => m.userId?._id === targetUserId);
  return found ? found._id : null;
}

export function getRoster() {
  return apiFetch("/admin/members");
}

export function getExMembers() {
  return apiFetch("/admin/members/ex");
}

export function promoteMember(targetUserId, newRole, memberRows) {
  const membershipId = resolveMembershipId(memberRows, targetUserId);
  if (!membershipId) {
    return Promise.reject(new Error("Could not find membership record for this player."));
  }
  return apiFetch("/admin/members/promote", {
    method: "POST",
    body: { membershipId, newRole },
  });
}

export function processMemberAction(actionType, targetUserId, memberRows) {
  const membershipId = resolveMembershipId(memberRows, targetUserId);
  if (!membershipId) {
    return Promise.reject(new Error("Could not find membership record for this player."));
  }
  return apiFetch("/admin/members/action", {
    method: "POST",
    body: { action: actionType, membershipId, reason: undefined },
  });
}

export function deleteExMember(targetUserId, exMembers) {
  const membershipId = resolveMembershipId(exMembers, targetUserId);
  if (!membershipId) {
    return Promise.reject(new Error("Could not find ex-member record for this player."));
  }
  return apiFetch("/admin/members/ex/delete", {
    method: "POST",
    body: { memberId: membershipId },
  });
}

export function getPendingActions() {
  return apiFetch("/admin/pending-actions");
}

export function votePendingAction(actionId, vote) {
  return apiFetch(`/admin/pending-actions/${actionId}/vote`, {
    method: "POST",
    body: { vote },
  });
}

export function initiateTransfer(targetUserId) {
  return apiFetch("/admin/transfer-leadership", {
    method: "POST",
    body: { targetUserId },
  });
}

export function completeTransfer(rawToken, newPassword) {
  return apiFetch("/admin/complete-leadership-transfer", {
    method: "POST",
    body: { rawToken, newPassword },
  });
}

export function claimLeadership() {
  return apiFetch("/admin/claim-leadership", { method: "POST" });
}

export function getActivityLogs() {
  return apiFetch("/admin/activity");
}

export function getGuildPlayers() {
  return apiFetch("/admin/guild-players");
}

export function searchGuildPlayer(payload) {
  return apiFetch("/admin/guild-players/search", {
    method: "POST",
    body: payload,
  });
}

export function addPlayerByGameUid(payload) {
  return apiFetch("/admin/guild-players", {
    method: "POST",
    body: payload,
  });
}

export function removeGuildPlayer(playerId) {
  return apiFetch(`/admin/guild-players/${playerId}`, {
    method: "DELETE",
  });
}