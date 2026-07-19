# מדריך מפתחות API למקורות המשרות

מסמך זה מסביר איך להשיג ולהגדיר מפתח לכל מקור משרות במערכת. כל מפתח מוגדר בקובץ
`.env` בתיקיית השורש. **כל מקור נדלק אוטומטית ברגע שהמפתח/ההגדרה שלו קיימים** — אין
צורך בשינוי קוד. אחרי עדכון `.env` יש להפעיל מחדש את שרת ה‑API.

> הערת עמידה בתנאים: המערכת משתמשת אך ורק ב‑API רשמי / פידים ציבוריים. אנחנו לא
> מבצעים scraping ל‑LinkedIn, Indeed, Glassdoor, AllJobs, Drushim, JobMaster,
> פייסבוק או וואטסאפ. את המשרות של החברות האלה אנחנו מקבלים ישירות מהמקור (ATS).

---

## 1. מקורות ללא מפתח — כבר פעילים

מקורות אלה עובדים מיד, ללא הרשמה:

| מקור                           | תיאור                                            |
| ------------------------------ | ------------------------------------------------ |
| **Remotive**                   | משרות הייטק מרוחקות (זכאיות לישראל)              |
| **Arbeitnow**                  | לוח משרות טכנולוגי ציבורי                        |
| **RemoteOK**                   | משרות מרוחקות טכנולוגיות                         |
| **Telegram**                   | ערוצי דרושים ישראליים ציבוריים (`t.me/s/<ערוץ>`) |
| **Greenhouse / Lever / Ashby** | לוחות הקריירה הרשמיים של חברות (ראו סעיף 2)      |

---

## 2. לוחות ATS של חברות (Greenhouse / Lever / Ashby) — ללא מפתח

אלה ה‑API הציבוריים הרשמיים של מערכות הגיוס. במקום מפתח, מגדירים **רשימת חברות**.
כל חברה מזוהה ע"י ה‑token (המזהה) שלה בלוח. הפורמט: `token|שם לתצוגה`, מופרד בפסיקים.

```env
GREENHOUSE_COMPANIES=appsflyer|AppsFlyer,taboola|Taboola,payoneer|Payoneer
LEVER_COMPANIES=walkme|WalkMe
ASHBY_COMPANIES=unit|Unit,pinecone|Pinecone
```

### איך מוצאים את ה‑token של חברה?

1. היכנסו לדף הקריירה של החברה וחפשו קישור למשרה.
2. זהו את מערכת הגיוס ואת ה‑token לפי כתובת ה‑URL:

| מערכת          | דוגמת URL                                 | ה‑token     | בדיקה ידנית                                                 |
| -------------- | ----------------------------------------- | ----------- | ----------------------------------------------------------- |
| **Greenhouse** | `boards.greenhouse.io/appsflyer/jobs/123` | `appsflyer` | `https://boards-api.greenhouse.io/v1/boards/appsflyer/jobs` |
| **Lever**      | `jobs.lever.co/walkme/abc`                | `walkme`    | `https://api.lever.co/v0/postings/walkme?mode=json`         |
| **Ashby**      | `jobs.ashbyhq.com/pinecone/xyz`           | `pinecone`  | `https://api.ashbyhq.com/posting-api/job-board/pinecone`    |

3. אם קישור הבדיקה מחזיר JSON עם משרות — ה‑token תקין. הוסיפו אותו לרשימה המתאימה.
   המערכת תסנן אוטומטית למשרות בישראל בלבד ולתפקידי הייטק.

> טיפ: הרבה חברות ישראליות משתמשות ב‑Greenhouse. אפשר לשלוח לי שם חברה ואבדוק
> עבורכם אם היא חשופה ואיזה token להשתמש.

---

## 3. מקורות עם מפתח — אתם מגדירים את המפתח

### 3.1 Jooble (משרות ישראליות) — מפתח חינם

