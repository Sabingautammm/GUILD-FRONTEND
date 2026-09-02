import { NavLink, useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import { useAuth } from "../../features/auth/context/AuthContext";
import { useUnreadNotifications } from "../../features/notifications/hooks/useUnreadNotifications";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { playerName } from "../../utils/playerName";
import Avatar from "../ui/Avatar";

const logo = "/Logo-removebg-preview.png";

export default function MobileHeader() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const unread = useUnreadNotifications(isAuthenticated);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-guild-950/90 backdrop-blur-xl border-b border-guild-700">
      <div className="flex h-full items-center justify-between px-5">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center">
            <img src={logo} alt="logo" className="h-full w-full object-contain" />
          </div>
        </NavLink>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => navigate("/notifications")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-guild-300 hover:bg-guild-800 hover:text-gold-300"
            >
              <FiBell className="text-xl" />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                  {unread}
                </span>
              )}
            </button>
          )}
          <NavLink
            to={isAuthenticated ? "/profile" : "/login"}
            className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-gold-300/40"
          >
            {user?.avatar ? (
              <Avatar
                src={resolveMediaUrl(user.avatar)}
                name={playerName(user)}
                className="h-10 w-10 rounded-full ring-1 ring-gold-300/40"
                fallbackClassName="bg-guild-700 text-sm text-gold-300"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full gold-gradient-bg text-sm font-bold text-guild-950">
                {playerName(user, "?").charAt(0).toUpperCase()}
              </span>
            )}
          </NavLink>
        </div>
      </div>
    </header>
  );
}