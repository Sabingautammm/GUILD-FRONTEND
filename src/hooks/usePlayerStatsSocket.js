import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../features/auth/context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function usePlayerStatsSocket(playerId, enabled = true) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(() => {
    if (!enabled || !isAuthenticated || !playerId || socketRef.current?.connected) {
      return;
    }

    // Backend sets 'access_token=' cookie; fallback to legacy 'token=' for compatibility
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token='))
      ?.split('=')[1]
      ?? document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

    if (!token) {
      setError('No auth token found');
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
      setError(null);
      socket.emit('subscribe:player-stats', { playerId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    socket.on('player:stats:update', (data) => {
      console.log('[Socket] Stats update received:', data);
      if (data.playerId === playerId) {
        // Guard against stale/corrupt broadcasts clobbering the REST profile.
        // Same bounds as Backend validateSeasonStats: headshot/winRate capped,
        // all numeric fields finite and non-negative. Reject anything that
        // fails so a mock-fallback snapshot can never resurface over live data.
        const clean = sanitizeStats(data.stats);
        if (clean) setStats(clean);
      }
    });

    socket.on('player:profile:update', (data) => {
      console.log('[Socket] Profile update received:', data);
      if (data.playerId === playerId) {
        // Could update profile data here if needed
      }
    });

    socketRef.current = socket;
  }, [enabled, isAuthenticated, playerId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Emit unsubscribe BEFORE disconnecting to avoid race condition
      socketRef.current.emit('unsubscribe:player-stats', { playerId });
      // Give the emit a moment to send before closing the connection
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setIsConnected(false);
        }
      }, 50);
    }
  }, [playerId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      disconnect();
    }
  }, [enabled, isAuthenticated, disconnect]);

  return { stats, isConnected, error, reconnect: connect };
}

// Returns a sanitized stats block (matching the dashboard shape) only if every
// metric fits sane bounds; otherwise null so the caller ignores the update and
// keeps the REST /players/me value. Mirrors Backend validateSeasonStats.
function sanitizeStats(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const cleanMode = (block) => {
    if (!block || typeof block !== 'object') return null;
    const out = {};
    const { matches, kd, headshotRate, winRate, rankPoints } = block;
    if (Number.isFinite(matches)) out.matches = Math.max(0, matches);
    if (Number.isFinite(kd)) out.kd = Math.max(0, kd);
    if (Number.isFinite(headshotRate)) {
      if (headshotRate < 0 || headshotRate > 100) return null;
      out.headshotRate = headshotRate;
    }
    if (Number.isFinite(winRate)) {
      if (winRate < 0 || winRate > 100) return null;
      out.winRate = winRate;
    }
    if (Number.isFinite(rankPoints)) out.rankPoints = Math.max(0, rankPoints);
    return Object.keys(out).length ? out : null;
  };

  const result = {};
  for (const key of ['brRank', 'csRank', 'clashSquadCustom']) {
    const mode = cleanMode(raw[key]);
    if (mode) result[key] = mode;
  }
  return Object.keys(result).length ? result : null;
}