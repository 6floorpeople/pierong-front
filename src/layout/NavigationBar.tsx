import NavItem from 'components/NavItem'
import { AnimatePresence, motion, useAnimationControls, Variants } from 'framer-motion'
import { MutableRefObject, useRef, useState } from 'react'
interface NavigationBarProps {
	navigationRef: MutableRefObject<HTMLElement | null>
}

const navVariants: Variants = {
	start: {
		maxWidth: 480,
		transition: {
			when: 'afterChild',
			staggerChildren: 0.03
		}
	},
	exit: {
		maxWidth: 0,
		transition: {
			// when: 'afterChild',
			staggerChildren: 0.03
		}
	}
}

const toggleVariants: Variants = {
	initial: { rotateZ: 0 },
	animate: {
		rotateZ: 180
	}
}

const NavigationBar = ({ navigationRef }: NavigationBarProps) => {
	const toggleControl = useAnimationControls()
	const navBarRef = useRef<HTMLElement | null>(null)
	const [open, setOpen] = useState(false)
	const navItems = [
		{
			icon: 'mypage',
			title: 'mypage',
			path: '/'
		},
		{
			icon: 'crown',
			title: 'crown',
			path: '/'
		},
		{
			icon: 'share',
			title: 'share'
		}
	]
	return (
		<>
			<motion.nav
				ref={navBarRef}
				drag="y"
				dragConstraints={navigationRef}
				dragElastic={0.3}
				layout
				className="flex align-center absolute h-11 bg-[#57765E] right-0 overflow-hidden rounded-l-lg z-40 top-[35%]"
			>
				<motion.div
					animate={toggleControl}
					onClick={() => {
						if (open) {
							toggleControl.start('initial')
						} else {
							toggleControl.start('animate')
						}
						setOpen((prev) => !prev)
					}}
					className="flex items-center"
				>
					<motion.svg
						variants={toggleVariants}
						className="w-6 stroke-white"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
					</motion.svg>
					{open ? null : (
						<div className="pr-2">
							<svg
								width="25"
								height="25"
								viewBox="0 0 25 25"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								xmlnsXlink="http://www.w3.org/1999/xlink"
							>
								<rect width="25" height="25" fill="url(#pattern0)" />
								<defs>
									<pattern id="pattern0" patternContentUnits="objectBoundingBox" width="1" height="1">
										<use xlinkHref="#image0_453_1544" transform="scale(0.0104167)" />
									</pattern>
									<image
										id="image0_453_1544"
										width="96"
										height="96"
										xlinkHref="data:image/png;base64,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"
									/>
								</defs>
							</svg>
						</div>
					)}
				</motion.div>

				<AnimatePresence mode="wait">
					{open && (
						<motion.div
							key="modal"
							className="flex justify-around mx-2"
							variants={navVariants}
							layout
							initial="initial"
							animate="start"
							exit="exit"
						>
							<NavItem />
						</motion.div>
					)}
				</AnimatePresence>
			</motion.nav>
		</>
	)
}

export default NavigationBar
