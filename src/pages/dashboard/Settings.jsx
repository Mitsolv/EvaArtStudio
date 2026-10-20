import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function Settings() {
    const { profile, user } = useAuth()
    const [slotStep, setSlotStep] = useState(60)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    // Загружаем текущую настройку
    useEffect(() => {
        if (profile?.slot_step !== undefined) {
            setSlotStep(profile.slot_step)
        }
    }, [profile])

    async function handleSave(e) {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        setError('')

        const { error } = await supabase
            .from('profiles')
            .update({ slot_step: slotStep })
            .eq('id', user.id)

        if (error) {
            setError(error.message)
        } else {
            setMessage('Настройки сохранены! Изменения вступят в силу при следующей загрузке кабинета.')
        }
        setSaving(false)
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-6">⚙️ Настройки</h1>

            <div className="bg-white rounded-2xl shadow p-6 max-w-xl">
                <h2 className="text-lg font-semibold mb-4">Шаг между клиентами</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Выберите, с каким интервалом клиенты могут выбирать время записи.
                    Например, при шаге 60 минут клиенты увидят слоты 08:00, 09:00, 10:00...
                    При шаге «Без шага» — смогут выбрать любое время с точностью до 15 минут.
                </p>

                <form onSubmit={handleSave}>
                    <div className="space-y-3 mb-6">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-emerald-50">
                            <input
                                type="radio"
                                name="step"
                                value={60}
                                checked={slotStep === 60}
                                onChange={() => setSlotStep(60)}
                                className="w-4 h-4 accent-pink-500"
                            />
                            <span>🕐 60 минут (рекомендуется)</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-emerald-50">
                            <input
                                type="radio"
                                name="step"
                                value={30}
                                checked={slotStep === 30}
                                onChange={() => setSlotStep(30)}
                                className="w-4 h-4 accent-pink-500"
                            />
                            <span>🕧 30 минут</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-emerald-50">
                            <input
                                type="radio"
                                name="step"
                                value={0}
                                checked={slotStep === 0}
                                onChange={() => setSlotStep(0)}
                                className="w-4 h-4 accent-pink-500"
                            />
                            <span>🔓 Без шага (любое время с точностью до 15 мин)</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white px-6 py-2 rounded-lg font-medium transition"
                    >
                        {saving ? 'Сохраняем...' : 'Сохранить'}
                    </button>

                    {message && (
                        <p className="text-green-600 text-sm mt-4">{message}</p>
                    )}
                    {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
                </form>
            </div>
        </div>
    )
}