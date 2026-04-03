import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { jsPDF } from "jspdf";
import { Award, CheckCircle2, Clock3, LogIn, Shield, UserCircle2, Users } from "lucide-react";

function Button({ children, className = "", ...props }) {
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${className}`}>{children}</button>;
}
function Card({ children, className = "" }) { return <div className={`rounded-[28px] border border-slate-200 bg-white shadow-lg shadow-slate-200/50 ${className}`}>{children}</div>; }
function Badge({ children, className = "" }) { return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>; }
function ProgressBar({ value }) { return <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-sky-600 to-blue-800" style={{ width: `${value}%` }} /></div>; }

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [modules, setModules] = useState([]);
  const [applications, setApplications] = useState([]);
  const [progress, setProgress] = useState([]);
  const [pendingApps, setPendingApps] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [authForm, setAuthForm] = useState({ email: "", password: "", fullName: "", surname: "", regNumber: "" });
  const [registerMode, setRegisterMode] = useState(false);

  async function bootstrap(userSession) {
    setLoading(true);
    try {
      const { data: progData, error: progErr } = await supabase.from("programs").select("*").order("id");
      if (progErr) throw progErr;
      setPrograms(progData || []);

      if (userSession?.user) {
        const { data: prof, error: profErr } = await supabase.from("profiles").select("*").eq("id", userSession.user.id).single();
        if (profErr) throw profErr;
        setProfile(prof);

        const { data: apps, error: appErr } = await supabase.from("applications").select("*").eq("user_id", userSession.user.id).order("created_at");
        if (appErr) throw appErr;
        setApplications(apps || []);

        if (prof.role === "admin") {
          const { data: pending, error: pendingErr } = await supabase
            .from("applications")
            .select("*, applicant:profiles!applications_user_id_fkey(id, full_name, reg_number), program:programs!applications_program_id_fkey(id, title)")
            .eq("status", "pending")
            .order("created_at");
          if (pendingErr) throw pendingErr;
          setPendingApps(pending || []);
        } else {
          setPendingApps([]);
        }
      } else {
        setProfile(null);
        setApplications([]);
        setModules([]);
        setProgress([]);
        setPendingApps([]);
      }
      setMessage("");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      bootstrap(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      bootstrap(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const approved = applications.filter((a) => a.status === "approved");
    if (approved.length > 0 && (!selectedProgramId || !approved.find((a) => a.program_id === selectedProgramId))) {
      setSelectedProgramId(approved[0].program_id);
    }
    if (approved.length === 0) {
      setSelectedProgramId(null);
      setActiveModuleId(null);
    }
  }, [JSON.stringify(applications)]);

  useEffect(() => {
    async function loadProgramData() {
      if (!selectedProgramId || !profile) return;
      try {
        const { data: mods, error: modErr } = await supabase.from("modules").select("*").eq("program_id", selectedProgramId).order("module_order");
        if (modErr) throw modErr;
        setModules(mods || []);
        setActiveModuleId((mods || [])[0]?.id || null);

        const { data: prog, error: progErr } = await supabase
          .from("module_progress")
          .select("*")
          .eq("user_id", profile.id)
          .eq("program_id", selectedProgramId);
        if (progErr) throw progErr;
        setProgress(prog || []);
      } catch (e) {
        setMessage(e.message);
      }
    }
    loadProgramData();
  }, [selectedProgramId, profile?.id]);

  const progressMap = useMemo(() => Object.fromEntries(progress.map((p) => [p.module_id, p])), [progress]);
  const unlockedIds = useMemo(() => {
    if (!modules.length) return [];
    const ids = [modules[0].id];
    for (let i = 1; i < modules.length; i++) if (progressMap[modules[i - 1].id]?.passed) ids.push(modules[i].id);
    return ids;
  }, [JSON.stringify(modules), JSON.stringify(progressMap)]);
  const overallPercent = modules.length ? Math.round((modules.filter((m) => progressMap[m.id]?.passed).length / modules.length) * 100) : 0;
  const allPassed = modules.length > 0 && modules.every((m) => progressMap[m.id]?.passed);
  const approvedPrograms = applications.filter((a) => a.status === "approved");

  async function register() {
    try {
      const { fullName, surname, regNumber, email, password } = authForm;
      if (!fullName || !surname || !regNumber || !email || !password) throw new Error("Заповніть усі поля.");
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, surname, reg_number: regNumber } }
      });
      if (error) throw error;
      setMessage("Реєстрація виконана. Якщо увімкнене підтвердження email — перевір пошту.");
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function login() {
    try {
      const { email, password } = authForm;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function applyForProgram(programId) {
    try {
      const { error } = await supabase.from("applications").insert({ user_id: profile.id, program_id: programId, status: "pending" });
      if (error) throw error;
      bootstrap(session);
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function approveApplication(id) {
    try {
      const { error } = await supabase.from("applications").update({ status: "approved", approved_by: profile.id, approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      bootstrap(session);
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function completeModule(moduleId) {
    try {
      const { error } = await supabase.from("module_progress").upsert({
        user_id: profile.id,
        program_id: selectedProgramId,
        module_id: moduleId,
        watched: true,
        watched_once: true,
        passed: true,
        score: 100
      }, { onConflict: "user_id,program_id,module_id" });
      if (error) throw error;
      const { data } = await supabase.from("module_progress").select("*").eq("user_id", profile.id).eq("program_id", selectedProgramId);
      setProgress(data || []);
    } catch (e) {
      setMessage(e.message);
    }
  }

  function downloadCertificate() {
    const program = programs.find((p) => p.id === selectedProgramId);
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
    doc.text(profile?.surname || profile?.full_name || "", 148.5, 82, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(`Реєстраційний номер: ${profile?.reg_number || "не вказано"}`, 148.5, 95, { align: "center" });
    doc.text(`успішно завершив(ла) програму: ${program?.title || ""}`, 148.5, 114, { align: "center" });
    doc.save(`certificate_${(profile?.surname || "user").replace(/\s+/g, "_")}.pdf`);
  }

  if (loading) return <div className="min-h-screen grid place-items-center bg-[linear-gradient(180deg,#edf5ff_0%,#f7fbff_40%,#ffffff_100%)]"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow"><RefreshIcon /><span className="font-semibold text-slate-700">Завантаження...</span></div></div>;

  return <div className="min-h-screen bg-[linear-gradient(180deg,#edf5ff_0%,#f7fbff_40%,#ffffff_100%)] text-slate-900">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/60 bg-white/80 px-6 py-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="rounded-3xl bg-gradient-to-br from-sky-800 to-blue-950 p-3 text-white shadow-lg"><Building2 className="h-7 w-7" /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">Освітній портал</p><h1 className="text-lg font-black md:text-2xl">ІПКПО · Supabase версія</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {profile ? <><Badge className="bg-slate-100 text-slate-800">{profile.role === "admin" ? "Адміністратор" : "Слухач"}</Badge><Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={logout}>Вийти</Button></> : <Badge className="bg-sky-100 text-sky-800">Онлайн-платформа курсів</Badge>}
        </div>
      </header>

      <div className="grid gap-6">
        <Hero />
        <ProgramsGrid currentUser={profile} programs={programs} applications={applications} onApply={applyForProgram} />

        {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</div>}

        {!profile ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr,0.9fr]">
            <Card className="p-6 lg:p-8">
              <h2 className="text-2xl font-black text-slate-900">Що є в цій версії</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card className="p-5"><Users className="mb-3 h-6 w-6 text-sky-700" /><p className="font-bold text-slate-900">Онлайн авторизація</p><p className="mt-2 text-sm text-slate-600">Реєстрація та вхід через Supabase Auth.</p></Card>
                <Card className="p-5"><CheckCircle2 className="mb-3 h-6 w-6 text-sky-700" /><p className="font-bold text-slate-900">Заявки й погодження</p><p className="mt-2 text-sm text-slate-600">Заявки зберігаються в онлайн-базі.</p></Card>
                <Card className="p-5"><Clock3 className="mb-3 h-6 w-6 text-sky-700" /><p className="font-bold text-slate-900">Прогрес модулів</p><p className="mt-2 text-sm text-slate-600">Прогрес не зникає після закриття браузера.</p></Card>
                <Card className="p-5"><Award className="mb-3 h-6 w-6 text-sky-700" /><p className="font-bold text-slate-900">Сертифікат</p><p className="mt-2 text-sm text-slate-600">PDF після завершення всіх модулів.</p></Card>
              </div>
            </Card>
            <Card className="p-6 lg:p-8">
              <div className="mb-6 flex items-center justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900">Вхід до кабінету</h2><p className="mt-1 text-sm text-slate-500">Авторизація слухачів та адміністратора платформи</p></div><div className="rounded-2xl bg-sky-50 p-3 text-sky-700"><Shield className="h-6 w-6" /></div></div>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <button onClick={() => setRegisterMode(false)} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${!registerMode ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>Вхід</button>
                <button onClick={() => setRegisterMode(true)} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${registerMode ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>Реєстрація</button>
              </div>
              <div className="grid gap-4">
                {registerMode && <>
                  <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="ПІБ" value={authForm.fullName} onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Прізвище для сертифіката" value={authForm.surname} onChange={(e) => setAuthForm({ ...authForm, surname: e.target.value })} />
                    <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Реєстраційний номер" value={authForm.regNumber} onChange={(e) => setAuthForm({ ...authForm, regNumber: e.target.value })} />
                  </div>
                </>}
                <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
                <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Пароль" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
                {registerMode
                  ? <Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={register}><LogIn className="h-4 w-4" />Створити обліковий запис</Button>
                  : <Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={login}><LogIn className="h-4 w-4" />Увійти</Button>}
              </div>
            </Card>
          </div>
        ) : profile.role === "admin" ? (
          <div className="grid gap-6">
            <Card className="p-6">
              <h3 className="mb-5 text-xl font-black text-slate-900">Заявки на погодження</h3>
              {pendingApps.length === 0 ? <div className="rounded-2xl bg-slate-50 p-4 text-slate-600">Немає заявок, що очікують погодження.</div> : <div className="grid gap-3">{pendingApps.map((app) => <div key={app.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"><div><p className="font-bold text-slate-900">{app.applicant?.full_name}</p><p className="text-sm text-slate-500">Реєстраційний номер: {app.applicant?.reg_number}</p><p className="mt-1 text-sm text-slate-700">{app.program?.title}</p></div><Button className="bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => approveApplication(app.id)}>Погодити</Button></div>)}</div>}
            </Card>
          </div>
        ) : (
          <div className="grid gap-6">
            <ProgramSelector currentUser={profile} selectedProgramId={selectedProgramId} setSelectedProgramId={setSelectedProgramId} applications={applications} programs={programs} />
            {selectedProgramId && <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-5"><p className="text-sm text-slate-500">Завершено модулів</p><p className="text-2xl font-black text-slate-900">{modules.filter((m) => progressMap[m.id]?.passed).length}/{modules.length}</p></Card>
                <Card className="p-5"><p className="text-sm text-slate-500">Прогрес програми</p><p className="text-2xl font-black text-slate-900">{overallPercent}%</p></Card>
                <Card className="p-5"><p className="text-sm text-slate-500">Сертифікат</p><p className="text-2xl font-black text-slate-900">{allPassed ? "Доступний" : "Очікує"}</p></Card>
              </div>
              <Card className="p-6"><div className="mb-4 flex items-center justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900">Особистий кабінет слухача</h2><p className="mt-1 text-sm text-slate-500">Натисни модуль і відміть завершення.</p></div><Badge className="bg-sky-100 text-sky-800"><UserCircle2 className="mr-2 h-4 w-4" />{profile.full_name}</Badge></div><ProgressBar value={overallPercent} /></Card>
              <div className="grid gap-6 xl:grid-cols-[0.95fr,1.5fr]">
                <Card className="p-6"><div className="mb-5 flex items-center justify-between gap-3"><h3 className="text-xl font-black text-slate-900">Модулі програми</h3><Badge className="bg-slate-100 text-slate-700">10 модулів</Badge></div><div className="grid gap-4">{modules.map((topic) => <TopicCard key={topic.id} topic={topic} progress={progressMap[topic.id]} unlocked={unlockedIds.includes(topic.id)} active={activeModuleId === topic.id} onOpen={() => setActiveModuleId(topic.id)} />)}</div></Card>
                <div className="grid gap-6">
                  <Card className="p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><Badge className="bg-sky-100 text-sky-800">{modules.find((m) => m.id === activeModuleId)?.code}</Badge><h2 className="mt-3 text-2xl font-black text-slate-900">{modules.find((m) => m.id === activeModuleId)?.title}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{modules.find((m) => m.id === activeModuleId)?.description}</p></div></div></Card>
                  {activeModuleId && <Card className="p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-2xl font-black text-slate-900">Завершення модуля</h3><p className="mt-1 text-sm text-slate-600">У спрощеній Supabase-версії натисни кнопку, щоб зарахувати модуль.</p></div><Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={() => completeModule(activeModuleId)}>Зарахувати модуль</Button></div></Card>}
                  {allPassed && <Card className="p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-2xl font-black text-slate-900">Сертифікат готовий</h3><p className="mt-1 text-sm text-slate-600">Після завершення всіх 10 модулів сформуйте документ.</p></div><Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={downloadCertificate}><Award className="h-4 w-4" />Завантажити сертифікат PDF</Button></div></Card>}
                </div>
              </div>
            </>}
          </div>
        )}

        <footer className="rounded-[28px] bg-slate-950 px-6 py-8 text-slate-300">
          <div className="grid gap-4 md:grid-cols-3">
            <div><p className="text-lg font-bold text-white">ІПКПО</p><p className="mt-2 text-sm leading-6 text-slate-400">LMS-платформа на Supabase.</p></div>
            <div><p className="font-semibold text-white">Функціональність</p><p className="mt-2 text-sm text-slate-400">Заявки · погодження · модулі · прогрес · сертифікати</p></div>
            <div><p className="font-semibold text-white">База даних</p><p className="mt-2 text-sm text-slate-400">Онлайн-зберігання через Supabase замість localStorage.</p></div>
          </div>
        </footer>
      </div>
    </div>
  </div>;
}
function RefreshIcon() { return <svg className="h-5 w-5 animate-spin text-sky-700" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
