/* ==========================================================================
   טופ שבמתמחים — התנהגויות קטנות בממשק
   1. חיפוש וסינון כרטיסי הפרויקטים בדף הבית
   2. לשוניות של שיטות התקנה בחלוניות הפרויקטים
   3. כפתורי "העתק" ליד פקודות וכתובות
   4. פתיחה וסגירה של חלוניות הפרויקטים לפי הכתובת
   5. חלונית שיתוף (וואטסאפ, טלגרם, מייל ועוד + העתקת קישור)
   ========================================================================== */
(function () {
    'use strict';

    /* ---------- 1. חיפוש וסינון ---------- */
    function initFilters() {
        var grid = document.getElementById('projectsGrid');
        if (!grid) return;

        var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
        var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter]'));
        var input = document.getElementById('projectSearch');
        var empty = document.getElementById('emptyState');
        var active = 'all';

        /* מונה פרויקטים לכל קטגוריה */
        chips.forEach(function (chip) {
            var f = chip.getAttribute('data-filter');
            var n = f === 'all' ? cards.length : cards.filter(function (c) {
                return (c.getAttribute('data-cat') || '').split(' ').indexOf(f) !== -1;
            }).length;
            var span = document.createElement('span');
            span.className = 'count';
            span.textContent = '(' + n + ')';
            chip.appendChild(span);
        });

        function normalize(s) {
            return (s || '').toLowerCase()
                .replace(/[֑-ׇ]/g, '')          /* ניקוד וטעמים */
                .replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ')
                .replace(/['"״׳`-]/g, '');
        }

        function apply() {
            var q = normalize(input ? input.value.trim() : '');
            var shown = 0;
            cards.forEach(function (card) {
                var cats = (card.getAttribute('data-cat') || '').split(' ');
                var okCat = active === 'all' || cats.indexOf(active) !== -1;
                var okText = !q || normalize(card.textContent + ' ' + (card.getAttribute('data-keywords') || '')).indexOf(q) !== -1;
                card.hidden = !(okCat && okText);
                if (!card.hidden) shown++;
            });
            if (empty) empty.classList.toggle('show', shown === 0);
        }

        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                active = chip.getAttribute('data-filter');
                chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
                apply();
            });
        });

        if (input) {
            input.addEventListener('input', apply);
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { input.value = ''; apply(); }
            });
            /* "/" ממקד את שדה החיפוש */
            document.addEventListener('keydown', function (e) {
                var t = e.target;
                if (e.key === '/' && t && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable && !document.querySelector('dialog[open]')) {
                    e.preventDefault();
                    input.focus();
                }
            });
        }
    }

    /* ---------- 2. לשוניות ---------- */
    function initTabs() {
        Array.prototype.forEach.call(document.querySelectorAll('[role="tablist"]'), function (list) {
            var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

            function select(tab) {
                tabs.forEach(function (t) {
                    var on = t === tab;
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                    t.tabIndex = on ? 0 : -1;
                    var panel = document.getElementById(t.getAttribute('aria-controls'));
                    if (panel) panel.hidden = !on;
                });
            }

            tabs.forEach(function (tab, i) {
                tab.addEventListener('click', function () { select(tab); });
                tab.addEventListener('keydown', function (e) {
                    /* באתר מימין לשמאל: חץ שמאלה = הלשונית הבאה */
                    var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
                    if (!d) return;
                    var next = tabs[(i + d + tabs.length) % tabs.length];
                    select(next);
                    next.focus();
                });
            });
        });
    }

    /* ---------- 3. העתקה ---------- */
    function initCopy() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
            btn.addEventListener('click', function () {
                var text = btn.getAttribute('data-copy');
                var done = function () {
                    if (btn.classList.contains('done')) return;
                    var old = btn.innerHTML;
                    btn.textContent = 'הועתק ✓';
                    btn.classList.add('done');
                    setTimeout(function () { btn.innerHTML = old; btn.classList.remove('done'); }, 1600);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done, function () {});
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    try { document.execCommand('copy'); done(); } catch (err) { /* אין תמיכה */ }
                    document.body.removeChild(ta);
                }
            });
        });
    }

    /* ---------- 4. חלוניות הפרויקטים ----------
       הכתובת קובעת איזו חלונית פתוחה: #top-gif פותח את Top Gif, בלי # הכול סגור.
       כך אפשר לשתף קישור ישיר לפרויקט, וכפתור "חזרה" בדפדפן סוגר את החלונית. */
    function initDialogs() {
        var dialogs = {};
        Array.prototype.forEach.call(document.querySelectorAll('dialog[data-project]'), function (d) {
            dialogs[d.getAttribute('data-project')] = d;
        });
        var current = null;
        var pushed = false;   /* החלונית נפתחה בלחיצה בדף, ולכן נוספה רשומה להיסטוריה */
        var syncing = false;  /* סגירה שנובעת משינוי בכתובת — לא נוגעים בהיסטוריה */
        var opener = null;

        function hashId() {
            try { return decodeURIComponent(location.hash.slice(1)); } catch (err) { return ''; }
        }

        /* הניקוי רץ מיד ולא מחכה לאירוע close, שבחלק מהדפדפנים מגיע באיחור */
        function afterClose(d) {
            if (current !== d) return;
            current = null;
            document.body.classList.remove('dialog-open');
            if (!syncing && hashId() === d.getAttribute('data-project')) {
                if (pushed) history.back();
                else history.replaceState(null, '', location.pathname + location.search);
            }
            pushed = false;
            if (opener) { opener.focus({ preventScroll: true }); opener = null; }
        }

        function hide(d) {
            if (d.open) d.close();
            afterClose(d);
        }

        function closeSilently() {
            if (!current) return;
            syncing = true;
            hide(current);
            syncing = false;
        }

        function sync() {
            var d = dialogs[hashId()] || null;
            if (d === current) return;
            closeSilently();
            if (!d) return;
            if (!d.open) d.showModal();
            current = d;
            document.body.classList.add('dialog-open');
            var scroller = d.querySelector('.d-scroll');
            if (scroller) scroller.scrollTop = 0;
        }

        Object.keys(dialogs).forEach(function (id) {
            var d = dialogs[id];
            d.addEventListener('close', function () { afterClose(d); });
            d.addEventListener('cancel', function (e) { e.preventDefault(); hide(d); });  /* מקש Esc */
            /* לחיצה על הרקע שמחוץ לחלונית סוגרת אותה */
            d.addEventListener('click', function (e) { if (e.target === d) hide(d); });
            Array.prototype.forEach.call(d.querySelectorAll('[data-close]'), function (b) {
                b.addEventListener('click', function () { hide(d); });
            });
        });

        Array.prototype.forEach.call(document.querySelectorAll('a.card[href^="#"]'), function (card) {
            card.addEventListener('click', function () { pushed = true; opener = card; });
        });

        window.addEventListener('hashchange', sync);
        sync();
    }

    /* ---------- 5. שיתוף ----------
       כל כפתור עם data-share פותח את חלונית השיתוף. בלי data-share-url משתפים את האתר כולו. */
    var SITE_URL = 'https://top-shebamitmachim.github.io/';
    var SITE_TEXT = 'טופ שבמתמחים – תוכנות, תוספים וסקריפטים חינמיים עם מדריכי התקנה בעברית';

    function initShare() {
        var dlg = document.getElementById('shareDialog');
        if (!dlg) return;
        var input = document.getElementById('shareUrl');
        var copyBtn = document.getElementById('shareCopy');
        var sub = document.getElementById('shareSub');
        var nativeBtn = dlg.querySelector('[data-target="native"]');
        var items = dlg.querySelectorAll('a.share-item');
        var data = { url: SITE_URL, text: SITE_TEXT };

        function links(url, text) {
            var u = encodeURIComponent(url), t = encodeURIComponent(text), both = encodeURIComponent(text + '\n' + url);
            return {
                whatsapp: 'https://wa.me/?text=' + both,
                telegram: 'https://t.me/share/url?url=' + u + '&text=' + t,
                gmail: 'https://mail.google.com/mail/?view=cm&fs=1&su=' + t + '&body=' + both,
                email: 'mailto:?subject=' + t + '&body=' + both,
                sms: 'sms:?&body=' + both,
                facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u,
                x: 'https://twitter.com/intent/tweet?url=' + u + '&text=' + t
            };
        }

        function open(btn) {
            var title = btn.getAttribute('data-share-title');
            data.url = btn.getAttribute('data-share-url') || SITE_URL;
            data.text = title ? title + ' – מדריך התקנה והורדה' : SITE_TEXT;
            sub.textContent = title ? 'שליחת קישור ישיר ל' + title : 'שליחת קישור לאתר לחברים';
            var map = links(data.url, data.text);
            Array.prototype.forEach.call(items, function (a) { a.href = map[a.getAttribute('data-target')]; });
            input.value = data.url;
            nativeBtn.hidden = !navigator.share;
            dlg.showModal();
        }

        Array.prototype.forEach.call(document.querySelectorAll('[data-share]'), function (btn) {
            btn.addEventListener('click', function () { open(btn); });
        });
        dlg.querySelector('[data-share-close]').addEventListener('click', function () { dlg.close(); });
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        /* Esc סוגר רק את חלונית השיתוף, לא את חלונית הפרויקט שמתחתיה */
        dlg.addEventListener('cancel', function (e) { e.preventDefault(); dlg.close(); });
        input.addEventListener('focus', function () { input.select(); });

        copyBtn.addEventListener('click', function () {
            var done = function () {
                var old = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> הועתק!';
                copyBtn.disabled = true;
                setTimeout(function () { copyBtn.innerHTML = old; copyBtn.disabled = false; }, 1600);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(data.url).then(done, function () { input.select(); document.execCommand('copy'); done(); });
            } else {
                input.select();
                try { document.execCommand('copy'); done(); } catch (err) { /* אין תמיכה */ }
            }
        });

        nativeBtn.addEventListener('click', function () {
            navigator.share({ title: 'טופ שבמתמחים', text: data.text, url: data.url }).catch(function () {});
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initFilters();
        initTabs();
        initCopy();
        initDialogs();
        initShare();
    });
})();
