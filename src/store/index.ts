import create, { UseBoundStore } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { axios } from 'api'
import { Tokens, User } from 'types'

interface IStore<T = any> {
	user?: null | User
	atk: string | null
	rtk: string | null
	isLogin: boolean
	setIsLogin: (flag: boolean) => void
	errorMessage?: string
	setErrorMessage: (message: string) => void
	setUser: (user: User) => void
	setNav: () => void
	showNav: boolean
	setTokens: (tokens: Tokens) => void
	dragState: {
		state: boolean
		dragged: T
	}
	setIsDragging: (flag: { state: boolean; dragged: T }) => void
	refreshAccount: () => void
}

const store = create(
	devtools(
		subscribeWithSelector(
			immer<IStore>((set) => ({
				user: null,
				isLogin: false,
				setIsLogin: (flag) => set((state) => ({ ...state, isLogin: flag })),
				showNav: false,
				atk: null,
				rtk: null,
				errorMessage: undefined,
				setErrorMessage: (msg) => set((state) => ({ ...state, errorMessage: msg })),
				setUser: (user) => set((state) => ({ ...state, user: user })),
				setNav: () =>
					set((state) => ({
						showNav: !state.showNav
					})),
				setTokens: ({ atk, rtk }: Tokens) => {
					return set((state) => ({
						atk: atk || state.atk,
						rtk: rtk || state.rtk
					}))
				},
				dragState: {
					state: false,
					dragged: null
				},
				setIsDragging: ({ state, dragged }) =>
					set({
						dragState: {
							state,
							dragged
						}
					}),
				refreshAccount: () => {
					localStorage.removeItem('X-ACCESS-TOKEN')
					localStorage.removeItem('X-REFRESH-TOKEN')
					return set({ atk: null, rtk: null, isLogin: false, user: null })
				}
			}))
		)
	)
)

store.subscribe(
	({ atk }) => ({ atk }),
	({ atk }) => {
		if (atk) {
			localStorage.setItem('X-ACCESS-TOKEN', atk)
			axios.defaults.headers['X-ACCESS-TOKEN'] = atk
		} else {
			delete axios.defaults.headers['X-ACCESS-TOKEN']
		}
	},
	{
		equalityFn(a, b) {
			return a.atk === b.atk
		},
		fireImmediately: true
	}
)
store.subscribe(
	({ rtk }) => ({ rtk }),
	({ rtk }) => {
		if (rtk) {
			localStorage.setItem('X-REFRESH-TOKEN', rtk)
		}
	},
	{
		equalityFn(a, b) {
			return a.rtk === b.rtk
		},
		fireImmediately: true
	}
)

store.subscribe(
	({ user, setIsLogin }) => ({ user, setIsLogin }),
	({ user, setIsLogin }) => setIsLogin(!!user)
)

export const useCommonStore = store.getState()

export default store
