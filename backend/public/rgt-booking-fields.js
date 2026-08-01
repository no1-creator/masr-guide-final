/* RaGo - Per-service custom booking fields.
 * Additive & isolated: injects the RIGHT form fields for each service type into
 * the shared category engine's booking box, then submits them (with guest ->
 * login -> resume). Does NOT edit the engine; overrides window.egBook only.
 * Each service type needs different inputs (a visa is not a hotel is not a car).
 */
(function () {
	'use strict'

	// field = [id, label, type, placeholder-or-options, required]
	// type: text | number | date | time | select | textarea  (select uses a|b|c)
	var FIELDS = {
		airport: [
			['direction', 'Direction', 'select', 'Arrival|Departure', true],
			['flightno', 'Flight number', 'text', 'e.g. MS777', true],
			['flighttime', 'Flight date & time', 'text', 'e.g. 12 Aug, 14:30', true],
			['passengers', 'Meeting point / terminal', 'text', 'Terminal or hall', false],
		],
		transfers: [
			['pickup', 'Pickup location', 'text', 'Airport / hotel name', true],
			['dropoff', 'Drop-off location', 'text', 'Hotel / address', true],
			['flightno', 'Flight number (optional)', 'text', 'e.g. MS777', false],
		],
		hotels: [
			['checkout', 'Check-out date', 'date', '', true],
			['room', 'Room type', 'select', 'Standard|Deluxe|Suite|Family room', true],
			['board', 'Board basis', 'select', 'Room only|Bed & breakfast|Half board|All inclusive', true],
		],
		tours: [
			['pickup', 'Pickup hotel / location', 'text', 'Your hotel name', true],
			['lang', 'Preferred language', 'select', 'English|German|Italian|Russian|Spanish|French', false],
		],
		'nile-cruise': [
			['cabin', 'Cabin type', 'select', 'Standard|Deluxe|Suite', true],
			['boarding', 'Boarding city', 'select', 'Luxor|Aswan', true],
		],
		diving: [
			['level', 'Certification level', 'select', 'None (beginner)|Open Water|Advanced|Divemaster', true],
			['equip', 'Need equipment rental?', 'select', 'Yes|No', true],
		],
		safari: [
			['pickup', 'Pickup hotel / location', 'text', 'Your hotel name', true],
			['vehicle', 'Vehicle preference', 'select', 'Quad bike|Jeep 4x4|Buggy|Camel', false],
		],
		carrental: [
			['returndate', 'Return date', 'date', '', true],
			['pickupcity', 'Pickup city', 'text', 'e.g. Cairo', true],
			['gear', 'Transmission', 'select', 'Automatic|Manual', true],
			['age', 'Driver age', 'number', '', false],
		],
		guide: [
			['lang', 'Guide language', 'select', 'English|German|Italian|Russian|Spanish|French|Arabic', true],
			['focus', 'Tour focus / interests', 'text', 'History, food, photography...', false],
		],
		sim: [
			['delivery', 'Delivery hotel / address', 'text', 'Where to deliver the SIM', true],
			['plan', 'Data plan', 'select', '10 GB|20 GB|Unlimited', true],
		],
		visa: [
			['nationality', 'Nationality', 'text', 'As shown in your passport', true],
			['passport', 'Passport number', 'text', '', true],
			['arrival', 'Intended arrival date', 'date', '', true],
		],
		insurance: [
			['period', 'Coverage period', 'select', '1 week|2 weeks|1 month|Custom', true],
			['ages', 'Travellers ages', 'text', 'e.g. 34, 30, 6', false],
		],
		dining: [
			['time', 'Reservation time', 'time', '', true],
			['occasion', 'Occasion (optional)', 'text', 'Birthday, anniversary...', false],
		],
		shopping: [
			['pickup', 'Pickup hotel / location', 'text', 'Your hotel name', true],
			['interests', 'Shopping interests', 'text', 'Gold, spices, crafts...', false],
		],
		spa: [
			['time', 'Preferred time', 'time', '', true],
			['treatment', 'Treatment', 'select', 'Massage|Hammam|Facial|Full package', true],
		],
		events: [
			['ticket', 'Ticket type', 'select', 'Standard|VIP|Family', true],
			['time', 'Preferred time (optional)', 'time', '', false],
		],
		departure: [
			['flightno', 'Flight number', 'text', 'e.g. MS778', true],
			['flighttime', 'Departure date & time', 'text', 'e.g. 20 Aug, 22:10', true],
		],
		pharmacy: [
			['delivery', 'Delivery hotel & room', 'text', 'Hotel name & room number', true],
			['items', 'Items / prescription details', 'textarea', 'List medicines or symptoms', true],
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
	function loadCats() {
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

	function fieldHtml(f) {
		var id = 'eg-f-' + f[0], t = f[2] || 'text'
		var lab = '<label>' + esc(f[1]) + (f[4] ? ' *' : '') + '</label>'
		var inp
		if (t === 'select') {
			var opts = (f[3] || '').split('|')
			inp = '<select id="' + id + '"><option value="">Choose...</option>' +
				opts.map(function (o) { return '<option>' + esc(o) + '</option>' }).join('') + '</select>'
		} else if (t === 'textarea') {
			inp = '<textarea id="' + id + '" rows="2" placeholder="' + esc(f[3] || '') +
				'" style="width:100%;border:1.5px solid #e0e8eb;border-radius:10px;padding:12px;font-size:14px;font-family:inherit;color:#1B2A30;resize:vertical"></textarea>'
		} else {
			inp = '<input id="' + id + '" type="' + t + '" placeholder="' + esc(f[3] || '') + '">'
		}
		return '<div class="eg-field" data-rgtf-field="1">' + lab + inp + '</div>'
	}

	function inject(box) {
		box.setAttribute('data-rgtf', '1')
		var key = curKey()
		var defs = defsFor(key)
		if (!defs.length) return
		var btn = box.querySelector('.eg-btn')
		if (!btn) return
		// Avoid duplicates if something re-runs.
		if (box.querySelector('[data-rgtf-field]')) return
		btn.insertAdjacentHTML('beforebegin', defs.map(fieldHtml).join(''))
	}

	function readFields(key) {
		var defs = defsFor(key), byLabel = {}, byId = {}, miss = []
		defs.forEach(function (f) {
			var el = document.getElementById('eg-f-' + f[0])
			var v = el ? ('' + el.value).trim() : ''
			byId[f[0]] = v
			if (v) byLabel[f[1]] = v
			else if (f[4]) miss.push(f[1])
		})
		return { byLabel: byLabel, byId: byId, miss: miss }
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
			toastMsg('Booked! Ref ' + ((bk && bk.ref) || ''))
		}).catch(function (e) {
			toastMsg((e && e.message) || 'Booking failed')
		})
	}

	// Observe the detail area; inject the right fields when a booking box appears.
	function startObserver() {
		var target = document.getElementById('detail-body') || document.body
		try {
			var mo = new MutationObserver(function () {
				var box = document.querySelector('#detail-body .eg-book:not([data-rgtf])')
				if (box) loadCats().then(function () { inject(box) })
			})
			mo.observe(target, { childList: true, subtree: true })
		} catch (e) {}
	}

	// Take over the booking button so we can collect + validate custom fields.
	window.egBook = function () {
		var key = curKey()
		var rf = readFields(key)
		if (rf.miss.length) { toastMsg('Please fill: ' + rf.miss.join(', ')); return }
		var svc = window.CUR_SVC, sid = svc && svc.id
		var d = document.getElementById('eg-date'), p = document.getElementById('eg-pax')
		var date = d ? d.value : '', pax = (p && p.value) ? p.value : 1
		if (isGuest()) {
			window.__RGTPEND = { sid: sid, date: date, pax: pax, byLabel: rf.byLabel }
			toastMsg('Please sign in to complete your booking')
			if (typeof openLogin === 'function') openLogin()
			return
		}
		postBooking(sid, date, pax, rf.byLabel)
	}

	// After login, finish the pending booking (with the fields captured earlier).
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
