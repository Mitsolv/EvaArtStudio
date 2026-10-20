import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardLayout() {
    const { profile, isMaster, signOut } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const menuItems = isMaster
        ? [
            { path: '/dashboard', label: '📊 Обзор', exact: true },
            { path: '/dashboard/services', label: '💅 Мои услуги' },
            { path: '/dashboard/schedule', label: '📅 Рабочий график' },
            { path: '/dashboard/bookings', label: '📝 Записи клиентов' },
            { path: '/dashboard/chat', label: '💬 Чат' },
            { path: '/dashboard/settings', label: '⚙️ Настройки' },
        ]
        : [
            { path: '/dashboard', label: '📊 Обзор', exact: true },
            { path: '/dashboard/book', label: '💅 Записаться' },
            { path: '/dashboard/my-bookings', label: '📝 Мои записи' },
            { path: '/dashboard/chat', label: '💬 Чат' },
        ]

    async function handleSignOut() {
        await signOut()
        navigate('/')
    }

    return (
        <div className="min-h-screen bg-emerald-50 flex">
            {/* Боковое меню */}
            <aside className="w-64 bg-white shadow-lg flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <Link to="/" className="text-2xl font-bold text-emerald-600">
                        💅 NailBook
                    </Link>
                    <p className="text-sm text-gray-500 mt-2">{profile?.full_name}</p>
                    <p className="text-xs text-emerald-500 font-medium">
                        {isMaster ? 'Мастер' : 'Клиент'}
                    </p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = item.exact
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path)

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`block px-4 py-2 rounded-lg transition ${isActive
                                        ? 'bg-emerald-100 text-emerald-700 font-medium'
                                        : 'text-gray-700 hover:bg-emerald-50'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleSignOut}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition"
                    >
                        Выйти
                    </button>
                </div>
            </aside>

            {/* Контент */}
            <main className="flex-1 p-8">
                <Outlet />
            </main>
        </div>
    )
}