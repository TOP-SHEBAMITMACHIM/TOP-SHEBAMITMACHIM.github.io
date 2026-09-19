/* ==========================================================================
   טופ שבמתמחים — כפתור "צור עמנו קשר"
   --------------------------------------------------------------------------
   הקובץ מזריק לדף כפתור צף + חלונית טופס, ומטפל בשליחת ההודעה.
   כדי להשתמש בו בכל דף מספיק להוסיף בשורה אחת:
       <script src="contact-widget.js"></script>

   >>> כל מה שצריך לשנות נמצא ב- CONTACT_CONFIG שלמטה <<<
   ========================================================================== */

var CONTACT_CONFIG = {
    /* 'formspree' = שליחה דרך Formspree | 'webhook' = כתובת Webhook | 'local' = שמירה מקומית בלבד */
    submitMethod: 'formspree',

    /* מזהה הטופס ב-Formspree (מתוך הכתובת formspree.io/f/XXXXXXX) */
    formspreeId: 'mvkgpkbr',

    /* כתובת Webhook — נדרשת רק אם submitMethod = 'webhook' */
    webhookUrl: '',

    /* שמירת עותק של כל פנייה ב-localStorage (לפאנל ניהול עתידי) */
    saveAdminLog: true,

    /* הודעת ההצלחה שתוצג למשתמש */
    successMsg: 'הודעתך נשלחה בהצלחה! נחזור אליך בהקדם.'
};

