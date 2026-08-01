/* RaGo — Per-service professional booking form.
 * Additive & isolated: injects a rich, world-class set of booking fields for
 * each service type into the shared category engine's booking box, shows a live
 * price estimate, then submits (with guest -> login -> resume). It does NOT edit
 * the frozen engine; it only overrides window.egBook / window.finishAuth and
 * observes the detail body. File uploads (passport / license / photo) are
 * stored as data-URLs inside the booking `details` JSON, like service images.
 */
(function () {
	'use strict'

	// field = [id, label, type, placeholder-or-options, required]
	// type: text | number | date | time | select | textarea | file | section
	// (select options joined with |). A 'section' renders a subheading.
	var FIELDS = {
		airport: [
			['direction', 'Direction', 'select', 'Arrival|Departure', true],
			['flightno', 'Flight number', 'text', 'e.g. MS777', true],
			['flighttime', 'Flight date & time', 'text', 'e.g. 12 Aug, 14:30', true],
			['terminal', 'Terminal / meeting point', 'text', 'Terminal or hall', false],
			['bags', 'Number of bags', 'number', '', false],
			['boardname', 'Name for the name-board', 'text', 'Your name', false],
		],
		transfers: [
			['pickup', 'Pickup location', 'text', 'Airport / hotel name', true],
			['dropoff', 'Drop-off location', 'text', 'Hotel / address', true],
			['ptime', 'Pickup time', 'time', '', false],
			['flightno', 'Flight number (optional)', 'text', 'e.g. MS777', false],
			['vehicle', 'Vehicle type', 'select', 'Sedan|Minivan|Minibus|Luxury', false],
			['bags', 'Luggage pieces', 'number', '', false],
		],
		hotels: [
			['__s1', 'Stay details', 'section'],
			['checkout', 'Check-out date', 'date', '', true],
			['rooms', 'Rooms', 'number', '1', true],
			['children', 'Children', 'number', '0', false],
			['room', 'Room type', 'select', 'Standard|Deluxe|Suite|Family room', true],
			['board', 'Board basis', 'select', 'Room only|Bed & breakfast|Half board|All inclusive', true],
			['bed', 'Bed preference', 'select', 'No preference|Twin beds|Large double bed', false],
			['__s2', 'Guest & preferences', 'section'],
			['lead', 'Lead guest full name', 'text', 'As in passport', true],
			['arrivaltime', 'Estimated arrival time', 'time', '', false],
			['requests', 'Special requests', 'textarea', 'High floor, late check-in, honeymoon...', false],
		],
		tours: [
			['pickup', 'Pickup hotel / location', 'text', 'Your hotel name', true],
			['ptime', 'Preferred pickup time', 'time', '', false],
			['lang', 'Preferred language', 'select', 'English|German|Italian|Russian|Spanish|French|Arabic', false],
			['children', 'Children', 'number', '0', false],
			['requests', 'Notes / dietary needs', 'textarea', 'Anything we should know?', false],
		],
		'nile-cruise': [
			['checkout', 'Disembark date', 'date', '', false],
			['cabin', 'Cabin type', 'select', 'Standard|Deluxe|Suite', true],
			['boarding', 'Boarding city', 'select', 'Luxor|Aswan', true],
			['board', 'Board basis', 'select', 'Full board|Half board|All inclusive', false],
			['requests', 'Special requests', 'textarea', 'Dietary needs, occasion...', false],
		],
		diving: [
			['level', 'Certification level', 'select', 'None (beginner)|Open Water|Advanced|Divemaster', true],
			['equip', 'Need equipment rental?', 'select', 'Yes|No', true],
			['pickup', 'Pickup hotel / location', 'text', 'Your hotel name', false],
			['dives', 'Number of dives', 'number', '', false],
		],
		safari: [
			['pickup', 'Pickup hotel / location', 'text', 'Your hotel name', true],
			['vehicle', 'Vehicle preference', 'select', 'Quad bike|Jeep 4x4|Buggy|Camel', false],
			['ptime', 'Preferred time', 'time', '', false],
			['children', 'Children', 'number', '0', false],
		],
		carrental: [
			['returndate', 'Return date', 'date', '', true],
			['pickupcity', 'Pickup city', 'text', 'e.g. Cairo', true],
			['dropcity', 'Drop-off city', 'text', 'Same as pickup if empty', false],
			['gear', 'Transmission', 'select', 'Automatic|Manual', true],
			['age', 'Driver age', 'number', '', false],
			['license', 'Driving license (photo)', 'file', '', false],
		],
		guide: [
			['lang', 'Guide language', 'select', 'English|German|Italian|Russian|Spanish|French|Arabic', true],
			['pickup', 'Pickup hotel / location', 'text', 'Your hotel name', false],
			['focus', 'Tour focus / interests', 'text', 'History, food, photography...', false],
		],
		sim: [
			['delivery', 'Delivery hotel / address', 'text', 'Where to deliver', true],
			['plan', 'Data plan', 'select', '10 GB|20 GB|Unlimited', true],
			['phone', 'Contact phone (WhatsApp)', 'text', '+20 ...', false],
		],
		visa: [
			['fullname', 'Full name (exactly as in passport)', 'text', 'First & last name', true],
			['sex', 'Sex (as in passport)', 'select', 'Male|Female', true],
			['dob', 'Date of birth', 'date', '', true],
			['nationality', 'Nationality', 'text', 'As shown in passport', true],
			['residence', 'Country of residence', 'text', '', true],
			['passport', 'Passport number', 'text', '', true],
			['passportissue', 'Passport issue date', 'date', '', true],
			['passportexpiry', 'Passport expiry date', 'date', '', true],
			['occupation', 'Occupation', 'text', '', false],
			['visatype', 'Visa type', 'select', 'Tourist – single entry|Tourist – multiple entry|Business|Transit', true],
			['purpose', 'Purpose of visit', 'select', 'Tourism|Business|Family visit|Study|Other', false],
			['arrival', 'Intended arrival date', 'date', '', true],
			['departure', 'Intended departure date', 'date', '', false],
			['address', 'Address / hotel in Egypt', 'text', '', false],
			['contactemail', 'Contact email', 'text', 'you@email.com', true],
			['contactphone', 'Contact phone (WhatsApp)', 'text', '+20 ...', true],
			['passportscan', 'Passport main page (photo/scan)', 'file', '', true],
			['personalphoto', 'Personal photo (white background)', 'file', '', true],
		],
		insurance: [
			['period', 'Coverage period', 'select', '1 week|2 weeks|1 month|Custom', true],
			['travellers', 'Number of travellers', 'number', '', true],
			['ages', 'Travellers ages', 'text', 'e.g. 34, 30, 6', false],
			['activities', 'Planned activities', 'select', 'Standard|Diving|Safari|Multiple', false],
		],
		dining: [
			['time', 'Reservation time', 'time', '', true],
			['occasion', 'Occasion (optional)', 'text', 'Birthday, anniversary...', false],
			['diet', 'Dietary requirements', 'text', 'Vegetarian, halal, allergies...', false],
		],
		shopping: [
			['delivery', 'Delivery hotel / address', 'text', 'Where to deliver (products)', false],
			['pickup', 'Or pickup hotel / location', 'text', 'For guided experiences', false],
			['interests', 'Interests / items', 'text', 'Gold, spices, crafts...', false],
			['requests', 'Notes', 'textarea', 'Sizes, colors, budget...', false],
		],
		spa: [
			['time', 'Preferred time', 'time', '', true],
			['treatment', 'Treatment', 'select', 'Massage|Hammam|Facial|Full package', true],
			['gender', 'Therapist preference', 'select', 'No preference|Male|Female', false],
		],
		events: [
			['ticket', 'Ticket type', 'select', 'Standard|VIP|Premium|Family', true],
			['time', 'Preferred time / session', 'time', '', false],
			['transfer', 'Add hotel transfer?', 'select', 'No|Yes', false],
		],
		departure: [
			['flightno', 'Flight number', 'text', 'e.g. MS778', true],
			['flighttime', 'Departure date & time', 'text', 'e.g. 20 Aug, 22:10', true],
			['pickuphotel', 'Pickup hotel', 'text', 'Your hotel name', false],
		],
		pharmacy: [
			['delivery', 'Delivery hotel & room', 'text', 'Hotel name & room number', true],
			['items', 'Items / prescription details', 'textarea', 'List medicines or symptoms', true],
			['phone', 'Contact phone (WhatsApp)', 'text', '+20 ...', false],
			['prescription', 'Prescription (photo, optional)', 'file', '', false],
		],
		'internal-trips': [
			['pickup', 'Pickup hotel / location', 'text', 'Your hotel name', false],
			['ptime', 'Preferred pickup time', 'time', '', false],
		],
	}

	var _catCache = null
	function catKeyById(id) {
		if (!id || !_catCache) return null
		for (var i = 0; i < _catCache.length; i++)
			if (_catCache[i].id === id) return _catCache[i].key
		return null
	}
	function loadCatsCache() {
		if (_catCache) return Promise.resolve(_catCache)
		try {
			return api('/api/categories').then(function (c) {
				_catCache = c || []
				return _catCache
			}).catch(function () { return [] })
		} catch (e) { return Promise.resolve([]) }
	}

	function esc(s) {
		return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
	}
	function isGuest() { try { return (typeof USER === 'undefined') || !USER } catch (e) { return true } }
	function toastMsg(m) { if (typeof toast === 'function') toast(m) }

	function curKey() {
		try { return catKeyById(window.CUR_SVC && window.CUR_SVC.category_id) } catch (e) { return null }
	}
	function defsFor(key) { return (key && FIELDS[key]) || [] }

	// Read a chosen file as a data-URL and stash it (survives guest -> login).
	window.rgtFileRead = function (el, fid) {
		var st = document.getElementById('eg-f-' + fid + '-st')
		var f = el && el.files && el.files[0]
		window.__RGTFILES = window.__RGTFILES || {}
		if (!f) { delete window.__RGTFILES[fid]; if (st) st.textContent = ''; return }
		if (f.size > 6 * 1024 * 1024) {
			if (st) { st.style.color = '#E05544'; st.textContent = 'File too large (max 6 MB)' }
			el.value = ''; delete window.__RGTFILES[fid]; return
		}
		var r = new FileReader()
		r.onload = function () {
			window.__RGTFILES[fid] = r.result
			if (st) { st.style.color = '#2E8B7B'; st.textContent = '✓ ' + f.name }
		}
		r.readAsDataURL(f)
	}

	function injectStyle() {
		if (document.getElementById('rgtf-style')) return
		var css = [
			'.rgtf-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;margin:6px 0 10px}',
			'.rgtf-grid .eg-field{margin:0}',
			'.rgtf-grid .rgtf-full{grid-column:1/-1}',
			'.rgtf-sec{grid-column:1/-1;font-weight:800;color:#123B4C;font-size:12px;letter-spacing:.4px;text-transform:uppercase;opacity:.8;margin:8px 0 -2px}',
			'.rgtf-summary{background:#E6EEF1;border:1px solid #d3e0e5;border-radius:12px;padding:12px 14px;margin:4px 0 12px}',
			'.rgtf-sum-line{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#1B2A30}',
			'#rgtf-sum-total{font-weight:800;color:#123B4C;font-size:16px}',
			'@media(max-width:520px){.rgtf-grid{grid-template-columns:1fr}}',
		].join('')
		var st = document.createElement('style')
		st.id = 'rgtf-style'; st.textContent = css
		;(document.head || document.documentElement).appendChild(st)
	}

	function fieldHtml(f) {
		var t = f[2] || 'text'
		if (t === 'section') return '<div class="rgtf-sec">' + esc(f[1]) + '</div>'
		var id = 'eg-f-' + f[0]
		var full = (t === 'textarea' || t === 'file')
		var lab = '<label>' + esc(f[1]) + (f[4] ? ' *' : '') + '</label>'
		var inp
		if (t === 'select') {
			var opts = (f[3] || '').split('|')
			inp = '<select id="' + id + '"><option value="">Choose...</option>' +
				opts.map(function (o) { return '<option>' + esc(o) + '</option>' }).join('') + '</select>'
		} else if (t === 'textarea') {
			inp = '<textarea id="' + id + '" rows="2" placeholder="' + esc(f[3] || '') +
				'" style="width:100%;border:1.5px solid #e0e8eb;border-radius:10px;padding:12px;font-size:14px;font-family:inherit;color:#1B2A30;resize:vertical"></textarea>'
		} else if (t === 'file') {
			inp = '<input id="' + id + '" type="file" accept="image/*" onchange="rgtFileRead(this,\'' + f[0] + '\')" style="width:100%;font-size:13px">' +
				'<div id="' + id + '-st" class="muted" style="font-size:12px;margin-top:4px"></div>'
		} else if (t === 'number') {
			inp = '<input id="' + id + '" type="number" min="0" value="' + esc(f[3] || '') + '">'
		} else {
			inp = '<input id="' + id + '" type="' + t + '" placeholder="' + esc(f[3] || '') + '">'
		}
		return '<div class="eg-field' + (full ? ' rgtf-full' : '') + '" data-rgtf-field="1">' + lab + inp + '</div>'
	}

	function summaryHtml() {
		return '<div class="rgtf-summary" id="rgtf-sum">' +
			'<div class="rgtf-sum-line"><span id="rgtf-sum-desc" class="muted">Choose your options</span>' +
			'<span id="rgtf-sum-total"></span></div></div>'
	}

	function money(n) { return '$' + (Math.round(n * 100) / 100) }
	function nightsBetween(a, b) {
		if (!a || !b) return 0
		var d1 = new Date(a), d2 = new Date(b)
		var n = Math.round((d2 - d1) / 864e5)
		return n > 0 ? n : 0
	}
	function val(id) { var e = document.getElementById(id); return e ? e.value : '' }
	function num(id, def) { var v = Number(val(id)); return v > 0 ? v : (def || 0) }

	function setSummary(desc, total) {
		var d = document.getElementById('rgtf-sum-desc')
		if (d) d.textContent = desc || ''
		var t = document.getElementById('rgtf-sum-total')
		if (t) t.textContent = (total != null && total > 0) ? ('Est. ' + money(total)) : ''
	}

	function calcEstimate() {
		var svc = window.CUR_SVC
		if (!svc) return
		var price = Number(svc.price) || 0
		var key = curKey()
		var pax = num('eg-pax', 1)
		if (key === 'hotels') {
			var rooms = num('eg-f-rooms', 1)
			var nights = nightsBetween(val('eg-date'), val('eg-f-checkout')) || 1
			if (!price) { setSummary('Best price on request', null); return }
			setSummary(rooms + ' room(s) × ' + nights + ' night(s) × ' + money(price), price * rooms * nights)
			return
		}
		if (!price) { setSummary('Price on request', null); return }
		setSummary(pax + ' × ' + money(price), price * pax)
	}

	function inject(box) {
		box.setAttribute('data-rgtf', '1')
		injectStyle()
		var key = curKey()
		var defs = defsFor(key)
		var btn = box.querySelector('.eg-btn')
		if (!btn) return
		if (!box.querySelector('#rgtf-sum')) {
			window.__RGTFILES = {} // fresh uploads per service
			var html = ''
			if (defs.length) html += '<div class="rgtf-grid">' + defs.map(fieldHtml).join('') + '</div>'
			html += summaryHtml()
			btn.insertAdjacentHTML('beforebegin', html)
		}
		if (!box.__rgtfListen) {
			box.__rgtfListen = 1
			box.addEventListener('input', calcEstimate)
			box.addEventListener('change', calcEstimate)
		}
		calcEstimate()
	}

	function readFields(key) {
		var defs = defsFor(key), byLabel = {}, miss = []
		defs.forEach(function (f) {
			var t = f[2] || 'text'
			if (t === 'section') return
			var v
			if (t === 'file') {
				v = (window.__RGTFILES && window.__RGTFILES[f[0]]) || ''
			} else {
				var el = document.getElementById('eg-f-' + f[0])
				v = el ? ('' + el.value).trim() : ''
			}
			if (v) byLabel[f[1]] = v
			else if (f[4]) miss.push(f[1])
		})
		return { byLabel: byLabel, miss: miss }
	}

	function postBooking(sid, date, pax, byLabel) {
		if (!sid) { toastMsg('Please select again'); return }
		var details = byLabel && Object.keys(byLabel).length ? JSON.stringify(byLabel) : null
		api('/api/bookings', {
			method: 'POST',
			body: {
				service_id: sid,
				date: date || null,
				pax: Number(pax) || 1,
				referral_code: (typeof REF !== 'undefined' && REF) || null,
				details: details,
			},
		}).then(function (bk) {
			window.__RGTFILES = {}
			toastMsg('Booked! Ref ' + ((bk && bk.ref) || ''))
		}).catch(function (e) {
			toastMsg((e && e.message) || 'Booking failed')
		})
	}

	function startObserver() {
		var target = document.getElementById('detail-body') || document.body
		try {
			var mo = new MutationObserver(function () {
				var box = document.querySelector('#detail-body .eg-book:not([data-rgtf])')
				if (box) loadCatsCache().then(function () { inject(box) })
			})
			mo.observe(target, { childList: true, subtree: true })
		} catch (e) {}
	}

	window.egBook = function () {
		var key = curKey()
		var rf = readFields(key)
		if (rf.miss.length) { toastMsg('Please fill: ' + rf.miss.join(', ')); return }
		var svc = window.CUR_SVC, sid = svc && svc.id
		var date = val('eg-date'), pax = val('eg-pax') || 1
		if (key === 'hotels') {
			var n = nightsBetween(date, val('eg-f-checkout'))
			if (n) rf.byLabel['Nights'] = String(n)
			if (date) rf.byLabel['Check-in date'] = date
		}
		if (isGuest()) {
			window.__RGTPEND = { sid: sid, date: date, pax: pax, byLabel: rf.byLabel }
			toastMsg('Please sign in to complete your booking')
			if (typeof openLogin === 'function') openLogin()
			return
		}
		postBooking(sid, date, pax, rf.byLabel)
	}

	var _fa = window.finishAuth
	window.finishAuth = function (r) {
		var pend = window.__RGTPEND
		var ret = (typeof _fa === 'function') ? _fa.apply(this, arguments) : undefined
		if (pend && !isGuest()) {
			window.__RGTPEND = null
			var role
			try { role = USER && USER.role } catch (e) {}
			if (!role || role === 'customer') {
				setTimeout(function () {
					postBooking(pend.sid, pend.date, pend.pax, pend.byLabel)
				}, 180)
			}
		}
		return ret
	}

	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', startObserver)
	else startObserver()
})()
