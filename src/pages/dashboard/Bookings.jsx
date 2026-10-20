import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function Bookings() {
    const { user } = useAuth()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('upcoming') // upcoming | past | all

    // Состояние для модального окна заметки
    const [noteModal, setNoteModal] = useState({ isOpen: false, client: null, text: '' })
    const [savingNote, setSavingNote] = useState(false)

    // Загружаем записи к этому мастеру
    async function loadBookings() {
        setLoading(true)

        const { data, error } = await supabase
            .from('bookings')
            .select(`
        *,
        service:services (name, duration_minutes, price),
        client:profiles!bookings_client_id_fkey (id, full_name, phone, master_note)
      `)
            .eq('master_id', user.id)
            .order('booking_date', { ascending: true })
            .order('start_time', { ascending: true })

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
        if (filter === 'upcoming') {
            return bookings.filter((b) => ['pending', 'confirmed'].includes(b.status))
        }
        if (filter === 'past') {
            return bookings.filter((b) => ['cancelled', 'done'].includes(b.status))
        }
        return bookings
    }

    const filtered = getFiltered()

    // Действия со статусом и отправка сообщений в чат
    async function updateStatus(booking, newStatus) {
        const ok = confirm(
            newStatus === 'cancelled'
                ? 'Отменить эту запись?'
                : newStatus === 'confirmed'
                    ? 'Подтвердить запись?'
                    : 'Отметить как выполнено?'
        )
        if (!ok) return

        // 1. Обновляем статус
        const { error } = await supabase
            .from('bookings')
            .update({ status: newStatus })
            .eq('id', booking.id)

        if (error) {
            alert('Ошибка: ' + error.message)
            return
        }

        // 2. Отправляем сообщения в чат
        const d = new Date(booking.booking_date)
        const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', weekday: 'short' })
        const timeStr = `${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)}`

        let messageText = ''

        if (newStatus === 'confirmed') {
            messageText = `✅ Запись подтверждена!\n📅 ${dateStr}\n⏰ ${timeStr}\n💅 ${booking.service?.name}\n💰 ${booking.service?.price} ₽`
        } else if (newStatus === 'cancelled') {
            messageText = `❌ Запись отменена.\n📅 ${dateStr}\n⏰ ${timeStr}\n💅 ${booking.service?.name}`
        }

        if (messageText) {
            await supabase.from('messages').insert({
                from_user: user.id,
                to_user: booking.client.id,
                text: messageText
            })
        }

        // 3. Перезагружаем список
        await loadBookings()
    }

    // Сохранение заметки в профиль КЛИЕНТА
    async function saveNote() {
        if (!noteModal.client) return
        setSavingNote(true)

        const { error } = await supabase
            .from('profiles')
            .update({ master_note: noteModal.text })
            .eq('id', noteModal.client.id)

        if (error) {
            alert('Ошибка сохранения: ' + error.message)
        } else {
            setNoteModal({ isOpen: false, client: null, text: '' })
            await loadBookings()
        }
        setSavingNote(false)
    }

    function openNoteModal(client) {
        setNoteModal({
            isOpen: true,
            client: client,
            text: client.master_note || '',
        })
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
            <h1 className="text-3xl font-bold text-emerald-600 mb-6">📝 Записи клиентов</h1>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                    {error}
                </div>
            )}

            <div className="flex gap-2 mb-6 flex-wrap">
                <button
                    onClick={() => setFilter('upcoming')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'upcoming' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-emerald-50'
                        }`}
                >
                    📅 Активные
                </button>
                <button
                    onClick={() => setFilter('past')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'past' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-emerald-50'
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
                <div className="bg-white rounded-2xl shadow p-6 text-gray-500">Записей нет</div>
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

                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <p className="text-gray-700">
                                        👤 <strong>{b.client?.full_name}</strong> ·{' '}
                                        <a href={`tel:${b.client?.phone}`} className="text-emerald-600 hover:underline">
                                            {b.client?.phone}
                                        </a>
                                    </p>

                                    {b.client?.master_note && (
                                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-md font-medium">
                                            📝 {b.client.master_note}
                                        </span>
                                    )}
                                </div>

                                <p className="text-gray-600 text-sm mt-1">
                                    💅 {b.service?.name} · {b.service?.duration_minutes} мин · {b.service?.price} ₽
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => openNoteModal(b.client)}
                                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                                >
                                    ✏️ Заметка
                                </button>

                                {b.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => updateStatus(b, 'confirmed')}
                                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                                        >
                                            ✅ Подтвердить
                                        </button>
                                        <button
                                            onClick={() => updateStatus(b, 'cancelled')}
                                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                                        >
                                            ❌ Отменить
                                        </button>
                                    </>
                                )}

                                {b.status === 'confirmed' && (
                                    <>
                                        <button
                                            onClick={() => updateStatus(b, 'done')}
                                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                                        >
                                            💅 Выполнено
                                        </button>
                                        <button
                                            onClick={() => updateStatus(b, 'cancelled')}
                                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                                        >
                                            ❌ Отменить
                                        </button>
                                    </>
                                )}

                                {(b.status === 'confirmed' || b.status === 'pending') && (
                                    <a
                                        href="/dashboard/chat"
                                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition inline-block"
                                    >
                                        💬 Чат
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Модальное окно заметки */}
            {noteModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Заметка о клиенте</h2>
                        <p className="text-sm text-gray-500 mb-3">
                            Клиент: <strong>{noteModal.client?.full_name}</strong>
                        </p>

                        <textarea
                            value={noteModal.text}
                            onChange={(e) => setNoteModal({ ...noteModal, text: e.target.value })}
                            placeholder="Например: Лена с работы, любит розовый..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none"
                            rows={3}
                            autoFocus
                        />

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setNoteModal({ isOpen: false, client: null, text: '' })}
                                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={saveNote}
                                disabled={savingNote}
                                className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-5 py-2 rounded-lg font-medium transition"
                            >
                                {savingNote ? 'Сохраняем...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}