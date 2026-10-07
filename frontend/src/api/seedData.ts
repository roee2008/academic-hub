import { Course, TimetableSlot, Assignment } from '../types';

export const SEED_COURSES: Course[] = [
  {
    "name": "מבני נתונים 2027  אורט כפר סבא ,אורט קרית ביאליק",
    "alternate_link": "https://classroom.google.com/c/ODc3MzEwNzQzMzA0",
    "is_hidden": false,
    "account_id": "acc_roee46559_gmail_com",
    "color_tag": "#6366F1",
    "id": "877310743304"
  },
  {
    "name": "שפת אסמבלי כפר סבא  2026/27",
    "alternate_link": "https://classroom.google.com/c/ODc2ODI2NzgxNjY2",
    "is_hidden": false,
    "account_id": "acc_roee46559_gmail_com",
    "color_tag": "#10B981",
    "id": "876826781666"
  },
  {
    "name": "פרוייקט גמר יג כפר סבא 2026/27",
    "alternate_link": "https://classroom.google.com/c/ODc2ODI3Nzc2Mzcy",
    "is_hidden": false,
    "account_id": "acc_roee46559_gmail_com",
    "color_tag": "#F59E0B",
    "id": "876827776372"
  },
  {
    "name": "‫יג פייתון תשפז - דני פרונט‬‎",
    "alternate_link": "https://classroom.google.com/c/MjUzMzI3MTQwMzZa",
    "is_hidden": false,
    "account_id": "acc_1000670292_taded_org_il",
    "section": "יג תוכנה אורט כפר סבא",
    "color_tag": "#6366F1",
    "id": "25332714036"
  },
  {
    "name": "לשון עברית יא10",
    "alternate_link": "https://classroom.google.com/c/NzE4OTIyOTg1OTA2",
    "is_hidden": true,
    "account_id": "acc_1000670292_taded_org_il",
    "section": "מקיף ע\"ש יגאל אלון 541045",
    "color_tag": "#10B981",
    "id": "718922985906"
  },
  {
    "name": "היסטוריה י8",
    "alternate_link": "https://classroom.google.com/c/NjE5Njg5OTYyMjY5",
    "is_hidden": true,
    "account_id": "acc_1000670292_taded_org_il",
    "section": "יהלום",
    "color_tag": "#F59E0B",
    "id": "619689962269"
  },
  {
    "name": "ז'1- חינוך גופני עם הרצל",
    "alternate_link": "https://classroom.google.com/c/MTY1MzIyNzkyNzQw",
    "is_hidden": true,
    "account_id": "acc_1000670292_taded_org_il",
    "color_tag": "#8B5CF6",
    "id": "165322792740"
  },
  {
    "name": "C",
    "alternate_link": "https://drive.google.com/drive/folders/1MWRd2lLWxugXsD96E2ZAY4ebWgZen2zI",
    "is_hidden": true,
    "account_id": "acc_roee46559_gmail_com",
    "color_tag": "#EC4899",
    "id": "course_7a22245d"
  },
  {
    "name": "Self-Directed Study",
    "is_hidden": true,
    "account_id": "acc_roee46559_gmail_com",
    "code": "SDS-101",
    "color_tag": "#10B981",
    "id": "course_f2508d64"
  },
  {
    "name": "ג'אווה אורט כפר סבא",
    "alternate_link": "https://classroom.google.com/c/ODg1MDg3MzE4NDMz",
    "is_hidden": false,
    "account_id": "acc_roee46559_gmail_com",
    "section": "תשפ\"ז",
    "color_tag": "#6366F1",
    "id": "885087318433"
  },
  {
    "name": "קורס מסדי נתונים",
    "alternate_link": "https://classroom.google.com/c/ODI2NTQ5NjI2MDc4",
    "is_hidden": false,
    "account_id": "acc_roee46559_gmail_com",
    "section": "קורס יג' ללימוד מסדי נתונים",
    "color_tag": "#6366F1",
    "id": "826549626078"
  },
  {
    "name": "English",
    "is_hidden": false,
    "account_id": "acc_roee46559_gmail_com",
    "color_tag": "#8B5CF6",
    "id": "course_8e25f80f"
  },
  {
    "name": "C",
    "is_hidden": false,
    "account_id": "acc_roee46559_gmail_com",
    "color_tag": "#EC4899",
    "id": "course_61685e0d"
  },
  {
    "name": "הסתברות וסטטיסטיקה",
    "is_hidden": false,
    "account_id": "acc_roee46559_gmail_com",
    "color_tag": "#EF4444",
    "id": "course_1896f599"
  }
];