(function () {
    'use strict';

    var FONT_AWESOME_URL = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    var LOG_KEY = 'contact_submissions';

    function ensureFontAwesome() {
        if (document.querySelector('link[href*="font-awesome"]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONT_AWESOME_URL;
        document.head.appendChild(link);
    }

    function widgetMarkup() {
        return '' +
        '<button type="button" class="widget-toggle" id="widgetToggle" aria-label="צור עמנו קשר" aria-expanded="false">' +
            '<i class="fa-solid fa-envelope widget-icon-closed"></i>' +
            '<i class="fa-solid fa-xmark widget-icon-opened"></i>' +
        '</button>' +

        '<div class="contact-block" id="contactBlock" role="dialog" aria-modal="false" aria-label="צור עמנו קשר">' +
            '<div class="contact-header">' +
                '<div class="contact-header-text">' +
                    '<h2><i class="fa-solid fa-paper-plane"></i> צור עמנו קשר</h2>' +
                    '<p>נשמח לשמוע ממך! מלא את הפרטים ונחזור אליך בהקדם.</p>' +
                '</div>' +
                '<div class="header-actions">' +
                    '<button type="button" class="icon-btn" id="closeWidget" aria-label="סגור"><i class="fa-solid fa-xmark"></i></button>' +
                '</div>' +
            '</div>' +

            '<form class="contact-form" id="contactForm">' +
                '<div class="form-group">' +
                    '<label for="cName"><i class="fa-regular fa-user"></i> שם מלא *</label>' +
                    '<input type="text" id="cName" name="name" class="form-control" placeholder="ישראל ישראלי" required>' +
                '</div>' +

                '<div class="form-group">' +
                    '<label for="cEmail"><i class="fa-regular fa-envelope"></i> כתובת מייל *</label>' +
                    '<input type="email" id="cEmail" name="email" class="form-control" placeholder="your@email.com" required>' +
                '</div>' +

                '<div class="form-group">' +
                    '<label for="cSubject"><i class="fa-regular fa-bookmark"></i> נושא הפנייה</label>' +
                    '<input type="text" id="cSubject" name="subject" class="form-control" placeholder="באיזה נושא מדובר?">' +
                '</div>' +

                '<div class="form-group">' +
                    '<label for="cMessage"><i class="fa-regular fa-comment-dots"></i> תוכן ההודעה *</label>' +
                    '<textarea id="cMessage" name="message" class="form-control" placeholder="רשום את הודעתך כאן..." required></textarea>' +
                '</div>' +

                '<button type="submit" class="btn-submit" id="btnSubmit">' +
                    '<span>שלח הודעה</span> <i class="fa-solid fa-arrow-left"></i>' +
                '</button>' +

                '<div class="status-msg" id="statusMsg" role="status" aria-live="polite"></div>' +
            '</form>' +
        '</div>';
    }

    function buildWidget() {
        if (document.getElementById('contactBlock')) return; /* כבר קיים בדף */

        ensureFontAwesome();

        var holder = document.createElement('div');
        holder.innerHTML = widgetMarkup();
        while (holder.firstChild) {
            document.body.appendChild(holder.firstChild);
        }

        var contactBlock = document.getElementById('contactBlock');
        var widgetToggle = document.getElementById('widgetToggle');
        var closeWidget = document.getElementById('closeWidget');
        var form = document.getElementById('contactForm');
        var btnSubmit = document.getElementById('btnSubmit');
        var statusMsg = document.getElementById('statusMsg');

        /* ---------- פתיחה וסגירה ----------
           שימו לב: לא מחליפים את ה-innerHTML של הכפתור, כי החלפה כזו מנתקת את
           האייקון שנלחץ מה-DOM ומקשה על זיהוי לחיצות מחוץ לחלונית. */
        function setOpen(isOpen) {
            contactBlock.classList.toggle('open', isOpen);
            widgetToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        widgetToggle.addEventListener('click', function () {
            setOpen(!contactBlock.classList.contains('open'));
        });

        closeWidget.addEventListener('click', function () {
            setOpen(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && contactBlock.classList.contains('open')) {
                setOpen(false);
                widgetToggle.focus();
            }
        });

        /* סגירה בלחיצה מחוץ לחלונית */
        document.addEventListener('click', function (event) {
            if (!contactBlock.classList.contains('open')) return;
            if (contactBlock.contains(event.target) || widgetToggle.contains(event.target)) return;
            setOpen(false);
        });

        /* ---------- שליחת הטופס ---------- */
        form.addEventListener('submit', async function (event) {
            event.preventDefault();

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span>שולח...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
            statusMsg.className = 'status-msg';
            statusMsg.style.display = 'none';

            var formData = {
                name: document.getElementById('cName').value,
                email: document.getElementById('cEmail').value,
                subject: document.getElementById('cSubject').value,
                message: document.getElementById('cMessage').value,
                date: new Date().toLocaleString('he-IL')
            };

            /* שמירה מקומית עבור פאנל ניהול, אם הופעל */
            if (CONTACT_CONFIG.saveAdminLog || CONTACT_CONFIG.submitMethod === 'local') {
                try {
                    var existingLogs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
                    existingLogs.unshift(formData);
                    localStorage.setItem(LOG_KEY, JSON.stringify(existingLogs));
                } catch (err) {
                    console.error('שגיאה בשמירת הלוג המקומי', err);
                }
            }

            try {
                if (CONTACT_CONFIG.submitMethod === 'formspree') {
                    if (!CONTACT_CONFIG.formspreeId) throw new Error('חסר מפתח Formspree Form ID בהגדרות');
                    var res = await fetch('https://formspree.io/f/' + CONTACT_CONFIG.formspreeId, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    if (!res.ok) throw new Error('שגיאה בשליחת הטופס ל-Formspree');

                } else if (CONTACT_CONFIG.submitMethod === 'webhook') {
                    if (!CONTACT_CONFIG.webhookUrl) throw new Error('חסרה כתובת Webhook URL');
                    await fetch(CONTACT_CONFIG.webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                }

                statusMsg.textContent = CONTACT_CONFIG.successMsg;
                statusMsg.className = 'status-msg success';
                statusMsg.style.display = 'block';
                form.reset();
            } catch (err) {
                statusMsg.textContent = err.message || 'אירעה שגיאה בשליחה. אנא נסה שנית.';
                statusMsg.className = 'status-msg error';
                statusMsg.style.display = 'block';
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<span>שלח הודעה</span> <i class="fa-solid fa-arrow-left"></i>';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
        buildWidget();
    }
})();
