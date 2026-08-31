import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { GoHome, GoHomeFill } from "react-icons/go";
import { PiTrophy, PiTrophyFill, PiFilmReel, PiFilmReelFill } from "react-icons/pi";
import { HiOutlineUserGroup, HiUserGroup } from "react-icons/hi2";
import { FiLogIn, FiBell } from "react-icons/fi";
import { useAuth } from "../../features/auth/context/AuthContext";
import { getUnreadCount } from "../../services/api/notificationApi";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { playerName } from "../../utils/playerName";
import Avatar from "../ui/Avatar";
import { useEffect, useRef } from "react";

const logo = "/Logo-removebg-preview.png";

const navItems = [
  { label: "Home", path: "/", icon: GoHome, activeIcon: GoHomeFill },
  { label: "Leader Board", path: "/leaderboard", icon: PiTrophy, activeIcon: PiTrophyFill },
  { label: "Reel", path: "/reel", icon: PiFilmReel, activeIcon: PiFilmReelFill },
  { label: "Guild", path: "/guild", icon: HiOutlineUserGroup, activeIcon: HiUserGroup },
];

function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    const load = () =>
      getUnreadCount()
        .then((d) => !cancelled && setUnread(d.unread ?? 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated]);

  return unread;
}

export default function DesktopNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, isAdmin, membership } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const [dropdown, setDropdown] = useState(false);
  const unread = useUnreadCount();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const activeItem = navItems.find((item) => item.path === location.pathname);
    const el = activeItem ? itemRefs.current[activeItem.path] : null;
    if (el && navRef.current) {
      const navBox = navRef.current.getBoundingClientRect();
      const itemBox = el.getBoundingClientRect();
      setIndicator({
        left: itemBox.left - navBox.left,
        width: itemBox.width,
        opacity: 1,
      });
    } else {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname]);

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-50 border-b transition-all duration-300 backdrop-blur-xl ${
        scrolled
          ? "h-16 bg-guild-950/90 border-guild-700 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.8)]"
          : "h-20 bg-guild-950/50 border-transparent shadow-none"
      }`}
    >
      <div className="max-w-7xl mx-auto flex h-full items-center justify-between gap-6 px-4 xl:px-8">
        <NavLink to="/" className="flex shrink-0 items-center group">
          <div className={`flex items-center justify-center transition-all duration-300 ${scrolled ? "h-12 w-12" : "h-16 w-16"}`}>
            <img src={logo} alt="Logo" className="h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(23,18,13,0.25)] transition-transform duration-300 group-hover:scale-105" />
          </div>
        </NavLink>

        <nav ref={navRef} className="relative flex items-center gap-1 rounded-full bg-guild-900 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_-10px_rgba(0,0,0,0.8)] ring-1 ring-gold-500/15 overflow-x-auto">
          <span
            className="absolute top-1.5 bottom-1.5 rounded-full gold-gradient-bg shadow-[0_4px_18px_-2px_rgba(227,160,18,0.55)] transition-all duration-300 ease-out"
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: indicator.opacity,
            }}
          />

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              ref={(el) => {
                itemRefs.current[item.path] = el;
              }}
              className={({ isActive }) =>
                `relative z-10 flex items-center gap-2 whitespace-nowrap rounded-full px-3 xl:px-5 py-2.5 text-sm xl:text-[15px] font-medium tracking-tight transition-colors duration-300 ${
                  isActive ? "text-guild-950" : "text-guild-400 hover:text-cream"
                }`
              }
            >
              {({ isActive }) => {
                const Icon = isActive ? item.activeIcon : item.icon;
                return (
                  <>
                    <span className="relative flex items-center justify-center">
                      {isActive && <span className="absolute h-4 w-4 rounded-full bg-gold-500 blur-[7px] opacity-50" />}
                      <Icon className={`relative text-lg shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                    </span>
                    <span className="hidden xl:inline">{item.label}</span>
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => navigate("/notifications")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-guild-300 hover:bg-guild-800 hover:text-gold-300"
            >
              <FiBell className="text-lg" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                  {unread}
                </span>
              )}
            </button>
          )}

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setDropdown((d) => !d)}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-guild-800"
              >
                {user?.avatar ? (
                  <Avatar
                    src={resolveMediaUrl(user.avatar)}
                    name={playerName(user)}
                    className="h-8 w-8 rounded-full ring-2 ring-gold-500/40"
                    fallbackClassName="bg-guild-700 text-sm text-gold-300"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full gold-gradient-bg text-sm font-bold text-guild-950">
                    {playerName(user, "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              {dropdown && (
                <div
                  className="absolute right-0 top-12 w-48 rounded-xl border border-guild-700 bg-guild-900 py-2 shadow-2xl"
                  onMouseLeave={() => setDropdown(false)}
                >
                  <NavLink to="/profile" className="block px-4 py-2 text-sm text-cream hover:bg-guild-800">
                    Profile
                  </NavLink>
                  {!membership && (
                    <NavLink to="/guild" className="block px-4 py-2 text-sm text-cream hover:bg-guild-800">
                      Browse Guilds
                    </NavLink>
                  )}
                  {isAdmin && (
                    <NavLink to="/admin/members" className="block px-4 py-2 text-sm text-cream hover:bg-guild-800">
                      Admin Dashboard
                    </NavLink>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-950/40"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink
              to="/login"
              className="group flex shrink-0 items-center gap-2 rounded-full gold-gradient-bg px-4 xl:px-5 py-2.5 font-bold text-guild-950 gold-glow transition-all duration-300 hover:brightness-110 active:scale-[0.97]"
            >
              <span className="hidden sm:inline">Login</span>
              <FiLogIn className="text-base transition-transform duration-300 group-hover:translate-x-0.5" />
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}