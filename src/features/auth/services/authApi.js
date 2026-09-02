import { apiFetch } from "../../../services/api/client";

// Google OAuth (real ID token)
export function googleLogin(token) {
  return apiFetch("/auth/google", {
    method: "POST",
    body: { idToken: token },
  });
}

export function logout() {
  return apiFetch("/auth/logout", { method: "POST" });
}

export function getCurrentUser() {
  return apiFetch("/auth/me", { method: "GET" });
}

// Onboarding steps
export function submitUidRegion(uid, region) {
  return apiFetch("/auth/onboarding/uid-region", {
    method: "POST",
    body: { uid, region },
  });
}

export function selectGame(game) {
  return apiFetch("/auth/onboarding/game", {
    method: "POST",
    body: { game },
  });
}

export function submitGameIdentity(gameUid, inGameName) {
  return apiFetch("/auth/onboarding/game-identity", {
    method: "POST",
    body: { gameUid, inGameName: inGameName.trim() },
  });
}

export function verifyLeaderPassword(password) {
  return apiFetch("/auth/onboarding/verify-leader", {
    method: "POST",
    body: { password },
  });
}

export function checkGuildUid(guildUid) {
  return apiFetch("/auth/onboarding/guild-uid", {
    method: "POST",
    body: { guildUid },
  });
}

export function createGuild({ guildUid, name, slogan, leaderPassword, confirmPassword }) {
  return apiFetch("/auth/onboarding/create-guild", {
    method: "POST",
    body: { guildUid, name, slogan, leaderPassword, confirmPassword },
  });
}

export function completeOnboarding(ffData) {
  return apiFetch("/auth/onboarding/complete", {
    method: "POST",
    body: ffData,
  });
}

// Account management
export function changePassword(currentPassword, newPassword) {
  return apiFetch("/auth/change-password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  });
}

export function deleteAccount() {
  return apiFetch("/auth/account", { method: "DELETE" });
}