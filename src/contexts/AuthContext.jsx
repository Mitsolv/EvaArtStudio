import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)       // данные auth (email, id)
    const [profile, setProfile] = useState(null) // данные из таблицы profiles (имя, роль)
    const [loading, setLoading] = useState(true)

    // Загружаем профиль из таблицы profiles по id
    async function loadProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            console.error('Ошибка загрузки профиля:', error)
            return null
        }
        return data
    }

    // При старте проверяем, есть ли активная сессия
    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user)
                const p = await loadProfile(session.user.id)
                setProfile(p)
            }
            setLoading(false)
        })

        // Слушаем изменения авторизации (вход/выход)
        const { data: listener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    setUser(session.user)
                    const p = await loadProfile(session.user.id)
                    setProfile(p)
                } else {
                    setUser(null)
                    setProfile(null)
                }
            }
        )

        return () => listener.subscription.unsubscribe()
    }, [])

    // Функция регистрации
    async function signUp({ email, password, full_name, phone }) {
        // 1. Создаём пользователя в auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name, phone, role: 'client' } // все регистрируются как клиенты
            }
        })
        if (error) throw error
        return data
    }

    // Функция входа
    async function signIn({ email, password }) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error
        return data
    }

    // Функция выхода
    async function signOut() {
        await supabase.auth.signOut()
    }

    const value = {
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        isMaster: profile?.role === 'master'
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Хук для использования контекста
export function useAuth() {
    return useContext(AuthContext)
}