- **הרשמה:** https://jooble.org/api/about
- לוחצים על "Get API key", ממלאים אימייל וכתובת אתר. המפתח נשלח במייל.
- **הגדרה ב‑.env:**
  ```env
  JOOBLE_API_KEY=<המפתח שלכם>
  JOOBLE_LOCATION=Israel
  JOOBLE_KEYWORDS=developer
  ```

### 3.2 JSearch / RapidAPI (הכי רחב — כולל משרות ממקור LinkedIn/Indeed)

JSearch מאגד את Google for Jobs, כך שהוא מכסה גם משרות שמקורן ב‑LinkedIn, Indeed,
Glassdoor ואתרי חברות — בצורה חוקית דרך ה‑API הרשמי.

- **הרשמה:** https://rapidapi.com/auth/sign-up (חשבון RapidAPI חינמי)
- נכנסים לעמוד ה‑API: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- לוחצים **Subscribe to Test** ובוחרים את התוכנית ה‑**Basic (Free)** (כולל מכסה חודשית חינם).
- בלשונית **Endpoints**, מעתיקים את הערך של הכותרת `X-RapidAPI-Key`.
- **הגדרה ב‑.env:**
  ```env
  RAPIDAPI_KEY=<המפתח שלכם>
  JSEARCH_QUERY=software developer jobs in israel
  ```

### 3.3 Careerjet (משרות ישראליות — careerjet.co.il) — מזהה שותף חינם

- **הרשמה:** https://www.careerjet.com/partners/
- נרשמים לתוכנית השותפים ומקבלים **Affiliate ID** בן 20 תווים.
- **הגדרה ב‑.env:**
  ```env
  CAREERJET_AFFID=<ה‑affiliate id שלכם>
  CAREERJET_KEYWORDS=developer
  CAREERJET_LOCATION=Israel
  ```

### 3.4 Findwork.dev — מפתח חינם

- **הרשמה:** https://findwork.dev/developers/ (יוצרים חשבון ומקבלים API token).
- **הגדרה ב‑.env:**
  ```env
  FINDWORK_API_KEY=<המפתח שלכם>
  FINDWORK_SEARCH=developer
  ```

---

## 4. מקורות עם כיסוי מוגבל / לא רלוונטיים לישראל

| מקור                                | סטטוס          | הערה                                                    |
| ----------------------------------- | -------------- | ------------------------------------------------------- |
| **The Muse**                        | מפתח אופציונלי | סינון המיקום שלהם לא אמין לישראל — כיסוי נמוך, לא שולב. |
| **Adzuna**                          | אין ישראל      | ה‑API של Adzuna לא תומך במדינת ישראל.                   |
| **USAJobs**                         | ארה"ב בלבד     | משרות ממשלת ארה"ב — לא רלוונטי.                         |
| **ZipRecruiter / Indeed Publisher** | Partner בלבד   | דורש אישור שותפות מסחרי, אין הרשמה עצמית פתוחה.         |
| **SmartRecruiters**                 | ציבורי         | נתמך בקוד, אך נמצאו מעט מאוד חברות ישראליות פעילות.     |

---

## 5. סיכום — משתני הסביבה

```env
# ללא מפתח (פעיל)
TELEGRAM_CHANNELS=tech_jobs_il,find_hitech_jobs,ilhotjobs,hitechjobsdatascience
GREENHOUSE_COMPANIES=appsflyer|AppsFlyer,...
LEVER_COMPANIES=walkme|WalkMe
ASHBY_COMPANIES=unit|Unit,pinecone|Pinecone

# עם מפתח (נדלק אוטומטית כשממלאים)
JOOBLE_API_KEY=
RAPIDAPI_KEY=
CAREERJET_AFFID=
FINDWORK_API_KEY=
```

לאחר עדכון `.env`:

```powershell
pnpm --filter @ai-job-agent/api build
# הפעילו מחדש את שרת ה‑API, ואז הפעילו איסוף:
# POST /api/jobs/ingest  (הרשאת ADMIN)
```
