import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function Chat() {
    const { user, isMaster } = useAuth()

    const [contacts, setContacts] = useState([])
    const [selectedContact, setSelectedContact] = useState(null)
    const [messages, setMessages] = useState([])
    const [pinnedBooking, setPinnedBooking] = useState(null) // Закреплённая запись
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    const messagesEndRef = useRef(null)

    // 1. Загружаем список собеседников
    useEffect(() => {
        if (!user) return

        async function loadContacts() {
            let query = supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .order('full_name')

            if (isMaster) {
                const { data: bookingsData } = await supabase
                    .from('bookings')
                    .select('client_id')
                    .eq('master_id', user.id)

                const clientIds = [...new Set(bookingsData?.map(b => b.client_id) || [])]

                if (clientIds.length === 0) {
                    setContacts([])
                    setLoading(false)
                    return
                }

                query = query.in('id', clientIds).eq('role', 'client')
            } else {
                query = query.eq('role', 'master').eq('is_active', true)
            }

            const { data, error } = await query
            if (error) setError(error.message)
            else {
                setContacts(data || [])
                if (data && data.length > 0) setSelectedContact(data[0])
            }
            setLoading(false)
        }
        loadContacts()
    }, [user, isMaster])

    // 2. Загружаем сообщения и ищем активную запись для закрепа
    useEffect(() => {
        if (!selectedContact || !user) return

        async function loadChatData() {
            // Загружаем сообщения
            const { data: msgs, error: mError } = await supabase
                .from('messages')
                .select('*')
                .or(`and(from_user.eq.${user.id},to_user.eq.${selectedContact.id}),and(from_user.eq.${selectedContact.id},to_user.eq.${user.id})`)
                .order('created_at', { ascending: true })

            if (mError) setError(mError.message)
            else setMessages(msgs || [])

            // Ищем ближайшую активную запись (pending или confirmed)
            const today = new Date().toISOString().slice(0, 10)

            const { data: bookings, error: bError } = await supabase
                .from('bookings')
                .select(`
          *,
          service:services (name, price)
        `)
                .or(`and(client_id.eq.${user.id},master_id.eq.${selectedContact.id}),and(client_id.eq.${selectedContact.id},master_id.eq.${user.id})`)
                .in('status', ['pending', 'confirmed'])
                .gte('booking_date', today)
                .order('booking_date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(1)

            if (bError) console.error(bError)
            else setPinnedBooking(bookings?.[0] || null)
        }

        loadChatData()

        // Realtime для сообщений
        const channel = supabase
            .channel('messages-channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const msg = payload.new
                    const isThisDialog =
                        (msg.from_user === user.id && msg.to_user === selectedContact.id) ||
                        (msg.from_user === selectedContact.id && msg.to_user === user.id)

                    if (isThisDialog) {
                        setMessages((prev) => {
                            if (prev.some((m) => m.id === msg.id)) return prev
                            return [...prev, msg]
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedContact, user])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // 3. Отправка сообщения
    async function handleSend(e) {
        e.preventDefault()
        if (!newMessage.trim() || !selectedContact) return

        setSending(true)
        const { error } = await supabase.from('messages').insert({
            from_user: user.id,
            to_user: selectedContact.id,
            text: newMessage.trim(),
        })

        if (error) alert('Ошибка: ' + error.message)
        else setNewMessage('')

        setSending(false)
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            weekday: 'short',
        })
    }

    if (loading) return <div className="text-emerald-500">Загрузка...</div>

    return (
        <div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-6">💬 Чат</h1>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow overflow-hidden flex h-[70vh] min-h-[500px]">
                {/* Список собеседников */}
                <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
                    <div className="p-4 bg-emerald-50 border-b border-gray-200">
                        <p className="font-semibold text-emerald-700">
                            {isMaster ? '👥 Клиенты' : '👩‍🎨 Мастера'}
                        </p>
                    </div>
                    {contacts.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm">
                            {isMaster
                                ? 'Пока нет клиентов, с которыми можно переписываться.'
                                : 'Пока нет активных мастеров.'}
                        </div>
                    ) : (
                        contacts.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedContact(c)}
                                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-emerald-50 transition ${selectedContact?.id === c.id ? 'bg-emerald-100' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium">{c.full_name}</p>
                                    {isMaster && c.master_note && (
                                        <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                                            📝 {c.master_note}
                                        </span>
                                    )}
                                </div>
                                <a
                                    href={`tel:${c.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-emerald-600 hover:underline block mt-1"
                                >
                                    📞 {c.phone}
                                </a>
                            </button>
                        ))
                    )}
                </div>

                {/* Область переписки */}
                <div className="flex-1 flex flex-col">
                    {!selectedContact ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            Выберите собеседника
                        </div>
                    ) : (
                        <>
                            {/* Шапка диалога */}
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <p className="font-semibold text-lg">{selectedContact.full_name}</p>
                                    <a
                                        href={`tel:${selectedContact.phone}`}
                                        className="text-sm text-emerald-600 hover:underline"
                                    >
                                        📞 {selectedContact.phone}
                                    </a>
                                    {isMaster && selectedContact.master_note && (
                                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-md font-medium">
                                            📝 {selectedContact.master_note}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 📌 ЗАКРЕПЛЁННАЯ ЗАПИСЬ (как в Telegram) */}
                            {pinnedBooking && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mx-4 mt-2 rounded-r-lg shadow-sm flex items-start gap-3 relative">
                                    <div className="text-xl">📌</div>
                                    <div>
                                        <p className="text-xs font-bold text-yellow-800 uppercase mb-0.5">Активная запись</p>
                                        <p className="text-sm text-gray-800 font-medium capitalize">
                                            {formatDate(pinnedBooking.booking_date)} · {pinnedBooking.start_time.slice(0, 5)} – {pinnedBooking.end_time.slice(0, 5)}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            💅 {pinnedBooking.service?.name} · {pinnedBooking.service?.price} ₽
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Лента сообщений */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                                {messages.length === 0 ? (
                                    <p className="text-gray-500 text-center text-sm">
                                        Начните диалог — напишите первое сообщение
                                    </p>
                                ) : (
                                    messages.map((m) => {
                                        const isMine = m.from_user === user.id
                                        return (
                                            <div
                                                key={m.id}
                                                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isMine
                                                            ? 'bg-emerald-500 text-white rounded-br-md'
                                                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                                                        }`}
                                                >
                                                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                                                    <p
                                                        className={`text-[10px] mt-1 ${isMine ? 'text-emerald-100' : 'text-gray-400'
                                                            }`}
                                                    >
                                                        {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Форма отправки */}
                            <form
                                onSubmit={handleSend}
                                className="p-4 border-t border-gray-200 flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Напишите сообщение..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white px-5 py-2 rounded-lg font-medium transition"
                                >
                                    {sending ? '...' : 'Отправить'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}