import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function MyBookings() {
    const { user } = useAuth()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('active') // active | archive | all

    async function loadBookings() {
        setLoading(true)
        const { data, error } = await supabase
            .from('bookings')
            .select(`
        *,
        service:services (name, duration_minutes, price),
        master:profiles!master_id (full_name, phone)
      `)
            .eq('client_id', user.id)
            .order('booking_date', { ascending: false })
            .order('start_time', { ascending: false })

        if (error) {
            setError(error.message)
        } else {
            setBookings(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        if (user) loadBookings()
    }, [user])

    // Фильтрация
    function getFiltered() {
        if (filter === 'active') {
            return bookings.filter((b) => ['pending', 'confirmed'].includes(b.status))
        }
        if (filter === 'archive') {
            return bookings.filter((b) => ['cancelled', 'done'].includes(b.status))
        }
        return bookings
    }

    const filtered = getFiltered()

    function canCancel(b) {
        if (b.status !== 'pending' && b.status !== 'confirmed') return false
        const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
        const now = new Date()
        const diffHours = (bookingDateTime - now) / (1000 * 60 * 60)
        return diffHours >= 6
    }

    // Отмена записи клиентом + отправка сообщения
    async function cancelBooking(b) {
        const ok = confirm('Вы точно хотите отменить запись? Это действие нельзя отменить.')
        if (!ok) return

        // 1. Обновляем статус
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', b.id)

        if (error) {
            alert('Ошибка: ' + error.message)
            return
        }

        // 2. Отправляем сообщение мастеру
        const d = new Date(b.booking_date)
        const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', weekday: 'short' })
        const timeStr = `${b.start_time.slice(0, 5)} – ${b.end_time.slice(0, 5)}`

        const messageText = `❌ Запись отменена клиентом.\n📅 ${dateStr}\n⏰ ${timeStr}\n💅 ${b.service?.name}`

        await supabase.from('messages').insert({
            from_user: user.id,
            to_user: b.master_id,
            text: messageText
        })

        // 3. Перезагружаем
        await loadBookings()
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            weekday: 'short',
        })
    }

    function statusBadge(status) {
        const map = {
            pending: { text: '⏳ Ожидает', cls: 'bg-yellow-100 text-yellow-800' },
            confirmed: { text: '✅ Подтверждена', cls: 'bg-green-100 text-green-800' },
            cancelled: { text: '❌ Отменена', cls: 'bg-red-100 text-red-700' },
            done: { text: '💅 Выполнена', cls: 'bg-gray-200 text-gray-700' },
        }
        const s = map[status] || { text: status, cls: 'bg-gray-100 text-gray-700' }
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.text}</span>
    }

    if (loading) return <div className="text-emerald-500">Загрузка...</div>

    return (
        <div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-6">📝 Мои записи</h1>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                    {error}
                </div>
            )}

            {/* Фильтры */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <button
                    onClick={() => setFilter('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'active' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-emerald-50'
                        }`}
                >
                    📅 Активные
                </button>
                <button
                    onClick={() => setFilter('archive')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'archive' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-emerald-50'
                        }`}
                >
                    🕰 Архив
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-emerald-50'
                        }`}
                >
                    📋 Все
                </button>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-6 text-gray-500">
                    {filter === 'active' && 'У вас нет активных записей.'}
                    {filter === 'archive' && 'Архив пуст.'}
                    {filter === 'all' && 'У вас пока нет записей.'}
                    {filter === 'active' && (
                        <>
                            <br />
                            <a href="/dashboard/book" className="text-emerald-600 hover:underline font-medium">
                                Записаться →
                            </a>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((b) => (
                        <div
                            key={b.id}
                            className="bg-white rounded-2xl shadow p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <p className="font-semibold text-lg">{formatDate(b.booking_date)}</p>
                                    <p className="text-gray-700 font-medium">
                                        ⏰ {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                                    </p>
                                    {statusBadge(b.status)}
                                </div>
                                <p className="text-gray-700">
                                    👤 Мастер: <strong>{b.master?.full_name}</strong> ·{' '}
                                    <a href={`tel:${b.master?.phone}`} className="text-emerald-600 hover:underline">
                                        {b.master?.phone}
                                    </a>
                                </p>
                                <p className="text-gray-600 text-sm mt-1">
                                    💅 {b.service?.name} · {b.service?.duration_minutes} мин · {b.service?.price} ₽
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(b.status === 'pending' || b.status === 'confirmed') && (
                                    <a
                                        href="/dashboard/chat"
                                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition inline-block"
                                    >
                                        💬 Чат
                                    </a>
                                )}

                                {canCancel(b) && (
                                    <button
                                        onClick={() => cancelBooking(b)}
                                        className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                                    >
                                        ❌ Отменить
                                    </button>
                                )}

                                {!canCancel(b) && (b.status === 'pending' || b.status === 'confirmed') && (
                                    <span className="text-xs text-gray-500 self-center max-w-[150px]">
                                        Отмена недоступна (менее 6 часов)
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}