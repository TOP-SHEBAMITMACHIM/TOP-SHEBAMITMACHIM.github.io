/* ==========================================================================
   טופ שבמתמחים — התנהגויות קטנות בממשק
   1. חיפוש וסינון כרטיסי הפרויקטים בדף הבית
   2. לשוניות של שיטות התקנה בדפי הפרויקטים
   3. כפתורי "העתק" ליד פקודות וכתובות
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
                if (e.key === '/' && t && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) {
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
                    var old = btn.textContent;
                    btn.textContent = 'הועתק ✓';
                    btn.classList.add('done');
                    setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1600);
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

    document.addEventListener('DOMContentLoaded', function () {
        initFilters();
        initTabs();
        initCopy();
    });
})();
