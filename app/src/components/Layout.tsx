import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { Waves, User, LogOut, PenSquare, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "社区" },
  { to: "/species", label: "生物资料库" },
  { to: "/water", label: "水质速查" },
  { to: "/equipment", label: "设备库" },
  { to: "/merchants", label: "认证商家" },
];

export default function Layout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-sea-50 text-slate-800 flex flex-col">
      <header className="bg-sea-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
            <Waves className="w-6 h-6 text-sea-300" />
            海洋之心
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm flex-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition ${isActive ? "bg-sea-700 text-white" : "text-sea-200 hover:text-white hover:bg-sea-800"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 ml-auto text-sm">
            <button
              onClick={() => navigate("/new")}
              className="hidden sm:flex items-center gap-1 bg-sand-400 hover:bg-sand-500 text-sea-950 font-medium px-3 py-1.5 rounded-md transition"
            >
              <PenSquare className="w-4 h-4" /> 发帖
            </button>
            {me ? (
              <>
                {me.role === "admin" && (
                  <Link to="/admin" className="text-sand-300 hover:text-white p-1.5" title="管理工作台">
                    <ShieldCheck className="w-4 h-4" />
                  </Link>
                )}
                <Link to="/profile" className="flex items-center gap-1 text-sea-200 hover:text-white px-2 py-1.5">
                  <User className="w-4 h-4" /> {me.nickname}
                  {!me.realName && <span className="text-xs text-sand-300">(未实名)</span>}
                </Link>
                <button onClick={logout} className="text-sea-300 hover:text-white p-1.5" title="退出登录">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link to="/login" className="bg-sea-600 hover:bg-sea-500 px-3 py-1.5 rounded-md transition">
                登录 / 注册
              </Link>
            )}
          </div>
        </div>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-3 pb-2 text-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1 rounded-md ${isActive ? "bg-sea-700 text-white" : "text-sea-200"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
          {/* 移动端也要有发帖入口,否则手机用户无处可发 */}
          <NavLink
            to="/new"
            className={({ isActive }) =>
              `whitespace-nowrap px-3 py-1 rounded-md font-medium ${isActive ? "bg-sand-500 text-sea-950" : "bg-sand-400 text-sea-950"}`
            }
          >
            ✏️ 发帖
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
      <footer className="bg-sea-950 text-sea-300 text-xs py-6">
        <div className="max-w-6xl mx-auto px-4 space-y-1">
          <p>海洋之心 · 中国海水观赏玩家的一站式家园 —— 权威生物资料库 × 玩家交流社区 × 合规商家服务</p>
          <p className="text-sea-400">
            合规提示:石珊瑚目、砗磲、海马等属国家重点保护野生动物,平台禁止相关交易信息;发帖/回帖实行后台实名制。
          </p>
        </div>
      </footer>
    </div>
  );
}
