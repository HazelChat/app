export const Loader = () => {
	return (
		<div className="flex h-screen flex-col items-center justify-center gap-6">
			<div className="mask-radial-at-center mask-radial-from-black mask-radial-to-transparent relative aspect-square w-full max-w-sm">
				<img
					src="/images/squirrle_window.png"
					alt="squirrel"
					className="mask-size-[110%_90%] mask-linear-to-r mask-from-black mask-to-transparent mask-center mask-no-repeat mask-[url(/images/image-mask.png)] h-full w-full rounded-md bg-center bg-cover bg-no-repeat object-cover"
				/>
			</div>

			<p className="font-bold font-mono text-xl">
				Loading
				<span className="inline-block">
					<span className="animate-bounce [animation-delay:0s]">.</span>
					<span className="animate-bounce [animation-delay:0.2s]">.</span>
					<span className="animate-bounce [animation-delay:0.4s]">.</span>
				</span>
			</p>
		</div>
	)
}
