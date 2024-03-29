import store from 'store'
import PIES from 'assets/seperated_pie'
import { AnimatePresence, motion, PanInfo, useAnimation, Variants } from 'framer-motion'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useDraggablePosition from 'hooks/useDraggablePosition'

import Modal from 'components/Modal'
import { useQuery } from 'react-query'
import { PieApi, UserApi } from 'api'
import { Pie } from 'types'
import { UserDetail } from 'types'
import NickNameChangePopup from 'components/Modal/NickNameChangePopup'
import SendMessage from 'components/popup/SendMessage'
import Login from 'components/popup/Login'
import Crown from 'components/Crown'
import { urlSafebtoa } from 'libs/utils'
import withNavigation from 'layout/withNavigation'
import PiePiece from 'components/PiePiece'
import SelectFeve from 'components/popup/SelectFeve'
import { useTitle } from 'hooks/useTitle'
import { useNavigate } from 'react-router-dom'
import CompletePie from 'components/popup/CompletePie'
import useCopyClipboard from 'hooks/useCopyClipboard'
import VisitHistory from 'components/popup/VisitHistory'
import useAuth from 'hooks/useAuth'

const signTitleVariants: Variants = {
	initial: {
		y: 100
	},
	animate: {
		y: 0
	},
	exit: {
		y: 100
	}
}

const domVariants: Variants = {
	initial: {
		transformOrigin: 'right bottom',
		rotateZ: 180
	},
	animate: (isInitial: boolean) => {
		return {
			transformOrigin: isInitial ? 'center' : 'right bottom',
			translateZ: isInitial ? [-100, 0, 100, 0] : 0,
			rotateZ: isInitial ? [0, -10, 0, 10, 0, -5, 0, 5, 0, -3, 0, 3, 0, -1, 0, 1, 0] : 0,
			transition: isInitial
				? { delay: 3, duration: 0.7, type: 'spring', damping: 2, repeat: Infinity, repeatDelay: 3 }
				: {
						easings: ['circIn', 'circInOut'],
						duration: 1.3
				  }
		}
	},
	exit: {
		transformOrigin: 'right bottom',
		rotateZ: 180,
		transition: {
			easings: ['circIn', 'circInOut'],
			duration: 1.3
		}
	}
}

