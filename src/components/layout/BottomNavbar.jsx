import { NavLink } from "react-router-dom";
import { GoHome, GoHomeFill } from "react-icons/go";
import { PiTrophy, PiTrophyFill, PiFilmReel, PiFilmReelFill } from "react-icons/pi";
import { HiOutlineUserGroup, HiUserGroup } from "react-icons/hi2";
import { FaRegUserCircle, FaUserCircle } from "react-icons/fa";
import { FiBell } from "react-icons/fi";
import { useAuth } from "../../features/auth/context/AuthContext";
import { useUnreadNotifications } from "../../features/notifications/hooks/useUnreadNotifications";

const navItems = [
  { label: "Home", path: "/", icon: GoHome, activeIcon: GoHomeFill },
  { label: "Leaderboard", path: "/leaderboard", icon: PiTrophy, activeIcon: PiTrophyFill },
  { label: "Reel", path: "/reel", icon: PiFilmReel, activeIcon: PiFilmReelFill },
  { label: "Guild", path: "/guild", icon: HiOutlineUserGroup, activeIcon: HiUserGroup },
];

export default function BottomNavbar() {
  const { isAuthenticated } = useAuth();
  const unread = useUnreadNotifications(isAuthenticated);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around bg-guild-950/95 backdrop-blur-xl border-t border-guild-700 px-2 lg:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] transition-colors ${
              isActive ? "font-bold text-gold-400" : "text-guild-400 hover:text-guild-200"
            }`
          }
        >
          {({ isActive }) => {
            const Icon = isActive ? item.activeIcon : item.icon;
            return (
              <>
                <Icon className="text-xl" />
                <span>{item.label}</span>
              </>
            );
          }}
        </NavLink>
      ))}

      {isAuthenticated && (
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-1 text-[11px] transition-colors ${isActive ? "font-bold text-gold-400" : "text-guild-400 hover:text-guild-200"}`
          }
        >
          <span className="relative">
            <FiBell className="text-xl" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                {unread}
              </span>
            )}
          </span>
          <span>Alerts</span>
        </NavLink>
      )}

      <NavLink
        to={isAuthenticated ? "/profile" : "/login"}
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[11px] transition-colors ${isActive ? "font-bold text-gold-400" : "text-guild-400 hover:text-guild-200"}`
        }
      >
        {({ isActive }) => {
          const Icon = isActive ? FaUserCircle : FaRegUserCircle;
          return (
            <>
              <Icon className="text-xl" />
              <span>{isAuthenticated ? "Profile" : "Login"}</span>
            </>
          );
        }}
      </NavLink>
    </nav>
  );
}