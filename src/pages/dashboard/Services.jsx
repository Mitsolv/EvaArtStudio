import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function Services() {
    const { profile } = useAuth()
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({
        name: '',
        duration_minutes: '',
        price: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Загружаем услуги (все, потому что общий прайс — от обоих мастеров)
    async function loadServices() {
        setLoading(true)
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error) setServices(data || [])
        setLoading(false)
    }

    useEffect(() => {
        loadServices()
    }, [])

    function update(field, value) {
        setForm({ ...form, [field]: value })
    }

    async function handleAdd(e) {
        e.preventDefault()
        setError('')
        setSaving(true)

        const { error } = await supabase.from('services').insert({
            name: form.name.trim(),
            duration_minutes: parseInt(form.duration_minutes),
            price: parseFloat(form.price),
        })

        if (error) {
            setError(error.message)
        } else {
            setForm({ name: '', duration_minutes: '', price: '' })
            await loadServices()
        }
        setSaving(false)
    }

    async function handleDelete(id) {
        if (!confirm('Удалить услугу?')) return
        const { error } = await supabase.from('services').delete().eq('id', id)
        if (error) {
            alert('Ошибка: ' + error.message)
        } else {
            await loadServices()
        }
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-6">💅 Мои услуги</h1>

            {/* Форма добавления */}
            <div className="bg-white rounded-2xl shadow p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Добавить услугу</h2>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        required
                        placeholder="Название (например: Маникюр)"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                    />
                    <input
                        type="number"
                        required
                        min="5"
                        placeholder="Длительность (мин)"
                        value={form.duration_minutes}
                        onChange={(e) => update('duration_minutes', e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                    />
                    <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="Цена (₽)"
                        value={form.price}
                        onChange={(e) => update('price', e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                        {saving ? 'Сохраняем...' : 'Добавить'}
                    </button>
                </form>
                {error && (
                    <p className="text-red-600 text-sm mt-3">Ошибка: {error}</p>
                )}
            </div>

            {/* Список услуг */}
            <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Список услуг</h2>

                {loading ? (
                    <p className="text-gray-500">Загрузка...</p>
                ) : services.length === 0 ? (
                    <p className="text-gray-500">Пока нет услуг. Добавьте первую!</p>
                ) : (
                    <div className="space-y-2">
                        {services.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium">{s.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {s.duration_minutes} мин · {s.price} ₽
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                    Удалить
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}