const Main = ({ userId, user }: { userId: string; user: UserDetail }) => {
	const navigate = useNavigate()
	const { logout } = useAuth()
	const { dragState, setDragState, popup, setPopup, user: loggedInUser, refreshPopup, isLogin, owner, setOwner } = store()
	const { data: pieData, refetch: pieRefetch } = useQuery(['room', 'pie', userId], () => PieApi.getUserPie({ userId }), {
		cacheTime: Infinity,
		staleTime: 1000 * 60 * 5,
		retry: false,
		refetchOnWindowFocus: false,
		enabled: !!userId
	})

	const { data: userResponse, refetch: userRefetch } = useQuery(['room', 'user', userId], () => UserApi.getUserDetail(userId), {
		cacheTime: Infinity,
		staleTime: 1000 * 60 * 5,
		retry: false,
		refetchOnWindowFocus: false,
		enabled: !!userId,
		onSuccess({ data }) {
			setOwner({ ...data, userId })
		}
	})

	const { data: count } = useQuery(['visit', 'count', userId], () => UserApi.getVisitCount(userId), {
		cacheTime: Infinity,
		staleTime: 1000 * 60 * 5,
		retry: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		enabled: !!userId
	})

	const [shakeCustom, setShakeCustom] = useState(false)
	const howToAnimate = useAnimation()
	const { copyUrlOnClipboard } = useCopyClipboard()
	const buttonAxios = useRef<HTMLDivElement | null>(null)

	const { startX, startY, endY, endX } = useDraggablePosition(buttonAxios)
	const isMe = loggedInUser && urlSafebtoa(loggedInUser.email) === userId
	const data = useMemo(() => ({ ...pieData, ...userResponse }), [pieData, userResponse])

	const selectedList = pieData?.userPiePiece?.map((item) => +item.pieceIndex)
	const pieNumber = pieData?.piecesNumber ?? '6'
	const pies: Pie[] | [] = PIES.Pies[pieNumber].filter((item) => {
		return item.id !== dragState?.dragged?.id && !selectedList?.includes(item.id)
	})

	const feves = userResponse?.data.userFeve.slice(0, 5) || []

	const {} = useTitle(`파이롱${user.nickname ? ' | ' + user.nickname + '의 베이킹룸' : ''}`)
	const refetch = () => {
		pieRefetch()
		userRefetch()
	}

	const onSelectFeve = () => {
		setPopup({
			key: 'selectFeve',
			isOpen: true,
			btnHide: true
		})
	}

	const onLogout = useCallback(() => {
		logout()
		navigate('/')
	}, [])

	const handleCreatePie = useCallback(
		async (feveId: string) => {
			const isCreateSuccess = await PieApi.createPie(feveId)
			if (isCreateSuccess) {
				refetch()
				setPopup({
					key: 'sharePopup',
					isOpen: true,
					btnHide: true
				})
			}
		},
		[userId]
	)

	useLayoutEffect(() => {
		if (isLogin && !isMe) {
			const loggedInUserId = urlSafebtoa(loggedInUser?.email ?? '')
			const history: any[] = JSON.parse(localStorage.getItem(`ROOM_HISTORY_${loggedInUserId}`) ?? '[]') || []
			const parsedHistory = history.filter((item) => item.userId !== userId)
			if (parsedHistory.length > 3) {
				parsedHistory.shift()
			}
			parsedHistory.push({
				nickname: owner?.nickname,
				userId,
				date: new Date().getTime()
			})
			parsedHistory.sort((a, b) => {
				if (a.date > b.date) return -1
				else if (a.date < b.date) return 1
				return 0
			})
			localStorage.setItem(`ROOM_HISTORY_${loggedInUserId}`, JSON.stringify(parsedHistory))
		}
	}, [isLogin])

	useLayoutEffect(() => {
		const firstTime = localStorage.getItem('initial')
		if (isLogin && !loggedInUser?.nickname) {
			setPopup({
				isOpen: true,
				cancelDisabled: true,
				key: 'initialNickname',
				btnHide: true,
				payload: {
					confirm() {
						if (!firstTime) {
							localStorage.setItem('initial', 'done')
							setPopup({
								isOpen: true,
								key: 'howTo'
							})
						} else {
							refreshPopup()
						}
					},
					cancel() {
						if (!firstTime) {
							localStorage.setItem('initial', 'done')
							setPopup({
								isOpen: true,
								key: 'howTo'
							})
						} else {
							refreshPopup()
						}
					}
				}
			})
		} else if (!firstTime) {
			localStorage.setItem('initial', 'done')
			setPopup({
				isOpen: true,
				key: 'howTo'
			})
		}
	}, [userId])

	useLayoutEffect(() => {
		if (!pieData) {
			howToAnimate.start('animate')
		} else {
			howToAnimate.stop()
		}
		if (pieData?.bakingStatus === '02' && isMe) {
			setPopup({
				key: 'pie-done',
				isOpen: true,
				btnHide: true
			})
		}
	}, [pieData])

	const onDragEnd = useCallback(
		(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, pie: Pie) => {
			if (!isLogin) {
				setPopup({
					isOpen: true,
					key: 'login',
					payload: {
						cancel(data) {
							setDragState({
								state: 'idle',
								dragged: null,
								item: null
							})
							refreshPopup()
						},
						confirm() {
							setDragState({
								state: 'idle',
								dragged: null,
								item: null
							})
							refreshPopup()
						}
					}
				})
				return
			} else {
				if (isMe) {
					setPopup({
						isOpen: true,
						key: 'alert',
						message: '직접 만든 파이는 선택할 수 없어요.'
					})
					setDragState({
						state: 'idle',
						dragged: null,
						item: null,
						enter: false
					})
				} else {
					setPopup({
						isOpen: true,
						key: 'sendMessage',
						btnHide: true,
						payload: {
							cancel: () => {
								setDragState({
									state: 'idle',
									dragged: null,
									item: null,
									enter: false
								})
								refreshPopup()
							}
						}
					})
					setDragState({
						state: 'pending',
						dragged: { ...pie },
						item: { ...pie }
					})
				}
			}
		},
		[userId]
	)

	return (
		<AnimatePresence>
			<motion.div key={window.location.pathname} className="h-full relative overflow-x-hidden">
				{!isLogin ? null : isMe ? (
					<button
						onClick={() =>
							setPopup({
								key: 'saveHistory',
								btnHide: true,
								isOpen: true
							})
						}
						className="fixed top-4 z-40 bg-mainTeal w-[120px] h-[50px] border border-solid border-black rounded-full flex items-center justify-center p-1"
						style={{
							left: 'calc(var(--main-mr) + 16px)'
						}}
					>
						<span className="w-full h-full  text-white font-thin py-1  grow text-center rounded-full border border-solid border-white flex items-center justify-center">
							친구 방가기
						</span>
					</button>
				) : (
					<button
						onClick={() => navigate(`/room/${urlSafebtoa(loggedInUser?.email || '')}`)}
						className="fixed top-4 z-40 bg-mainTeal w-[120px] h-[50px] border border-solid border-black rounded-full flex items-center justify-center p-1"
						style={{
							left: 'calc(var(--main-mr) + 16px)'
						}}
					>
						<span className="w-full h-full text-white font-thin p-1  grow text-center rounded-full border border-solid border-white flex items-center justify-center">
							내 방가기
						</span>
					</button>
				)}

				<div className="aspect-[9/20] absolute ">
					{feves.map((item, index) => (
						<div key={item.collectedDate + index} className={`absolute w-16 h-w-16 feves-3d feve-box-${index}`}>
							<div className="relative">
								<img className="absolute feve-front" src={`/image/feve/${item.feveId}.png`} alt={item.feveName} />
							</div>
						</div>
					))}
					<img src="/image/main_board.png" />
					<motion.div className="absolute top-[7.5%] w-[85%] left-[7.5%]">
						<img src="/image/board.png" alt="board" />
						{count && userResponse ? (
							<div className="absolute max-w-[50%] top-1/2 -translate-y-1/2 left-[7%] h-[76%] break-all flex flex-col justify-center space-y-2">
								<p className="text-slate-200 font-thin text-sm">
									오늘 방문자수 : {(+count.data.todayVisitCount).toLocaleString()}
								</p>
								<p className="text-slate-200 font-thin text-sm">
									획득한 페브수: {(+userResponse.data.userFeve.length).toLocaleString()}
								</p>
								<p className="text-slate-200 font-thin text-sm">
									총 방문자수 : {(+count.data.totalVisitCount).toLocaleString()}
								</p>
							</div>
						) : null}
						<div className="absolute max-w-[35%] top-1/2 -translate-y-1/2 right-[7%] h-[76%] break-all flex items-center">
							<img className="absolute top-0 -z-[1]" src="/image/memo.png" />
							<p className="px-3 text-center leading-5 text-xs">{count?.data.noteContent}</p>
						</div>
						<div className="absolute top-0"></div>
						<div className="relative"></div>
					</motion.div>
					{/* <motion.div
						className="absolute top-[4.5%] max-w-[60%] left-[35%]"
						onClick={() => {
							setPopup({
								isOpen: true,
								key: 'howTo'
							})
						}}
					>
						<motion.div className="relative">
							<motion.img
								initial={{
									filter: 'drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.698))'
								}}
								animate={howToAnimate}
								variants={{
									animate: {
										filter: 'drop-shadow(1px 1px 15px rgba(255, 255, 255, 0.698))'
									}
								}}
								transition={{
									duration: 1.2,
									repeat: Infinity,
									ease: 'easeInOut',
									repeatType: 'reverse'
								}}
								src={PIES.HowTo}
							/>
							<motion.div className="absolute max-w-[15%] left-[61%]">
								<img src={PIES.Arrow} />
							</motion.div>
						</motion.div>
					</motion.div> */}
				</div>
				<div className="h-full bg-mainBeige">
					<Crown rank={userResponse?.data.crownId} />

					<div className="relative max-w-[85%] translate-x-[40%] translate-y-[188%] z-30 disabled-drag">
						<div className="relative -left-[9%] z-[1]">
							<img className="drop-shadow-bottom" src={PIES.Plate} />
						</div>
						<div className="absolute top-[30%] -left-[5%]">
							<img src={PIES.GREEN_PAPER} />
							<img className="absolute -left-[47%] top-[45%] -z-[1]" draggable={false} src={PIES.WhitePaper} />

							<img className="absolute top-[35%] -left-[30%] max-w-[61%] z-10" draggable={false} src={PIES.Piece} />
							<img
								className="absolute top-[57%] -left-[34%] max-w-[70%] z-[0] drop-shadow-bottom"
								draggable={false}
								src={PIES.Plate_Small}
							/>
						</div>
						<AnimatePresence>
							{data.userPieId
								? pies.map((pie) => (
										<PiePiece
											isMe={!!isMe}
											dragged={false}
											key={pie.id}
											pie={pie}
											startX={startX}
											startY={startY}
											endX={endX}
											endY={endY}
											onDragEnd={onDragEnd}
										/>
								  ))
								: null}
							{!pieData || pieData.bakingStatus === '03' || pieData.bakingStatus === '02' ? (
								<motion.div
									layoutId="pieSection"
									variants={domVariants}
									onAnimationComplete={(def) => {
										if (def === 'animate' && !pieData) {
											setShakeCustom(true)
										} else {
											setShakeCustom(false)
										}
									}}
									initial="initial"
									animate="animate"
									exit="exit"
									onClick={isMe ? onSelectFeve : () => {}}
									custom={shakeCustom}
									className="absolute -top-[65%] -left-[7%] max-w-[102%] z-10"
								>
									<img src="/image/dom.png" />
								</motion.div>
							) : null}
						</AnimatePresence>
					</div>
					<div ref={buttonAxios} className="fixed left-0 right-0 mx-auto bottom-4 w-[7rem] h-[3rem] invisible"></div>
				</div>

				<AnimatePresence>
					{dragState.state === 'idle' ? (
						<motion.div
							variants={signTitleVariants}
							exit="exit"
							animate="animate"
							initial="initial"
							className={`fixed bottom-0 flex justify-center items-center z-40  max-w-screen-default bg-mainTeal`}
							style={{
								left: 'var(--main-mr)'
							}}
						>
							<div className="h-[60px] border border-solid p-1 flex justify-center items-center relative">
								<div className="border-[#EAE6DA] grow h-full bg-mainTeal border border-solid   flex items-center justify-center text-[#EAE6DA] leading-5 space-x-2 px-2">
									<div className="relative flex items-center">
										<strong className="text-base">
											{user.nickname}
											<small
												className="ml-1"
												style={{
													fontSize: '0.75em'
												}}
											>
												의 베이킹룸
											</small>
										</strong>
									</div>
								</div>
							</div>
							{isMe ? (
								<div className="w-[60px] h-[60px] border border-solid p-1 flex justify-center items-center">
									<div className="border-[#EAE6DA] grow h-full bg-mainTeal border border-solid   flex items-center justify-center text-[#EAE6DA] leading-5 flex-col">
										<svg
											width="25"
											height="25"
											viewBox="0 0 25 25"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
											xmlnsXlink="http://www.w3.org/1999/xlink"
										>
											<rect width="25" height="25" fill="url(#crown)" />
											<defs>
												<pattern id="crown" patternContentUnits="objectBoundingBox" width="1" height="1">
													<use xlinkHref="#crown_sm" transform="scale(0.0208333)" />
												</pattern>
												<image
													id="crown_sm"
													width="48"
													height="48"
													xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADZElEQVR4nO1ZzWsTQRQfrR9139uECmoFFbUKiiDowepBikcpfvwBgp4E8dIP0VPsyQpqFU+iggf1FNp9s7HWW9OevIh4qApJZ9IWW/UifraC2siktU2T3cxumpIN5gfvEnZ/7/ebee/tMGGsiiqqWBKkLNwtOL4SHAYSPWs2sUrCaG+4ThIkJce0CkH4cjzGDFYJSEdZjeDY90/8XBA+ZpUASdiVJ35uJ6CdBRnCglNu4jMGOP5JWcZRFkSkuLFPEP4oZGB2Fz4l7dAOFiQIGzZIjmM68Vkm3opoXZgFAS/uspWCYNCr+CwTPN3BlpdbPxOEt/2Kz5pMlxYtQHLskARfBGG/tLDJ9/uEo8UaEATPfeezsElpne23y2oFx3MmRdyPEUl4VnD87V88TqUIT/oSrrQt1DqpDPS7jDzPRpQQNSJ9ibfMQ8UKn9cIb5jkcEUzu+PqXKNNRPDAR+1HdHxJG/a4CZ8PuM8Emcc8JBzS7gKHI14NJKxQg45PEL7T8aTIPMMSUVwnCKd1D6szTqGEI3Z4m2cDfWx1Ia50lNV44Rl+Yu7MvCAJEnq34a2aFTvs1cBod3h7Ia6EFWrwwPMxnWbLZpJzfOihjC4WNgB3StUDkjCi4xAE1nxyC8/pk8JXYcNeR/HcbPYzSmdmuNnoKJ6bjR7PVO0LDmLeksNn9aKI1W4ZirJVqRjuEgTXJOEvz6ufbYIwospFcWXKhjDiRXympG3zYE7TwDe/IsoVguOkMp1TBrqZG5wQBIMOjQOd5RYmvQZBp1PzHK+cEjKb8wwM98D60m2xOqhBS6rXqB/pMTYKDq3qtxJxT49FQ2ud5y+HYQ8kT9U9jwrH24fMRw9a8kcttBXLJxcYgNeO4mf6AB/pCLIvqZJUu9nRQK9Rn8utdqJYPrnQwD1XA4LD+VIYUGKXyoC0jdOuBkZixn59A2GfSqRCED5zfgba8nfXuFAsn8yKgjca8ThbIQi+l6DRppQJteqZJiZol4Q/F8srCT+4is8qo4FFJ1qygG6tAUlwtfxC0aV8oVVvwMYTgTVghQ5oDVRRTqTirFZwvCUI3wev/nFCEt5UGl0NKPHlFip1QdjlbiCAKy/9fAsqwYAgHC/q76GghOB4vWATKxOZhgme8AnJ8YbuUqyKKv43/AVM/rp4B1oxuAAAAABJRU5ErkJggg=="
												/>
											</defs>
										</svg>
									</div>
								</div>
							) : null}
						</motion.div>
					) : null}
				</AnimatePresence>
				{popup?.key === 'howTo' ? (
					<Modal icon="book">
						<div className="p-5 flex flex-col space-y-6">
							<img src="/image/howTo/1.png" />
							<img src="/image/howTo/2.png" />
							<img src="/image/howTo/3.png" />
						</div>
					</Modal>
				) : popup?.key === 'sendMessage' ? (
					<Modal icon="message">
						<SendMessage refetch={refetch} userPieId={pieData?.userPieId} ownerEmail={pieData?.ownerEmail} owner={user} />
					</Modal>
				) : popup?.key === 'alert' ? (
					<Modal />
				) : popup?.key === 'changeNickName' ? (
					<Modal icon="pancel">
						<NickNameChangePopup refetch={refetch} />
					</Modal>
				) : popup?.key === 'login' ? (
					<Modal>
						<Login />
					</Modal>
				) : popup?.key === 'initialNickname' ? (
					<Modal icon="pancel">
						<NickNameChangePopup refetch={refetch} title="닉네임을 설정해 주세요." />
					</Modal>
				) : popup?.key === 'selectFeve' ? (
					<Modal icon="pancel">
						<SelectFeve onSelect={handleCreatePie} />
					</Modal>
				) : popup?.key === 'sharePopup' ? (
					<Modal>
						<div className="px-2 flex flex-col items-center justify-center relative h-full space-y-3">
							<p className="text-center leading-5">파이가 구워졌어요 친구들에게 공유해 파이조각마다 메세지를 받아보세요!</p>

							<button onClick={copyUrlOnClipboard} className="modal-btn mx-auto">
								공유하기
							</button>
						</div>
					</Modal>
				) : popup?.key === 'pie-done' ? (
					<Modal>
						<CompletePie />
					</Modal>
				) : popup?.key === 'myPie' ? (
					<Modal>
						<div className="flex flex-col items-center">
							<p className="text-center leading-6 mb-2">
								<b className="text-mainTeal">내 파이</b>는 선택할 수 없어요
								<br />
								친구들에게 공유해 메세지를 받아보세요!
							</p>

							<button
								onClick={copyUrlOnClipboard}
								className="min-w-[100px] w-1/3  rounded-full border border-solid border-black mt-2 text-white bg-mainTeal py-3"
							>
								공유하기
							</button>
						</div>
					</Modal>
				) : popup?.key === 'alreadySelect' ? (
					<Modal>
						<div>
							<p className="text-center leading-6 mb-2">
								<b className="text-mainTeal">{user.nickname}</b>님의
								<br />
								파이를 선택한 적이 있어요
								<br />
								파이당 한조각만 가져갈 수 있어요!
							</p>
						</div>
					</Modal>
				) : popup?.key === 'saveHistory' ? (
					<Modal icon="door">
						<VisitHistory />
					</Modal>
				) : popup?.key === 'logout' ? (
					<Modal>
						<div>
							<p className="text-center leading-6 mb-2">
								<b className="text-mainTeal">{user.nickname}</b>님 계정을
								<br />
								로그아웃 할까요?
							</p>
							<div className="flex space-x-2">
								<button onClick={onLogout} className="modal-btn py-1.5 text-sm font-normal min-w-min px-6">
									네
								</button>
								<button
									onClick={refreshPopup}
									className="modal-btn py-1.5 text-sm font-normal bg-transparent text-black min-w-min px-6"
								>
									아니요
								</button>
							</div>
						</div>
					</Modal>
				) : null}
			</motion.div>
		</AnimatePresence>
	)
}

export default withNavigation(Main)
