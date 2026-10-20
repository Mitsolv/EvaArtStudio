import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function Schedule() {
    const { user } = useAuth()
    const [availability, setAvailability] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Форма добавления
    const [form, setForm] = useState({
        work_date: '',
        start_time: '08:00',
        end_time: '21:00',
    })

    // Загружаем открытые дни этого мастера
    async function loadAvailability() {
        setLoading(true)
        const { data, error } = await supabase
            .from('availability')
            .select('*')
            .eq('master_id', user.id)
            .gte('work_date', new Date().toISOString().slice(0, 10)) // только сегодня и вперёд
            .order('work_date', { ascending: true })

        if (error) {
            setError(error.message)
        } else {
            setAvailability(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        if (user) loadAvailability()
    }, [user])

    function update(field, value) {
        setForm({ ...form, [field]: value })
    }

    async function handleAdd(e) {
        e.preventDefault()
        setError('')

        // Проверка: не в прошлом ли дата
        const today = new Date().toISOString().slice(0, 10)
        if (form.work_date < today) {
            setError('Нельзя открыть день в прошлом')
            return
        }

        // Проверка: не больше 45 дней вперёд
        const maxDate = new Date()
        maxDate.setDate(maxDate.getDate() + 45)
        if (form.work_date > maxDate.toISOString().slice(0, 10)) {
            setError('Можно открыть только на 45 дней вперёд')
            return
        }

        // Проверка: время начала раньше конца
        if (form.start_time >= form.end_time) {
            setError('Время начала должно быть раньше времени конца')
            return
        }

        setSaving(true)

        const { error } = await supabase.from('availability').insert({
            master_id: user.id,
            work_date: form.work_date,
            start_time: form.start_time,
            end_time: form.end_time,
        })

        if (error) {
            if (error.code === '23505') {
                setError('Этот день уже открыт')
            } else {
                setError(error.message)
            }
        } else {
            setForm({ ...form, work_date: '' }) // сбрасываем дату, время оставляем
            await loadAvailability()
        }
        setSaving(false)
    }

    async function handleDelete(id) {
        if (!confirm('Закрыть этот день? Клиенты не смогут записаться.')) return
        const { error } = await supabase
            .from('availability')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Ошибка: ' + error.message)
        } else {
            await loadAvailability()
        }
    }

    // Красивое форматирование даты: 21.10.2025
    function formatDate(dateStr) {
        const d = new Date(dateStr)
        return d.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    }

    // Название дня недели: Понедельник
    function weekdayName(dateStr) {
        const d = new Date(dateStr)
        return d.toLocaleDateString('ru-RU', { weekday: 'long' })
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-6">📅 Рабочий график</h1>

            {/* Форма открытия дня */}
            <div className="bg-white rounded-2xl shadow p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Открыть рабочий день</h2>

                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Дата</label>
                        <input
                            type="date"
                            required
                            value={form.work_date}
                            min={new Date().toISOString().slice(0, 10)}
                            max={
                                new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
                                    .toISOString()
                                    .slice(0, 10)
                            }
                            onChange={(e) => update('work_date', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">С</label>
                        <input
                            type="time"
                            required
                            value={form.start_time}
                            onChange={(e) => update('start_time', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">До</label>
                        <input
                            type="time"
                            required
                            value={form.end_time}
                            onChange={(e) => update('end_time', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white px-4 py-2 rounded-lg font-medium transition"
                        >
                            {saving ? 'Открываем...' : 'Открыть день'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mt-4">
                        {error}
                    </div>
                )}
            </div>

            {/* Список открытых дней */}
            <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold mb-4">
                    Открытые дни ({availability.length})
                </h2>

                {loading ? (
                    <p className="text-gray-500">Загрузка...</p>
                ) : availability.length === 0 ? (
                    <p className="text-gray-500">
                        Пока нет открытых дней. Клиенты не смогут записаться. Откройте первый день!
                    </p>
                ) : (
                    <div className="space-y-2">
                        {availability.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium">
                                        {formatDate(a.work_date)}{' '}
                                        <span className="text-gray-500 font-normal capitalize">
                                            ({weekdayName(a.work_date)})
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        ⏰ {a.start_time.slice(0, 5)} – {a.end_time.slice(0, 5)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(a.id)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                    Закрыть день
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}