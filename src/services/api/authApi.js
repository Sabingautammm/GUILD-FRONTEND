import { apiFetch } from "./client";

export function googleLogin(idToken) {
  return apiFetch("/auth/google", {
    method: "POST",
    body: { idToken },
  });
}

export function checkGuildUid(guildUid) {
  return apiFetch("/auth/onboarding/guild-uid", {
    method: "POST",
    body: { guildUid },
  });
}

export function createGuild(payload) {
  return apiFetch("/auth/onboarding/create-guild", {
    method: "POST",
    body: payload,
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
    body: { gameUid, inGameName },
  });
}

export function verifyLeaderPassword(password) {
  return apiFetch("/auth/onboarding/verify-leader", {
    method: "POST",
    body: { password },
  });
}

export function completeOnboarding() {
  return apiFetch("/auth/onboarding/complete", { method: "POST" });
}

export function getCurrentUser() {
  return apiFetch("/auth/me", { method: "GET" });
}

export function logout() {
  return apiFetch("/auth/logout", { method: "POST" });
}