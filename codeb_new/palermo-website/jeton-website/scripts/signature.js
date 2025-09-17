;(function () {
	if (navigator.userAgent.toLowerCase().includes('chrome') || navigator.userAgent.toLowerCase().includes('firefox')) {
		const e = [
			'%c Made by Büro %c %c🤘 %c\n',
			'color: #fff; background: #0020f4; padding:5px 0;',
			'color: #fff; background: #242424; padding:5px 0 5px 5px;',
			'background: #242424; padding:5px 0',
			'background: #242424; padding:5px 5px 5px 0',
		]
		window.console.log.apply(console, e)
	} else {
		window.console && window.console.log('Made by Büro')
	}
})()
