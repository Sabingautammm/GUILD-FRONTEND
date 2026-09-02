import { useState, useEffect, useRef, useCallback } from "react";
import { getUnreadCount } from "../../../services/api/notificationApi";

// Single shared polling timer for all components needing unread count
let sharedUnreadCount = 0;
let sharedSubscribers = new Set();
let sharedPollInterval = null;
let sharedIsAuthenticated = false;

function notifySubscribers(count) {
  sharedUnreadCount = count;
  sharedSubscribers.forEach((setter) => setter(count));
}

function startPolling() {
  if (sharedPollInterval) return;
  
  const load = async () => {
    if (!sharedIsAuthenticated) {
      notifySubscribers(0);
      return;
    }
    try {
      const d = await getUnreadCount();
      notifySubscribers(d.unread ?? 0);
    } catch {
      notifySubscribers(0);
    }
  };
  
  load();
  sharedPollInterval = setInterval(load, 30000);
}

function stopPolling() {
  if (sharedPollInterval) {
    clearInterval(sharedPollInterval);
    sharedPollInterval = null;
  }
}

export function useUnreadNotifications(isAuthenticated) {
  const [unread, setUnread] = useState(sharedUnreadCount);
  const isSubscribed = useRef(false);
  
  // Subscribe/unsubscribe to shared state
  useEffect(() => {
    if (!isSubscribed.current) {
      sharedSubscribers.add(setUnread);
      isSubscribed.current = true;
    }
    return () => {
      sharedSubscribers.delete(setUnread);
      isSubscribed.current = false;
    };
  }, [setUnread]);
  
  // Control polling based on auth state
  useEffect(() => {
    sharedIsAuthenticated = isAuthenticated;
    if (isAuthenticated) {
      startPolling();
    } else {
      notifySubscribers(0);
      stopPolling();
    }
    return () => {
      // Don't stop polling on unmount - other components may still need it
      // Polling stops when last subscriber with auth unsubscribes
    };
  }, [isAuthenticated]);
  
  return unread;
}

// Expose a way to manually trigger a refresh (e.g., after marking as read)
export function refreshUnreadCount() {
  if (sharedIsAuthenticated) {
    getUnreadCount()
      .then((d) => notifySubscribers(d.unread ?? 0))
      .catch(() => notifySubscribers(0));
  }
}