
import React, { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Award, BookOpen, CheckCircle2, ChevronRight, Clock3, FileText, Building2,
  LogIn, Shield, UserCircle2, Video, Users, BadgeCheck, Sparkles
} from "lucide-react";

const programs = [
  {
    id: "prog-1",
    title: "Бухгалтерський облік і фінансова звітність у державних установах",
    type: "Спеціально короткострокова програма",
    date: "07 Квітня 2026",
    rating: "4.9"
  },
  {
    id: "prog-2",
    title: "Українська мова в службовій практиці",
    type: "Загально короткострокова програма",
    date: "08 Квітня 2026",
    rating: "4.92"
  },
  {
    id: "prog-3",
    title: "Використання табличного процесора Microsoft Excel в роботі державних службовців",
    type: "Спеціально короткострокова програма",
    date: "08 Квітня 2026",
    rating: "4.8"
  },
  {
    id: "prog-4",
    title: "Стратегічне державне планування та розвиток середньострокового бюджетного планування",
    type: "Загально короткострокова програма",
    date: "20 Квітня 2026",
    rating: "5"
  },
  {
    id: "prog-5",
    title: "Українська мова у професійному спілкуванні",
    type: "Загально професійна (сертифікатна) програма",
    date: "27 Квітня 2026",
    rating: "4.85"
  },
  {
    id: "prog-6",
    title: "Актуальні питання європейської інтеграції України",
    type: "Загально короткострокова програма",
    date: "27 Квітня 2026",
    rating: "4.88"
  },
  {
    id: "prog-7",
    title: "Ключові аспекти проведення внутрішнього аудиту",
    type: "Спеціально короткострокова програма",
    date: "30 Квітня 2026",
    rating: "4.92"
  },
  {
    id: "prog-8",
    title: "Запобігання корупції",
    type: "Загально короткострокова програма",
    date: "30 Квітня 2026",
    rating: "4.9"
  }
];

function makeQuiz(moduleTitle, programTitle) {
  return [
    {
      question: `Яка основна мета модуля "${moduleTitle}" програми "${programTitle}"?`,
      options: [
        "Опанування теми та перевірка знань",
        "Лише реєстрація на курс",
        "Тільки завантаження файлів",
        "Видалення облікового запису"
      ],
      answer: 0
    },
    {
      question: "Що потрібно зробити перед переходом до наступного модуля?",
      options: [
        "Успішно пройти тест поточного модуля",
        "Лише відкрити відео",
        "Змінити пароль",
        "Оновити сторінку"
      ],
      answer: 0
    },
    {
      question: "Хто відкриває доступ до програми після подання заявки?",
      options: [
        "Адміністратор",
        "Будь-який слухач",
        "Система без погодження",
        "Ніхто"
      ],
      answer: 0
    }
  ];
}

function generateModules(program) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `${program.id}-mod-${i + 1}`,
    code: `${Math.floor(i / 5) + 1}.${(i % 5) + 1}`,
    title: `${program.title} — модуль ${i + 1}`,
    description: `Навчальний модуль ${i + 1} програми "${program.title}". Після перегляду відео потрібно пройти окремий тест.`,
    videoUrl: "",
    quiz: makeQuiz(`Модуль ${i + 1}`, program.title)
  }));
}

const initialCourseMap = Object.fromEntries(programs.map((p) => [p.id, generateModules(p)]));

const STORAGE_KEYS = {
  users: "ipkpo_users_v4",
  session: "ipkpo_session_v4",
  courses: "ipkpo_courses_v4"
};

const defaultUsers = [
  {
    id: "admin-1",
    role: "admin",
    fullName: "Адміністратор платформи",
    surname: "Адміністратор",
    regNumber: "000000",
    email: "admin@ipkpo.edu.ua",
    password: "admin123",
    applications: [],
    progressByProgram: {}
  },
  {
    id: "user-1",
    role: "student",
    fullName: "Іваненко Іван",
    surname: "Іваненко",
    regNumber: "123456",
    email: "student@ipkpo.edu.ua",
    password: "student123",
    applications: [],
    progressByProgram: {}
  }
];