export const SEED_TIMETABLE: TimetableSlot[] = [
  {
    "day_of_week": 3,
    "start_time": "08:30",
    "end_time": "12:30",
    "course_id": "826549626078",
    "id": "slot_09b45fa7"
  },
  {
    "day_of_week": 3,
    "start_time": "13:00",
    "end_time": "17:00",
    "course_id": "877310743304",
    "id": "slot_41903187"
  },
  {
    "day_of_week": 4,
    "start_time": "08:30",
    "end_time": "13:45",
    "course_id": "876826781666",
    "id": "slot_6eb8b35a"
  },
  {
    "day_of_week": 2,
    "start_time": "08:30",
    "end_time": "12:30",
    "course_id": "885087318433",
    "id": "slot_f8d1fd6d"
  },
  {
    "day_of_week": 2,
    "start_time": "13:00",
    "end_time": "17:00",
    "course_id": "course_61685e0d",
    "id": "slot_170aa244"
  },
  {
    "day_of_week": 4,
    "start_time": "13:45",
    "end_time": "16:15",
    "course_id": "course_8e25f80f",
    "id": "slot_349e0872"
  },
  {
    "day_of_week": 1,
    "start_time": "08:30",
    "end_time": "12:30",
    "course_id": "877310743304",
    "id": "slot_379a188a"
  },
  {
    "day_of_week": 1,
    "start_time": "13:00",
    "end_time": "17:00",
    "course_id": "course_1896f599",
    "id": "slot_0d96ae04"
  },
  {
    "day_of_week": 1,
    "start_time": "10:15",
    "end_time": "15:30",
    "course_id": "course_1896f599",
    "id": "slot_f50ca92c"
  },
  {
    "day_of_week": 0,
    "start_time": "10:15",
    "end_time": "15:30",
    "course_id": "25332714036",
    "id": "slot_70db7b45"
  }
];

