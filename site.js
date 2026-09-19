/* ==========================================================================
   טופ שבמתמחים — מצב בהיר / מצב כהה
   הקובץ הזה מטמיע את המצב הנבחר מיד עם טעינת הדף (בלי "הבזק"),
   ומוסיף כפתור צף להחלפה בין המצבים בפינה השמאלית העליונה.
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

    /*
       מוחל מיד, עוד לפני שהדף מצטייר, כדי שלא יהיה "הבזק" של המצב הלא נכון.
       ברירת המחדל היא מצב כהה — כמו שהאתר נראה תמיד.
       רוצים שהאתר ייפתח לפי הגדרת מערכת ההפעלה של הגולש? החליפו את השורה למטה ב:
           applyTheme(readStored() || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    */
    applyTheme(readStored() || 'dark');

    document.addEventListener('DOMContentLoaded', function () {
        var button = document.createElement('button');
        button.type = 'button';
        button.id = 'themeToggle';
        button.className = 'theme-toggle';
        document.body.appendChild(button);
        applyTheme(root.getAttribute('data-theme') || 'dark');

        button.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            applyTheme(next);
            store(next);
        });
    });
})();