function readLS(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getYouTubeId(url = "") {
  const cleaned = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?&/]+)/,
    /(?:youtube\.com\/embed\/)([^?&/]+)/
  ];
  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m) return m[1];
  }
  return "";
}

function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    if (!document.getElementById("yt-api")) {
      const s = document.createElement("script");
      s.id = "yt-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve(window.YT);
    };
  });
}

function Button({ children, onClick, className = "", type = "button", disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-[28px] border border-slate-200 bg-white shadow-lg shadow-slate-200/50 ${className}`}>{children}</div>;
}

function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function ProgressBar({ value }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-gradient-to-r from-sky-600 to-blue-800" style={{ width: `${value}%` }} />
    </div>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-sky-950 via-blue-900 to-sky-700 p-8 text-white">
      <div className="relative grid gap-8 lg:grid-cols-[1.4fr,0.9fr] lg:items-center">
        <div>
          <Badge className="mb-4 bg-white/15 text-white">Освітній портал</Badge>
          <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">
            Інститут підвищення кваліфікації та післядипломної освіти
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-100 md:text-base">
            Система реєстрації на програми, погодження адміністратором, модульного навчання,
            тестування та формування сертифікатів.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge className="bg-white/15 text-white">8 програм</Badge>
            <Badge className="bg-white/15 text-white">по 10 модулів кожна</Badge>
            <Badge className="bg-white/15 text-white">окремі тести</Badge>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-white/10 p-5 text-white shadow-none border-white/10">
            <p className="text-lg font-bold">Погодження заявок</p>
            <p className="mt-2 text-sm text-sky-100">Слухач подає заявку, адміністратор відкриває доступ.</p>
          </Card>
          <Card className="bg-white/10 p-5 text-white shadow-none border-white/10">
            <p className="text-lg font-bold">10 модулів на програму</p>
            <p className="mt-2 text-sm text-sky-100">Кожен модуль має окремий тест і прогрес.</p>
          </Card>
          <Card className="bg-white/10 p-5 text-white shadow-none border-white/10 sm:col-span-2">
            <p className="text-lg font-bold">Важливо</p>
            <p className="mt-2 text-sm text-sky-100">
              Поки адміністратор не погодив програму, слухач бачить повідомлення “Чекайте погодження адміном”.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProgramsGrid({ currentUser, onApply }) {
  return (
    <Card className="p-6 lg:p-8">
      <p className="mb-6 text-2xl font-black text-slate-900">Освітні програми провайдера</p>
      <div className="grid gap-6 md:grid-cols-2">
        {programs.map((item) => {
          const app = currentUser?.applications?.find((a) => a.programId === item.id);
          const status = app?.status || null;
          return (
            <div key={item.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
                <div>
                  <h3 className="text-xl font-bold leading-7 text-slate-800">{item.title}</h3>
                  <p className="mt-1 text-sm italic text-slate-500">{item.type}</p>
                </div>
                <div className="rounded-lg bg-emerald-500 px-4 py-2 text-lg font-black text-white">{item.rating}</div>
              </div>
              <div className="p-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500 text-white">найближчий набір - {item.date}</Badge>
                  {status === "pending" && <Badge className="bg-amber-100 text-amber-800">Очікує погодження</Badge>}
                  {status === "approved" && <Badge className="bg-emerald-100 text-emerald-800">Погоджено</Badge>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">10 модулів · окремі тести</div>
                  {currentUser?.role === "student" && !status && (
                    <Button className="bg-blue-500 text-white hover:bg-blue-600" onClick={() => onApply(item.id)}>
                      Подати заявку
                    </Button>
                  )}
                  {currentUser?.role === "student" && status === "pending" && (
                    <Button className="bg-slate-300 text-slate-700" disabled>
                      Чекайте погодження
                    </Button>
                  )}
                  {currentUser?.role === "student" && status === "approved" && (
                    <Button className="bg-emerald-500 text-white" disabled>
                      Доступ відкрито
                    </Button>
                  )}
                  {!currentUser && <Button className="bg-blue-500 text-white hover:bg-blue-600" disabled>Увійдіть для заявки</Button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AuthForm({ onLogin, onRegister }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ fullName: "", surname: "", regNumber: "", email: "", password: "" });

  const submit = (e) => {
    e.preventDefault();
    if (isRegister) onRegister(form);
    else onLogin(form.email, form.password);
  };

  return (
    <Card className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Вхід до кабінету</h2>
          <p className="mt-1 text-sm text-slate-500">Авторизація слухачів та адміністратора платформи</p>
        </div>
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-700"><Shield className="h-6 w-6" /></div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button onClick={() => setIsRegister(false)} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${!isRegister ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>Вхід</button>
        <button onClick={() => setIsRegister(true)} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${isRegister ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>Реєстрація</button>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        {isRegister && (
          <>
            <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-600" placeholder="ПІБ" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-600" placeholder="Прізвище для сертифіката" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-600" placeholder="Реєстраційний номер" value={form.regNumber} onChange={(e) => setForm({ ...form, regNumber: e.target.value })} />
            </div>
          </>
        )}
        <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-600" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-600" placeholder="Пароль" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800"><LogIn className="h-4 w-4" />{isRegister ? "Створити обліковий запис" : "Увійти"}</Button>
      </form>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Тестовий доступ:</p>
        <p>Адміністратор: admin@ipkpo.edu.ua / admin123</p>
        <p>Слухач: student@ipkpo.edu.ua / student123</p>
      </div>
    </Card>
  );
}

function ProgramSelector({ currentUser, selectedProgramId, setSelectedProgramId }) {
  const approvedPrograms = (currentUser?.applications || []).filter((a) => a.status === "approved");
  const pendingPrograms = (currentUser?.applications || []).filter((a) => a.status === "pending");

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Мої програми</h2>
          <p className="mt-1 text-sm text-slate-500">Оберіть погоджену програму для проходження</p>
        </div>
        <Badge className="bg-sky-100 text-sky-800"><Users className="mr-2 h-4 w-4" />{currentUser.fullName}</Badge>
      </div>

      {approvedPrograms.length === 0 && pendingPrograms.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4" />Чекайте погодження адміном</div>
          <p className="mt-1 text-sm">Ваші заявки ще не погоджені. Після погодження програма стане доступною.</p>
        </div>
      )}

      {approvedPrograms.length === 0 && pendingPrograms.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          Спочатку подайте заявку на програму в переліку програм вище.
        </div>
      )}

      {approvedPrograms.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {approvedPrograms.map((app) => {
            const p = programs.find((x) => x.id === app.programId);
            return (
              <button
                key={app.programId}
                onClick={() => setSelectedProgramId(app.programId)}
                className={`rounded-2xl border p-4 text-left ${selectedProgramId === app.programId ? "border-sky-700 bg-sky-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">{p?.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{p?.type}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800"><BadgeCheck className="mr-1 h-3.5 w-3.5" />Погоджено</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TopicCard({ topic, progress, unlocked, active, onOpen }) {
  return (
    <button
      onClick={onOpen}
      disabled={!unlocked}
      className={`w-full rounded-[24px] border p-5 text-left transition ${active ? "border-sky-700 bg-sky-50" : "border-slate-200 bg-white"} ${!unlocked ? "cursor-not-allowed opacity-60" : "hover:border-sky-300 hover:shadow-md"}`}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <Badge className="bg-slate-100 text-slate-700">{topic.code}</Badge>
          <h3 className="mt-3 text-base font-bold leading-6 text-slate-900">{topic.title}</h3>
        </div>
        {!unlocked ? <ChevronRight className="h-5 w-5 text-slate-300" /> : progress?.passed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge className={progress?.watched ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>{progress?.watched ? "Відео завершено" : "Очікує перегляду"}</Badge>
        <Badge className={progress?.passed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>{progress?.passed ? "Тест складено" : "Тест не складено"}</Badge>
      </div>
    </button>
  );
}

function VideoLesson({ topic, progress, onComplete }) {
  const wrapRef = useRef(null);
  const playerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const youtubeId = getYouTubeId(topic?.videoUrl || "");
  const isYoutube = !!youtubeId;
  const watchedOnce = !!progress?.watchedOnce;

  useEffect(() => {
    setLoading(false);
    setStarted(false);
    if (playerRef.current && playerRef.current.destroy) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    if (wrapRef.current) wrapRef.current.innerHTML = "";
  }, [topic?.id]);

  const startYoutube = async () => {
    if (!youtubeId || watchedOnce) return;
    setLoading(true);
    const YT = await loadYouTubeApi();
    if (!wrapRef.current) return;
    wrapRef.current.innerHTML = "";
    const div = document.createElement("div");
    div.id = `yt-player-${topic.id}`;
    wrapRef.current.appendChild(div);
    playerRef.current = new YT.Player(div.id, {
      width: "100%",
      height: "100%",
      videoId: youtubeId,
      playerVars: { rel: 0, modestbranding: 1, fs: 0, playsinline: 1 },
      events: {
        onReady: (event) => {
          setLoading(false);
          setStarted(true);
          event.target.playVideo();
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.ENDED) onComplete();
        }
      }
    });
  };

  if (!topic) return null;

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Відеолекція</h3>
          <p className="mt-1 text-sm text-slate-500">Тест відкриється лише після повного перегляду відео</p>
        </div>
        <Badge className={progress?.watched ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>{progress?.watched ? "Можна проходити тест" : "Очікує перегляду"}</Badge>
      </div>

      {!topic.videoUrl ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
          Для цього модуля ще не додано відео.
        </div>
      ) : watchedOnce ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-10 text-center text-emerald-800">
          Відео вже було переглянуте один раз. Повторний перегляд для учасника заблокований.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[28px] bg-black">
            {isYoutube ? (
              <div ref={wrapRef} className="aspect-video w-full bg-black" />
            ) : (
              <video className="aspect-video w-full bg-black" controls controlsList="nodownload noplaybackrate" onEnded={onComplete}>
                <source src={topic.videoUrl} />
              </video>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {isYoutube && (
              <Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={startYoutube} disabled={loading || started}>
                <Video className="h-4 w-4" />
                {loading ? "Завантаження..." : started ? "Відтворення триває" : "Почати перегляд"}
              </Button>
            )}
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              Адміністратор задає посилання на відео, а учасник бачить його лише у вбудованому плеєрі.
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function Quiz({ topic, progress, enabled, onPass }) {
  const [selected, setSelected] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    setSelected({});
    setResult(null);
  }, [topic?.id]);

  if (!topic) return null;

  const submitQuiz = () => {
    let correct = 0;
    topic.quiz.forEach((q, i) => {
      if (selected[i] === q.answer) correct += 1;
    });
    const percent = Math.round((correct / topic.quiz.length) * 100);
    const passed = percent >= 70;
    setResult({ percent, passed, correct });
    if (passed) onPass(percent);
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Тест до модуля</h3>
          <p className="mt-1 text-sm text-slate-500">Для зарахування потрібно не менше 70%</p>
        </div>
        <Badge className={progress?.passed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>{progress?.passed ? `Складено: ${progress.score}%` : "Очікує проходження"}</Badge>
      </div>

      {!enabled ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          Спочатку завершіть перегляд відео.
        </div>
      ) : (
        <div className="grid gap-5">
          {topic.quiz.map((q, index) => (
            <div key={index} className="rounded-[24px] border border-slate-200 p-5">
              <p className="text-base font-bold text-slate-900">{index + 1}. {q.question}</p>
              <div className="mt-4 grid gap-3">
                {q.options.map((option, optionIndex) => (
                  <button
                    key={option}
                    onClick={() => setSelected({ ...selected, [index]: optionIndex })}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm ${selected[index] === optionIndex ? "border-sky-700 bg-sky-50 text-sky-900" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={submitQuiz}><FileText className="h-4 w-4" />Завершити тестування</Button>
          {result && (
            <div className={`rounded-[24px] p-5 ${result.passed ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
              <p className="text-lg font-bold">Результат: {result.percent}%</p>
              <p className="mt-1 text-sm">Правильних відповідей: {result.correct} з {topic.quiz.length}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function AdminPanel({ topicsByProgram, setTopicsByProgram, users, setUsers }) {
  const [selectedProgramId, setSelectedProgramId] = useState(programs[0].id);
  const [activeModuleId, setActiveModuleId] = useState(topicsByProgram[selectedProgramId][0].id);
  const modules = topicsByProgram[selectedProgramId];
  const currentModule = modules.find((m) => m.id === activeModuleId) || modules[0];
  const [form, setForm] = useState(currentModule);

  useEffect(() => {
    setActiveModuleId(topicsByProgram[selectedProgramId][0].id);
  }, [selectedProgramId, topicsByProgram]);

  useEffect(() => {
    const mods = topicsByProgram[selectedProgramId];
    const found = mods.find((m) => m.id === activeModuleId) || mods[0];
    setForm(found);
  }, [activeModuleId, selectedProgramId, topicsByProgram]);

  const updateModule = () => {
    setTopicsByProgram({
      ...topicsByProgram,
      [selectedProgramId]: topicsByProgram[selectedProgramId].map((m) => (m.id === form.id ? form : m))
    });
  };

  const approveApplication = (userId, programId) => {
    setUsers(users.map((u) => {
      if (u.id !== userId) return u;
      return {
        ...u,
        applications: (u.applications || []).map((a) => a.programId === programId ? { ...a, status: "approved" } : a)
      };
    }));
  };

  const pendingApps = users
    .filter((u) => u.role === "student")
    .flatMap((u) => (u.applications || []).filter((a) => a.status === "pending").map((a) => ({
      userId: u.id,
      userName: u.fullName,
      regNumber: u.regNumber,
      programId: a.programId,
      programTitle: programs.find((p) => p.id === a.programId)?.title || a.programId
    })));

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <h3 className="mb-5 text-xl font-black text-slate-900">Заявки на погодження</h3>
        {pendingApps.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-slate-600">Немає заявок, що очікують погодження.</div>
        ) : (
          <div className="grid gap-3">
            {pendingApps.map((app, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-bold text-slate-900">{app.userName}</p>
                  <p className="text-sm text-slate-500">Реєстраційний номер: {app.regNumber}</p>
                  <p className="mt-1 text-sm text-slate-700">{app.programTitle}</p>
                </div>
                <Button className="bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => approveApplication(app.userId, app.programId)}>
                  Погодити
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.4fr]">
        <Card className="p-6">
          <h3 className="mb-4 text-xl font-black text-slate-900">Програми та модулі</h3>
          <select
            className="mb-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
          >
            {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <div className="grid gap-3">
            {topicsByProgram[selectedProgramId].map((topic) => (
              <button
                key={topic.id}
                onClick={() => setActiveModuleId(topic.id)}
                className={`rounded-2xl border px-4 py-3 text-left ${activeModuleId === topic.id ? "border-sky-700 bg-sky-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <p className="text-sm font-semibold text-slate-500">{topic.code}</p>
                <p className="font-bold text-slate-900">{topic.title}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-5 text-xl font-black text-slate-900">Редагування модуля</h3>
          <div className="grid gap-4">
            <input className="rounded-2xl border border-slate-200 px-4 py-3" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Код модуля" />
            <input className="rounded-2xl border border-slate-200 px-4 py-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Назва модуля" />
            <textarea className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Опис модуля" />
            <input className="rounded-2xl border border-slate-200 px-4 py-3" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="YouTube або пряме посилання на відео" />
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Для кожного модуля можна задати своє посилання на відео. Тести вже створені окремо для кожного модуля.
            </div>
            <Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={updateModule}>Зберегти модуль</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StudentDashboard({ user, topicsByProgram, updateUser }) {
  const approvedPrograms = (user.applications || []).filter((a) => a.status === "approved").map((a) => a.programId);
  const [selectedProgramId, setSelectedProgramId] = useState(approvedPrograms[0] || null);
  const topics = selectedProgramId ? topicsByProgram[selectedProgramId] : [];
  const [activeModuleId, setActiveModuleId] = useState(topics[0]?.id || null);

  useEffect(() => {
    if (approvedPrograms.length > 0 && (!selectedProgramId || !approvedPrograms.includes(selectedProgramId))) {
      setSelectedProgramId(approvedPrograms[0]);
    }
    if (approvedPrograms.length === 0) {
      setSelectedProgramId(null);
      setActiveModuleId(null);
    }
  }, [approvedPrograms.join("|")]);

  useEffect(() => {
    const mods = selectedProgramId ? topicsByProgram[selectedProgramId] : [];
    setActiveModuleId(mods[0]?.id || null);
  }, [selectedProgramId, topicsByProgram]);

  const progressByProgram = user.progressByProgram || {};
  const programProgress = selectedProgramId ? (progressByProgram[selectedProgramId] || {}) : {};
  const activeTopic = topics.find((t) => t.id === activeModuleId);

  const overallPercent = selectedProgramId && topics.length > 0
    ? Math.round((topics.filter((t) => programProgress[t.id]?.passed).length / topics.length) * 100)
    : 0;

  const allPassed = selectedProgramId && topics.length > 0
    ? topics.every((t) => programProgress[t.id]?.passed)
    : false;

  const unlockedTopicIds = useMemo(() => {
    if (!selectedProgramId) return [];
    const ids = topics[0] ? [topics[0].id] : [];
    for (let i = 1; i < topics.length; i++) {
      if (programProgress[topics[i - 1].id]?.passed) ids.push(topics[i].id);
    }
    return ids;
  }, [selectedProgramId, JSON.stringify(programProgress), topics.map((t) => t.id).join("|")]);

  const markCompletedVideo = () => {
    if (!selectedProgramId || !activeModuleId) return;
    updateUser({
      ...user,
      progressByProgram: {
        ...progressByProgram,
        [selectedProgramId]: {
          ...programProgress,
          [activeModuleId]: {
            ...(programProgress[activeModuleId] || {}),
            watched: true,
            watchedOnce: true
          }
        }
      }
    });
  };

  const passQuiz = (score) => {
    if (!selectedProgramId || !activeModuleId) return;
    updateUser({
      ...user,
      progressByProgram: {
        ...progressByProgram,
        [selectedProgramId]: {
          ...programProgress,
          [activeModuleId]: {
            ...(programProgress[activeModuleId] || {}),
            watched: true,
            watchedOnce: true,
            passed: true,
            score
          }
        }
      }
    });
  };

  const downloadCertificate = () => {
    const p = programs.find((x) => x.id === selectedProgramId);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFillColor(245, 248, 255);
    doc.rect(0, 0, 297, 210, "F");
    doc.setDrawColor(14, 116, 144);
    doc.setLineWidth(2);
    doc.rect(8, 8, 281, 194);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("СЕРТИФІКАТ", 148.5, 35, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("про успішне проходження підвищення кваліфікації", 148.5, 50, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(user.surname || user.fullName, 148.5, 82, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(`Реєстраційний номер: ${user.regNumber || "не вказано"}`, 148.5, 95, { align: "center" });
    doc.text(`успішно завершив(ла) програму: ${p?.title || ""}`, 148.5, 114, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Інститут підвищення кваліфікації та післядипломної освіти", 148.5, 132, { align: "center" });
    doc.save(`certificate_${(user.surname || "user").replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="grid gap-6">
      <ProgramSelector currentUser={user} selectedProgramId={selectedProgramId} setSelectedProgramId={setSelectedProgramId} />

      {selectedProgramId && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5"><p className="text-sm text-slate-500">Завершено модулів</p><p className="text-2xl font-black text-slate-900">{topics.filter((t) => programProgress[t.id]?.passed).length}/{topics.length}</p></Card>
            <Card className="p-5"><p className="text-sm text-slate-500">Прогрес програми</p><p className="text-2xl font-black text-slate-900">{overallPercent}%</p></Card>
            <Card className="p-5"><p className="text-sm text-slate-500">Сертифікат</p><p className="text-2xl font-black text-slate-900">{allPassed ? "Доступний" : "Очікує"}</p></Card>
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Особистий кабінет слухача</h2>
                <p className="mt-1 text-sm text-slate-500">Навчання відбувається послідовно: відео → тест → наступний модуль</p>
              </div>
              <Badge className="bg-sky-100 text-sky-800"><UserCircle2 className="mr-2 h-4 w-4" />{user.fullName}</Badge>
            </div>
            <ProgressBar value={overallPercent} />
          </Card>

          <div className="grid gap-6 xl:grid-cols-[0.95fr,1.5fr]">
            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-xl font-black text-slate-900">Модулі програми</h3>
                <Badge className="bg-slate-100 text-slate-700">10 модулів</Badge>
              </div>
              <div className="grid gap-4">
                {topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    progress={programProgress[topic.id]}
                    unlocked={unlockedTopicIds.includes(topic.id)}
                    active={activeModuleId === topic.id}
                    onOpen={() => setActiveModuleId(topic.id)}
                  />
                ))}
              </div>
            </Card>

            <div className="grid gap-6">
              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge className="bg-sky-100 text-sky-800">{activeTopic?.code}</Badge>
                    <h2 className="mt-3 text-2xl font-black text-slate-900">{activeTopic?.title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{activeTopic?.description}</p>
                  </div>
                  <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-blue-50 p-4 text-sky-800"><Sparkles className="h-10 w-10" /></div>
                </div>
              </Card>

              <VideoLesson topic={activeTopic} progress={programProgress[activeModuleId]} onComplete={markCompletedVideo} />
              <Quiz topic={activeTopic} progress={programProgress[activeModuleId]} enabled={programProgress[activeModuleId]?.watched} onPass={passQuiz} />

              {allPassed && (
                <Card className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">Сертифікат готовий</h3>
                      <p className="mt-1 text-sm text-slate-600">Після завершення всіх 10 модулів сформуйте документ.</p>
                    </div>
                    <Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={downloadCertificate}>
                      <Award className="h-4 w-4" />
                      Завантажити сертифікат PDF
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState(() => readLS(STORAGE_KEYS.users, defaultUsers));
  const [sessionId, setSessionId] = useState(() => readLS(STORAGE_KEYS.session, null));
  const [topicsByProgram, setTopicsByProgram] = useState(() => readLS(STORAGE_KEYS.courses, initialCourseMap));
  const [message, setMessage] = useState("");

  useEffect(() => writeLS(STORAGE_KEYS.users, users), [users]);
  useEffect(() => writeLS(STORAGE_KEYS.session, sessionId), [sessionId]);
  useEffect(() => writeLS(STORAGE_KEYS.courses, topicsByProgram), [topicsByProgram]);

  const currentUser = users.find((u) => u.id === sessionId) || null;

  const login = (email, password) => {
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) return setMessage("Невірний email або пароль.");
    setSessionId(found.id);
    setMessage("");
  };

  const register = (form) => {
    if (!form.fullName || !form.email || !form.password || !form.surname || !form.regNumber) {
      return setMessage("Заповніть усі поля реєстрації.");
    }
    if (users.some((u) => u.email === form.email)) {
      return setMessage("Користувач з таким email вже існує.");
    }
    const newUser = {
      id: `user-${Date.now()}`,
      role: "student",
      fullName: form.fullName,
      surname: form.surname,
      regNumber: form.regNumber,
      email: form.email,
      password: form.password,
      applications: [],
      progressByProgram: {}
    };
    setUsers([...users, newUser]);
    setSessionId(newUser.id);
    setMessage("");
  };

  const applyForProgram = (programId) => {
    if (!currentUser || currentUser.role !== "student") return;
    setUsers(users.map((u) => {
      if (u.id !== currentUser.id) return u;
      if ((u.applications || []).some((a) => a.programId === programId)) return u;
      return { ...u, applications: [...(u.applications || []), { programId, status: "pending" }] };
    }));
  };

  const updateUser = (updated) => {
    setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf5ff_0%,#f7fbff_40%,#ffffff_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/60 bg-white/80 px-6 py-4 shadow-lg backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-gradient-to-br from-sky-800 to-blue-950 p-3 text-white shadow-lg"><Building2 className="h-7 w-7" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">Освітній портал</p>
              <h1 className="text-lg font-black md:text-2xl">ІПКПО · Система навчання та сертифікації</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {currentUser ? (
              <>
                <Badge className="bg-slate-100 text-slate-800">{currentUser.role === "admin" ? "Адміністратор" : "Слухач"}</Badge>
                <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setSessionId(null)}>Вийти</Button>
              </>
            ) : (
              <Badge className="bg-sky-100 text-sky-800">Онлайн-платформа курсів</Badge>
            )}
          </div>
        </header>

        <div className="grid gap-6">
          <Hero />
          <ProgramsGrid currentUser={currentUser} onApply={applyForProgram} />

          {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</div>}

          {!currentUser ? (
            <div className="grid gap-6 lg:grid-cols-[1.15fr,0.9fr]">
              <Card className="p-6 lg:p-8">
                <h2 className="text-2xl font-black text-slate-900">Що входить у цей сайт</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Card className="p-5"><BookOpen className="mb-3 h-6 w-6 text-sky-700" /><p className="font-bold text-slate-900">Вибір програми</p><p className="mt-2 text-sm text-slate-600">Слухач спочатку подає заявку на конкретну програму.</p></Card>
                  <Card className="p-5"><Users className="mb-3 h-6 w-6 text-sky-700" /><p className="font-bold text-slate-900">Погодження адміністратором</p><p className="mt-2 text-sm text-slate-600">До моменту погодження доступ не відкривається.</p></Card>
                  <Card className="p-5"><Video className="mb-3 h-6 w-6 text-sky-700" /><p className="font-bold text-slate-900">10 модулів на програму</p><p className="mt-2 text-sm text-slate-600">Кожен модуль має відео та окремий тест.</p></Card>
                  <Card className="p-5"><Award className="mb-3 h-6 w-6 text-sky-700" /><p className="font-bold text-slate-900">Сертифікат</p><p className="mt-2 text-sm text-slate-600">Після завершення програми формується PDF.</p></Card>
                </div>
              </Card>
              <AuthForm onLogin={login} onRegister={register} />
            </div>
          ) : currentUser.role === "admin" ? (
            <AdminPanel topicsByProgram={topicsByProgram} setTopicsByProgram={setTopicsByProgram} users={users} setUsers={setUsers} />
          ) : (
            <StudentDashboard user={currentUser} topicsByProgram={topicsByProgram} updateUser={updateUser} />
          )}

          <footer className="rounded-[28px] bg-slate-950 px-6 py-8 text-slate-300">
            <div className="grid gap-4 md:grid-cols-3">
              <div><p className="text-lg font-bold text-white">ІПКПО</p><p className="mt-2 text-sm leading-6 text-slate-400">Демонстраційна LMS-платформа для навчальних програм.</p></div>
              <div><p className="font-semibold text-white">Функціональність</p><p className="mt-2 text-sm text-slate-400">Заявки · погодження · модулі · тести · сертифікати · адмін-панель</p></div>
              <div><p className="font-semibold text-white">Примітка</p><p className="mt-2 text-sm text-slate-400">Це демо-версія без серверної бази даних. Дані зберігаються в браузері.</p></div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
