import { useCallback, useEffect, useRef, useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { FiLoader } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import { googleLogin } from "../services/authApi";
import { ApiError } from "../../../services/api/client";
import { useToast } from "../../../components/toast/ToastProvider";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";

// When no real VITE_GOOGLE_CLIENT_ID is configured, the backend accepts a mock
// token (NODE_ENV=development) so the whole onboarding flow can be tested
// end-to-end without Google credentials.
const MOCK_GOOGLE_TOKEN = "mock-google-token-for-dev";

// LoginForm + SignupForm both mount this component. GSI's initialize() must
// only ever run once per page load, so guard it at module level.
let _gsiInitialized = false;

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In."));
    document.head.appendChild(script);
  });
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function SocialLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { refresh } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gsiButtonReady, setGsiButtonReady] = useState(false);
  const [gsiInitError, setGsiInitError] = useState(false);
  const googleBtnRef = useRef(null);
  const busyRef = useRef(false);
  const gsiInitializedRef = useRef(false);

  const handleCredentialResponse = useCallback(
    async (credential) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setIsSubmitting(true);
      try {
        await toast.promise(googleLogin(credential), {
          loading: "Connecting to Google…",
          success: "Signed in with Google",
          error: (err) => (err instanceof ApiError ? err.message : "Google sign-in failed."),
        });
        await refresh();
        // Restore the protected route the user was originally headed to.
        const from = location.state?.from ?? "/";
        navigate(from, { replace: true });
      } catch {
        // toast already surfaced the error
      } finally {
        busyRef.current = false;
        setIsSubmitting(false);
      }
    },
    [navigate, location, refresh, toast]
  );

  // Keep the GSI callback pointing at the latest handler without re-init.
  const cbRef = useRef(handleCredentialResponse);
  cbRef.current = handleCredentialResponse;

  const initializeGSI = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID || gsiInitializedRef.current) return;

    try {
      await loadGsiScript();
      if (!window.google?.accounts?.id) return;

      gsiInitializedRef.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) cbRef.current(response.credential);
        },
        // Mobile-friendly: use popup UX instead of redirect
        ux_mode: "popup",
        // Allow the button to be re-rendered
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render button if ref is available
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          type: "standard",
          size: "large",
          width: "100%",
          max_width: 400,
          text: "continue_with",
          locale: navigator.language || "en",
        });
        setGsiButtonReady(true);
      }
    } catch (err) {
      console.warn("[SocialLogin] GSI initialization failed:", err);
      setGsiInitError(true);
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let isMounted = true;
    initializeGSI().catch(() => {
      if (isMounted) setGsiInitError(true);
    });

    return () => {
      isMounted = false;
    };
  }, [initializeGSI]);

  const handleMockLogin = async () => {
    if (busyRef.current) return;
    setIsSubmitting(true);
    try {
      await handleCredentialResponse(MOCK_GOOGLE_TOKEN);
    } finally {
      setIsSubmitting(false);
    }
  };

const handlePopupLogin = useCallback(async () => {
    if (busyRef.current || !GOOGLE_CLIENT_ID) return;
    busyRef.current = true;
    setIsSubmitting(true);

    try {
      await loadGsiScript();
      if (!window.google?.accounts?.id) throw new Error("GSI not loaded");

      // The GSI callback already routes through cbRef.current
      // (handleCredentialResponse), which performs the actual login. We only
      // need prompt() to confirm the popup was displayed — if it wasn't,
      // reject immediately so the button never hangs in a loading state.
      await new Promise((resolve, reject) => {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error("not-displayed"));
          } else if (notification.getMomentType() === "display") {
            // Popup shown — the credential callback will fire and complete
            // the login via handleCredentialResponse. Resolve here; spinner
            // state is managed by handleCredentialResponse's busyRef.
            resolve();
          }
        });
      });
    } catch (err) {
      console.warn("[SocialLogin] Popup login failed:", err);
      toast.error(
        "Google sign-in popup couldn't open. Allow popups for this site, then try the Google button above."
      );
    } finally {
      busyRef.current = false;
      setIsSubmitting(false);
    }
  }, [toast]);

  // Mobile: use popup-based flow for better compatibility
  const isMobile = isMobileDevice();

  return (
    <div className="flex flex-col items-center gap-3 w-full my-4">
      {GOOGLE_CLIENT_ID ? (
        <>
          {/* GSI button container — always mounted so renderButton always has
              a target. Hidden (but present) until GSI finishes initializing;
              the custom popup button shows below while it loads or if GSI
              fails. */}
          <div
            ref={googleBtnRef}
            className={`justify-center w-full min-w-[280px] ${gsiButtonReady ? "flex" : "hidden"}`}
            aria-label="Continue with Google"
            style={{ maxWidth: "100%" }}
          />

          {/* Fallback custom button while GSI initializes or after a failure */}
          {(!gsiButtonReady || gsiInitError) && (
            <button
              type="button"
              onClick={handlePopupLogin}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 w-full max-w-[400px] min-h-[48px] rounded-lg border border-gold-500/50 bg-gold-500/10 px-4 py-3 text-sm font-semibold text-gold-300 hover:bg-gold-500/20 hover:border-gold-500 disabled:opacity-50 transition-all"
              aria-label="Continue with Google"
            >
              {isSubmitting ? (
                <FiLoader className="animate-spin text-gold-400" />
              ) : (
                <FaGoogle className="text-red-400" style={{ fontSize: "1.25rem" }} />
              )}
              <span className="hidden sm:inline">Continue with Google</span>
              <span className="sm:hidden">Google</span>
            </button>
          )}

          {/* Mobile hint */}
          {isMobile && gsiButtonReady && (
            <p className="text-[11px] text-guild-500 text-center px-4">
              Tap the button above to sign in with Google
            </p>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={handleMockLogin}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 w-full max-w-[400px] min-h-[48px] rounded-lg border border-guild-600 px-4 py-3 text-sm font-semibold text-guild-300 hover:bg-guild-800 hover:border-gold-500/40 disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? <FiLoader className="animate-spin text-red-400" /> : <FaGoogle className="text-red-400" style={{ fontSize: "1.25rem" }} />}
          <span className="hidden sm:inline">Continue with Google</span>
          <span className="sm:hidden">Google</span>
        </button>
      )}

      <p className="text-center text-[11px] text-guild-600 px-4">
        By continuing you agree to the GUILD terms. Leaders verify ownership after signing in.
      </p>
    </div>
  );
}