export const SEED_TASKS: Assignment[] = [
  {
    "title": "הגשת הצעת פרוייקט  סופית",
    "description": "1. שם קובץ : שם משפחה שם פרטי ת.ז. בעברית בפורמט DOCX\n2.  עמוד ראשון מצורף",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/ODc2ODI3Nzc2Mzcy/a/ODc2ODI3Nzc2Mzky/details",
    "id": "876827776392",
    "account_id": "acc_roee46559_gmail_com",
    "due_datetime": "2026-12-01T21:59:00",
    "status": "TODO",
    "google_submission_state": "CREATED",
    "local_override": false,
    "course_id": "876827776372",
    "updated_at": "2026-09-07T08:09:30.108596",
    "files": []
  },
  {
    "title": "הגשת הצעת פרוייקט - שם קובץ : שם משפחה שם פרטי ת.ז. בעברית בפורמט DOCX",
    "description": "1. שם קובץ : שם משפחה שם פרטי ת.ז. בעברית בפורמט DOCX\n2.  עמוד ראשון מצורף",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/ODc2ODI3Nzc2Mzcy/a/ODc2ODI3Nzc2Mzkx/details",
    "id": "876827776391",
    "account_id": "acc_roee46559_gmail_com",
    "due_datetime": "2026-11-17T21:59:00",
    "status": "TODO",
    "google_submission_state": "CREATED",
    "local_override": false,
    "course_id": "876827776372",
    "updated_at": "2026-09-07T08:09:30.400584",
    "files": []
  },
  {
    "title": "שיעור 2 משימה להגשה",
    "description": "מצורפת העבודה\n1. online python function exam ( add picture of result)\n2. online python list exam. ( add picture of result)\n3. עבודה בפייתון שיעור 2",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/MjUzMzI3MTQwMzZa/a/MjUzMzI3MTQwOTNa/details",
    "id": "25332714093",
    "account_id": "acc_1000670292_taded_org_il",
    "due_datetime": "2026-09-30T21:59:00",
    "status": "TODO",
    "google_submission_state": "CREATED",
    "local_override": false,
    "course_id": "25332714036",
    "updated_at": "2026-09-07T11:10:43.702809",
    "files": []
  },
  {
    "title": "מבחן פתיחה ליודעי פייתון",
    "description": "יש לרשום את התשובות ב++NOTEPAD\nשאלות מעקב באקסל\n\nמותר בזמן המבחן להשתמש ב\nויקיספר פייתון מצורף קישור\nאסור להשתמש בכל אתר אחר או להיעזר בבינה מלאכותית \n\nיש לצרף קובץ בסיומת PY לכל שאלת קוד\nלשאלת מעקב ענו באקסל",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/MjUzMzI3MTQwMzZa/a/MjUzMzI3MTQwODha/details",
    "id": "25332714088",
    "account_id": "acc_1000670292_taded_org_il",
    "due_datetime": "2026-09-09T20:59:00",
    "status": "DONE",
    "google_submission_state": "TURNED_IN",
    "local_override": false,
    "course_id": "25332714036",
    "updated_at": "2026-09-07T11:10:44.651032",
    "files": []
  },
  {
    "title": "שיעור 1",
    "description": "צרפו צילומים מהמרשתת של סיום התשובות בעזרת כלי החיתוך \nSNPINIG",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/MjUzMzI3MTQwMzZa/a/MjUzMzI3MTQwODda/details",
    "id": "25332714087",
    "account_id": "acc_1000670292_taded_org_il",
    "status": "TODO",
    "google_submission_state": "NEW",
    "local_override": false,
    "course_id": "25332714036",
    "updated_at": "2026-09-07T11:10:45.014796",
    "files": []
  },
  {
    "title": "שאלון פתיחה",
    "description": "",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/MjUzMzI3MTQwMzZa/a/MjUzMzI3MTQwODZa/details",
    "id": "25332714086",
    "account_id": "acc_1000670292_taded_org_il",
    "due_datetime": "2026-09-06T20:59:00",
    "status": "DONE",
    "google_submission_state": "NEW",
    "local_override": true,
    "course_id": "25332714036",
    "updated_at": "2026-10-05T08:19:34.779823",
    "files": []
  },
  {
    "title": "עבודה להגשה דצמבר 2020",
    "description": "שלום לכל התלמידים\nאלו ההנחיות לעבודה.\nבהצלחה\nהרצל",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/MTY1MzIyNzkyNzQw/a/MTcyNjQzMTU1MTM3/details",
    "id": "172643155137",
    "account_id": "acc_1000670292_taded_org_il",
    "due_datetime": "2020-12-19T21:59:00",
    "status": "DONE",
    "google_submission_state": "RETURNED",
    "local_override": false,
    "course_id": "165322792740",
    "updated_at": "2026-09-07T11:10:52.448208",
    "files": []
  },
  {
    "title": "מטלה ראשונה - סיבוכיות זמן ריצה ",
    "description": "יש לענות על כל השאלות ",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/ODc3MzEwNzQzMzA0/a/ODg0NzUzNjUwMjEz/details",
    "id": "884753650213",
    "account_id": "acc_roee46559_gmail_com",
    "due_datetime": "2026-09-22T20:59:00",
    "status": "DONE",
    "google_submission_state": "RETURNED",
    "local_override": true,
    "course_id": "877310743304",
    "updated_at": "2026-10-05T08:19:40.566295",
    "files": []
  },
  {
    "title": "תרגיל כיתה - מחלקות",
    "description": "",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/ODg1MDg3MzE4NDMz/a/ODg1MDk4OTMyNzUx/details",
    "id": "885098932751",
    "account_id": "acc_roee46559_gmail_com",
    "status": "DONE",
    "google_submission_state": "TURNED_IN",
    "local_override": true,
    "course_id": "885087318433",
    "updated_at": "2026-09-15T07:20:21.765926",
    "files": []
  },
  {
    "title": "תרגיל כיתה בנושא הורשה",
    "description": "מערכת ניהול כלי רכב\nנתונה מערכת לניהול כלי רכב בחברת השכרה.\nיש ליצור את המחלקות:\n\nהמחלקה מייצגת כלי רכב כללי.\nתכונות:\nString model\nint year\nstatic int vehicleCount\nהבנאי של המחלקה יקבל דגם ושנה, ויעדכן את vehicleCount.\nיש לממש את הפעולות:\nvoid printDetails() – מדפיסה את פרטי כלי הרכב.\ndouble calculatePrice(int days) – מחזירה את מחיר ההשכרה עבור מספר ימים. מחיר הבסיס הוא 200 ₪ ליום.\ndouble calculatePrice(int days, double discount) – פעולה  שמחזירה את מחיר ההשכרה לאחר הנחה באחוזים.\nstatic int getVehicleCount() – מחזירה את מספר כלי הרכב שנוצרו.\nהמחלקה יורשת מ־Vehicle.\nתכונה נוספת:\nint doors\nיש ליצור בנאי מתאים.\nיש  את printDetails() כך שתודפס גם כמות הדלתות.\nיש  את calculatePrice(int days).\nמחיר השכרת רכב הוא 250 ₪ ליום.\n\nהמחלקה יורשת מ־Vehicle.\nתכונה נוספת:\nboolean hasBox\nיש ליצור בנאי מתאים.\nיש  את printDetails() כך שתודפס גם העובדה האם קיימת ארגזת אחסון.\nיש  את calculatePrice(int days).\nמחיר השכרת אופנוע הוא 150 ₪ ליום.\nאם לאופנוע יש ארגז אחסון, יש תוספת של 30 ₪ ליום.המחלקה הראשית\nיש ליצור במחלקה Main את כלי הרכב הבאים:\nרכב מדגם \"Toyota\" משנת 2022 עם 4 דלתות.\nרכב מדגם \"Mazda\" משנת 2024 עם 5 דלתות.\nאופנוע מדגם \"Honda\" משנת 2023 ללא ארגז.\nאופנוע מדגם \"Yamaha\" משנת 2025 עם ארגז.\nיש להכניס את כל כלי הרכב למערך מסוג:Vehicle[]\n\nלאחר מכן:\nלעבור על המערך ולהפעיל על כל כלי הרכב את printDetails().\nלעבור על המערך ולהדפיס את מחיר ההשכרה של כל כלי רכב עבור 3 ימים.\nלחשב ולהדפיס את המחיר של כל כלי הרכב עבור 5 ימים עם הנחה של 10%.\nלהדפיס כמה כלי רכב נוצרו באמצעות התכונה ה־static.\nליצור משתנה מסוג Vehicle שמצביע על אובייקט מסוג Car, ולהפעיל עליו:printDetails()\n\nולהסביר איזו פעולה מתבצעת בפועל.\nלהוסיף במחלקה Car פעולה מועמסת:calculatePrice(int days, boolean weekend)\n\nאם weekend הוא true, יש להוסיף 50 ₪ למחיר הכולל.\nלהפעיל פעולה זו על אחד מכלי הרכב.שאלות הבנה\nמדוע vehicleCount צריך להיות static?\nהאם לכל אובייקט מסוג Car יש עותק משלו של vehicleCount?\nכאשר המשתנה הוא:Vehicle v = new Car(...);\n\nאיזו גרסה של printDetails() תופעל? הסבר.\nמה ההבדל בין  של calculatePrice לבין  של calculatePrice?\nהאם ניתן לגשת ל־vehicleCount באמצעות אובייקט מסוים? האם זו הדרך המומלצת?\nמה יקרה אם ניצור 10 אובייקטים שונים של Car ו־Motorcycle? מה יהיה הערך של vehicleCount?דרישות\nאין להשתמש ב־ArrayList או באוספים אחרים.\nיש להשתמש במערך מסוג Vehicle[].\nיש להדגים בתוכנית את השימוש בהורשה, דריסה, העמסה ותכונה static.",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/ODg1MDg3MzE4NDMz/a/ODg5MzM1NjAzNTIw/details",
    "id": "889335603520",
    "account_id": "acc_roee46559_gmail_com",
    "status": "DONE",
    "google_submission_state": "TURNED_IN",
    "local_override": false,
    "course_id": "885087318433",
    "updated_at": "2026-10-07T07:17:18.012514",
    "files": []
  },
  {
    "title": "מטלה 1",
    "description": "",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/ODg1MDg3MzE4NDMz/a/ODg1MTAzNjM1NTQw/details",
    "id": "885103635540",
    "account_id": "acc_roee46559_gmail_com",
    "due_datetime": "2026-09-24T21:59:00",
    "status": "DONE",
    "google_submission_state": "TURNED_IN",
    "local_override": false,
    "course_id": "885087318433",
    "updated_at": "2026-10-07T07:17:18.791301",
    "files": []
  },
  {
    "title": "הגשת טופס הצעה לנושא פרויקט",
    "description": "",
    "source": "CLASSROOM",
    "priority": "MEDIUM",
    "web_link": "https://classroom.google.com/c/ODc2ODI3Nzc2Mzcy/a/ODg5MzUzODY5NTUw/details",
    "id": "889353869550",
    "account_id": "acc_roee46559_gmail_com",
    "due_datetime": "2026-10-31T21:59:00",
    "status": "TODO",
    "google_submission_state": "CREATED",
    "local_override": false,
    "course_id": "876827776372",
    "updated_at": "2026-10-07T07:17:37.198434",
    "files": []
  }
];
