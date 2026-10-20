import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

// Утилита: 'HH:MM' → минуты от начала дня
function toMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
}

// Утилита: минуты → 'HH:MM'
function toTimeStr(minutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Умный расчёт шага слотов (зависит от услуги и настроек мастера)
function getSlotStep(durationMin, masterStep) {
    // Если мастер выбрал "Без шага" (0) — шаг 15 минут
    if (masterStep === 0) return 15

    // Иначе — шаг из настроек мастера
    // Но если услуга короче шага — уменьшаем шаг до 30 или 15
    if (durationMin <= 15) return 15
    if (durationMin <= 30) return Math.min(30, masterStep)
    return masterStep
}

export default function Book() {
    const { user } = useAuth()

    const [masters, setMasters] = useState([])
    const [services, setServices] = useState([])
    const [dates, setDates] = useState([])
    const [bookings, setBookings] = useState([]) // записи мастера на выбранный день
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const [selectedMaster, setSelectedMaster] = useState(null)
    const [selectedService, setSelectedService] = useState(null)
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedTime, setSelectedTime] = useState(null)

    // Загружаем мастеров и услуги
    useEffect(() => {
        async function loadInitial() {
            setLoading(true)

            const [{ data: mastersData, error: mErr }, { data: servicesData, error: sErr }] =
                await Promise.all([
                    supabase
                        .from('profiles')
                        .select('*')
                        .eq('role', 'master')
                        .eq('is_active', true)
                        .order('full_name'),
                    supabase
                        .from('services')
                        .select('*')
                        .eq('is_active', true)
                        .order('name'),
                ])

            if (mErr) setError(mErr.message)
            else setMasters(mastersData || [])

            if (sErr) setError(sErr.message)
            else setServices(servicesData || [])

            setLoading(false)
        }
        loadInitial()
    }, [])

    // Загружаем открытые дни выбранного мастера
    useEffect(() => {
        if (!selectedMaster) {
            setDates([])
            return
        }

        async function loadDates() {
            const today = new Date().toISOString().slice(0, 10)
            const maxDate = new Date()
            maxDate.setDate(maxDate.getDate() + 45)
            const maxDateStr = maxDate.toISOString().slice(0, 10)

            const { data, error } = await supabase
                .from('availability')
                .select('*')
                .eq('master_id', selectedMaster.id)
                .gte('work_date', today)
                .lte('work_date', maxDateStr)
                .order('work_date', { ascending: true })

            if (error) setError(error.message)
            else setDates(data || [])
        }
        loadDates()
    }, [selectedMaster])

    // Загружаем записи мастера на выбранный день
    useEffect(() => {
        if (!selectedDate || !selectedMaster) {
            setBookings([])
            return
        }

        async function loadBookings() {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('master_id', selectedMaster.id)
                .eq('booking_date', selectedDate.work_date)
                .in('status', ['pending', 'confirmed'])

            if (error) setError(error.message)
            else setBookings(data || [])
        }
        loadBookings()
    }, [selectedDate, selectedMaster])

    // Сброс выбранного времени при смене чего-либо выше
    useEffect(() => {
        setSelectedDate(null)
        setSelectedTime(null)
    }, [selectedMaster, selectedService])

    useEffect(() => {
        setSelectedTime(null)
    }, [selectedDate])

    // Расчёт свободных слотов
    function computeSlots() {
        if (!selectedDate || !selectedService) return []

        const workStart = toMinutes(selectedDate.start_time)
        const workEnd = toMinutes(selectedDate.end_time)
        const duration = selectedService.duration_minutes

        // Берем шаг из настроек мастера (или 60 по умолчанию)
        const masterStep = selectedMaster?.slot_step ?? 60
        const step = getSlotStep(duration, masterStep)

        // Занятые интервалы
        const busy = bookings.map((b) => ({
            start: toMinutes(b.start_time),
            end: toMinutes(b.end_time),
        }))

        const slots = []
        for (let t = workStart; t + duration <= workEnd; t += step) {
            const slotEnd = t + duration
            const overlaps = busy.some(
                (b) => t < b.end && slotEnd > b.start
            )

            // Если слот в прошлом (для сегодняшнего дня) — пропускаем
            const now = new Date()
            const isToday =
                selectedDate.work_date === now.toISOString().slice(0, 10)
            if (isToday) {
                const nowMinutes = now.getHours() * 60 + now.getMinutes()
                if (t <= nowMinutes) continue
            }

            slots.push({
                start: t,
                end: slotEnd,
                timeStr: toTimeStr(t),
                endTimeStr: toTimeStr(slotEnd),
                available: !overlaps,
            })
        }
        return slots
    }

    const slots = computeSlots()

    // Запись на выбранное время
    async function handleBook() {
        if (!selectedTime || !selectedDate || !selectedService || !selectedMaster) return

        setError('')
        setSubmitting(true)

        const { error } = await supabase.from('bookings').insert({
            client_id: user.id,
            master_id: selectedMaster.id,
            service_id: selectedService.id,
            booking_date: selectedDate.work_date,
            start_time: selectedTime.timeStr + ':00',
            end_time: selectedTime.endTimeStr + ':00',
            status: 'pending',
        })

        if (error) {
            setError('Не удалось записаться: ' + error.message)
        } else {
            alert('🎉 Вы записаны! Мастер увидит вашу запись в своём кабинете.')
            // сбрасываем
            setSelectedMaster(null)
            setSelectedService(null)
            setSelectedDate(null)
            setSelectedTime(null)
        }
        setSubmitting(false)
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            weekday: 'short',
        })
    }

    function isMasterSelected(m) {
        return selectedMaster?.id === m.id
    }
    function isServiceSelected(s) {
        return selectedService?.id === s.id
    }
    function isDateSelected(d) {
        return selectedDate?.id === d.id
    }
    function isTimeSelected(t) {
        return selectedTime?.timeStr === t.timeStr
    }

    if (loading) {
        return <div className="text-emerald-500">Загрузка...</div>
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-6">💅 Записаться</h1>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                    {error}
                </div>
            )}

            {/* ШАГ 1. Мастер */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">
                    <span className="bg-emerald-500 text-white rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">
                        1
                    </span>
                    Выберите мастера
                </h2>
                {masters.length === 0 ? (
                    <p className="text-gray-500">Пока нет активных мастеров.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {masters.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedMaster(m)}
                                className={`p-4 rounded-xl border-2 text-left transition ${isMasterSelected(m)
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-gray-200 hover:border-pink-300'
                                    }`}
                            >
                                <p className="font-medium">{m.full_name}</p>
                                <p className="text-sm text-gray-500">{m.phone}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ШАГ 2. Услуга */}
            {selectedMaster && (
                <div className="bg-white rounded-2xl shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">
                        <span className="bg-emerald-500 text-white rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">
                            2
                        </span>
                        Выберите услугу
                    </h2>
                    {services.length === 0 ? (
                        <p className="text-gray-500">Пока нет услуг.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {services.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedService(s)}
                                    className={`p-4 rounded-xl border-2 text-left transition ${isServiceSelected(s)
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-gray-200 hover:border-pink-300'
                                        }`}
                                >
                                    <p className="font-medium">{s.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {s.duration_minutes} мин · {s.price} ₽
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ШАГ 3. Дата */}
            {selectedMaster && selectedService && (
                <div className="bg-white rounded-2xl shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">
                        <span className="bg-emerald-500 text-white rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">
                            3
                        </span>
                        Выберите дату
                    </h2>
                    {dates.length === 0 ? (
                        <p className="text-gray-500">У мастера пока нет открытых дней.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {dates.map((d) => (
                                <button
                                    key={d.id}
                                    onClick={() => setSelectedDate(d)}
                                    className={`p-3 rounded-xl border-2 text-sm text-left transition ${isDateSelected(d)
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-gray-200 hover:border-pink-300'
                                        }`}
                                >
                                    <p className="font-medium capitalize">{formatDate(d.work_date)}</p>
                                    <p className="text-xs text-gray-500">
                                        {d.start_time.slice(0, 5)}–{d.end_time.slice(0, 5)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ШАГ 4. Время */}
            {selectedMaster && selectedService && selectedDate && (
                <div className="bg-white rounded-2xl shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">
                        <span className="bg-emerald-500 text-white rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">
                            4
                        </span>
                        Выберите время
                    </h2>

                    {slots.length === 0 ? (
                        <p className="text-gray-500">
                            На этот день нет подходящих слотов для выбранной услуги.
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {slots.map((slot) => (
                                <button
                                    key={slot.timeStr}
                                    disabled={!slot.available}
                                    onClick={() => slot.available && setSelectedTime(slot)}
                                    className={`p-3 rounded-lg border-2 text-sm font-medium transition ${!slot.available
                                            ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed line-through'
                                            : isTimeSelected(slot)
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : 'border-gray-200 hover:border-pink-400 text-gray-700'
                                        }`}
                                >
                                    {slot.timeStr}
                                </button>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-gray-500 mt-3">
                        Слоты рассчитаны на {selectedService.duration_minutes} мин.{' '}
                        {selectedMaster?.slot_step === 0
                            ? 'Шаг: без ограничений (15 мин).'
                            : `Шаг: ${getSlotStep(selectedService.duration_minutes, selectedMaster?.slot_step ?? 60)} мин.`}
                    </p>
                </div>
            )}

            {/* ИТОГ + кнопка записи */}
            {selectedMaster && selectedService && selectedDate && selectedTime && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-lg mb-3">📋 Проверьте запись:</h3>
                    <ul className="text-gray-700 space-y-1 mb-4">
                        <li>👤 Мастер: <strong>{selectedMaster.full_name}</strong></li>
                        <li>💅 Услуга: <strong>{selectedService.name}</strong></li>
                        <li>📅 Дата: <strong className="capitalize">{formatDate(selectedDate.work_date)}</strong></li>
                        <li>⏰ Время: <strong>{selectedTime.timeStr} – {selectedTime.endTimeStr}</strong></li>
                        <li>💰 Стоимость: <strong>{selectedService.price} ₽</strong></li>
                    </ul>

                    <button
                        onClick={handleBook}
                        disabled={submitting}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white px-6 py-3 rounded-lg font-medium transition"
                    >
                        {submitting ? 'Записываем...' : '✅ Подтвердить запись'}
                    </button>
                </div>
            )}
        </div>
    )
}