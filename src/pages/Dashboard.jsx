import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
    const { profile, isMaster } = useAuth()

    return (
        <div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-2">
                {isMaster ? '👑 Кабинет мастера' : '👤 Личный кабинет'}
            </h1>
            <p className="text-gray-600 mb-8">
                Добро пожаловать, {profile?.full_name}!
            </p>

            {isMaster ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link
                        to="/dashboard/services"
                        className="bg-white p-6 rounded-2xl shadow hover:shadow-md transition"
                    >
                        <div className="text-3xl mb-3">💅</div>
                        <h3 className="font-semibold text-lg mb-1">Мои услуги</h3>
                        <p className="text-gray-500 text-sm">
                            Добавьте услуги: маникюр, педикюр и т.д.
                        </p>
                    </Link>

                    <Link
                        to="/dashboard/schedule"
                        className="bg-white p-6 rounded-2xl shadow hover:shadow-md transition"
                    >
                        <div className="text-3xl mb-3">📅</div>
                        <h3 className="font-semibold text-lg mb-1">Рабочий график</h3>
                        <p className="text-gray-500 text-sm">
                            Отметьте дни, когда вы работаете
                        </p>
                    </Link>

                    <Link
                        to="/dashboard/bookings"
                        className="bg-white p-6 rounded-2xl shadow hover:shadow-md transition"
                    >
                        <div className="text-3xl mb-3">📝</div>
                        <h3 className="font-semibold text-lg mb-1">Записи клиентов</h3>
                        <p className="text-gray-500 text-sm">
                            Управляйте записями: подтверждайте и отменяйте
                        </p>
                    </Link>

                    <Link
                        to="/dashboard/chat"
                        className="bg-white p-6 rounded-2xl shadow hover:shadow-md transition"
                    >
                        <div className="text-3xl mb-3">💬</div>
                        <h3 className="font-semibold text-lg mb-1">Чат</h3>
                        <p className="text-gray-500 text-sm">
                            Общайтесь с клиентами
                        </p>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link
                        to="/dashboard/book"
                        className="bg-white p-6 rounded-2xl shadow hover:shadow-md transition"
                    >
                        <div className="text-3xl mb-3">💅</div>
                        <h3 className="font-semibold text-lg mb-1">Записаться</h3>
                        <p className="text-gray-500 text-sm">
                            Выберите услугу и удобное время
                        </p>
                    </Link>

                    <Link
                        to="/dashboard/my-bookings"
                        className="bg-white p-6 rounded-2xl shadow hover:shadow-md transition"
                    >
                        <div className="text-3xl mb-3">📝</div>
                        <h3 className="font-semibold text-lg mb-1">Мои записи</h3>
                        <p className="text-gray-500 text-sm">
                            Ваши предстоящие и прошлые визиты
                        </p>
                    </Link>
                </div>
            )}
        </div>
    )
}