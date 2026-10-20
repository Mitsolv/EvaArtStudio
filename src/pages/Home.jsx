import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-emerald-500">Загрузка...</div>
    }

    return (
        <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6">
            <h1 className="text-5xl font-bold text-emerald-600 mb-4">💅 NailBook</h1>
            <p className="text-lg text-gray-700 mb-8 text-center">
                Запись на маникюр онлайн — к Евгении и Ирине
            </p>

            {!user && (
                <div className="flex gap-4">
                    <Link
                        to="/register"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition"
                    >
                        Зарегистрироваться
                    </Link>
                    <Link
                        to="/login"
                        className="bg-white hover:bg-gray-100 text-emerald-600 border-2 border-emerald-500 px-6 py-3 rounded-lg font-medium transition"
                    >
                        Войти
                    </Link>
                </div>
            )}

            {user && profile && (
                <div className="text-center">
                    <p className="text-xl mb-4">
                        Привет, <strong>{profile.full_name}</strong>! 👋
                    </p>
                    <p className="text-gray-600 mb-6">
                        Твоя роль: <span className="font-medium text-emerald-600">
                            {profile.role === 'master' ? 'Мастер' : 'Клиент'}
                        </span>
                    </p>
                    <Link
                        to="/dashboard"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition inline-block"
                    >
                        Перейти в кабинет →
                    </Link>
                </div>
            )}
        </div>
    )
}