/* ==========================================================================
   טופ שבמתמחים — מצב בהיר / מצב כהה
   --------------------------------------------------------------------------
   ברירת המחדל נקבעת לפי הגדרת מערכת ההפעלה של הגולש (בהיר או כהה).
   ברגע שהגולש לוחץ על כפתור המצב, הבחירה שלו נשמרת ב-localStorage ומכאן היא
   זו שקובעת בכל טעינה — עד שהוא יחליף שוב.

   רוצים שכולם תמיד ייפתחו במצב כהה, בלי קשר להגדרות המערכת? החליפו את השורה
       applyTheme(readStored() || systemTheme());
   בשורה
       applyTheme(readStored() || 'dark');
   ========================================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'site-theme';
    var root = document.documentElement;

    function readStored() {
        try {
            var value = localStorage.getItem(STORAGE_KEY);
            return (value === 'light' || value === 'dark') ? value : null;
        } catch (err) {
            return null;
        }
    }

    function store(theme) {
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (err) { /* מצב פרטי / חסימת אחסון */ }
    }

    /* מה הגולש הגדיר במערכת ההפעלה שלו */
    function systemTheme() {
        try {
            return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        } catch (err) {
            return 'dark';
        }
    }

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);

        var button = document.getElementById('themeToggle');
        if (!button) return;

        /* האייקון מציג את המצב שאליו נלחץ */
        button.innerHTML = theme === 'light'
            ? '<i class="fa-solid fa-moon"></i>'
            : '<i class="fa-solid fa-sun"></i>';

        button.title = theme === 'light' ? 'עבור למצב כהה' : 'עבור למצב בהיר';
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    }

    /* מוחל מיד, עוד לפני שהדף מצטייר, כדי שלא יהיה "הבזק" של המצב הלא נכון */
    applyTheme(readStored() || systemTheme());

    document.addEventListener('DOMContentLoaded', function () {
        var button = document.createElement('button');
        button.type = 'button';
        button.id = 'themeToggle';
        button.className = 'theme-toggle';
        /* אם בדף יש מקום שמור לכפתור (בכותרת העליונה) — הוא נכנס לשם, אחרת הוא צף בפינה */
        var slot = document.querySelector('[data-theme-slot]');
        if (slot) button.className += ' in-header';
        (slot || document.body).appendChild(button);
        applyTheme(root.getAttribute('data-theme') || systemTheme());

        button.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            applyTheme(next);
            store(next); /* בחירה ידנית — מכאן היא זו שקובעת */
        });

        /* אם הגולש לא בחר ידנית, עוקבים גם אחרי שינוי בהגדרות המערכת בזמן אמת */
        try {
            var query = window.matchMedia('(prefers-color-scheme: light)');
            var onSystemChange = function (event) {
                if (!readStored()) applyTheme(event.matches ? 'light' : 'dark');
            };
            if (query.addEventListener) query.addEventListener('change', onSystemChange);
            else if (query.addListener) query.addListener(onSystemChange);
        } catch (err) { /* דפדפן ישן */ }
    });
})();
